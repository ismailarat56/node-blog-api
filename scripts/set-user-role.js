require('dotenv').config();

const pool = require('../src/config/database');

const allowedRoles = new Set(['user', 'admin']);

function readRequiredEnvironment(name) {
	const value = process.env[name];

	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`${name} environment değişkeni gereklidir.`);
	}

	return value;
}

async function main() {
	const email = readRequiredEnvironment('BOOTSTRAP_EMAIL').trim().toLowerCase();

	const role = readRequiredEnvironment('BOOTSTRAP_ROLE').trim().toLowerCase();

	if (!allowedRoles.has(role)) {
		throw new Error('BOOTSTRAP_ROLE yalnızca user veya admin olabilir.');
	}

	const [result] = await pool.execute(
		`
      UPDATE users
      SET role = ?
      WHERE email = ?
        AND deleted_at IS NULL
    `,
		[role, email]
	);

	if (result.affectedRows === 0) {
		throw new Error('Rolü değiştirilecek aktif kullanıcı bulunamadı.');
	}

	console.log(`Kullanıcı rolü ${role} olarak güncellendi.`);
}

main()
	.catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	})
	.finally(async () => {
		await pool.end();
	});
