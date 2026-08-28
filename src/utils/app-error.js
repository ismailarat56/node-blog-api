class AppError extends Error {
	constructor(statusCode, message, appCode = 'APP_ERROR', details = null) {
		super(message);

		this.name = 'AppError';
		this.statusCode = statusCode;
		this.appCode = appCode;
		this.details = details;
		this.isOperational = true;

		Error.captureStackTrace?.(this, this.constructor);
	}
}

module.exports = AppError;
