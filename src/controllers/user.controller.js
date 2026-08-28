const userModel = require('../models/user.model');

const AppError = require('../utils/app-error');

const { sendSuccess } = require('../utils/response');

const {
	parsePositiveId,
	normalizeName,
	normalizeEmail,
} = require('../validators/user.validator');

async function index(request, response) {
	const users = await userModel.findAllUsers();

	return sendSuccess(response, {
		data: users,
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
