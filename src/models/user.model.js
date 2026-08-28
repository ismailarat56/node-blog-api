const pool = require('../config/database');

async function findAllUsers() {
	const sql = `
		SELECT
			id,
			name,
			email,
			created_at
		FROM users
		ORDER BY id ASC
	`;

	const [rows] = await pool.execute(sql);

	return rows;
}

async function findUserById(id) {
	const sql = `
		SELECT
			id,
			name,
			email,
			created_at
		FROM users
		WHERE id = ?
		LIMIT 1
	`;

	const [rows] = await pool.execute(sql, [id]);

	return rows[0] || null;
}

async function findUserByEmail(email, ignoredUserId = null) {
	let sql = `
		SELECT id
		FROM users
		WHERE email = ?
	`;

	const values = [email];

	if (ignoredUserId !== null) {
		sql += ' AND id != ?';
		values.push(ignoredUserId);
	}

	sql += ' LIMIT 1';

	const [rows] = await pool.execute(sql, values);

	return rows[0] || null;
}

async function createUser(data) {
	const [result] = await pool.execute(
		'INSERT INTO users (name, email) VALUES (?, ?)',
		[data.name, data.email]
	);

	return findUserById(result.insertId);
}

async function replaceUser(id, data) {
	await pool.execute('UPDATE users SET name = ?, email = ? WHERE id = ?', [
		data.name,
		data.email,
		id,
	]);

	return findUserById(id);
}

async function deleteUser(id) {
	const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);

	return result.affectedRows;
}

module.exports = {
	findAllUsers,
	findUserById,
	findUserByEmail,
	createUser,
	replaceUser,
	deleteUser,
};
