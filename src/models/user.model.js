const pool = require('../config/database');

const sortColumnMap = {
	id: 'id',
	name: 'name',
	email: 'email',
	created_at: 'created_at',
	updated_at: 'updated_at',
};
const patchColumnMap = {
	name: 'name',
	email: 'email',
	isActive: 'is_active',
};

function buildUserWhereClause(options) {
	const conditions = [];
	const values = [];

	if (options.search) {
		const searchPattern = `%${options.search}%`;

		conditions.push('(name LIKE ? OR email LIKE ?)');
		values.push(searchPattern, searchPattern);
	}

	if (options.isActive !== null) {
		conditions.push('is_active = ?');
		values.push(options.isActive);
	}

	return {
		whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
		values,
	};
}

async function findAllUsers(options) {
	const { whereClause, values } = buildUserWhereClause(options);
	const sortColumn = sortColumnMap[options.sortBy] || 'id';
	const sortDirection = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

	const sql = `
		SELECT
			id,
			name,
			email,
			is_active,
			created_at,
			updated_at,
			deleted_at
		FROM users
		${whereClause}
		ORDER BY ${sortColumn} ${sortDirection}, id ${sortDirection}
		LIMIT ?
		OFFSET ?
	`;

	const queryValues = [...values, options.limit, options.offset];
	const [rows] = await pool.execute(sql, queryValues);

	return rows;
}

async function countUsers(options) {
	const { whereClause, values } = buildUserWhereClause(options);
	const [rows] = await pool.execute(
		`SELECT COUNT(*) AS total FROM users ${whereClause}`,
		values
	);

	return Number(rows[0].total);
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

async function updateUserFields(id, data) {
	const assignments = [];
	const values = [];

	for (const [dataField, columnName] of Object.entries(patchColumnMap)) {
		if (Object.prototype.hasOwnProperty.call(data, dataField)) {
			assignments.push(`${columnName} = ?`);
			values.push(data[dataField]);
		}
	}

	values.push(id);

	const [result] = await pool.execute(
		`UPDATE users SET ${assignments.join(', ')} WHERE id = ?`,
		values
	);

	return result.affectedRows;
}

async function deleteUser(id) {
	const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);

	return result.affectedRows;
}

module.exports = {
	findAllUsers,
	countUsers,
	findUserById,
	findUserByEmail,
	createUser,
	replaceUser,
	updateUserFields,
	deleteUser,
};
