function errorHandler(error, request, response, next) {
	if (response.headersSent) {
		return next(error);
	}

	let statusCode = error.statusCode || 500;

	let appCode = error.appCode || 'INTERNAL_SERVER_ERROR';

	let message = error.message || 'Beklenmeyen bir hata oluştu.';

	let details = error.details || null;

	if (error.code === 'ER_DUP_ENTRY') {
		statusCode = 409;
		appCode = 'DUPLICATE_VALUE';
		message = 'Bu e-posta adresi zaten kullanılıyor.';
	}

	if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
		statusCode = 400;
		appCode = 'INVALID_JSON';
		message = 'Gönderilen JSON okunamadı.';
	}

	if (statusCode >= 500) {
		console.error(error);

		message = 'Beklenmeyen bir hata oluştu.';
		details = null;
	}

	return response.status(statusCode).json({
		success: false,
		error: {
			code: appCode,
			message,
			details,
		},
		request_id: request.requestId || null,
	});
}

module.exports = errorHandler;
