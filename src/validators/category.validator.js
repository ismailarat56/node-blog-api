const AppError = require('../utils/app-error');

const { getPagination } = require('../utils/pagination');

const { assertPlainObject, parsePositiveId, parseBooleanFilter } = require('./common.validator');

const allowedQueryFields = new Set([
	'search',
	'is_active',
	'sort_by',
	'sort_order',
	'page',
	'limit',
	'include_deleted',
]);

const allowedSortFields = new Set(['id', 'name', 'slug', 'created_at', 'updated_at']);

const categoryFields = new Set(['name', 'slug', 'description', 'is_active']);

function parseCategoryId(value) {
	return parsePositiveId(value, {
		resourceName: 'category',
		appCode: 'INVALID_CATEGORY_ID',
	});
}

function parseCategoryListQuery(query) {
	const unsupportedFields = Object.keys(query).filter((field) => !allowedQueryFields.has(field));

	if (unsupportedFields.length > 0) {
		throw new AppError(
			422,
			'Desteklenmeyen query parameter gönderildi.',
			'UNSUPPORTED_QUERY_PARAMETERS',
			{ fields: unsupportedFields }
		);
	}

	const { page, limit, offset } = getPagination(query);

	if (query.search !== undefined && typeof query.search !== 'string') {
		throw new AppError(422, 'search string olmalıdır.', 'INVALID_QUERY_PARAMETER', {
			field: 'search',
		});
	}

	const search = typeof query.search === 'string' ? query.search.trim() : '';

	if (search.length > 100) {
		throw new AppError(
			422,
			'search en fazla 100 karakter olabilir.',
			'INVALID_QUERY_PARAMETER',
			{ field: 'search' }
		);
	}

	const isActive = parseBooleanFilter(query.is_active, 'is_active');

	const includeDeleted = parseBooleanFilter(query.include_deleted, 'include_deleted', {
		defaultValue: 0,
	});

	let sortBy = 'id';

	if (query.sort_by !== undefined) {
		if (typeof query.sort_by !== 'string' || !allowedSortFields.has(query.sort_by)) {
			throw new AppError(
				422,
				'sort_by desteklenen bir alan olmalıdır.',
				'INVALID_QUERY_PARAMETER',
				{ field: 'sort_by' }
			);
		}

		sortBy = query.sort_by;
	}

	let sortOrder = 'desc';

	if (query.sort_order !== undefined) {
		if (query.sort_order !== 'asc' && query.sort_order !== 'desc') {
			throw new AppError(
				422,
				'sort_order asc veya desc olmalıdır.',
				'INVALID_QUERY_PARAMETER',
				{ field: 'sort_order' }
			);
		}

		sortOrder = query.sort_order;
	}

	return {
		search,
		isActive,
		includeDeleted,
		sortBy,
		sortOrder,
		page,
		limit,
		offset,
	};
}

function validateCategoryName(value) {
	if (typeof value !== 'string') {
		throw new AppError(422, 'name string olmalıdır.', 'INVALID_CATEGORY_NAME');
	}

	const name = value.trim();

	if (name.length < 2 || name.length > 100) {
		throw new AppError(
			422,
			'name 2 ile 100 karakter arasında olmalıdır.',
			'INVALID_CATEGORY_NAME'
		);
	}

	return name;
}

function validateCategorySlug(value) {
	if (typeof value !== 'string') {
		throw new AppError(422, 'slug string olmalıdır.', 'INVALID_CATEGORY_SLUG');
	}

	const slug = value.trim().toLowerCase();

	if (slug.length < 2 || slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
		throw new AppError(
			422,
			'slug küçük harf, sayı ve tek tire gruplarından oluşmalıdır.',
			'INVALID_CATEGORY_SLUG'
		);
	}

	return slug;
}

function validateCategoryDescription(value) {
	if (value === null) {
		return null;
	}

	if (typeof value !== 'string') {
		throw new AppError(
			422,
			'description string veya null olmalıdır.',
			'INVALID_CATEGORY_DESCRIPTION'
		);
	}

	const description = value.trim();

	if (description.length > 2000) {
		throw new AppError(
			422,
			'description en fazla 2000 karakter olabilir.',
			'INVALID_CATEGORY_DESCRIPTION'
		);
	}

	return description.length === 0 ? null : description;
}

function validateCategoryActive(value) {
	if (value === null || value === undefined || value === '') {
		throw new AppError(
			422,
			'is_active geçerli bir Boolean değer olmalıdır.',
			'INVALID_CATEGORY_ACTIVE'
		);
	}

	return parseBooleanFilter(value, 'is_active', {
		appCode: 'INVALID_CATEGORY_ACTIVE',
	});
}

function findUnsupportedFields(body) {
	return Object.keys(body).filter((field) => !categoryFields.has(field));
}

function rejectUnsupportedFields(body) {
	const unsupportedFields = findUnsupportedFields(body);

	if (unsupportedFields.length > 0) {
		throw new AppError(
			422,
			'Category için desteklenmeyen alan gönderildi.',
			'UNSUPPORTED_CATEGORY_FIELDS',
			{ fields: unsupportedFields }
		);
	}
}

function validateCreateCategory(body) {
	assertPlainObject(body);
	rejectUnsupportedFields(body);

	return {
		name: validateCategoryName(body.name),
		slug: validateCategorySlug(body.slug),
		description:
			body.description === undefined ? null : validateCategoryDescription(body.description),
		isActive: body.is_active === undefined ? 1 : validateCategoryActive(body.is_active),
	};
}

function validateReplaceCategory(body) {
	assertPlainObject(body);
	rejectUnsupportedFields(body);

	const requiredFields = ['name', 'slug', 'description', 'is_active'];

	const missingFields = requiredFields.filter(
		(field) => !Object.prototype.hasOwnProperty.call(body, field)
	);

	if (missingFields.length > 0) {
		throw new AppError(
			422,
			'PUT için bütün category alanlarını gönderin.',
			'MISSING_CATEGORY_FIELDS',
			{ fields: missingFields }
		);
	}

	return {
		name: validateCategoryName(body.name),
		slug: validateCategorySlug(body.slug),
		description: validateCategoryDescription(body.description),
		isActive: validateCategoryActive(body.is_active),
	};
}

function validatePatchCategory(body) {
	assertPlainObject(body);
	rejectUnsupportedFields(body);

	if (Object.keys(body).length === 0) {
		throw new AppError(
			422,
			'Güncellenecek en az bir category alanı gönderin.',
			'EMPTY_CATEGORY_PATCH_BODY'
		);
	}

	const data = {};

	if ('name' in body) {
		data.name = validateCategoryName(body.name);
	}

	if ('slug' in body) {
		data.slug = validateCategorySlug(body.slug);
	}

	if ('description' in body) {
		data.description = validateCategoryDescription(body.description);
	}

	if ('is_active' in body) {
		data.isActive = validateCategoryActive(body.is_active);
	}

	return data;
}

module.exports = {
	parseCategoryId,
	parseCategoryListQuery,
	validateCreateCategory,
	validateReplaceCategory,
	validatePatchCategory,
};
