function sendSuccess(response, { statusCode = 200, message, data, meta }) {
	const body = {
		success: true,
		request_id: response.req?.requestId || null,
	};

	if (message !== undefined) {
		body.message = message;
	}

	if (data !== undefined) {
		body.data = data;
	}

	if (meta !== undefined) {
		body.meta = meta;
	}

	return response.status(statusCode).json(body);
}

module.exports = {
	sendSuccess,
};
