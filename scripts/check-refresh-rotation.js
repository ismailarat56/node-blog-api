// Requires the local Docker database: docker compose up -d db.
require('dotenv').config({ path: '.env.docker', quiet: true });
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '3307';
process.env.RATE_LIMIT_ENABLED = 'true';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { test } = require('node:test');
const pool = require('../src/config/database');
const app = require('../src/app');
const { issueRefreshToken, rotateRefreshToken } = require('../src/services/refresh-token.service');
const { hashRefreshToken, generateRefreshToken } = require('../src/utils/refresh-token');

test('refresh rotation, committed reuse revocation, concurrency and IP limiting', { timeout: 30000 }, async (t) => {
	let userId;
	let server;
	try {
		const [inserted] = await pool.execute(
			'INSERT INTO users (name, email, email_verified_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
			['Refresh rotation check', `rotation-${randomUUID()}@example.test`]
		);
		userId = inserted.insertId;
		server = app.listen(0, '127.0.0.1');
		await once(server, 'listening');
		const base = `http://127.0.0.1:${server.address().port}/api/v1/auth`;
		let requestCount = 0;
		async function refresh(token) {
			requestCount += 1;
			const response = await fetch(`${base}/refresh`, {
				method: 'POST',
				headers: token === undefined ? {} : { Cookie: `refresh_token=${token}` },
				signal: AbortSignal.timeout(10000),
			});
			return { status: response.status, headers: response.headers, body: await response.json() };
		}
		function error(result, code, clearsCookie = true) {
			assert.equal(result.status, 401);
			assert.equal(result.body.error.code, code);
			if (clearsCookie) assert.match(result.headers.get('set-cookie'), /refresh_token=;.*Expires=Thu, 01 Jan 1970/);
		}
		function cookie(result) {
			const token = /^refresh_token=([A-Za-z0-9_-]{43});/.exec(result.headers.get('set-cookie'))?.[1];
			assert.ok(token);
			return token;
		}
		async function rows() {
			const [result] = await pool.execute('SELECT * FROM refresh_tokens WHERE user_id = ? ORDER BY id', [userId]);
			return result;
		}

		await t.test('missing and malformed cookies reach refresh without access authentication', async () => {
			error(await refresh(), 'REFRESH_TOKEN_MISSING', false);
			error(await refresh('malformed'), 'REFRESH_TOKEN_INVALID');
			error(await refresh(generateRefreshToken()), 'REFRESH_TOKEN_INVALID');
		});
		await t.test('rotation returns a usable access token and reuse permanently revokes its family', async () => {
			const first = await issueRefreshToken(userId);
			const otherSession = await issueRefreshToken(userId);
			const rotated = await refresh(first);
			assert.equal(rotated.status, 200);
			const next = cookie(rotated);
			assert.notEqual(next, first);
			assert.equal(rotated.headers.get('cache-control'), 'no-store');
			assert.equal(rotated.headers.get('pragma'), 'no-cache');
			assert.equal(rotated.body.data.user.id, userId);
			assert.equal(JSON.stringify(rotated.body).includes(next), false);
			const me = await fetch(`${base}/me`, { headers: { Authorization: `Bearer ${rotated.body.data.access_token}` } });
			assert.equal(me.status, 200);
			assert.equal((await me.json()).data.id, userId);
			const before = await rows();
			const parent = before.find(row => row.token_hash === hashRefreshToken(first));
			const child = before.find(row => row.token_hash === hashRefreshToken(next));
			assert.ok(parent.used_at);
			assert.equal(child.family_id, parent.family_id);
			assert.equal(child.used_at, null);
			error(await refresh(first), 'REFRESH_TOKEN_REUSED');
			assert.ok((await rows()).filter(row => row.family_id === parent.family_id).every(row => row.revoked_at));
			error(await refresh(next), 'REFRESH_TOKEN_INVALID');
			error(await refresh(first), 'REFRESH_TOKEN_REUSED');
			assert.equal((await refresh(otherSession)).status, 200, 'other sessions remain valid');
		});
		await t.test('expired and revoked tokens cannot rotate; used takes precedence over both', async () => {
			const token = await issueRefreshToken(userId);
			await pool.execute('UPDATE refresh_tokens SET expires_at = CURRENT_TIMESTAMP WHERE token_hash = ?', [hashRefreshToken(token)]);
			error(await refresh(token), 'REFRESH_TOKEN_INVALID');
			await pool.execute('UPDATE refresh_tokens SET used_at = CURRENT_TIMESTAMP, revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?', [hashRefreshToken(token)]);
			error(await refresh(token), 'REFRESH_TOKEN_REUSED');
		});
		await t.test('disabled and deleted accounts lose their family even after restoration', async () => {
			for (const column of ['is_active', 'deleted_at']) {
				const token = await issueRefreshToken(userId);
				await pool.execute(column === 'is_active' ? 'UPDATE users SET is_active = 0 WHERE id = ?' : 'UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
				error(await refresh(token), 'REFRESH_TOKEN_INVALID');
				await pool.execute('UPDATE users SET is_active = 1, deleted_at = NULL WHERE id = ?', [userId]);
				error(await refresh(token), 'REFRESH_TOKEN_INVALID');
			}
		});
		await t.test('20 simultaneous requests yield one 200 and 19 reuse errors, invalidating the winner', async () => {
			const token = await issueRefreshToken(userId);
			const results = await Promise.all(Array.from({ length: 20 }, () => refresh(token)));
			const winners = results.filter(result => result.status === 200);
			assert.equal(winners.length, 1);
			const losers = results.filter(result => result.status !== 200);
			assert.equal(losers.length, 19);
			losers.forEach(result => error(result, 'REFRESH_TOKEN_REUSED'));
			error(await refresh(cookie(winners[0])), 'REFRESH_TOKEN_INVALID');
		});
		await t.test('rotation completes when only one pool connection is free', async () => {
			const token = await issueRefreshToken(userId);
			const held = [];
			let timer;
			try {
				for (let i = 0; i < 4; i += 1) held.push(await pool.getConnection());
				const rotated = await Promise.race([
					rotateRefreshToken(token),
					new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('rotation requires a second connection')), 3000); }),
				]);
				assert.equal(rotated.user.id, userId);
			} finally {
				clearTimeout(timer);
				held.forEach(connection => connection.release());
			}
		});
		await t.test('request 61 is rate limited per IP with Retry-After', async () => {
			while (requestCount < 60) error(await refresh(), 'REFRESH_TOKEN_MISSING', false);
			const limited = await refresh();
			assert.equal(limited.status, 429);
			assert.equal(limited.body.error.code, 'RATE_LIMITED');
			assert.equal(limited.body.error.details.limit_name, 'refresh_ip');
			assert.ok(Number(limited.headers.get('retry-after')) > 0);
		});
	} finally {
		if (server) await new Promise(resolve => server.close(resolve));
		try {
			if (userId) await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
		} finally {
			await pool.end();
		}
	}
});
