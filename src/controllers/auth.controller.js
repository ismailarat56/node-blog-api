const AppError = require('../utils/app-error');

const authModel = require('../models/auth.model');

const userModel = require('../models/user.model');

const {
	validateLoginBody,
	validateRegisterBody,
	validatePasswordChangeBody,
} = require('../validators/auth.validator');

const { verifyPassword, performDummyPasswordWork, hashPassword } = require('../utils/password');

const { createAccessToken } = require('../utils/jwt');

const { sendSuccess } = require('../utils/response');

function throwInvalidCredentials() {
	throw new AppError(401, 'E-posta veya password hatalı.', 'INVALID_CREDENTIALS');
}

async function register(request, response) {
	const data = validateRegisterBody(request.body);

	const existingUser = await userModel.findUserByEmail(data.email);

	if (existingUser) {
		throw new AppError(409, 'Bu e-posta adresi zaten kullanılıyor.', 'EMAIL_ALREADY_EXISTS');
	}

	const passwordHash = await hashPassword(data.password);

	const userId = await userModel.createUser({
		name: data.name,
		email: data.email,
		passwordHash,
	});

	const user = await userModel.findUserById(userId);

	return sendSuccess(response, {
		statusCode: 201,
		message: 'Kayıt tamamlandı. Giriş yapabilirsiniz.',
		data: user,
	});
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

async function changePassword(request, response) {
	const { currentPassword, newPassword } = validatePasswordChangeBody(request.body);

	const passwordHash = await authModel.findPasswordHashById(request.user.id);

	const passwordMatches = passwordHash
		? await verifyPassword(currentPassword, passwordHash)
		: false;

	if (!passwordMatches) {
		throw new AppError(422, 'Mevcut parola hatalı.', 'CURRENT_PASSWORD_MISMATCH');
	}

	const newPasswordHash = await hashPassword(newPassword);

	const affectedRows = await authModel.updatePasswordHash(request.user.id, newPasswordHash);

	if (affectedRows === 0) {
		throw new AppError(409, 'Parola güncellenemedi.', 'PASSWORD_UPDATE_FAILED');
	}

	await authModel.revokeAccessToken({
		jti: request.auth.jti,
		userId: request.auth.userId,
		expiresAtEpoch: request.auth.expiresAtEpoch,
	});

	response.setHeader('Cache-Control', 'no-store');

	return sendSuccess(response, {
		message: 'Parola güncellendi. Bütün oturumlar kapatıldı; yeniden giriş yapın.',
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
	register,
	login,
	me,
	changePassword,
	logout,
};
