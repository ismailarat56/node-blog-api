const { getRefreshTokenConfig } = require('../config/refresh-token.config');

const COOKIE_NAME = 'refresh_token';
const COOKIE_PATH = '/api/v1/auth';

function cookieOptions() {
	return {
		httpOnly: true,
		secure: getRefreshTokenConfig().cookieSecure,
		sameSite: 'strict',
		path: COOKIE_PATH,
	};
}

function setRefreshCookie(response, token) {
	response.cookie(COOKIE_NAME, token, {
		...cookieOptions(),
		maxAge: getRefreshTokenConfig().ttlSeconds * 1000,
	});
}

function clearRefreshCookie(response) {
	response.clearCookie(COOKIE_NAME, cookieOptions());
}

function readRefreshCookie(request) {
	const value = request.cookies?.[COOKIE_NAME];
	return typeof value === 'string' && value.length > 0 ? value : null;
}

module.exports = {
	setRefreshCookie,
	clearRefreshCookie,
	readRefreshCookie,
};
