const AppError = require('../utils/app-error');

const { getPagination } = require('../utils/pagination');

const {
	assertPlainObject,
	parsePositiveId: parseCommonPositiveId,
	parseBooleanFilter,
} = require('./common.validator');

const allowedSortFields = ['id', 'name', 'email', 'created_at', 'updated_at'];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /users için sadece bu alanlara izin verilir.
const createAllowedFields = ['name', 'email', 'password'];

const patchFieldMap = {
	name: 'name',
	email: 'email',
	is_active: 'isActive',
};

// Kullanıcının sahip olabileceği roller.
const allowedRoles = new Set(['user', 'admin']);

function parsePositiveId(value) {
	return parseCommonPositiveId(value, {
		resourceName: 'kullanıcı',
		appCode: 'INVALID_USER_ID',
	});
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

function validateNewPassword(value) {
	if (typeof value !== 'string') {
		throw new AppError(422, 'password string olmalıdır.', 'INVALID_PASSWORD');
	}

	const length = Array.from(value).length;

	if (length < 8 || length > 128) {
		throw new AppError(
			422,
			'password 8 ile 128 karakter arasında olmalıdır.',
			'INVALID_PASSWORD'
		);
	}

	return value;
}

function validateCreateUser(body) {
	assertPlainObject(body);

	const receivedFields = Object.keys(body);

	const unsupportedFields = receivedFields.filter(
		(field) => !createAllowedFields.includes(field)
	);

	if (unsupportedFields.length > 0) {
		throw new AppError(422, 'Desteklenmeyen alan gönderildi.', 'UNSUPPORTED_FIELDS', {
			fields: unsupportedFields,
		});
	}

	const name = normalizeName(body.name);

	const email = normalizeEmail(body.email);

	if (!name || !email || body.password === undefined) {
		throw new AppError(
			422,
			'name, email ve password alanları zorunludur.',
			'INVALID_REQUEST_BODY'
		);
	}

	if (name.length < 2 || name.length > 100) {
		throw new AppError(422, 'name 2 ile 100 karakter arasında olmalıdır.', 'INVALID_NAME');
	}

	if (!emailPattern.test(email) || email.length > 255) {
		throw new AppError(422, 'Geçerli bir e-posta adresi girin.', 'INVALID_EMAIL');
	}

	const password = validateNewPassword(body.password);

	return {
		name,
		email,
		password,
	};
}

function parseUserListQuery(query) {
	const { page, limit, offset } = getPagination(query);

	const search = typeof query.search === 'string' ? query.search.trim() : '';

	if (search.length > 100) {
		throw new AppError(
			422,
			'search en fazla 100 karakter olabilir.',
			'INVALID_QUERY_PARAMETER'
		);
	}

	const isActive = parseBooleanFilter(query.is_active, 'is_active');

	const includeDeleted = parseBooleanFilter(query.include_deleted, 'include_deleted', {
		defaultValue: 0,
	});

	const sortBy = allowedSortFields.includes(query.sort_by) ? query.sort_by : 'id';

	const sortOrder = query.sort_order === 'asc' ? 'asc' : 'desc';

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

function validatePatchUser(body) {
	assertPlainObject(body);

	const receivedFields = Object.keys(body);

	if (receivedFields.length === 0) {
		throw new AppError(422, 'Güncellenecek en az bir alan gönderin.', 'EMPTY_PATCH_BODY');
	}

	const unsupportedFields = receivedFields.filter(
		(field) => !Object.prototype.hasOwnProperty.call(patchFieldMap, field)
	);

	if (unsupportedFields.length > 0) {
		throw new AppError(422, 'Desteklenmeyen alan gönderildi.', 'UNSUPPORTED_FIELDS', {
			fields: unsupportedFields,
		});
	}

	const data = {};

	if ('name' in body) {
		const name = normalizeName(body.name);

		if (name.length < 2 || name.length > 100) {
			throw new AppError(422, 'name 2 ile 100 karakter arasında olmalıdır.', 'INVALID_NAME');
		}

		data.name = name;
	}

	if ('email' in body) {
		const email = normalizeEmail(body.email);

		if (!emailPattern.test(email) || email.length > 255) {
			throw new AppError(422, 'Geçerli bir e-posta adresi girin.', 'INVALID_EMAIL');
		}

		data.email = email;
	}

	if ('is_active' in body) {
		data.isActive = parseBooleanFilter(body.is_active, 'is_active');
	}

	return data;
}

function validateRoleBody(body) {
	assertPlainObject(body);

	const unsupportedFields = Object.keys(body).filter((field) => field !== 'role');

	if (unsupportedFields.length > 0) {
		throw new AppError(
			422,
			'Role güncellemesi yalnızca role alanını kabul eder.',
			'UNSUPPORTED_ROLE_FIELDS',
			{
				fields: unsupportedFields,
			}
		);
	}

	if (typeof body.role !== 'string' || !allowedRoles.has(body.role)) {
		throw new AppError(422, 'role yalnızca user veya admin olabilir.', 'INVALID_USER_ROLE');
	}

	return {
		role: body.role,
	};
}

module.exports = {
	parsePositiveId,
	normalizeName,
	normalizeEmail,
	validateNewPassword,
	validateCreateUser,
	parseUserListQuery,
	validatePatchUser,
	validateRoleBody,
};
