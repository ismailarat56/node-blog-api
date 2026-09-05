const pool = require('../config/database');

const AppError = require('../utils/app-error');

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

	if (!options.includeDeleted) {
		conditions.push('deleted_at IS NULL');
	}

	// İsim veya e-posta içinde arama yapar.
	if (options.search) {
		const searchPattern = `%${options.search}%`;

		conditions.push(`
			(
				name LIKE ?
				OR email LIKE ?
			)
		`);

		values.push(searchPattern, searchPattern);
	}

	if (options.isActive !== null) {
		conditions.push('is_active = ?');
		values.push(options.isActive);
	}

	const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

	return {
		whereClause,
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
		ORDER BY
			${sortColumn} ${sortDirection},
			id ${sortDirection}
		LIMIT ?
		OFFSET ?
	`;

	const queryValues = [...values, options.limit, options.offset];

	const [rows] = await pool.execute(sql, queryValues);

	return rows;
}

async function countUsers(options) {
	const { whereClause, values } = buildUserWhereClause(options);

	const sql = `
		SELECT
			COUNT(*) AS total
		FROM users
		${whereClause}
	`;

	const [rows] = await pool.execute(sql, values);

	return Number(rows[0].total);
}

async function findUserById(id, { includeDeleted = false } = {}) {
	const conditions = ['id = ?'];

	if (!includeDeleted) {
		conditions.push('deleted_at IS NULL');
	}

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
    WHERE ${conditions.join(' AND ')}
    LIMIT 1
  `;

	const [rows] = await pool.execute(sql, [id]);

	return rows[0] || null;
}

async function findUserByEmail(email, ignoredUserId = null) {
	let sql = `
		SELECT
			id
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

async function createUser({ name, email, passwordHash }) {
	const [result] = await pool.execute(
		`
			INSERT INTO users (
				name,
				email,
				password_hash
			)
			VALUES (?, ?, ?)
		`,
		[name, email, passwordHash]
	);

	return result.insertId;
}

async function replaceUser(id, data) {
	const updateSql = `
		UPDATE users
		SET
			name = ?,
			email = ?
		WHERE id = ?
	`;

	await pool.execute(updateSql, [data.name, data.email, id]);

	const selectSql = `
		SELECT
			id,
			name,
			email,
			created_at
		FROM users
		WHERE id = ?
		LIMIT 1
	`;

	const [updatedRows] = await pool.execute(selectSql, [id]);

	return updatedRows[0];
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

	if (assignments.length === 0) {
		return 0;
	}

	values.push(id);

	const sql = `
    UPDATE users
    SET ${assignments.join(', ')}
    WHERE id = ?
      AND deleted_at IS NULL
  `;

	const [result] = await pool.execute(sql, values);

	return result.affectedRows;
}

async function softDeleteUserWithAudit(id, requestId) {
	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		const [deleteResult] = await connection.execute(
			`
          UPDATE users
          SET
            deleted_at =
              CURRENT_TIMESTAMP,
            is_active = 0
          WHERE id = ?
            AND deleted_at IS NULL
        `,
			[id]
		);

		if (deleteResult.affectedRows === 0) {
			throw new AppError(404, 'Kullanıcı bulunamadı.', 'USER_NOT_FOUND');
		}

		await connection.execute(
			`
        INSERT INTO user_audit_logs (
          user_id,
          action,
          details
        )
        VALUES (?, ?, ?)
      `,
			[
				id,
				'user_soft_deleted',
				JSON.stringify({
					requestId,
				}),
			]
		);

		await connection.commit();

		return true;
	} catch (error) {
		await connection.rollback();

		throw error;
	} finally {
		connection.release();
	}
}

async function restoreUser(id) {
	const sql = `
    UPDATE users
    SET
      deleted_at = NULL,
      is_active = 1
    WHERE id = ?
      AND deleted_at IS NOT NULL
  `;

	const [result] = await pool.execute(sql, [id]);

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
	softDeleteUserWithAudit,
	restoreUser,
};
