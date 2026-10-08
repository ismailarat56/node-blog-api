// Requires the local Docker database: docker compose up -d db.
require('dotenv').config({ path: '.env.docker', quiet: true });
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '3307';
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.MAIL_TRANSPORT = 'json';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { test } = require('node:test');
const pool = require('../src/config/database');
const app = require('../src/app');
const { hashPassword } = require('../src/utils/password');
const { createAccessToken } = require('../src/utils/jwt');
const { issueRefreshToken } = require('../src/services/refresh-token.service');
const { issueVerificationCode } = require('../src/services/verification.service');
const { hashRefreshToken } = require('../src/utils/refresh-token');

test('logout and password changes revoke only the intended refresh sessions', async (t) => {
	const users = [];
	let server;
	const password = `Old-${randomUUID()}`;
	try {
		for (let i = 0; i < 2; i += 1) {
			const email = `revoke-${randomUUID()}@example.test`;
			const [result] = await pool.execute(
				'INSERT INTO users (name, email, password_hash, email_verified_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
				['Revocation test', email, await hashPassword(password)]
			);
			users.push({ id: result.insertId, email });
		}
		const [owner, other] = users;
		server = app.listen(0, '127.0.0.1');
		await once(server, 'listening');
		const base = `http://127.0.0.1:${server.address().port}/api/v1/auth`;
		async function request(path, { user, token, body, method = 'POST' } = {}) {
			const response = await fetch(base + path, {
				method,
				headers: {
					...(user ? { Authorization: `Bearer ${createAccessToken(user).accessToken}` } : {}),
					...(token ? { Cookie: `refresh_token=${token}` } : {}),
					...(body ? { 'Content-Type': 'application/json' } : {}),
				},
				body: body ? JSON.stringify(body) : undefined,
				signal: AbortSignal.timeout(10000),
			});
			return { status: response.status, cookie: response.headers.get('set-cookie'), body: await response.json() };
		}
		async function revoked(token) {
			const [[row]] = await pool.execute('SELECT revoked_at FROM refresh_tokens WHERE token_hash = ?', [hashRefreshToken(token)]);
			return row.revoked_at !== null;
		}
		function cleared(result) {
			assert.match(result.cookie, /refresh_token=;.*Path=\/api\/v1\/auth;.*Expires=Thu, 01 Jan 1970/);
		}
		await t.test('logout revokes its cookie family and clears cookie, preserving another session', async () => {
			const token = await issueRefreshToken(owner.id);
			const independent = await issueRefreshToken(owner.id);
			const result = await request('/logout', { user: owner, token });
			assert.equal(result.status, 200);
			assert.equal(result.body.message, 'Çıkış yapıldı.');
			cleared(result);
			assert.equal(await revoked(token), true);
			assert.equal(await revoked(independent), false);
			const replay = await request('/refresh', { token });
			assert.equal(replay.status, 401);
			assert.equal(replay.body.error.code, 'REFRESH_TOKEN_INVALID');
		});
		await t.test('logout ignores another account cookie, missing cookie and malformed cookie', async () => {
			const token = await issueRefreshToken(other.id);
			for (const value of [token, undefined, 'malformed']) {
				const result = await request('/logout', { user: owner, token: value });
				assert.equal(result.status, 200);
				cleared(result);
			}
			assert.equal(await revoked(token), false);
			assert.equal((await request('/refresh', { token })).status, 200);
		});
		await t.test('password change revokes all user families and clears cookie', async () => {
			const tokens = await Promise.all([issueRefreshToken(owner.id), issueRefreshToken(owner.id)]);
			const unaffected = await issueRefreshToken(other.id);
			const { code } = await issueVerificationCode({ userId: owner.id, purpose: 'password_change' });
			const result = await request('/password', {
				method: 'PATCH', user: owner, token: tokens[0],
				body: { current_password: password, new_password: `New-${randomUUID()}`, code },
			});
			assert.equal(result.status, 200);
			cleared(result);
			for (const token of tokens) assert.equal(await revoked(token), true);
			assert.equal(await revoked(unaffected), false);
		});
		await t.test('password reset revokes all target families without deleting a different account cookie', async () => {
			const tokens = await Promise.all([issueRefreshToken(owner.id), issueRefreshToken(owner.id)]);
			const unaffected = await issueRefreshToken(other.id);
			const { code } = await issueVerificationCode({ userId: owner.id, purpose: 'password_reset' });
			const result = await request('/password/reset', {
				token: unaffected,
				body: { email: owner.email, new_password: `Reset-${randomUUID()}`, code },
			});
			assert.equal(result.status, 200);
			assert.equal(result.cookie, null);
			for (const token of tokens) assert.equal(await revoked(token), true);
			assert.equal(await revoked(unaffected), false);
		});
	} finally {
		if (server) await new Promise(resolve => server.close(resolve));
		try {
			for (const user of users) await pool.execute('DELETE FROM users WHERE id = ?', [user.id]);
		} finally {
			await pool.end();
		}
	}
});
