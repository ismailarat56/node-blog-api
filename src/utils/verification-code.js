const crypto = require('node:crypto');
const { getVerificationConfig } = require('../config/verification.config');

const CODE_PATTERN = /^[0-9]{6}$/;

function generateVerificationCode() {
	return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

function hashVerificationCode({ userId, purpose, code }) {
	return crypto
		.createHmac('sha256', getVerificationConfig().codeKey)
		.update(`${purpose}:${userId}:${code}`)
		.digest('hex');
}

function verificationCodeMatches({ userId, purpose, code, codeHash }) {
	const expected = Buffer.from(codeHash, 'hex');
	const actual = Buffer.from(
		hashVerificationCode({
			userId,
			purpose,
			code,
		}),
		'hex'
	);

	return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

module.exports = {
	CODE_PATTERN,
	generateVerificationCode,
	hashVerificationCode,
	verificationCodeMatches,
};
