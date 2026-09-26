const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { detectImageMime } = require('../src/utils/image-signature');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sig-'));

const pngPath = path.join(directory, 'a.png');

fs.writeFileSync(
	pngPath,
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])
);

const fakePath = path.join(directory, 'b.png');

fs.writeFileSync(fakePath, 'merhaba dunya');

const shortPath = path.join(directory, 'c.png');

fs.writeFileSync(shortPath, Buffer.from([0x89, 0x50]));

(async () => {
	assert.equal(await detectImageMime(pngPath), 'image/png');

	assert.equal(await detectImageMime(fakePath), null);

	assert.equal(await detectImageMime(shortPath), null);

	fs.rmSync(directory, {
		recursive: true,
		force: true,
	});

	console.log('imza kontrolleri gecti');
})();
