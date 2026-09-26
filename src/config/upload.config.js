const path = require('node:path');

const MIME_TO_EXTENSION = Object.freeze({
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
});

let cached = null;

function readBooleanFlag(name, fallback) {
	const raw = (process.env[name] ?? fallback).trim().toLowerCase();

	if (raw !== 'true' && raw !== 'false') {
		throw new Error(`${name} true veya false olmalidir.`);
	}

	return raw === 'true';
}

function readMaxBytes() {
	const raw = (process.env.UPLOAD_MAX_BYTES ?? '2097152').trim();

	const value = Number(raw);

	if (!Number.isInteger(value) || value < 1024 || value > 20 * 1024 * 1024) {
		throw new Error('UPLOAD_MAX_BYTES 1024 ile 20971520 arasinda bir tam sayi olmalidir.');
	}

	return value;
}

function getUploadConfig() {
	if (cached) {
		return cached;
	}

	const directory = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');

	cached = Object.freeze({
		directory,
		coverDirectory: path.join(directory, 'covers'),
		maxBytes: readMaxBytes(),
		serveUploads: readBooleanFlag('SERVE_UPLOADS', 'true'),
		mimeToExtension: MIME_TO_EXTENSION,
		allowedMimeTypes: Object.freeze(Object.keys(MIME_TO_EXTENSION)),
	});

	return cached;
}

module.exports = {
	getUploadConfig,
};
