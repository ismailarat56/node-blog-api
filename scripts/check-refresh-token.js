const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');

function configProcess(overrides, code) {
	const env = { ...process.env };
	delete env.REFRESH_TOKEN_TTL_SECONDS;
	delete env.REFRESH_COOKIE_SECURE;
	delete env.NODE_ENV;
	const result = spawnSync(process.execPath, ['-e', code ?? `
		const { getRefreshTokenConfig } = require('./src/config/refresh-token.config');
		console.log(JSON.stringify(getRefreshTokenConfig()));
	`], { cwd: root, env: { ...env, ...overrides }, encoding: 'utf8' });
	assert.ifError(result.error);
	return result;
}

test('configuration defaults, bounds and production guard', () => {
	for (const [env, expected] of [
		[{}, { ttlSeconds: 604800, cookieSecure: true }],
		[{ REFRESH_TOKEN_TTL_SECONDS: '3600', REFRESH_COOKIE_SECURE: ' FALSE ' }, { ttlSeconds: 3600, cookieSecure: false }],
		[{ REFRESH_TOKEN_TTL_SECONDS: '2592000', NODE_ENV: 'production' }, { ttlSeconds: 2592000, cookieSecure: true }],
	]) {
		const result = configProcess(env);
		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(JSON.parse(result.stdout), expected);
	}
	for (const value of ['', '3599', '2592001', '3600.5', 'NaN', 'Infinity']) {
		const result = configProcess({ REFRESH_TOKEN_TTL_SECONDS: value });
		assert.notEqual(result.status, 0);
		assert.match(result.stderr, /REFRESH_TOKEN_TTL_SECONDS 3600/);
	}
	for (const value of ['', '1', 'yes']) {
		const result = configProcess({ REFRESH_COOKIE_SECURE: value });
		assert.notEqual(result.status, 0);
		assert.match(result.stderr, /REFRESH_COOKIE_SECURE true veya false/);
	}
	const production = configProcess({ NODE_ENV: 'production', REFRESH_COOKIE_SECURE: 'false' });
	assert.notEqual(production.status, 0);
	assert.match(production.stderr, /production ortaminda kullanilamaz/);
});

test('validated configuration is frozen and reused', () => {
	const result = configProcess({}, `
		const assert = require('node:assert/strict');
		const { getRefreshTokenConfig } = require('./src/config/refresh-token.config');
		const config = getRefreshTokenConfig();
		process.env.REFRESH_TOKEN_TTL_SECONDS = 'invalid';
		assert.equal(getRefreshTokenConfig(), config);
		assert.equal(Object.isFrozen(config), true);
	`);
	assert.equal(result.status, 0, result.stderr);
});

test('tokens have 256-bit encoding, reject malformed input and hash correctly', () => {
	const { generateRefreshToken, hashRefreshToken, isRefreshTokenFormat } = require('../src/utils/refresh-token');
	const tokens = new Set(Array.from({ length: 100 }, generateRefreshToken));
	assert.equal(tokens.size, 100);
	for (const token of tokens) {
		assert.equal(isRefreshTokenFormat(token), true);
		assert.equal(Buffer.from(token, 'base64url').length, 32);
	}
	for (const token of [undefined, null, 123, {}, '', 'a'.repeat(42), 'a'.repeat(44), '+'.repeat(43), '/'.repeat(43), 'a'.repeat(42) + '=']) {
		assert.equal(isRefreshTokenFormat(token), false);
	}
	assert.equal(hashRefreshToken('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('cookie headers share deletion scope and use seconds for Max-Age', () => {
	const express = require('express');
	const { ServerResponse } = require('node:http');
	const { setRefreshCookie, clearRefreshCookie, readRefreshCookie } = require('../src/utils/refresh-cookie');
	const response = new ServerResponse({ method: 'GET' });
	Object.setPrototypeOf(response, express.response);
	setRefreshCookie(response, 'a'.repeat(43));
	clearRefreshCookie(response);
	const [set, clear] = response.getHeader('Set-Cookie');
	assert.match(set, /^refresh_token=a{43};/);
	assert.match(set, /Max-Age=604800;/);
	assert.match(set, /Expires=/);
	assert.match(clear, /^refresh_token=;.*Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
	assert.doesNotMatch(clear, /Max-Age=/);
	for (const header of [set, clear]) {
		assert.match(header, /Path=\/api\/v1\/auth;/);
		assert.match(header, /HttpOnly;/);
		assert.match(header, /Secure;/);
		assert.match(header, /SameSite=Strict/);
	}
	for (const request of [{}, { cookies: {} }, { cookies: { refresh_token: '' } }, { cookies: { refresh_token: {} } }]) {
		assert.equal(readRefreshCookie(request), null);
	}
	assert.equal(readRefreshCookie({ cookies: { refresh_token: 'token' } }), 'token');
});
