const { randomUUID } = require('node:crypto');

const pool = require('../config/database');

const AppError = require('../utils/app-error');

const authModel = require('../models/auth.model');

const refreshTokenModel = require('../models/refresh-token.model');

const { generateRefreshToken, hashRefreshToken, isRefreshTokenFormat } = require('../utils/refresh-token');

const { getRefreshTokenConfig } = require('../config/refresh-token.config');

async function issueRefreshToken(userId) {
	const token = generateRefreshToken();

	await refreshTokenModel.insertRefreshToken({
		userId,
		familyId: randomUUID(),
		tokenHash: hashRefreshToken(token),
		ttlSeconds: getRefreshTokenConfig().ttlSeconds,
	});

	return token;
}

function throwInvalidRefreshToken() {
	throw new AppError(
		401,
		'Oturum geçersiz veya süresi dolmuş. Tekrar giriş yap.',
		'REFRESH_TOKEN_INVALID'
	);
}

async function rotateInTransaction(connection, presentedHash, nextHash) {
	const stored = await refreshTokenModel.findRefreshTokenForUpdate(presentedHash, connection);

	if (!stored) {
		return { result: 'invalid' };
	}

	if (stored.used_at !== null) {
		await refreshTokenModel.revokeRefreshFamily(stored.family_id, connection);

		return { result: 'reused' };
	}

	if (stored.revoked_at !== null || Number(stored.is_expired) === 1) {
		return { result: 'invalid' };
	}

	const state = await authModel.findAuthenticationStateById(stored.user_id, connection);

	if (!state || Number(state.user.is_active) !== 1) {
		await refreshTokenModel.revokeRefreshFamily(stored.family_id, connection);

		return { result: 'invalid' };
	}

	await refreshTokenModel.markRefreshTokenUsed(stored.id, connection);

	await refreshTokenModel.insertRefreshToken(
		{
			userId: stored.user_id,
			familyId: stored.family_id,
			tokenHash: nextHash,
			ttlSeconds: getRefreshTokenConfig().ttlSeconds,
		},
		connection
	);

	return { result: 'rotated', user: state.user };
}

async function rotateRefreshToken(presentedToken) {
	if (!isRefreshTokenFormat(presentedToken)) {
		throwInvalidRefreshToken();
	}

	const nextToken = generateRefreshToken();
	const connection = await pool.getConnection();
	let outcome;

	try {
		await connection.beginTransaction();

		outcome = await rotateInTransaction(
			connection,
			hashRefreshToken(presentedToken),
			hashRefreshToken(nextToken)
		);

		await connection.commit();
	} catch (error) {
		await connection.rollback();

		throw error;
	} finally {
		connection.release();
	}

	if (outcome.result === 'reused') {
		throw new AppError(
			401,
			'Bu oturum anahtarı daha önce kullanılmış. Güvenlik için oturum kapatıldı.',
			'REFRESH_TOKEN_REUSED'
		);
	}

	if (outcome.result === 'invalid') {
		throwInvalidRefreshToken();
	}

	return { user: outcome.user, refreshToken: nextToken };
}

async function revokeRefreshSession(presentedToken, userId) {
	if (!isRefreshTokenFormat(presentedToken)) {
		return;
	}

	const stored = await refreshTokenModel.findRefreshTokenByHash(hashRefreshToken(presentedToken));

	if (stored && Number(stored.user_id) === userId) {
		await refreshTokenModel.revokeRefreshFamily(stored.family_id);
	}
}

module.exports = {
	issueRefreshToken,
	rotateRefreshToken,
	revokeRefreshSession,
};
