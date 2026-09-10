const AppError = require('../utils/app-error');

const { getPagination } = require('../utils/pagination');

const { assertPlainObject, parsePositiveId, parseBooleanFilter } = require('./common.validator');

const allowedQueryFields = new Set([
	'search',
	'status',
	'category_id',
	'user_id',
	'sort_by',
	'sort_order',
	'page',
	'limit',
	'include_deleted',
]);

const allowedSortFields = new Set(['id', 'title', 'created_at', 'updated_at', 'published_at']);

const allowedStatuses = new Set(['draft', 'published']);

const postFields = new Set(['title', 'content', 'excerpt', 'category_id']);

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parsePostId(value) {
	return parsePositiveId(value, {
		resourceName: 'post',
		appCode: 'INVALID_POST_ID',
	});
}

function parsePostSlug(value) {
	if (typeof value !== 'string' || value.length > 220 || !slugPattern.test(value)) {
		throw new AppError(400, 'Geçerli bir post slug değeri girin.', 'INVALID_POST_SLUG');
	}

	return value;
}

function parseOptionalFilterId(value, fieldName) {
	if (value === undefined) {
		return null;
	}

	const parsedValue = Number(value);

	if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
		throw new AppError(
			422,
			`${fieldName} pozitif bir integer olmalıdır.`,
			'INVALID_QUERY_PARAMETER',
			{
				field: fieldName,
			}
		);
	}

	return parsedValue;
}

function parsePostListQuery(query) {
	const unsupportedFields = Object.keys(query).filter((field) => !allowedQueryFields.has(field));

	if (unsupportedFields.length > 0) {
		throw new AppError(
			422,
			'Desteklenmeyen query parameter gönderildi.',
			'UNSUPPORTED_QUERY_PARAMETERS',
			{
				fields: unsupportedFields,
			}
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
			{
				field: 'search',
			}
		);
	}

	let status = null;

	if (query.status !== undefined) {
		if (typeof query.status !== 'string' || !allowedStatuses.has(query.status)) {
			throw new AppError(
				422,
				'status draft veya published olmalıdır.',
				'INVALID_QUERY_PARAMETER',
				{
					field: 'status',
				}
			);
		}

		status = query.status;
	}

	const categoryId = parseOptionalFilterId(query.category_id, 'category_id');

	const userId = parseOptionalFilterId(query.user_id, 'user_id');

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
				{
					field: 'sort_by',
				}
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
				{
					field: 'sort_order',
				}
			);
		}

		sortOrder = query.sort_order;
	}

	return {
		search,
		status,
		categoryId,
		userId,
		includeDeleted,
		sortBy,
		sortOrder,
		page,
		limit,
		offset,
	};
}

const publicQueryFields = new Set([
	'search',
	'category_id',
	'user_id',
	'sort_by',
	'sort_order',
	'page',
	'limit',
]);

const publicSortFields = new Set(['published_at', 'title', 'id']);

function parsePublicPostListQuery(query) {
	const unsupportedFields = Object.keys(query).filter((field) => !publicQueryFields.has(field));

	if (unsupportedFields.length > 0) {
		throw new AppError(
			422,
			'Desteklenmeyen query parameter gönderildi.',
			'UNSUPPORTED_QUERY_PARAMETERS',
			{
				fields: unsupportedFields,
			}
		);
	}

	if (query.sort_by !== undefined && !publicSortFields.has(query.sort_by)) {
		throw new AppError(
			422,
			'sort_by published_at, title veya id olmalıdır.',
			'INVALID_QUERY_PARAMETER',
			{
				field: 'sort_by',
			}
		);
	}

	const options = parsePostListQuery(query);

	return {
		...options,
		sortBy: query.sort_by === undefined ? 'published_at' : options.sortBy,
		status: null,
		includeDeleted: 0,
		visibility: 'published',
	};
}

function countCharacters(value) {
	return Array.from(value).length;
}

function validatePostTitle(value) {
	if (typeof value !== 'string') {
		throw new AppError(422, 'title string olmalıdır.', 'INVALID_POST_TITLE');
	}

	const title = value.trim();

	const length = countCharacters(title);

	if (length < 3 || length > 200) {
		throw new AppError(
			422,
			'title 3 ile 200 karakter arasında olmalıdır.',
			'INVALID_POST_TITLE'
		);
	}

	return title;
}

function validatePostContent(value) {
	if (typeof value !== 'string') {
		throw new AppError(422, 'content string olmalıdır.', 'INVALID_POST_CONTENT');
	}

	const content = value.trim();

	const length = countCharacters(content);

	if (length < 1 || length > 50_000) {
		throw new AppError(
			422,
			'content 1 ile 50000 karakter arasında olmalıdır.',
			'INVALID_POST_CONTENT'
		);
	}

	return content;
}

function validatePostExcerpt(value) {
	if (value === null) {
		return null;
	}

	if (typeof value !== 'string') {
		throw new AppError(422, 'excerpt string veya null olmalıdır.', 'INVALID_POST_EXCERPT');
	}

	const excerpt = value.trim();

	if (countCharacters(excerpt) > 500) {
		throw new AppError(422, 'excerpt en fazla 500 karakter olabilir.', 'INVALID_POST_EXCERPT');
	}

	return excerpt.length === 0 ? null : excerpt;
}

function validatePostCategoryId(value) {
	if (value === undefined || value === null || value === '') {
		throw new AppError(422, 'category_id gereklidir.', 'INVALID_POST_CATEGORY');
	}

	const categoryId = Number(value);

	if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
		throw new AppError(
			422,
			'category_id pozitif bir integer olmalıdır.',
			'INVALID_POST_CATEGORY'
		);
	}

	return categoryId;
}

function rejectUnsupportedFields(body) {
	const unsupportedFields = Object.keys(body).filter((field) => !postFields.has(field));

	if (unsupportedFields.length > 0) {
		throw new AppError(
			422,
			'Post için desteklenmeyen alan gönderildi.',
			'UNSUPPORTED_POST_FIELDS',
			{
				fields: unsupportedFields,
			}
		);
	}
}

function validateCreatePost(body) {
	assertPlainObject(body);

	rejectUnsupportedFields(body);

	return {
		title: validatePostTitle(body.title),

		content: validatePostContent(body.content),

		excerpt: 'excerpt' in body ? validatePostExcerpt(body.excerpt) : null,

		categoryId: validatePostCategoryId(body.category_id),
	};
}

function validateReplacePost(body) {
	assertPlainObject(body);

	rejectUnsupportedFields(body);

	const missingFields = [...postFields].filter((field) => !(field in body));

	if (missingFields.length > 0) {
		throw new AppError(
			422,
			'PUT için bütün post alanları gönderilmelidir.',
			'MISSING_POST_FIELDS',
			{
				fields: missingFields,
			}
		);
	}

	return {
		title: validatePostTitle(body.title),

		content: validatePostContent(body.content),

		excerpt: validatePostExcerpt(body.excerpt),

		categoryId: validatePostCategoryId(body.category_id),
	};
}

function validatePatchPost(body) {
	assertPlainObject(body);

	rejectUnsupportedFields(body);

	if (Object.keys(body).length === 0) {
		throw new AppError(
			422,
			'Güncellenecek en az bir post alanı gönderin.',
			'EMPTY_POST_PATCH_BODY'
		);
	}

	const data = {};

	if ('title' in body) {
		data.title = validatePostTitle(body.title);
	}

	if ('content' in body) {
		data.content = validatePostContent(body.content);
	}

	if ('excerpt' in body) {
		data.excerpt = validatePostExcerpt(body.excerpt);
	}

	if ('category_id' in body) {
		data.categoryId = validatePostCategoryId(body.category_id);
	}

	return data;
}

module.exports = {
	parsePostId,
	parsePostSlug,
	parsePostListQuery,
	parsePublicPostListQuery,
	validateCreatePost,
	validateReplacePost,
	validatePatchPost,
};
