const CODE_TTL_SECONDS = 600;
const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 60;

function readCodeKey() {
	const raw = (process.env.VERIFICATION_CODE_KEY ?? '').trim();

	if (!/^[0-9a-f]{64}$/i.test(raw)) {
		throw new Error('VERIFICATION_CODE_KEY 64 karakterlik hex olmalidir.');
	}

	return Buffer.from(raw, 'hex');
}

let cached = null;

function getVerificationConfig() {
	if (cached) {
		return cached;
	}

	cached = Object.freeze({
		codeKey: readCodeKey(),
		ttlSeconds: CODE_TTL_SECONDS,
		maxAttempts: MAX_ATTEMPTS,
		cooldownSeconds: COOLDOWN_SECONDS,
	});

	return cached;
}

module.exports = {
	getVerificationConfig,
};
