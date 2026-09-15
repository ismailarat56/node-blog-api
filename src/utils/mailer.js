const nodemailer = require('nodemailer');
const { getMailConfig } = require('../config/mail.config');

let transporter = null;

function getTransporter() {
	if (transporter) {
		return transporter;
	}

	const config = getMailConfig();

	if (config.mode === 'json') {
		transporter = nodemailer.createTransport({
			jsonTransport: true,
		});

		return transporter;
	}

	transporter = nodemailer.createTransport({
		host: config.host,
		port: config.port,
		secure: config.secure,
		auth: {
			user: config.user,
			pass: config.credential,
		},
		connectionTimeout: 10000,
		greetingTimeout: 10000,
		socketTimeout: 20000,
	});

	return transporter;
}

async function verifyMailConnection() {
	const config = getMailConfig();

	if (!config.enabled) {
		throw new Error('Mail katmani kapali: SMTP_USER ve SMTP_PASS bos.');
	}

	return getTransporter().verify();
}

async function sendMail(message) {
	const config = getMailConfig();

	if (!config.enabled) {
		const error = new Error('Mail katmani kapali.');
		error.code = 'MAIL_DISABLED';
		throw error;
	}

	return getTransporter().sendMail({
		from: config.from,
		...message,
	});
}

function queueMail(message, context) {
	const config = getMailConfig();

	if (!config.enabled) {
		console.error(
			'[mail] skipped',
			JSON.stringify({
				...context,
				reason: 'MAIL_DISABLED',
			})
		);

		return;
	}

	sendMail(message)
		.then((info) => {
			console.error(
				'[mail] sent',
				JSON.stringify({
					...context,
					messageId: info.messageId,
					accepted: info.accepted?.length ?? 0,
				})
			);
		})
		.catch((error) => {
			console.error(
				'[mail] failed',
				JSON.stringify({
					...context,
					code: error.code ?? 'UNKNOWN',
					responseCode: error.responseCode ?? null,
				})
			);
		});
}

module.exports = {
	verifyMailConnection,
	sendMail,
	queueMail,
};
