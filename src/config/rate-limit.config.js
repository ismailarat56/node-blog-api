function readEnabledFlag() {
	const raw = (process.env.RATE_LIMIT_ENABLED ?? 'true').trim().toLowerCase();

	if (raw !== 'true' && raw !== 'false') {
		throw new Error('RATE_LIMIT_ENABLED true veya false olmalidir.');
	}

	return raw === 'true';
}

let cached = null;

function getRateLimitConfig() {
	if (cached) {
		return cached;
	}

	const enabled = readEnabledFlag();

	if (!enabled && process.env.NODE_ENV === 'production') {
		throw new Error('RATE_LIMIT_ENABLED=false production ortaminda kullanilamaz.');
	}

	cached = Object.freeze({
		enabled,
	});

	return cached;
}

module.exports = {
	getRateLimitConfig,
};
