const express = require('express');

const app = express();

const PORT = 3000;

let nextId = 3;

const users = [
	{
		id: 1,
		name: 'Ali Yılmaz',
		email: 'ali@example.com',
	},
	{
		id: 2,
		name: 'Ayşe Demir',
		email: 'ayse@example.com',
	},
];
app.use(express.json());

app.get('/users', (request, response) => {
	response.status(200).json(users);
});

app.get('/users/:id', (request, response) => {
	const id = Number(request.params.id);

	const user = users.find((currentUser) => currentUser.id === id);

	if (!user) {
		return response.status(404).json({
			message: 'Kullanıcı bulunamadı.',
		});
	}

	return response.status(200).json(user);
});

app.post('/users', (request, response) => {
	const { name, email } = request.body;

	if (!name || !email) {
		return response.status(400).json({
			message: 'name ve email alanları zorunludur.',
		});
	}

	const newUser = {
		id: nextId,
		name: name,
		email: email,
	};

	nextId = nextId + 1;

	users.push(newUser);

	return response.status(201).json(newUser);
});

app.put('/users/:id', (request, response) => {
	const id = Number(request.params.id);

	const userIndex = users.findIndex((user) => user.id === id);

	if (userIndex === -1) {
		return response.status(404).json({
			message: 'Kullanıcı bulunamadı.',
		});
	}

	const { name, email } = request.body;

	if (!name || !email) {
		return response.status(400).json({
			message: 'name ve email alanları zorunludur.',
		});
	}

	const updatedUser = {
		id: id,
		name: name,
		email: email,
	};

	users[userIndex] = updatedUser;

	return response.status(200).json(updatedUser);
});

app.delete('/users/:id', (request, response) => {
	const id = Number(request.params.id);

	const userIndex = users.findIndex((user) => user.id === id);

	if (userIndex === -1) {
		return response.status(404).json({
			message: 'Kullanıcı bulunamadı.',
		});
	}

	const deletedUsers = users.splice(userIndex, 1);

	const deletedUser = deletedUsers[0];

	return response.status(200).json({
		message: 'Kullanıcı silindi.',
		user: deletedUser,
	});
});

app.listen(PORT, () => {
	console.log(`Server http://localhost:${PORT} adresinde çalışıyor.`);
});
