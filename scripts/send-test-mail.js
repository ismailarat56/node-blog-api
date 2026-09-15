require('dotenv').config();

const { verifyMailConnection, sendMail } = require('../src/utils/mailer');

async function main() {
	const recipient = process.argv[2];

	if (!recipient) {
		console.error('Kullanim: node scripts/send-test-mail.js adres@ornek.com');
		process.exitCode = 1;
		return;
	}
	console.log('deneme');
	await verifyMailConnection();
	console.error('[mail] baglanti dogrulandi');

	const info = await sendMail({
		to: recipient,
		subject: 'Node Blog API: SMTP testi',
		text: 'Bu bir baglanti testidir.',
	});

	console.error(
		'[mail] gonderildi',
		JSON.stringify({
			messageId: info.messageId,
			accepted: info.accepted,
			rejected: info.rejected,
		})
	);
}

main().catch((error) => {
	console.error(
		'[mail] hata',
		JSON.stringify({
			code: error.code ?? 'UNKNOWN',
			responseCode: error.responseCode ?? null,
			message: error.message,
		})
	);
	process.exitCode = 1;
});
