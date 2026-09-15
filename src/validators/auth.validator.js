const AppError = require('../utils/app-error');

const { assertPlainObject } = require('./common.validator');

const { validateCreateUser, validateEmail, validateNewPassword } = require('./user.validator');

const { CODE_PATTERN } = require('../utils/verification-code');

const loginFields = new Set(['email', 'password']);

const registerFields = new Set(['name', 'email', 'password']);

const passwordChangeFields = new Set(['current_password', 'new_password', 'code']);

function assertAllowedFields(body, allowedFields, appCode) {
	const unsupportedFields = Object.keys(body).filter((field) => !allowedFields.includes(field));

	if (unsupportedFields.length > 0) {
		throw new AppError(
			422,
			`Bu istek yalnızca ${allowedFields.join(', ')} alanlarını kabul eder.`,
			appCode,
			{
				fields: unsupportedFields,
			}
		);
	}
}

function parseVerificationCode(value) {
	if (typeof value !== 'string' || !CODE_PATTERN.test(value)) {
		throw new AppError(
			422,
			'code 6 haneli bir string olmalıdır.',
			'INVALID_VERIFICATION_CODE_FORMAT'
		);
	}

	return value;
}

function parseCurrentPassword(value) {
	if (typeof value !== 'string' || value.length === 0 || Array.from(value).length > 256) {
		throw new AppError(422, 'current_password gönderin.', 'INVALID_CURRENT_PASSWORD');
	}

	return value;
}

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
			'Parola değişikliği yalnızca current_password, new_password ve code alanlarını kabul eder.',
			'UNSUPPORTED_PASSWORD_CHANGE_FIELDS',
			{
				fields: unsupportedFields,
			}
		);
	}

	const current = parseCurrentPassword(body.current_password);

	const newPassword = validateNewPassword(body.new_password);

	if (newPassword === current) {
		throw new AppError(
			422,
			'Yeni parola mevcut paroladan farklı olmalıdır.',
			'PASSWORD_NOT_CHANGED'
		);
	}

	const code = parseVerificationCode(body.code);

	return {
		currentPassword: current,
		newPassword,
		code,
	};
}

function validateEmailOnlyBody(body) {
	assertPlainObject(body);

	assertAllowedFields(body, ['email'], 'UNSUPPORTED_EMAIL_REQUEST_FIELDS');

	return {
		email: validateEmail(body.email),
	};
}

function validateEmailVerifyBody(body) {
	assertPlainObject(body);

	assertAllowedFields(body, ['email', 'code'], 'UNSUPPORTED_EMAIL_VERIFY_FIELDS');

	return {
		email: validateEmail(body.email),
		code: parseVerificationCode(body.code),
	};
}

function validatePasswordResetBody(body) {
	assertPlainObject(body);

	assertAllowedFields(
		body,
		['email', 'code', 'new_password'],
		'UNSUPPORTED_PASSWORD_RESET_FIELDS'
	);

	return {
		email: validateEmail(body.email),
		code: parseVerificationCode(body.code),
		newPassword: validateNewPassword(body.new_password),
	};
}

function validateEmailChangeBody(body) {
	assertPlainObject(body);

	assertAllowedFields(body, ['new_email', 'current_password'], 'UNSUPPORTED_EMAIL_CHANGE_FIELDS');

	return {
		newEmail: validateEmail(body.new_email),
		currentPassword: parseCurrentPassword(body.current_password),
	};
}

function validateEmailChangeConfirmBody(body) {
	assertPlainObject(body);

	assertAllowedFields(body, ['code'], 'UNSUPPORTED_EMAIL_CHANGE_CONFIRM_FIELDS');

	return {
		code: parseVerificationCode(body.code),
	};
}

module.exports = {
	validateLoginBody,
	validateRegisterBody,
	validatePasswordChangeBody,
	validateEmailOnlyBody,
	validateEmailVerifyBody,
	validatePasswordResetBody,
	validateEmailChangeBody,
	validateEmailChangeConfirmBody,
};
