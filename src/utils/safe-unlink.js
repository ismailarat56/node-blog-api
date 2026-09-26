const { unlink } = require('node:fs/promises');

async function safeUnlink(filePath) {
	if (!filePath) {
		return;
	}

	try {
		await unlink(filePath);
	} catch (error) {
		if (error.code === 'ENOENT') {
			return;
		}

		console.error('[uploads] dosya silinemedi:', error.code);
	}
}

module.exports = { safeUnlink };
