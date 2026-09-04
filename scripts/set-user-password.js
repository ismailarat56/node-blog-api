require('dotenv').config();

const pool = require('../src/config/database');

const { hashPassword } = require('../src/utils/password');

function readRequiredEnvironment(name) {
	const value = process.env[name];

	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`${name} environment değişkeni gereklidir.`);
	}

	return value;
}

async function main() {
	const email = readRequiredEnvironment('BOOTSTRAP_EMAIL').trim().toLowerCase();

	const password = readRequiredEnvironment('BOOTSTRAP_PASSWORD');

	const passwordLength = Array.from(password).length;

	if (passwordLength < 15 || passwordLength > 128) {
		throw new Error('BOOTSTRAP_PASSWORD 15 ile 128 karakter arasında olmalıdır.');
	}

	const passwordHash = await hashPassword(password);

	const [result] = await pool.execute(
		`
      UPDATE users
      SET password_hash = ?
      WHERE email = ?
        AND deleted_at IS NULL
    `,
		[passwordHash, email]
	);

	if (result.affectedRows === 0) {
		throw new Error('Şifre atanacak aktif kullanıcı bulunamadı.');
	}

	console.log('Kullanıcı şifresi güvenli hash ile güncellendi.');
}

main()
	.catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	})
	.finally(async () => {
		await pool.end();
	});
