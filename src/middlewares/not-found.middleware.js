const AppError = require('../utils/app-error');

function notFoundHandler(request, response, next) {
	return next(new AppError(404, 'Endpoint bulunamadı.', 'ROUTE_NOT_FOUND'));
}

module.exports = notFoundHandler;
