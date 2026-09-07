const AppError = require('../utils/app-error');

const knownRoles = new Set(['user', 'admin']);

function requireRole(...allowedRoles) {
	if (allowedRoles.length === 0 || allowedRoles.some((role) => !knownRoles.has(role))) {
		throw new Error('requireRole yalnızca tanımlı rollerle çağrılmalıdır.');
	}

	const allowed = new Set(allowedRoles);

	return function authorize(request, response, next) {
		if (!request.user || typeof request.user.role !== 'string') {
			return next(
				new AppError(401, 'Bu endpoint için giriş yapmalısınız.', 'AUTHENTICATION_REQUIRED')
			);
		}

		if (!allowed.has(request.user.role)) {
			return next(
				new AppError(403, 'Bu işlem için yetkiniz yok.', 'FORBIDDEN', {
					required_roles: [...allowed],
				})
			);
		}

		return next();
	};
}

function isAdmin(user) {
	return Boolean(user) && user.role === 'admin';
}

module.exports = {
	requireRole,
	isAdmin,
};
