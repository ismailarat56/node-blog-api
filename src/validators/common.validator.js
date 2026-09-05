const AppError = require('../utils/app-error');

function assertPlainObject(
	value,
	{ appCode = 'INVALID_REQUEST_BODY', message = 'Geçerli bir JSON object gönderin.' } = {}
) {
	if (!value || Array.isArray(value) || typeof value !== 'object') {
		throw new AppError(422, message, appCode);
	}

	return value;
}

function parsePositiveId(value, { resourceName = 'Kaynak', appCode = 'INVALID_RESOURCE_ID' } = {}) {
	const parsedValue = Number(value);

	if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
		throw new AppError(400, `Geçerli bir ${resourceName} ID değeri girin.`, appCode);
	}

	return parsedValue;
}

function parseBooleanFilter(
	value,
	fieldName,
	{ defaultValue = null, appCode = 'INVALID_QUERY_PARAMETER' } = {}
) {
	if (value === undefined) {
		return defaultValue;
	}

	if (value === true || value === 1) {
		return 1;
	}

	if (value === false || value === 0) {
		return 0;
	}

	const normalized = String(value).trim().toLowerCase();

	if (normalized === '1' || normalized === 'true') {
		return 1;
	}

	if (normalized === '0' || normalized === 'false') {
		return 0;
	}

	throw new AppError(422, `${fieldName} yalnızca 0, 1, true veya false olabilir.`, appCode, {
		field: fieldName,
	});
}

module.exports = {
	assertPlainObject,
	parsePositiveId,
	parseBooleanFilter,
};
