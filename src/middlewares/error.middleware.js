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
		message = 'Benzersiz olması gereken bir değer zaten kullanılıyor.';
		details = null;
	}

	if (error.code === 'ER_NO_REFERENCED_ROW_2') {
		statusCode = 422;
		appCode = 'INVALID_REFERENCE';
		message = 'Bağlı kayıt bulunamadı.';
		details = null;
	}

	if (error.code === 'ER_ROW_IS_REFERENCED_2') {
		statusCode = 409;
		appCode = 'RESOURCE_IN_USE';
		message = 'Kayıt başka kayıtlar tarafından kullanılıyor.';
		details = null;
	}

	if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
		statusCode = 400;
		appCode = 'INVALID_JSON';
		message = 'Gönderilen JSON okunamadı.';
		details = null;
	}

	if (statusCode === 401 && error.wwwAuthenticate) {
		response.setHeader('WWW-Authenticate', error.wwwAuthenticate);
	}

	if (statusCode >= 500 && !error.isOperational) {
		message = 'Beklenmeyen bir hata oluştu.';
		details = null;
	}

	if (statusCode >= 500) {
		console.error({
			requestId: request.requestId || null,
			error,
		});
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
