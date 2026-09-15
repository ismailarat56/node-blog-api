const DEFAULT_HOST = 'smtp.gmail.com';
const DEFAULT_PORT = 587;

function readTransportMode() {
	const raw = (process.env.MAIL_TRANSPORT ?? 'smtp').trim().toLowerCase();

	if (raw !== 'smtp' && raw !== 'json') {
		throw new Error('MAIL_TRANSPORT yalnizca smtp veya json olabilir.');
	}

	return raw;
}

function readPort() {
	const raw = (process.env.SMTP_PORT ?? '').trim();

	if (raw === '') {
		return DEFAULT_PORT;
	}

	const port = Number(raw);

	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error('SMTP_PORT gecerli bir port numarasi degil.');
	}

	return port;
}

function readCredential(name) {
	return (process.env[name] ?? '').replace(/\s+/g, '');
}

function buildFrom() {
	const address = (process.env.MAIL_FROM_ADDRESS ?? process.env.SMTP_USER ?? '').trim();

	if (address === '') {
		return '';
	}

	const label = (process.env.MAIL_FROM_NAME ?? '').trim();

	return label === '' ? address : `${label} <${address}>`;
}

let cached = null;

function getMailConfig() {
	if (cached) {
		return cached;
	}

	const mode = readTransportMode();
	const user = readCredential('SMTP_USER');
	const credential = readCredential('SMTP_PASS');

	cached = Object.freeze({
		mode,
		host: (process.env.SMTP_HOST ?? DEFAULT_HOST).trim(),
		port: readPort(),
		secure: (process.env.SMTP_SECURE ?? '').trim() === 'true',
		user,
		credential,
		from: buildFrom(),
		enabled: mode === 'json' || (user !== '' && credential !== ''),
	});

	return cached;
}

module.exports = {
	getMailConfig,
};
