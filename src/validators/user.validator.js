const AppError = require('../utils/app-error');

const { getPagination } = require('../utils/pagination');

const allowedSortFields = ['id', 'name', 'email', 'created_at', 'updated_at'];

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

function parseBooleanFilter(value, fieldName) {
	if (value === undefined) {
		return null;
	}

	const normalized = String(value).trim().toLowerCase();

	if (normalized === '1' || normalized === 'true') {
		return 1;
	}

	if (normalized === '0' || normalized === 'false') {
		return 0;
	}

	throw new AppError(422, `${fieldName} yalnızca 0, 1, true veya false olabilir.`, 'INVALID_QUERY_PARAMETER', {
		field: fieldName,
	});
}

function parseUserListQuery(query) {
	const { page, limit, offset } = getPagination(query);

	const search = typeof query.search === 'string' ? query.search.trim() : '';

	if (search.length > 100) {
		throw new AppError(422, 'search en fazla 100 karakter olabilir.', 'INVALID_QUERY_PARAMETER');
	}

	return {
		search,
		isActive: parseBooleanFilter(query.is_active, 'is_active'),
		sortBy: allowedSortFields.includes(query.sort_by) ? query.sort_by : 'id',
		sortOrder: query.sort_order === 'asc' ? 'asc' : 'desc',
		page,
		limit,
		offset,
	};
}

module.exports = {
	parseUserListQuery,
	parsePositiveId,
	normalizeName,
	normalizeEmail,
};
