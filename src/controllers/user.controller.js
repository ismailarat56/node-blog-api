const userModel = require('../models/user.model');

const AppError = require('../utils/app-error');

const { sendSuccess } = require('../utils/response');

const { hashPassword } = require('../utils/password');

const {
	parseUserListQuery,
	parsePositiveId,
	validatePatchUser,
	validateCreateUser,
	normalizeName,
	normalizeEmail,
} = require('../validators/user.validator');

async function index(request, response) {
	const options = parseUserListQuery(request.query);

	const [users, total] = await Promise.all([
		userModel.findAllUsers(options),
		userModel.countUsers(options),
	]);

	const totalPages = total === 0 ? 0 : Math.ceil(total / options.limit);

	return sendSuccess(response, {
		data: users,
		meta: {
			page: options.page,
			limit: options.limit,
			total,
			total_pages: totalPages,
			has_next_page: options.page < totalPages,
			has_previous_page: options.page > 1,
		},
	});
}

async function show(request, response) {
	const id = parsePositiveId(request.params.id);

	const user = await userModel.findUserById(id);

	if (!user) {
		throw new AppError(404, 'Kullanıcı bulunamadı.', 'USER_NOT_FOUND');
	}

	return sendSuccess(response, {
		data: user,
	});
}

async function store(request, response) {
	const data = validateCreateUser(request.body);

	const existingUser = await userModel.findUserByEmail(data.email);

	if (existingUser) {
		throw new AppError(409, 'Bu e-posta adresi zaten kullanılıyor.', 'EMAIL_ALREADY_EXISTS');
	}

	const passwordHash = await hashPassword(data.password);

	const userId = await userModel.createUser({
		name: data.name,
		email: data.email,
		passwordHash,
	});

	const createdUser = await userModel.findUserById(userId);

	return sendSuccess(response, {
		statusCode: 201,
		message: 'Kullanıcı oluşturuldu.',
		data: createdUser,
	});
}

async function replace(request, response) {
	const id = parsePositiveId(request.params.id);

	const existingUser = await userModel.findUserById(id);

	if (!existingUser) {
		throw new AppError(404, 'Kullanıcı bulunamadı.', 'USER_NOT_FOUND');
	}

	const body = request.body || {};

	const name = normalizeName(body.name);

	const email = normalizeEmail(body.email);

	if (!name || !email) {
		throw new AppError(422, 'name ve email alanları zorunludur.', 'INVALID_REQUEST_BODY');
	}

	const emailOwner = await userModel.findUserByEmail(email, id);

	if (emailOwner) {
		throw new AppError(
			409,
			'Bu e-posta başka bir kullanıcı tarafından kullanılıyor.',
			'EMAIL_ALREADY_EXISTS'
		);
	}

	const updatedUser = await userModel.replaceUser(id, {
		name,
		email,
	});

	return sendSuccess(response, {
		message: 'Kullanıcı güncellendi.',
		data: updatedUser,
	});
}

async function update(request, response) {
	const id = parsePositiveId(request.params.id);

	const existingUser = await userModel.findUserById(id);

	if (!existingUser) {
		throw new AppError(404, 'Kullanıcı bulunamadı.', 'USER_NOT_FOUND');
	}

	const data = validatePatchUser(request.body);

	if (data.email) {
		const emailOwner = await userModel.findUserByEmail(data.email, id);

		if (emailOwner) {
			throw new AppError(
				409,
				'Bu e-posta başka bir kullanıcı tarafından kullanılıyor.',
				'EMAIL_ALREADY_EXISTS'
			);
		}
	}

	await userModel.updateUserFields(id, data);

	const updatedUser = await userModel.findUserById(id);

	return sendSuccess(response, {
		message: 'Kullanıcı güncellendi.',
		data: updatedUser,
	});
}

async function destroy(request, response) {
	const id = parsePositiveId(request.params.id);

	await userModel.softDeleteUserWithAudit(id, request.requestId);

	return sendSuccess(response, {
		message: 'Kullanıcı silindi.',
		data: {
			id,
		},
	});
}

async function restore(request, response) {
	const id = parsePositiveId(request.params.id);

	const deletedUser = await userModel.findUserById(id, {
		includeDeleted: true,
	});

	if (!deletedUser || deletedUser.deleted_at === null) {
		throw new AppError(
			404,
			'Geri getirilecek silinmiş kullanıcı bulunamadı.',
			'DELETED_USER_NOT_FOUND'
		);
	}

	await userModel.restoreUser(id);

	const restoredUser = await userModel.findUserById(id);

	return sendSuccess(response, {
		message: 'Kullanıcı geri getirildi.',
		data: restoredUser,
	});
}

module.exports = {
	index,
	show,
	store,
	replace,
	update,
	destroy,
	restore,
};
