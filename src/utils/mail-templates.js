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

function buildWelcomeMail(user) {
	const title = 'Hesabin olusturuldu';

	const lines = [
		`Merhaba ${user.name},`,
		'Node Blog API hesabin olusturuldu. Artik giris yapip yazi ve yorum yazabilirsin.',
		'Bu kaydi sen yapmadiysan bu adresi yok sayabilirsin; hesap dogrulanmadan once bir sey yapmaz.',
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

module.exports = {
	buildWelcomeMail,
	buildPasswordChangedMail,
};
