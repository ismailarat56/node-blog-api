const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
	dateStyle: 'long',
	timeStyle: 'short',
	timeZone: 'Europe/Istanbul',
});

function formatMoment(value) {
	return dateFormatter.format(value instanceof Date ? value : new Date(value));
}

function escapeHtml(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function layout(title, lines) {
	const body = lines.map((line) => `<p style="margin:0 0 12px">${escapeHtml(line)}</p>`).join('');

	return [
		'<div style="font-family:system-ui,sans-serif;',
		'font-size:15px;line-height:1.6;color:#1f2933">',
		`<h2 style="margin:0 0 16px">${escapeHtml(title)}</h2>`,
		body,
		'<p style="margin:24px 0 0;font-size:13px;color:#6b7280">',
		'Node Blog API',
		'</p></div>',
	].join('');
}

const codeMailCopy = {
	email_verification: {
		subject: 'Node Blog API: e-posta dogrulama kodun',
		title: 'E-posta adresini dogrula',
		intro: 'Hesabini etkinlestirmek icin asagidaki kodu gir.',
	},
	password_reset: {
		subject: 'Node Blog API: parola sifirlama kodun',
		title: 'Parola sifirlama',
		intro: 'Yeni parola belirlemek icin asagidaki kodu gir.',
	},
	password_change: {
		subject: 'Node Blog API: parola degisikligi kodun',
		title: 'Parola degisikligini onayla',
		intro: 'Parola degisikligini onaylamak icin asagidaki kodu gir.',
	},
	email_change: {
		subject: 'Node Blog API: yeni adresini dogrula',
		title: 'Yeni e-posta adresini dogrula',
		intro: 'Bu adresi hesabina baglamak icin asagidaki kodu gir.',
	},
};

function buildVerificationCodeMail(recipient, { purpose, code, ttlMinutes }) {
	const copy = codeMailCopy[purpose];

	if (!copy) {
		throw new Error(`Bilinmeyen kod amaci: ${purpose}`);
	}

	const lines = [
		`Merhaba ${recipient.name},`,
		copy.intro,
		`Kod: ${code}`,
		`Kod ${ttlMinutes} dakika gecerlidir ve yalnizca bir kez kullanilabilir.`,
		'Bu istegi sen yapmadiysan bu maili yok say ve kodu kimseyle paylasma.',
	];

	return {
		to: recipient.email,
		subject: copy.subject,
		text: lines.join('\n\n'),
		html: layout(copy.title, lines),
	};
}

function buildWelcomeMail(user) {
	const title = 'Hesabin olusturuldu';

	const lines = [
		`Merhaba ${user.name},`,
		'Node Blog API hesabin olusturuldu. Artik giris yapip yazi ve yorum yazabilirsin.',
		'E-posta adresin dogrulandi; artik giris yapabilirsin.',
	];

	return {
		to: user.email,
		subject: 'Node Blog API: hesabin olusturuldu',
		text: lines.join('\n\n'),
		html: layout(title, lines),
	};
}

function buildPasswordChangedMail(user, changedAt) {
	const moment = formatMoment(changedAt);

	const title = 'Parolan degistirildi';

	const lines = [
		`Merhaba ${user.name},`,
		`Hesabinin parolasi ${moment} tarihinde degistirildi.`,
		'Acik olan butun oturumlar kapatildi; yeni parolanla tekrar giris yapman gerekiyor.',
		'Bu islemi sen yapmadiysan hesabina erisimi olan biri var demektir. Hemen giris yapip parolani yeniden degistir.',
	];

	return {
		to: user.email,
		subject: 'Node Blog API: parolan degistirildi',
		text: lines.join('\n\n'),
		html: layout(title, lines),
	};
}

function buildEmailChangeRequestedMail(user, newEmail) {
	const lines = [
		`Merhaba ${user.name},`,
		`Hesabinin e-posta adresini ${newEmail} olarak degistirme istegi alindi.`,
		'Yeni adrese gonderilen kod girilmedikce adresin degismez.',
		'Bu istegi sen yapmadiysan hesabina erisimi olan biri var demektir. Hemen parolani degistir.',
	];

	return {
		to: user.email,
		subject: 'Node Blog API: e-posta degisikligi istendi',
		text: lines.join('\n\n'),
		html: layout('E-posta degisikligi istendi', lines),
	};
}

function buildEmailChangedMail(recipient, { oldEmail, newEmail }) {
	const lines = [
		`Merhaba ${recipient.name},`,
		`Hesabinin e-posta adresi ${oldEmail} adresinden ${newEmail} adresine degistirildi.`,
		'Bundan sonra giris ve bildirimler yeni adresi kullanir.',
		'Bu islemi sen yapmadiysan hemen parolani sifirla.',
	];

	return {
		to: recipient.email,
		subject: 'Node Blog API: e-posta adresin degistirildi',
		text: lines.join('\n\n'),
		html: layout('E-posta adresin degistirildi', lines),
	};
}

module.exports = {
	buildWelcomeMail,
	buildPasswordChangedMail,
	buildVerificationCodeMail,
	buildEmailChangeRequestedMail,
	buildEmailChangedMail,
};
