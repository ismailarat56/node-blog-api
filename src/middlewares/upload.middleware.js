const crypto = require('node:crypto');
const multer = require('multer');
const AppError = require('../utils/app-error');
const { getUploadConfig } = require('../config/upload.config');

function buildCoverUpload() {
	const config = getUploadConfig();

	const storage = multer.diskStorage({
		destination: (request, file, callback) => {
			callback(null, config.coverDirectory);
		},
		filename: (request, file, callback) => {
			const extension = config.mimeToExtension[file.mimetype];

			const name = crypto.randomBytes(16).toString('hex');

			callback(null, `${name}${extension}`);
		},
	});

	return multer({
		storage,
		limits: {
			fileSize: config.maxBytes,
			files: 1,
			fields: 5,
		},
		fileFilter: (request, file, callback) => {
			if (!config.allowedMimeTypes.includes(file.mimetype)) {
				callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'cover'));

				return;
			}

			callback(null, true);
		},
	}).single('cover');
}

const coverUpload = buildCoverUpload();

function uploadCoverImage(request, response, next) {
	coverUpload(request, response, (error) => {
		if (!error) {
			next();

			return;
		}

		if (error instanceof multer.MulterError) {
			next(mapMulterError(error));

			return;
		}

		next(error);
	});
}

function mapMulterError(error) {
	if (error.code === 'LIMIT_FILE_SIZE') {
		return new AppError(413, 'Kapak görseli en fazla 2 MB olabilir.', 'COVER_TOO_LARGE', {
			max_bytes: getUploadConfig().maxBytes,
		});
	}

	if (error.code === 'LIMIT_UNEXPECTED_FILE') {
		return new AppError(
			415,
			'Yalnizca jpeg, png ve webp gorseller yuklenebilir.',
			'COVER_TYPE_NOT_ALLOWED',
			{
				allowed: getUploadConfig().allowedMimeTypes,
			}
		);
	}

	return new AppError(422, 'Dosya yuklenemedi.', 'COVER_UPLOAD_FAILED', {
		multer_code: error.code,
	});
}

module.exports = {
	uploadCoverImage,
};
