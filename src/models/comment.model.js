const pool = require('../config/database');

const commentColumns = `
	cm.id,
	cm.post_id,
	cm.parent_id,
	cm.body,
	cm.status,
	cm.edited_at,
	cm.created_at,
	cm.updated_at,
	cm.deleted_at,
	u.id AS author_id,
	u.name AS author_name
`;

const fromClause = `
	FROM comments AS cm
	INNER JOIN users AS u
		ON u.id = cm.user_id
`;

function mapCommentRow(row) {
	if (!row) {
		return null;
	}

	return {
		id: row.id,
		post_id: row.post_id,
		parent_id: row.parent_id,
		body: row.body,
		status: row.status,

		author: {
			id: row.author_id,
			name: row.author_name,
		},

		edited_at: row.edited_at,
		created_at: row.created_at,
		updated_at: row.updated_at,
		deleted_at: row.deleted_at,
	};
}

function buildVisibilitySql(options = {}) {
	return options.includeHidden ? '' : "AND cm.status = 'visible'";
}

async function findTopLevelComments(options) {
	const [rows] = await pool.execute(
		`
			SELECT
				${commentColumns}
			${fromClause}
			WHERE cm.post_id = ?
				AND cm.parent_id IS NULL
				AND cm.deleted_at IS NULL
				${buildVisibilitySql(options)}
			ORDER BY
				cm.created_at ASC,
				cm.id ASC
			LIMIT ?
			OFFSET ?
		`,
		[options.postId, options.limit, options.offset]
	);

	return rows.map(mapCommentRow);
}

async function countTopLevelComments(options) {
	const [rows] = await pool.execute(
		`
			SELECT
				COUNT(*) AS total
			FROM comments AS cm
			WHERE cm.post_id = ?
				AND cm.parent_id IS NULL
				AND cm.deleted_at IS NULL
				${buildVisibilitySql(options)}
		`,
		[options.postId]
	);

	return Number(rows[0].total);
}

async function findRepliesForParents(parentIds, options) {
	if (parentIds.length === 0) {
		return [];
	}

	const placeholders = parentIds.map(() => '?').join(', ');

	const [rows] = await pool.execute(
		`
			SELECT
				${commentColumns}
			${fromClause}
			WHERE cm.parent_id IN (${placeholders})
				AND cm.deleted_at IS NULL
				${buildVisibilitySql(options)}
			ORDER BY
				cm.created_at ASC,
				cm.id ASC
		`,
		parentIds
	);

	return rows.map(mapCommentRow);
}

function attachReplies(comments, replies) {
	const repliesByParent = new Map();

	for (const reply of replies) {
		const list = repliesByParent.get(reply.parent_id) || [];

		list.push(reply);

		repliesByParent.set(reply.parent_id, list);
	}

	return comments.map((comment) => ({
		...comment,

		replies: repliesByParent.get(comment.id) || [],
	}));
}

async function findCommentTree(options) {
	const comments = await findTopLevelComments(options);

	const replies = await findRepliesForParents(
		comments.map((comment) => comment.id),
		options
	);

	return attachReplies(comments, replies);
}

async function findCommentById(id) {
	const [rows] = await pool.execute(
		`
			SELECT
				${commentColumns},
				p.user_id AS post_author_id,
				p.status AS post_status,
				p.deleted_at AS post_deleted_at
			${fromClause}
			INNER JOIN posts AS p
				ON p.id = cm.post_id
			WHERE cm.id = ?
				AND cm.deleted_at IS NULL
			LIMIT 1
		`,
		[id]
	);

	const row = rows[0];

	if (!row) {
		return null;
	}

	return {
		...mapCommentRow(row),

		post: {
			author_id: row.post_author_id,
			status: row.post_status,
			deleted_at: row.post_deleted_at,
		},
	};
}

async function createComment({ postId, userId, parentId, body }) {
	const [result] = await pool.execute(
		`
			INSERT INTO comments (
				post_id,
				user_id,
				parent_id,
				body
			)
			VALUES (?, ?, ?, ?)
		`,
		[postId, userId, parentId, body]
	);

	return result.insertId;
}

async function updateCommentBody(id, body) {
	const [result] = await pool.execute(
		`
			UPDATE comments
			SET
				body = ?,
				edited_at = CURRENT_TIMESTAMP
			WHERE id = ?
				AND deleted_at IS NULL
		`,
		[body, id]
	);

	return result.affectedRows;
}

async function hideComment(id) {
	const [result] = await pool.execute(
		`
			UPDATE comments
			SET
				status = 'hidden'
			WHERE id = ?
				AND deleted_at IS NULL
				AND status = 'visible'
		`,
		[id]
	);

	return result.affectedRows;
}

async function unhideComment(id) {
	const [result] = await pool.execute(
		`
			UPDATE comments
			SET
				status = 'visible'
			WHERE id = ?
				AND deleted_at IS NULL
				AND status = 'hidden'
		`,
		[id]
	);

	return result.affectedRows;
}

async function softDeleteComment(id) {
	const [result] = await pool.execute(
		`
			UPDATE comments
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

module.exports = {
	findCommentTree,
	countTopLevelComments,
	findCommentById,
	createComment,
	updateCommentBody,
	hideComment,
	unhideComment,
	softDeleteComment,
};
