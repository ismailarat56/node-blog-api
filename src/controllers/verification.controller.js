const AppError = require('../utils/app-error');

const authModel = require('../models/auth.model');
const userModel = require('../models/user.model');

const { sendSuccess } = require('../utils/response');

const { hashPassword, verifyPassword } = require('../utils/password');

const { queueMail } = require('../utils/mailer');

const {
	buildWelcomeMail,
	buildPasswordChangedMail,
	buildEmailChangeRequestedMail,
	buildEmailChangedMail,
} = require('../utils/mail-templates');

const {
	throwInvalidVerificationCode,
	issueVerificationCode,
	consumeVerificationCode,
	queueVerificationCodeMail,
} = require('../services/verification.service');

const {
	validateEmailOnlyBody,
	validateEmailVerifyBody,
	validatePasswordResetBody,
	validateEmailChangeBody,
	validateEmailChangeConfirmBody,
} = require('../validators/auth.validator');

const GENERIC_CODE_MESSAGE = 'Adres uygunsa birkaç dakika içinde bir doğrulama kodu gönderilecek.';

function isActiveUser(user) {
	return Boolean(user) && Number(user.is_active) === 1;
}

function sendGenericAccepted(response) {
	response.setHeader('Cache-Control', 'no-store');

	return sendSuccess(response, {
		statusCode: 202,
		message: GENERIC_CODE_MESSAGE,
	});
}

function throwCooldown(response, retryAfterSeconds) {
	response.setHeader('Retry-After', String(retryAfterSeconds));

	throw new AppError(429, 'Yeni kod istemeden önce biraz bekle.', 'VERIFICATION_CODE_COOLDOWN', {
		retry_after_seconds: retryAfterSeconds,
	});
}

async function verifyEmail(request, response) {
	const { email, code } = validateEmailVerifyBody(request.body);

	const user = await authModel.findCodeRecipientByEmail(email);

	if (!isActiveUser(user) || user.email_verified_at !== null) {
		throwInvalidVerificationCode();
	}

	await consumeVerificationCode({
		userId: user.id,
		purpose: 'email_verification',
		code,
	});

	await authModel.markEmailVerified(user.id);

	sendSuccess(response, {
		message: 'E-posta adresin doğrulandı. Giriş yapabilirsin.',
	});

	queueMail(
		buildWelcomeMail({
			name: user.name,
			email: user.email,
		}),
		{
			event: 'email-verified',
			userId: user.id,
			requestId: request.request_id,
		}
	);
}

async function resendEmailVerification(request, response) {
	const { email } = validateEmailOnlyBody(request.body);

	const user = await authModel.findCodeRecipientByEmail(email);

	const eligible = isActiveUser(user) && user.email_verified_at === null;

	const issued = eligible
		? await issueVerificationCode({
				userId: user.id,
				purpose: 'email_verification',
			})
		: { issued: false };

	sendGenericAccepted(response);

	if (eligible) {
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
}

async function forgotPassword(request, response) {
	const { email } = validateEmailOnlyBody(request.body);

	const user = await authModel.findCodeRecipientByEmail(email);

	const eligible = isActiveUser(user);

	const issued = eligible
		? await issueVerificationCode({
				userId: user.id,
				purpose: 'password_reset',
			})
		: { issued: false };

	sendGenericAccepted(response);

	if (eligible) {
		queueVerificationCodeMail({
			recipient: {
				id: user.id,
				name: user.name,
				email: user.email,
			},
			purpose: 'password_reset',
			issued,
			requestId: request.request_id,
		});
	}
}

async function resetPassword(request, response) {
	const { email, code, newPassword } = validatePasswordResetBody(request.body);

	const user = await authModel.findCodeRecipientByEmail(email);

	if (!isActiveUser(user)) {
		throwInvalidVerificationCode();
	}

	await consumeVerificationCode({
		userId: user.id,
		purpose: 'password_reset',
		code,
	});

	const passwordHash = await hashPassword(newPassword);

	const affectedRows = await authModel.resetPasswordHash(user.id, passwordHash);

	if (affectedRows === 0) {
		throw new AppError(409, 'Parola güncellenemedi.', 'PASSWORD_UPDATE_FAILED');
	}

	response.setHeader('Cache-Control', 'no-store');

	sendSuccess(response, {
		message: 'Parola sıfırlandı. Bütün oturumlar kapatıldı; yeni parolanla giriş yap.',
	});

	queueMail(
		buildPasswordChangedMail(
			{
				name: user.name,
				email: user.email,
			},
			new Date()
		),
		{
			event: 'password-reset',
			userId: user.id,
			requestId: request.request_id,
		}
	);
}

async function requestPasswordChangeCode(request, response) {
	const issued = await issueVerificationCode({
		userId: request.user.id,
		purpose: 'password_change',
	});

	if (!issued.issued) {
		throwCooldown(response, issued.retryAfterSeconds);
	}

	response.setHeader('Cache-Control', 'no-store');

	sendSuccess(response, {
		statusCode: 202,
		message: 'Parola değişikliği kodu e-posta adresine gönderildi.',
	});

	queueVerificationCodeMail({
		recipient: {
			id: request.user.id,
			name: request.user.name,
			email: request.user.email,
		},
		purpose: 'password_change',
		issued,
		requestId: request.request_id,
	});
}

async function requestEmailChange(request, response) {
	const { newEmail, currentPassword } = validateEmailChangeBody(request.body);

	if (newEmail === request.user.email) {
		throw new AppError(422, 'Yeni adres mevcut adresinle aynı.', 'EMAIL_NOT_CHANGED');
	}

	const passwordHash = await authModel.findPasswordHashById(request.user.id);

	const passwordMatches = passwordHash
		? await verifyPassword(currentPassword, passwordHash)
		: false;

	if (!passwordMatches) {
		throw new AppError(422, 'Mevcut parola hatalı.', 'CURRENT_PASSWORD_MISMATCH');
	}

	const existingUser = await userModel.findUserByEmail(newEmail);

	if (existingUser) {
		throw new AppError(409, 'Bu e-posta adresi zaten kullanılıyor.', 'EMAIL_ALREADY_EXISTS');
	}

	const issued = await issueVerificationCode({
		userId: request.user.id,
		purpose: 'email_change',
		targetEmail: newEmail,
	});

	if (!issued.issued) {
		throwCooldown(response, issued.retryAfterSeconds);
	}

	response.setHeader('Cache-Control', 'no-store');

	sendSuccess(response, {
		statusCode: 202,
		message:
			'Yeni adresine bir doğrulama kodu gönderildi. Kodu onaylayana kadar adresin değişmez.',
	});

	queueVerificationCodeMail({
		recipient: {
			id: request.user.id,
			name: request.user.name,
			email: newEmail,
		},
		purpose: 'email_change',
		issued,
		requestId: request.request_id,
	});

	queueMail(
		buildEmailChangeRequestedMail(
			{
				name: request.user.name,
				email: request.user.email,
			},
			newEmail
		),
		{
			event: 'email-change-requested',
			userId: request.user.id,
			requestId: request.request_id,
		}
	);
}

async function confirmEmailChange(request, response) {
	const { code } = validateEmailChangeConfirmBody(request.body);

	const oldEmail = request.user.email;

	const { targetEmail } = await consumeVerificationCode({
		userId: request.user.id,
		purpose: 'email_change',
		code,
	});

	let affectedRows;

	try {
		affectedRows = await authModel.updateEmail(request.user.id, targetEmail);
	} catch (error) {
		if (error.code === 'ER_DUP_ENTRY') {
			throw new AppError(
				409,
				'Bu e-posta adresi zaten kullanılıyor.',
				'EMAIL_ALREADY_EXISTS'
			);
		}

		throw error;
	}

	if (affectedRows === 0) {
		throw new AppError(409, 'E-posta adresi güncellenemedi.', 'EMAIL_UPDATE_FAILED');
	}

	const user = await authModel.findAuthenticatedUserById(request.user.id);

	response.setHeader('Cache-Control', 'no-store');

	sendSuccess(response, {
		message: 'E-posta adresin güncellendi.',
		data: user,
	});

	const change = {
		oldEmail,
		newEmail: targetEmail,
	};

	for (const address of [oldEmail, targetEmail]) {
		queueMail(
			buildEmailChangedMail(
				{
					name: user.name,
					email: address,
				},
				change
			),
			{
				event: 'email-changed',
				userId: user.id,
				requestId: request.request_id,
			}
		);
	}
}

module.exports = {
	verifyEmail,
	resendEmailVerification,
	forgotPassword,
	resetPassword,
	requestPasswordChangeCode,
	requestEmailChange,
	confirmEmailChange,
};
