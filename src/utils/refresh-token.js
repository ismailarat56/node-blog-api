const crypto = require('node:crypto');

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function generateRefreshToken() {
	return crypto.randomBytes(32).toString('base64url');
}

function hashRefreshToken(token) {
	return crypto.createHash('sha256').update(token).digest('hex');
}

function isRefreshTokenFormat(token) {
	return typeof token === 'string' && TOKEN_PATTERN.test(token);
}

module.exports = {
	generateRefreshToken,
	hashRefreshToken,
	isRefreshTokenFormat,
};
