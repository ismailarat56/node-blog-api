require('dotenv').config();

const pool = require('../src/config/database');

async function withoutJoin() {
	let queryCount = 0;

	const [posts] = await pool.execute(
		`
      SELECT id, title, user_id
      FROM posts
      WHERE deleted_at IS NULL
    `
	);

	queryCount += 1;

	for (const post of posts) {
		const [users] = await pool.execute(
			`
        SELECT name
        FROM users
        WHERE id = ?
      `,
			[post.user_id]
		);

		queryCount += 1;
		post.author = users[0].name;
	}

	return {
		posts: posts.length,
		queryCount,
	};
}

async function withJoin() {
	const [posts] = await pool.execute(
		`
      SELECT
        p.id,
        p.title,
        u.name AS author
      FROM posts AS p
      INNER JOIN users AS u
        ON u.id = p.user_id
      WHERE p.deleted_at IS NULL
    `
	);

	return {
		posts: posts.length,
		queryCount: 1,
	};
}

async function main() {
	console.log('JOIN olmadan:', await withoutJoin());

	console.log('JOIN ile:', await withJoin());
}

main()
	.catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	})
	.finally(async () => {
		await pool.end();
	});
