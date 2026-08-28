require('dotenv').config();

const app = require('./src/app');
const pool = require('./src/config/database');

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
	await pool.query('SELECT 1');

	app.listen(PORT, () => {
		console.log(`Server http://localhost:${PORT} adresinde çalışıyor.`);
	});
}

startServer().catch((error) => {
	console.error('Server başlatılamadı.', error.message);

	process.exit(1);
});
