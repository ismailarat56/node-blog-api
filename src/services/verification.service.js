const AppError = require('../utils/app-error');
const verificationCodeModel = require('../models/verification-code.model');
const { getVerificationConfig } = require('../config/verification.config');
const {
	generateVerificationCode,
	hashVerificationCode,
	verificationCodeMatches,
} = require('../utils/verification-code');
const { queueMail } = require('../utils/mailer');
const { buildVerificationCodeMail } = require('../utils/mail-templates');

function throwInvalidVerificationCode() {
	throw new AppError(
		422,
		'Doğrulama kodu hatalı veya süresi dolmuş.',
		'INVALID_VERIFICATION_CODE'
	);
}

async function issueVerificationCode({ userId, purpose, targetEmail = null }) {
	const config = getVerificationConfig();

	const ageSeconds = await verificationCodeModel.findPendingCodeAge({
		userId,
		purpose,
	});

	if (ageSeconds !== null && ageSeconds < config.cooldownSeconds) {
		return {
			issued: false,
			retryAfterSeconds: config.cooldownSeconds - ageSeconds,
		};
	}

	const code = generateVerificationCode();

	await verificationCodeModel.invalidatePendingCodes({
		userId,
		purpose,
	});

	await verificationCodeModel.createCode({
		userId,
		purpose,
		codeHash: hashVerificationCode({
			userId,
			purpose,
			code,
		}),
		targetEmail,
		ttlSeconds: config.ttlSeconds,
	});

	return {
		issued: true,
		code,
		ttlMinutes: Math.round(config.ttlSeconds / 60),
	};
}

async function consumeVerificationCode({ userId, purpose, code }) {
	const config = getVerificationConfig();

	const liveCode = await verificationCodeModel.findLatestLiveCode({
		userId,
		purpose,
	});

	if (!liveCode) {
		throwInvalidVerificationCode();
	}

	const reserved = await verificationCodeModel.reserveAttempt({
		id: liveCode.id,
		maxAttempts: config.maxAttempts,
	});

	if (reserved === 0) {
		throwInvalidVerificationCode();
	}

	const matches = verificationCodeMatches({
		userId,
		purpose,
		code,
		codeHash: liveCode.code_hash,
	});

	if (!matches) {
		throwInvalidVerificationCode();
	}

	const consumed = await verificationCodeModel.consumeCode(liveCode.id);

	if (consumed === 0) {
		throwInvalidVerificationCode();
	}

	return {
		targetEmail: liveCode.target_email,
	};
}

function queueVerificationCodeMail({ recipient, purpose, issued, requestId }) {
	if (!issued.issued) {
		return;
	}

	queueMail(
		buildVerificationCodeMail(recipient, {
			purpose,
			code: issued.code,
			ttlMinutes: issued.ttlMinutes,
		}),
		{
			event: `code:${purpose}`,
			userId: recipient.id,
			requestId,
		}
	);
}

module.exports = {
	throwInvalidVerificationCode,
	issueVerificationCode,
	consumeVerificationCode,
	queueVerificationCodeMail,
};
