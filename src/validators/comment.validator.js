const AppError = require('../utils/app-error');

const { getPagination } = require('../utils/pagination');

const { assertPlainObject, parsePositiveId, parseBooleanFilter } = require('./common.validator');

const allowedQueryFields = new Set(['page', 'limit', 'include_hidden']);

const createFields = new Set(['body', 'parent_id']);

const patchFields = new Set(['body']);

function parseCommentId(value) {
	return parsePositiveId(value, {
		resourceName: 'comment',
		appCode: 'INVALID_COMMENT_ID',
	});
}

function parseCommentListQuery(query) {
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

	const includeHidden = parseBooleanFilter(query.include_hidden, 'include_hidden', {
		defaultValue: 0,
	});

	return {
		page,
		limit,
		offset,
		includeHidden,
	};
}

function countCharacters(value) {
	return Array.from(value).length;
}

function validateCommentText(value) {
	if (typeof value !== 'string') {
		throw new AppError(422, 'body string olmalıdır.', 'INVALID_COMMENT_BODY');
	}

	const text = value.trim();
	const length = countCharacters(text);

	if (length < 1 || length > 2000) {
		throw new AppError(
			422,
			'body 1 ile 2000 karakter arasında olmalıdır.',
			'INVALID_COMMENT_BODY'
		);
	}

	return text;
}

function validateParentId(value) {
	if (value === undefined || value === null) {
		return null;
	}

	const parentId = Number(value);

	if (!Number.isSafeInteger(parentId) || parentId <= 0) {
		throw new AppError(
			422,
			'parent_id pozitif bir integer veya null olmalıdır.',
			'INVALID_COMMENT_PARENT',
			{
				field: 'parent_id',
			}
		);
	}

	return parentId;
}

function rejectUnsupportedFields(payload, allowedFields) {
	const unsupportedFields = Object.keys(payload).filter((field) => !allowedFields.has(field));

	if (unsupportedFields.length > 0) {
		throw new AppError(
			422,
			'Yorum için desteklenmeyen alan gönderildi.',
			'UNSUPPORTED_COMMENT_FIELDS',
			{
				fields: unsupportedFields,
			}
		);
	}
}

function validateCreateComment(payload) {
	assertPlainObject(payload);
	rejectUnsupportedFields(payload, createFields);

	return {
		body: validateCommentText(payload.body),
		parentId: validateParentId(payload.parent_id),
	};
}

function validatePatchComment(payload) {
	assertPlainObject(payload);
	rejectUnsupportedFields(payload, patchFields);

	if (!('body' in payload)) {
		throw new AppError(422, 'Güncellenecek body alanını gönderin.', 'EMPTY_COMMENT_PATCH_BODY');
	}

	return {
		body: validateCommentText(payload.body),
	};
}

module.exports = {
	parseCommentId,
	parseCommentListQuery,
	validateCreateComment,
	validatePatchComment,
};
