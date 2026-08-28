const { randomUUID } = require('node:crypto');

function requestLogger(request, response, next) {
	const startedAt = process.hrtime.bigint();

	const requestId = request.get('X-Request-Id') || randomUUID();

	request.requestId = requestId;

	response.setHeader('X-Request-Id', requestId);

	response.on('finish', () => {
		const finishedAt = process.hrtime.bigint();

		const durationMs = Number(finishedAt - startedAt) / 1_000_000;

		console.log({
			requestId,
			method: request.method,
			path: request.originalUrl,
			statusCode: response.statusCode,
			durationMs: Number(durationMs.toFixed(2)),
		});
	});

	next();
}

module.exports = requestLogger;
