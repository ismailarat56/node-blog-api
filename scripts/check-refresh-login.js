// Requires the local Docker database: docker compose up -d db.
require('dotenv').config({ path: '.env.docker', quiet: true });
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '3307';

const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { once } = require('node:events');
const { test } = require('node:test');
const pool = require('../src/config/database');
const app = require('../src/app');
const authModel = require('../src/models/auth.model');
const { hashPassword } = require('../src/utils/password');
const { verifyAccessToken } = require('../src/utils/jwt');
const { getRefreshTokenConfig } = require('../src/config/refresh-token.config');

test('login cookies and refresh-token model with Docker MySQL', async () => {
	let userId;
	let server;
	let connection;
	const email = `refresh-check-${randomUUID()}@example.test`;
	const password = randomUUID();
	const ttl = getRefreshTokenConfig().ttlSeconds;
	try {
		const [inserted] = await pool.execute(
			'INSERT INTO users (name, email, password_hash, email_verified_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
			['Refresh login check', email, await hashPassword(password)]
		);
		userId = inserted.insertId;
		server = app.listen(0, '127.0.0.1');
		await once(server, 'listening');
		const login = (submittedPassword) => fetch(`http://127.0.0.1:${server.address().port}/api/v1/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password: submittedPassword }),
		});
		const hashes = [];
		for (let i = 0; i < 2; i += 1) {
			const response = await login(password);
			assert.equal(response.status, 200);
			const cookie = response.headers.get('set-cookie');
			assert.ok(cookie, 'successful login must set a refresh cookie');
			const token = /^refresh_token=([A-Za-z0-9_-]{43});/.exec(cookie)?.[1];
			assert.ok(token, 'refresh cookie must contain a 43-character base64url token');
			assert.ok(cookie.includes(`Max-Age=${ttl};`));
			assert.match(cookie, /Path=\/api\/v1\/auth;/);
			assert.match(cookie, /HttpOnly;/);
			assert.match(cookie, /SameSite=Strict/);
			assert.equal(cookie.includes('; Secure'), getRefreshTokenConfig().cookieSecure);
			assert.equal(response.headers.get('cache-control'), 'no-store');
			assert.equal(response.headers.get('pragma'), 'no-cache');
			const body = await response.json();
			assert.equal(body.success, true);
			assert.equal(body.message, 'Giriş başarılı.');
			assert.deepEqual(Object.keys(body.data).sort(), ['access_token', 'expires_in', 'token_type', 'user']);
			assert.equal(body.data.user.id, userId);
			assert.equal(body.data.token_type, 'Bearer');
			assert.ok(body.data.expires_in > 0);
			assert.equal(verifyAccessToken(body.data.access_token).sub, String(userId));
			assert.equal(JSON.stringify(body).includes(token), false);
			hashes.push(createHash('sha256').update(token).digest('hex'));
		}
		const [rows] = await pool.execute(
			'SELECT *, TIMESTAMPDIFF(SECOND, created_at, expires_at) AS ttl FROM refresh_tokens WHERE user_id = ? ORDER BY id',
			[userId]
		);
		assert.equal(rows.length, 2);
		assert.deepEqual(rows.map((row) => row.token_hash), hashes);
		assert.notEqual(rows[0].family_id, rows[1].family_id);
		for (const row of rows) {
			assert.match(row.family_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
			assert.equal(row.ttl, ttl);
			assert.equal(row.used_at, null);
			assert.equal(row.revoked_at, null);
		}
		const invalid = await login('wrong-password');
		assert.equal(invalid.status, 401);
		assert.equal(invalid.headers.get('set-cookie'), null);
		await invalid.arrayBuffer();
		await pool.execute('UPDATE users SET email_verified_at = NULL WHERE id = ?', [userId]);
		const unverified = await login(password);
		assert.equal(unverified.status, 403);
		assert.equal(unverified.headers.get('set-cookie'), null);
		await unverified.arrayBuffer();
		const [[count]] = await pool.execute('SELECT COUNT(*) AS total FROM refresh_tokens WHERE user_id = ?', [userId]);
		assert.equal(count.total, 2, 'failed logins must not create refresh tokens');

		const model = require('../src/models/refresh-token.model');
		assert.equal((await model.findRefreshTokenByHash(hashes[0])).user_id, userId);
		assert.equal(await model.findRefreshTokenByHash('0'.repeat(64)), null);
		connection = await pool.getConnection();
		await connection.beginTransaction();
		await connection.execute('UPDATE users SET name = ? WHERE id = ?', ['Uncommitted name', userId]);
		assert.equal((await authModel.findAuthenticationStateById(userId, connection)).user.name, 'Uncommitted name');
		assert.equal((await authModel.findAuthenticationStateById(userId)).user.name, 'Refresh login check');
		assert.equal((await model.findRefreshTokenForUpdate(hashes[0], connection)).is_expired, 0);
		assert.equal(await model.findRefreshTokenForUpdate('0'.repeat(64), connection), null);
		assert.equal(await model.markRefreshTokenUsed(rows[0].id, connection), 1);
		assert.equal(await model.markRefreshTokenUsed(rows[0].id, connection), 0);
		assert.ok((await model.findRefreshTokenForUpdate(hashes[0], connection)).used_at);
		assert.equal(await model.revokeRefreshFamily(rows[0].family_id, connection), 1);
		assert.ok((await model.findRefreshTokenForUpdate(hashes[0], connection)).revoked_at);
		assert.equal((await model.findRefreshTokenForUpdate(hashes[1], connection)).revoked_at, null);
		await model.insertRefreshToken({ userId, familyId: randomUUID(), tokenHash: 'f'.repeat(64), ttlSeconds: 3600 }, connection);
		assert.ok(await model.findRefreshTokenForUpdate('f'.repeat(64), connection));
		await connection.execute('UPDATE refresh_tokens SET expires_at = CURRENT_TIMESTAMP WHERE id = ?', [rows[0].id]);
		assert.equal((await model.findRefreshTokenForUpdate(hashes[0], connection)).is_expired, 1);
		await connection.rollback();
		connection.release();
		connection = null;
		assert.equal(await model.findRefreshTokenByHash('f'.repeat(64)), null, 'transaction insert must roll back');
		assert.equal(await model.revokeRefreshFamily(rows[0].family_id), 1);
		assert.equal(await model.revokeRefreshFamily(rows[0].family_id), 0);
		assert.equal(await model.revokeUserRefreshTokens(userId), 1);
		assert.equal(await model.revokeUserRefreshTokens(userId), 0);
	} finally {
		if (connection) {
			await connection.rollback();
			connection.release();
		}
		if (server) {
			await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
		}
		try {
			if (userId) await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
		} finally {
			await pool.end();
		}
	}
});
