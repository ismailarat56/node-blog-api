const express = require('express');
const pool = require('./database');
const app = express();

const PORT = Number(process.env.PORT || 3000);
app.use(express.json());

app.get('/users', async (request, response) => {
	try {
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

		return response.status(200).json(rows);
	} catch (error) {
		console.error(error);

		return response.status(500).json({
			message: 'Kullanıcılar alınamadı.',
		});
	}
});

app.get('/users/:id', async (request, response) => {
	const id = Number(request.params.id);

	if (!Number.isInteger(id) || id <= 0) {
		return response.status(400).json({
			message: 'Geçerli bir kullanıcı ID değeri girin.',
		});
	}

	try {
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

		const user = rows[0];

		if (!user) {
			return response.status(404).json({
				message: 'Kullanıcı bulunamadı.',
			});
		}

		return response.status(200).json(user);
	} catch (error) {
		console.error(error);

		return response.status(500).json({
			message: 'Kullanıcı alınamadı.',
		});
	}
});

app.post('/users', async (request, response) => {
	const name = typeof request.body.name === 'string' ? request.body.name.trim() : '';

	const email =
		typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';

	if (!name || !email) {
		return response.status(400).json({
			message: 'name ve email alanları zorunludur.',
		});
	}

	try {
		const checkEmailSql = `
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
    `;

		const [existingUsers] = await pool.execute(checkEmailSql, [email]);

		if (existingUsers.length > 0) {
			return response.status(409).json({
				message: 'Bu e-posta zaten kullanılıyor.',
			});
		}

		const insertSql = `
      INSERT INTO users (
        name,
        email
      )
      VALUES (?, ?)
    `;

		const [result] = await pool.execute(insertSql, [name, email]);

		const [createdRows] = await pool.execute(
			`
        SELECT
          id,
          name,
          email,
          created_at
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
			[result.insertId]
		);

		return response.status(201).json(createdRows[0]);
	} catch (error) {
		console.error(error);

		return response.status(500).json({
			message: 'Kullanıcı oluşturulamadı.',
		});
	}
});

app.put('/users/:id', async (request, response) => {
	const id = Number(request.params.id);

	if (!Number.isInteger(id) || id <= 0) {
		return response.status(400).json({
			message: 'Geçerli bir kullanıcı ID değeri girin.',
		});
	}

	const name = typeof request.body.name === 'string' ? request.body.name.trim() : '';

	const email =
		typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';

	if (!name || !email) {
		return response.status(400).json({
			message: 'name ve email alanları zorunludur.',
		});
	}

	try {
		const [userRows] = await pool.execute(
			`
        SELECT id
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
			[id]
		);

		if (userRows.length === 0) {
			return response.status(404).json({
				message: 'Kullanıcı bulunamadı.',
			});
		}

		const [emailRows] = await pool.execute(
			`
        SELECT id
        FROM users
        WHERE email = ?
        AND id != ?
        LIMIT 1
      `,
			[email, id]
		);

		if (emailRows.length > 0) {
			return response.status(409).json({
				message: 'Bu e-posta başka bir kullanıcı tarafından kullanılıyor.',
			});
		}

		await pool.execute(
			`
        UPDATE users
        SET
          name = ?,
          email = ?
        WHERE id = ?
      `,
			[name, email, id]
		);

		const [updatedRows] = await pool.execute(
			`
        SELECT
          id,
          name,
          email,
          created_at
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
			[id]
		);

		return response.status(200).json(updatedRows[0]);
	} catch (error) {
		console.error(error);

		return response.status(500).json({
			message: 'Kullanıcı güncellenemedi.',
		});
	}
});

app.delete('/users/:id', async (request, response) => {
	const id = Number(request.params.id);

	if (!Number.isInteger(id) || id <= 0) {
		return response.status(400).json({
			message: 'Geçerli bir kullanıcı ID değeri girin.',
		});
	}

	try {
		const [result] = await pool.execute(
			`
        DELETE FROM users
        WHERE id = ?
      `,
			[id]
		);

		if (result.affectedRows === 0) {
			return response.status(404).json({
				message: 'Kullanıcı bulunamadı.',
			});
		}

		return response.status(200).json({
			message: 'Kullanıcı silindi.',
		});
	} catch (error) {
		console.error(error);

		return response.status(500).json({
			message: 'Kullanıcı silinemedi.',
		});
	}
});

async function startServer() {
	try {
		await pool.execute('SELECT 1 AS connection_test');

		app.listen(PORT, () => {
			console.log(`Server http://localhost:${PORT} adresinde çalışıyor.`);
		});
	} catch (error) {
		console.error('MySQL bağlantısı kurulamadığı için server başlatılmadı.');

		process.exit(1);
	}
}

startServer();
