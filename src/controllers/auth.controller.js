const AppError = require('../utils/app-error');

const authModel = require('../models/auth.model');

const userModel = require('../models/user.model');

const refreshTokenModel = require('../models/refresh-token.model');

const {
	validateLoginBody,
	validateRegisterBody,
	validatePasswordChangeBody,
} = require('../validators/auth.validator');

const { verifyPassword, performDummyPasswordWork, hashPassword } = require('../utils/password');

const { createAccessToken } = require('../utils/jwt');

const { sendSuccess } = require('../utils/response');

const { setRefreshCookie, clearRefreshCookie, readRefreshCookie } = require('../utils/refresh-cookie');

const {
	issueRefreshToken,
	rotateRefreshToken,
	revokeRefreshSession,
} = require('../services/refresh-token.service');

const { queueMail } = require('../utils/mailer');

const { buildPasswordChangedMail } = require('../utils/mail-templates');

const {
	issueVerificationCode,
	consumeVerificationCode,
	queueVerificationCodeMail,
} = require('../services/verification.service');

function sendSession(response, { message, user, refreshToken }) {
	const { accessToken, tokenType, expiresIn } = createAccessToken(user);

	setRefreshCookie(response, refreshToken);

	response.setHeader('Cache-Control', 'no-store');

	response.setHeader('Pragma', 'no-cache');

	return sendSuccess(response, {
		message,
		data: {
			access_token: accessToken,
			token_type: tokenType,
			expires_in: expiresIn,
			user,
		},
	});
}

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

	const issued = await issueVerificationCode({
		userId: user.id,
		purpose: 'email_verification',
	});

	sendSuccess(response, {
		statusCode: 201,
		message: 'Kayıt tamamlandı. E-postana gelen 6 haneli kodla adresini doğrula.',
		data: user,
	});

	queueVerificationCodeMail({
		recipient: {
			id: user.id,
			name: user.name,
			email: user.email,
		},
		purpose: 'email_verification',
		issued,
		requestId: request.request_id,
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

	if (loginUser.email_verified_at === null) {
		throw new AppError(
			403,
			'E-posta adresin doğrulanmadı. Kayıtta gönderilen kodu kullan veya yeni kod iste.',
			'EMAIL_NOT_VERIFIED'
		);
	}

	await authModel.updateLastLoginAt(loginUser.id);

	const user = await authModel.findAuthenticatedUserById(loginUser.id);

	if (!user) {
		throwInvalidCredentials();
	}

	const refreshToken = await issueRefreshToken(user.id);

	return sendSession(response, {
		message: 'Giriş başarılı.',
		user,
		refreshToken,
	});
}

async function refresh(request, response) {
	const presentedToken = readRefreshCookie(request);

	if (!presentedToken) {
		throw new AppError(401, 'Oturum bulunamadı. Giriş yap.', 'REFRESH_TOKEN_MISSING');
	}

	let rotated;

	try {
		rotated = await rotateRefreshToken(presentedToken);
	} catch (error) {
		if (error.statusCode === 401) {
			clearRefreshCookie(response);
		}

		throw error;
	}

	return sendSession(response, {
		message: 'Oturum yenilendi.',
		...rotated,
	});
}

async function me(request, response) {
	return sendSuccess(response, {
		data: request.user,
	});
}

async function changePassword(request, response) {
	const { currentPassword, newPassword, code } = validatePasswordChangeBody(request.body);

	const passwordHash = await authModel.findPasswordHashById(request.user.id);

	const passwordMatches = passwordHash
		? await verifyPassword(currentPassword, passwordHash)
		: false;

	if (!passwordMatches) {
		throw new AppError(422, 'Mevcut parola hatalı.', 'CURRENT_PASSWORD_MISMATCH');
	}

	await consumeVerificationCode({
		userId: request.user.id,
		purpose: 'password_change',
		code,
	});

	const newPasswordHash = await hashPassword(newPassword);

	const affectedRows = await authModel.updatePasswordHash(request.user.id, newPasswordHash);

	if (affectedRows === 0) {
		throw new AppError(409, 'Parola güncellenemedi.', 'PASSWORD_UPDATE_FAILED');
	}

	const changedAt = new Date();

	await authModel.revokeAccessToken({
		jti: request.auth.jti,
		userId: request.auth.userId,
		expiresAtEpoch: request.auth.expiresAtEpoch,
	});

	await refreshTokenModel.revokeUserRefreshTokens(request.user.id);

	clearRefreshCookie(response);

	response.setHeader('Cache-Control', 'no-store');

	sendSuccess(response, {
		message: 'Parola guncellendi. Butun oturumlar kapatildi; yeniden giris yapin.',
	});

	queueMail(
		buildPasswordChangedMail(
			{
				name: request.user.name,
				email: request.user.email,
			},
			changedAt
		),
		{
			event: 'password-change',
			userId: request.user.id,
			requestId: request.requestId,
		}
	);
}

async function logout(request, response) {
	await authModel.revokeAccessToken({
		jti: request.auth.jti,
		userId: request.auth.userId,
		expiresAtEpoch: request.auth.expiresAtEpoch,
	});

	const presentedToken = readRefreshCookie(request);

	if (presentedToken) {
		await revokeRefreshSession(presentedToken, request.auth.userId);
	}

	clearRefreshCookie(response);

	response.setHeader('Cache-Control', 'no-store');

	return sendSuccess(response, {
		message: 'Çıkış yapıldı.',
	});
}

module.exports = {
	register,
	login,
	refresh,
	me,
	changePassword,
	logout,
};
