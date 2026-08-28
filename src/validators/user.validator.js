const AppError = require('../utils/app-error');

function parsePositiveId(value) {
	const parsedValue = Number(value);

	if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
		throw new AppError(400, 'Geçerli bir kullanıcı ID değeri girin.', 'INVALID_USER_ID');
	}

	return parsedValue;
}

function normalizeName(value) {
	if (typeof value !== 'string') {
		return '';
	}

	return value.trim();
}

function normalizeEmail(value) {
	if (typeof value !== 'string') {
		return '';
	}

	return value.trim().toLowerCase();
}

module.exports = {
	parsePositiveId,
	normalizeName,
	normalizeEmail,
};
