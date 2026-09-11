const AppError = require('../utils/app-error');

const { assertPlainObject } = require('./common.validator');

const { validateCreateUser, validateNewPassword } = require('./user.validator');

const loginFields = new Set(['email', 'password']);

const registerFields = new Set(['name', 'email', 'password']);

const passwordChangeFields = new Set(['current_password', 'new_password']);

function validateLoginBody(body) {
	if (!body || Array.isArray(body) || typeof body !== 'object') {
		throw new AppError(422, 'Geçerli bir JSON object gönderin.', 'INVALID_LOGIN_BODY');
	}

	const unsupportedFields = Object.keys(body).filter((field) => !loginFields.has(field));

	if (unsupportedFields.length > 0) {
		throw new AppError(
			422,
			'Login isteğinde desteklenmeyen alan var.',
			'UNSUPPORTED_LOGIN_FIELDS',
			{
				fields: unsupportedFields,
			}
		);
	}

	const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

	if (email.length === 0 || email.length > 255 || !email.includes('@')) {
		throw new AppError(422, 'Geçerli login bilgileri gönderin.', 'INVALID_LOGIN_INPUT');
	}

	if (
		typeof body.password !== 'string' ||
		body.password.length === 0 ||
		Array.from(body.password).length > 256
	) {
		throw new AppError(422, 'Geçerli login bilgileri gönderin.', 'INVALID_LOGIN_INPUT');
	}

	return {
		email,
		password: body.password,
	};
}

function validateRegisterBody(body) {
	assertPlainObject(body);

	const unsupportedFields = Object.keys(body).filter((field) => !registerFields.has(field));

	if (unsupportedFields.length > 0) {
		throw new AppError(
			422,
			'Kayıt yalnızca name, email ve password alanlarını kabul eder.',
			'UNSUPPORTED_REGISTER_FIELDS',
			{
				fields: unsupportedFields,
			}
		);
	}

	const { name, email, password } = validateCreateUser(body);

	return {
		name,
		email,
		password,
	};
}

function validatePasswordChangeBody(body) {
	assertPlainObject(body);

	const unsupportedFields = Object.keys(body).filter((field) => !passwordChangeFields.has(field));

	if (unsupportedFields.length > 0) {
		throw new AppError(
			422,
			'Parola değişikliği yalnızca current_password ve new_password alanlarını kabul eder.',
			'UNSUPPORTED_PASSWORD_CHANGE_FIELDS',
			{
				fields: unsupportedFields,
			}
		);
	}

	const current = body.current_password;

	if (typeof current !== 'string' || current.length === 0 || Array.from(current).length > 256) {
		throw new AppError(422, 'current_password gönderin.', 'INVALID_CURRENT_PASSWORD');
	}

	const newPassword = validateNewPassword(body.new_password);

	if (newPassword === current) {
		throw new AppError(
			422,
			'Yeni parola mevcut paroladan farklı olmalıdır.',
			'PASSWORD_NOT_CHANGED'
		);
	}

	return {
		currentPassword: current,
		newPassword,
	};
}

module.exports = {
	validateLoginBody,
	validateRegisterBody,
	validatePasswordChangeBody,
};
