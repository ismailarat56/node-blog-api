const { open } = require('node:fs/promises');

const SIGNATURES = Object.freeze([
	{
		mime: 'image/png',
		offset: 0,
		bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
	},
	{
		mime: 'image/jpeg',
		offset: 0,
		bytes: [0xff, 0xd8, 0xff],
	},
	{
		mime: 'image/webp',
		offset: 8,
		bytes: [0x57, 0x45, 0x42, 0x50],
	},
]);

async function detectImageMime(filePath) {
	const handle = await open(filePath, 'r');

	try {
		const buffer = Buffer.alloc(12);

		const { bytesRead } = await handle.read(buffer, 0, 12, 0);

		for (const signature of SIGNATURES) {
			const end = signature.offset + signature.bytes.length;

			if (bytesRead < end) {
				continue;
			}

			const matches = signature.bytes.every(
				(byte, index) => buffer[signature.offset + index] === byte
			);

			if (matches) {
				return signature.mime;
			}
		}

		return null;
	} finally {
		await handle.close();
	}
}

module.exports = {
	detectImageMime,
};
