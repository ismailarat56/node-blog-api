const AppError = require('../utils/app-error');

const authModel = require('../models/auth.model');

const { verifyAccessToken } = require('../utils/jwt');

function createBearerError(message, appCode) {
	const error = new AppError(401, message, appCode);

	error.wwwAuthenticate = 'Bearer realm="api"';

	return error;
}

function readBearerToken(request) {
	const authorization = request.get('Authorization');

	if (!authorization) {
		throw createBearerError('Bu endpoint için giriş yapmalısınız.', 'AUTHENTICATION_REQUIRED');
	}

	const parts = authorization.trim().split(/\s+/);

	if (
		parts.length !== 2 ||
		parts[0].toLowerCase() !== 'bearer' ||
		parts[1].length === 0 ||
		parts[1].length > 8192
	) {
		throw createBearerError('Authorization header geçersiz.', 'INVALID_AUTHORIZATION_HEADER');
	}

	return parts[1];
}

function parseTokenClaims(payload) {
	if (!payload || typeof payload !== 'object') {
		throw createBearerError('Access token geçersiz.', 'INVALID_ACCESS_TOKEN');
	}

	const userId = Number(payload.sub);

	const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

	if (
		typeof payload.sub !== 'string' ||
		!Number.isSafeInteger(userId) ||
		userId <= 0 ||
		typeof payload.jti !== 'string' ||
		!uuidPattern.test(payload.jti) ||
		!Number.isInteger(payload.iat) ||
		!Number.isInteger(payload.exp) ||
		payload.exp <= payload.iat ||
		payload.token_type !== 'access'
	) {
		throw createBearerError('Access token claimleri geçersiz.', 'INVALID_ACCESS_TOKEN_CLAIMS');
	}

	return {
		userId,
		jti: payload.jti,
		issuedAtEpoch: payload.iat,
		expiresAtEpoch: payload.exp,
	};
}

async function authenticate(request, response, next) {
	const token = readBearerToken(request);

	let payload;

	try {
		payload = verifyAccessToken(token);
	} catch (error) {
		if (error && error.name === 'TokenExpiredError') {
			throw createBearerError('Access token süresi dolmuş.', 'ACCESS_TOKEN_EXPIRED');
		}

		throw createBearerError('Access token geçersiz.', 'INVALID_ACCESS_TOKEN');
	}

	const auth = parseTokenClaims(payload);

	const isRevoked = await authModel.isAccessTokenRevoked(auth.jti);

	if (isRevoked) {
		throw createBearerError('Access token iptal edilmiş.', 'ACCESS_TOKEN_REVOKED');
	}

	const user = await authModel.findAuthenticatedUserById(auth.userId);

	if (!user || Number(user.is_active) !== 1) {
		throw createBearerError(
			'Access tokenın kullanıcısı aktif değil.',
			'AUTHENTICATED_USER_UNAVAILABLE'
		);
	}

	request.auth = auth;
	request.user = user;

	return next();
}

module.exports = authenticate;
