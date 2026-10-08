require('dotenv').config();

const fs = require('node:fs');
const app = require('./src/app');
const pool = require('./src/config/database');

const { getMailConfig } = require('./src/config/mail.config');
const { getVerificationConfig } = require('./src/config/verification.config');
const { getRateLimitConfig } = require('./src/config/rate-limit.config');
const { getRefreshTokenConfig } = require('./src/config/refresh-token.config');
const { getUploadConfig } = require('./src/config/upload.config');

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
	await pool.query('SELECT 1');

	getMailConfig();
	getVerificationConfig();
	getRateLimitConfig();
	getRefreshTokenConfig();
	const uploadConfig = getUploadConfig();

	fs.mkdirSync(uploadConfig.coverDirectory, { recursive: true });

	const server = app.listen(PORT, () => {
		console.log(`Server http://localhost:${PORT} adresinde çalışıyor.`);
	});

	registerShutdown(server);
}

function registerShutdown(server) {
	let closing = false;

	function shutdown(signal) {
		if (closing) {
			return;
		}

		closing = true;

		console.error(
			`[server] ${signal} alındı, yeni bağlantı kabul edilmiyor.`
		);

		const forceTimer = setTimeout(
			() => process.exit(1),
			10_000
		);

		forceTimer.unref();

		server.close(async () => {
			await pool.end();
			process.exit(0);
		});
	}

	process.on('SIGTERM', () =>
		shutdown('SIGTERM')
	);

	process.on('SIGINT', () =>
		shutdown('SIGINT')
	);
}

startServer().catch((error) => {
	console.error('Server başlatılamadı.', error.message);

	process.exit(1);
});
