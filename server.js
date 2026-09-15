require('dotenv').config();

const app = require('./src/app');
const pool = require('./src/config/database');

const { getMailConfig } = require('./src/config/mail.config');
const { getVerificationConfig } = require('./src/config/verification.config');

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
	await pool.query('SELECT 1');

	getMailConfig();
	getVerificationConfig();

	app.listen(PORT, () => {
		console.log(`Server http://localhost:${PORT} adresinde çalışıyor.`);
	});
}

startServer().catch((error) => {
	console.error('Server başlatılamadı.', error.message);

	process.exit(1);
});
