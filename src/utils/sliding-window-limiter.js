function createSlidingWindowLimiter({ limit, windowSeconds }) {
	const windowMs = windowSeconds * 1000;
	const hits = new Map();

	function prune(timestamps, now) {
		while (timestamps.length > 0 && timestamps[0] <= now - windowMs) {
			timestamps.shift();
		}
	}

	function consume(key, now = Date.now()) {
		const timestamps = hits.get(key) ?? [];

		prune(timestamps, now);

		if (timestamps.length >= limit) {
			hits.set(key, timestamps);

			const retryAfterMs = timestamps[0] + windowMs - now;

			return {
				allowed: false,
				retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
			};
		}

		timestamps.push(now);
		hits.set(key, timestamps);

		return {
			allowed: true,
			retryAfterSeconds: 0,
		};
	}

	function sweep(now = Date.now()) {
		for (const [key, timestamps] of hits) {
			prune(timestamps, now);

			if (timestamps.length === 0) {
				hits.delete(key);
			}
		}
	}

	const timer = setInterval(sweep, 60 * 1000);

	timer.unref();

	return {
		consume,
		sweep,
		size: () => hits.size,
	};
}

module.exports = {
	createSlidingWindowLimiter,
};
