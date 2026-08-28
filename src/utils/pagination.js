const AppError = require('./app-error');

function parseIntegerOption(value, { fieldName, defaultValue, min, max }) {
	if (value === undefined || value === '') {
		return defaultValue;
	}

	const parsedValue = Number(value);

	if (!Number.isInteger(parsedValue) || parsedValue < min || parsedValue > max) {
		throw new AppError(
			422,
			`${fieldName} geçerli aralıkta olmalıdır.`,
			'INVALID_QUERY_PARAMETER',
			{
				field: fieldName,
				min,
				max,
			}
		);
	}

	return parsedValue;
}

function getPagination(query) {
	const page = parseIntegerOption(query.page, {
		fieldName: 'page',
		defaultValue: 1,
		min: 1,
		max: 1_000_000,
	});

	const limit = parseIntegerOption(query.limit, {
		fieldName: 'limit',
		defaultValue: 10,
		min: 1,
		max: 50,
	});

	const offset = (page - 1) * limit;

	return {
		page,
		limit,
		offset,
	};
}

module.exports = {
	getPagination,
};
