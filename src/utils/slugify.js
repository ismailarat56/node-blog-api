const turkishCharacterMap = {
	ç: 'c',
	Ç: 'c',
	ğ: 'g',
	Ğ: 'g',
	ı: 'i',
	I: 'i',
	İ: 'i',
	ö: 'o',
	Ö: 'o',
	ş: 's',
	Ş: 's',
	ü: 'u',
	Ü: 'u',
};

function slugify(value, { maxLength = 200 } = {}) {
	if (typeof value !== 'string') {
		return '';
	}

	const replaced = Array.from(value)
		.map((character) => turkishCharacterMap[character] ?? character)
		.join('');

	return replaced
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, maxLength)
		.replace(/-+$/g, '');
}

module.exports = {
	slugify,
};
