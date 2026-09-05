const pool = require('../config/database');

const sortColumnMap = {
	id: 'id',
	name: 'name',
	slug: 'slug',
	created_at: 'created_at',
	updated_at: 'updated_at',
};

const patchColumnMap = {
	name: 'name',
	slug: 'slug',
	description: 'description',
	isActive: 'is_active',
};

function buildCategoryWhereClause(options) {
	const conditions = [];
	const values = [];

	if (!options.includeDeleted) {
		conditions.push('deleted_at IS NULL');
	}

	if (options.search) {
		const pattern = `%${options.search}%`;

		conditions.push(`
			(
				name LIKE ?
				OR slug LIKE ?
				OR description LIKE ?
			)
		`);

		values.push(pattern, pattern, pattern);
	}

	if (options.isActive !== null) {
		conditions.push('is_active = ?');

		values.push(options.isActive);
	}

	const whereClause = conditions.length === 0 ? '' : `WHERE ${conditions.join(' AND ')}`;

	return {
		whereClause,
		values,
	};
}

async function findAllCategories(options) {
	const { whereClause, values } = buildCategoryWhereClause(options);

	const sortColumn = sortColumnMap[options.sortBy] || 'id';

	const sortDirection = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

	const sql = `
		SELECT
			id,
			name,
			slug,
			description,
			is_active,
			created_at,
			updated_at,
			deleted_at
		FROM categories
		${whereClause}
		ORDER BY
			${sortColumn} ${sortDirection},
			id ${sortDirection}
		LIMIT ?
		OFFSET ?
	`;

	const [rows] = await pool.execute(sql, [...values, options.limit, options.offset]);

	return rows;
}

async function countCategories(options) {
	const { whereClause, values } = buildCategoryWhereClause(options);

	const [rows] = await pool.execute(
		`
			SELECT
				COUNT(*) AS total
			FROM categories
			${whereClause}
		`,
		values
	);

	return Number(rows[0].total);
}

async function findCategoryById(id, { includeDeleted = false } = {}) {
	const conditions = ['id = ?'];

	if (!includeDeleted) {
		conditions.push('deleted_at IS NULL');
	}

	const [rows] = await pool.execute(
		`
			SELECT
				id,
				name,
				slug,
				description,
				is_active,
				created_at,
				updated_at,
				deleted_at
			FROM categories
			WHERE ${conditions.join(' AND ')}
			LIMIT 1
		`,
		[id]
	);

	return rows[0] || null;
}

async function findCategoryBySlug(slug, ignoredCategoryId = null) {
	const conditions = ['slug = ?'];

	const values = [slug];

	if (ignoredCategoryId !== null) {
		conditions.push('id <> ?');

		values.push(ignoredCategoryId);
	}

	const [rows] = await pool.execute(
		`
			SELECT
				id,
				slug,
				deleted_at
			FROM categories
			WHERE ${conditions.join(' AND ')}
			LIMIT 1
		`,
		values
	);

	return rows[0] || null;
}

async function createCategory({ name, slug, description, isActive }) {
	const [result] = await pool.execute(
		`
			INSERT INTO categories (
				name,
				slug,
				description,
				is_active
			)
			VALUES (?, ?, ?, ?)
		`,
		[name, slug, description, isActive]
	);

	return result.insertId;
}

async function replaceCategory(id, { name, slug, description, isActive }) {
	const [result] = await pool.execute(
		`
			UPDATE categories
			SET
				name = ?,
				slug = ?,
				description = ?,
				is_active = ?
			WHERE id = ?
				AND deleted_at IS NULL
		`,
		[name, slug, description, isActive, id]
	);

	return result.affectedRows;
}

async function updateCategoryFields(id, data) {
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

	const [result] = await pool.execute(
		`
			UPDATE categories
			SET ${assignments.join(', ')}
			WHERE id = ?
				AND deleted_at IS NULL
		`,
		values
	);

	return result.affectedRows;
}

async function softDeleteCategory(id) {
	const [result] = await pool.execute(
		`
			UPDATE categories
			SET
				deleted_at =
					CURRENT_TIMESTAMP,
				is_active = 0
			WHERE id = ?
				AND deleted_at IS NULL
		`,
		[id]
	);

	return result.affectedRows;
}

async function restoreCategory(id) {
	const [result] = await pool.execute(
		`
			UPDATE categories
			SET
				deleted_at = NULL,
				is_active = 1
			WHERE id = ?
				AND deleted_at IS NOT NULL
		`,
		[id]
	);

	return result.affectedRows;
}

module.exports = {
	findAllCategories,
	countCategories,
	findCategoryById,
	findCategoryBySlug,
	createCategory,
	replaceCategory,
	updateCategoryFields,
	softDeleteCategory,
	restoreCategory,
};
