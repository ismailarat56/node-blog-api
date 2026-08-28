const userModel = require('../models/user.model');

function parseId(value) {
	const id = Number(value);

	return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeName(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value) {
	return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

async function index(request, response) {
	try {
		const users = await userModel.findAllUsers();

		return response.status(200).json(users);
	} catch (error) {
		console.error(error);

		return response.status(500).json({ message: 'Kullanıcılar alınamadı.' });
	}
}

async function show(request, response) {
	const id = parseId(request.params.id);

	if (!id) {
		return response.status(400).json({
			message: 'Geçerli bir kullanıcı ID değeri girin.',
		});
	}

	try {
		const user = await userModel.findUserById(id);

		if (!user) {
			return response.status(404).json({ message: 'Kullanıcı bulunamadı.' });
		}

		return response.status(200).json(user);
	} catch (error) {
		console.error(error);

		return response.status(500).json({ message: 'Kullanıcı alınamadı.' });
	}
}

async function store(request, response) {
	const name = normalizeName(request.body?.name);
	const email = normalizeEmail(request.body?.email);

	if (!name || !email) {
		return response.status(400).json({
			message: 'name ve email alanları zorunludur.',
		});
	}

	try {
		const emailOwner = await userModel.findUserByEmail(email);

		if (emailOwner) {
			return response.status(409).json({
				message: 'Bu e-posta zaten kullanılıyor.',
			});
		}

		const user = await userModel.createUser({ name, email });

		return response.status(201).json(user);
	} catch (error) {
		console.error(error);

		return response.status(500).json({ message: 'Kullanıcı oluşturulamadı.' });
	}
}

async function replace(request, response) {
	const id = parseId(request.params.id);

	if (!id) {
		return response.status(400).json({
			message: 'Geçerli bir kullanıcı ID değeri girin.',
		});
	}

	const name = normalizeName(request.body?.name);
	const email = normalizeEmail(request.body?.email);

	if (!name || !email) {
		return response.status(400).json({
			message: 'name ve email alanları zorunludur.',
		});
	}

	try {
		const existingUser = await userModel.findUserById(id);

		if (!existingUser) {
			return response.status(404).json({ message: 'Kullanıcı bulunamadı.' });
		}

		const emailOwner = await userModel.findUserByEmail(email, id);

		if (emailOwner) {
			return response.status(409).json({
				message: 'Bu e-posta başka bir kullanıcı tarafından kullanılıyor.',
			});
		}

		const user = await userModel.replaceUser(id, { name, email });

		return response.status(200).json(user);
	} catch (error) {
		console.error(error);

		return response.status(500).json({ message: 'Kullanıcı güncellenemedi.' });
	}
}

async function destroy(request, response) {
	const id = parseId(request.params.id);

	if (!id) {
		return response.status(400).json({
			message: 'Geçerli bir kullanıcı ID değeri girin.',
		});
	}

	try {
		const affectedRows = await userModel.deleteUser(id);

		if (affectedRows === 0) {
			return response.status(404).json({ message: 'Kullanıcı bulunamadı.' });
		}

		return response.status(200).json({ message: 'Kullanıcı silindi.' });
	} catch (error) {
		console.error(error);

		return response.status(500).json({ message: 'Kullanıcı silinemedi.' });
	}
}

module.exports = {
	index,
	show,
	store,
	replace,
	destroy,
};
