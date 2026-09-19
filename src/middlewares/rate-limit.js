const AppError = require('../utils/app-error');
const { createSlidingWindowLimiter } = require('../utils/sliding-window-limiter');
const { getRateLimitConfig } = require('../config/rate-limit.config');

function clientIp(request) {
	const raw = request.ip ?? '';

	return raw.startsWith('::ffff:') ? raw.slice(7) : raw;
}

function bodyEmail(request) {
	const value = request.body?.email;

	return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

const keyBy = Object.freeze({
	ip: (request) => `ip:${clientIp(request)}`,
	ipAndEmail: (request) => `ip:${clientIp(request)}` + `|email:${bodyEmail(request)}`,
	email: (request) => `email:${bodyEmail(request)}`,
	user: (request) => `user:${request.user.id}`,
});

function rateLimit({ name, limit, windowSeconds, key }) {
	const limiter = createSlidingWindowLimiter({
		limit,
		windowSeconds,
	});

	return function rateLimitMiddleware(request, response, next) {
		if (!getRateLimitConfig().enabled) {
			return next();
		}

		const result = limiter.consume(key(request));

		if (result.allowed) {
			return next();
		}

		response.setHeader('Retry-After', String(result.retryAfterSeconds));

		throw new AppError(
			429,
			'Çok fazla istek gönderildi. Biraz bekleyip tekrar dene.',
			'RATE_LIMITED',
			{
				limit_name: name,
				retry_after_seconds: result.retryAfterSeconds,
			}
		);
	};
}

module.exports = {
	rateLimit,
	keyBy,
};
