const userModel = require('../models/user.model');

const AppError = require('../utils/app-error');

const { sendSuccess } = require('../utils/response');

const {
	parseUserListQuery,
	parsePositiveId,
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
	const body = request.body || {};

	const name = normalizeName(body.name);

	const email = normalizeEmail(body.email);

	if (!name || !email) {
		throw new AppError(422, 'name ve email alanları zorunludur.', 'INVALID_REQUEST_BODY');
	}

	const emailOwner = await userModel.findUserByEmail(email);

	if (emailOwner) {
		throw new AppError(409, 'Bu e-posta zaten kullanılıyor.', 'EMAIL_ALREADY_EXISTS');
	}

	const createdUser = await userModel.createUser({
		name,
		email,
	});

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

async function destroy(request, response) {
	const id = parsePositiveId(request.params.id);

	const existingUser = await userModel.findUserById(id);

	if (!existingUser) {
		throw new AppError(404, 'Kullanıcı bulunamadı.', 'USER_NOT_FOUND');
	}

	await userModel.deleteUser(id);

	return sendSuccess(response, {
		message: 'Kullanıcı silindi.',
		data: {
			id,
		},
	});
}

module.exports = {
	index,
	show,
	store,
	replace,
	destroy,
};
