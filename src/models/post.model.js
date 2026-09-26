const pool = require('../config/database');

const sortColumnMap = {
	id: 'p.id',
	title: 'p.title',
	created_at: 'p.created_at',
	updated_at: 'p.updated_at',
	published_at: 'p.published_at',
};

const visibilityConditions = {
	published: () => ({
		sql: "p.status = 'published'",
		values: [],
	}),

	own_or_published: (options) => {
		if (!options.viewerId) {
			throw new Error('own_or_published görünürlüğü viewerId ister.');
		}

		return {
			sql: `
				(
					p.status = 'published'
					OR p.user_id = ?
				)
			`,
			values: [options.viewerId],
		};
	},

	all: () => null,
};

function buildVisibilityCondition(options) {
	const build = visibilityConditions[options.visibility] || visibilityConditions.published;

	return build(options);
}

const listColumns = `
	p.id,
	p.title,
	p.slug,
	p.excerpt,
	p.cover_path,
	p.status,
	p.published_at,
	p.created_at,
	p.updated_at,
	p.deleted_at,
	u.id AS author_id,
	u.name AS author_name,
	c.id AS category_id,
	c.name AS category_name,
	c.slug AS category_slug,
	(
		SELECT COUNT(*)
		FROM comments AS cm
		WHERE cm.post_id = p.id
			AND cm.deleted_at IS NULL
			AND cm.status = 'visible'
	) AS comment_count
`;

const detailColumns = `
	${listColumns},
	p.content
`;

const fromClause = `
	FROM posts AS p
	INNER JOIN users AS u
		ON u.id = p.user_id
	INNER JOIN categories AS c
		ON c.id = p.category_id
`;

const patchColumnMap = {
	categoryId: 'category_id',
	title: 'title',
	excerpt: 'excerpt',
	content: 'content',
};

function buildPostWhereClause(options) {
	const conditions = [];
	const values = [];

	if (!options.includeDeleted) {
		conditions.push('p.deleted_at IS NULL');
	}

	const visibility = buildVisibilityCondition(options);

	if (visibility) {
		conditions.push(visibility.sql);
		values.push(...visibility.values);
	}

	if (options.search) {
		const pattern = `%${options.search}%`;

		conditions.push(`
			(
				p.title LIKE ?
				OR p.excerpt LIKE ?
			)
		`);

		values.push(pattern, pattern);
	}

	if (options.status !== null) {
		conditions.push('p.status = ?');

		values.push(options.status);
	}

	if (options.categoryId !== null) {
		conditions.push('p.category_id = ?');

		values.push(options.categoryId);
	}

	if (options.userId !== null) {
		conditions.push('p.user_id = ?');

		values.push(options.userId);
	}

	const whereClause = conditions.length === 0 ? '' : `WHERE ${conditions.join(' AND ')}`;

	return {
		whereClause,
		values,
	};
}

function mapPostRow(row) {
	if (!row) {
		return null;
	}

	const post = {
		id: row.id,
		title: row.title,
		slug: row.slug,
		excerpt: row.excerpt,
		cover_path: row.cover_path,
		status: row.status,
		published_at: row.published_at,

		author: {
			id: row.author_id,
			name: row.author_name,
		},

		category: {
			id: row.category_id,
			name: row.category_name,
			slug: row.category_slug,
		},

		comment_count: Number(row.comment_count),

		created_at: row.created_at,
		updated_at: row.updated_at,
		deleted_at: row.deleted_at,
	};

	if (Object.prototype.hasOwnProperty.call(row, 'content')) {
		post.content = row.content;
	}

	return post;
}

async function findAllPosts(options) {
	const { whereClause, values } = buildPostWhereClause(options);

	const sortColumn = sortColumnMap[options.sortBy] || 'p.id';

	const sortDirection = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

	const sql = `
		SELECT
			${listColumns}
		${fromClause}
		${whereClause}
		ORDER BY
			${sortColumn}
			${sortDirection},
			p.id ${sortDirection}
		LIMIT ?
		OFFSET ?
	`;

	const [rows] = await pool.execute(sql, [...values, options.limit, options.offset]);

	return rows.map(mapPostRow);
}

async function countPosts(options) {
	const { whereClause, values } = buildPostWhereClause(options);

	const [rows] = await pool.execute(
		`
				SELECT
					COUNT(*) AS total
				${fromClause}
				${whereClause}
			`,
		values
	);

	return Number(rows[0].total);
}

async function findPostById(id, { includeDeleted = false } = {}) {
	const conditions = ['p.id = ?'];

	if (!includeDeleted) {
		conditions.push('p.deleted_at IS NULL');
	}

	const [rows] = await pool.execute(
		`
				SELECT
					${detailColumns}
				${fromClause}
				WHERE ${conditions.join(' AND ')}
				LIMIT 1
			`,
		[id]
	);

	return mapPostRow(rows[0]);
}

async function findPostBySlug(slug) {
	const [rows] = await pool.execute(
		`
				SELECT
					id,
					slug,
					deleted_at
				FROM posts
				WHERE slug = ?
				LIMIT 1
			`,
		[slug]
	);

	return rows[0] || null;
}

async function findPublishedPostBySlug(slug) {
	const [rows] = await pool.execute(
		`
				SELECT
					${detailColumns}
				${fromClause}
				WHERE p.slug = ?
					AND p.status = 'published'
					AND p.deleted_at IS NULL
				LIMIT 1
			`,
		[slug]
	);

	return mapPostRow(rows[0]);
}

async function countActivePostsByCategory(categoryId) {
	const [rows] = await pool.execute(
		`
				SELECT
					COUNT(*) AS total
				FROM posts
				WHERE category_id = ?
					AND deleted_at IS NULL
			`,
		[categoryId]
	);

	return Number(rows[0].total);
}

async function createPost({ userId, categoryId, title, slug, excerpt, content }) {
	const [result] = await pool.execute(
		`
				INSERT INTO posts (
					user_id,
					category_id,
					title,
					slug,
					excerpt,
					content
				)
				VALUES (?, ?, ?, ?, ?, ?)
			`,
		[userId, categoryId, title, slug, excerpt, content]
	);

	return result.insertId;
}

async function replacePost(id, { categoryId, title, excerpt, content }) {
	const [result] = await pool.execute(
		`
				UPDATE posts
				SET
					category_id = ?,
					title = ?,
					excerpt = ?,
					content = ?
				WHERE id = ?
					AND deleted_at IS NULL
			`,
		[categoryId, title, excerpt, content, id]
	);

	return result.affectedRows;
}

async function updatePostFields(id, data) {
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
				UPDATE posts
				SET ${assignments.join(', ')}
				WHERE id = ?
					AND deleted_at IS NULL
			`,
		values
	);

	return result.affectedRows;
}

async function updatePostCoverPath(postId, coverPath) {
	const [result] = await pool.execute(
		`
				UPDATE posts
				SET cover_path = ?
				WHERE id = ?
					AND deleted_at IS NULL
			`,
		[coverPath, postId]
	);

	return result.affectedRows === 1;
}

async function publishPost(id) {
	const [result] = await pool.execute(
		`
				UPDATE posts
				SET
					status = 'published',
					published_at = COALESCE(
						published_at,
						CURRENT_TIMESTAMP
					)
				WHERE id = ?
					AND deleted_at IS NULL
					AND status = 'draft'
			`,
		[id]
	);

	return result.affectedRows;
}

async function unpublishPost(id) {
	const [result] = await pool.execute(
		`
				UPDATE posts
				SET
					status = 'draft'
				WHERE id = ?
					AND deleted_at IS NULL
					AND status = 'published'
			`,
		[id]
	);

	return result.affectedRows;
}

async function softDeletePost(id) {
	const [result] = await pool.execute(
		`
				UPDATE posts
				SET
					deleted_at =
						CURRENT_TIMESTAMP
				WHERE id = ?
					AND deleted_at IS NULL
			`,
		[id]
	);

	return result.affectedRows;
}

async function restorePost(id) {
	const [result] = await pool.execute(
		`
				UPDATE posts
				SET
					deleted_at = NULL
				WHERE id = ?
					AND deleted_at IS NOT NULL
			`,
		[id]
	);

	return result.affectedRows;
}

module.exports = {
	findAllPosts,
	countPosts,
	findPostById,
	findPostBySlug,
	findPublishedPostBySlug,
	countActivePostsByCategory,
	createPost,
	replacePost,
	updatePostFields,
	updatePostCoverPath,
	publishPost,
	unpublishPost,
	softDeletePost,
	restorePost,
};
