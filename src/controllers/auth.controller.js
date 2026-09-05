const AppError = require('../utils/app-error');

const authModel = require('../models/auth.model');

const { validateLoginBody } = require('../validators/auth.validator');

const { verifyPassword, performDummyPasswordWork } = require('../utils/password');

const { createAccessToken } = require('../utils/jwt');

const { sendSuccess } = require('../utils/response');

function throwInvalidCredentials() {
	throw new AppError(401, 'E-posta veya password hatalı.', 'INVALID_CREDENTIALS');
}

async function login(request, response) {
	const { email, password } = validateLoginBody(request.body);

	const loginUser = await authModel.findLoginUserByEmail(email);

	if (!loginUser || !loginUser.password_hash) {
		await performDummyPasswordWork(password);

		throwInvalidCredentials();
	}

	const passwordMatches = await verifyPassword(password, loginUser.password_hash);

	if (!passwordMatches || Number(loginUser.is_active) !== 1) {
		throwInvalidCredentials();
	}

	await authModel.updateLastLoginAt(loginUser.id);

	const user = await authModel.findAuthenticatedUserById(loginUser.id);

	if (!user) {
		throwInvalidCredentials();
	}

	const { accessToken, tokenType, expiresIn } = createAccessToken(user);

	response.setHeader('Cache-Control', 'no-store');

	response.setHeader('Pragma', 'no-cache');

	return sendSuccess(response, {
		message: 'Giriş başarılı.',
		data: {
			access_token: accessToken,
			token_type: tokenType,
			expires_in: expiresIn,
			user,
		},
	});
}

async function me(request, response) {
	return sendSuccess(response, {
		data: request.user,
	});
}

async function logout(request, response) {
	await authModel.revokeAccessToken({
		jti: request.auth.jti,
		userId: request.auth.userId,
		expiresAtEpoch: request.auth.expiresAtEpoch,
	});

	response.setHeader('Cache-Control', 'no-store');

	return sendSuccess(response, {
		message: 'Çıkış yapıldı.',
	});
}
module.exports = {
	login,
	me,
	logout,
};
