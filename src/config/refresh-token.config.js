const DEFAULT_TTL_SECONDS = 604_800;

function readTtlSeconds() {
	const value = Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? String(DEFAULT_TTL_SECONDS));

	if (!Number.isInteger(value) || value < 3_600 || value > 2_592_000) {
		throw new Error('REFRESH_TOKEN_TTL_SECONDS 3600 ile 2592000 arasinda integer olmalidir.');
	}

	return value;
}

function readCookieSecure() {
	const raw = (process.env.REFRESH_COOKIE_SECURE ?? 'true').trim().toLowerCase();

	if (raw !== 'true' && raw !== 'false') {
		throw new Error('REFRESH_COOKIE_SECURE true veya false olmalidir.');
	}

	return raw === 'true';
}

let cached = null;

function getRefreshTokenConfig() {
	if (cached) {
		return cached;
	}

	const cookieSecure = readCookieSecure();

	if (!cookieSecure && process.env.NODE_ENV === 'production') {
		throw new Error('REFRESH_COOKIE_SECURE=false production ortaminda kullanilamaz.');
	}

	cached = Object.freeze({
		ttlSeconds: readTtlSeconds(),
		cookieSecure,
	});

	return cached;
}

module.exports = {
	getRefreshTokenConfig,
};
