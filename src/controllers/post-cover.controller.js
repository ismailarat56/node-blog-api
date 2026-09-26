const path = require('node:path');
const AppError = require('../utils/app-error');
const postModel = require('../models/post.model');
const { getUploadConfig } = require('../config/upload.config');
const { detectImageMime } = require('../utils/image-signature');
const { safeUnlink } = require('../utils/safe-unlink');
const { sendSuccess } = require('../utils/response');

function absolutePath(relative) {
	return path.join(getUploadConfig().directory, relative);
}

async function uploadCover(request, response) {
	const config = getUploadConfig();
	const post = request.coverPost;
	const file = request.file;

	if (!file) {
		throw new AppError(
			422,
			'cover alaninda bir dosya gonderilmelidir.',
			'COVER_REQUIRED'
		);
	}

	const realMime = await detectImageMime(file.path);

	if (realMime !== file.mimetype) {
		await safeUnlink(file.path);

		throw new AppError(
			415,
			'Dosyanin icerigi belirtilen turle uyusmuyor.',
			'COVER_CONTENT_MISMATCH',
			{
				declared: file.mimetype,
				detected: realMime,
			}
		);
	}

	const newRelativePath = path.posix.join('covers', file.filename);

	const updated = await postModel.updatePostCoverPath(post.id, newRelativePath);

	if (!updated) {
		await safeUnlink(file.path);

		throw new AppError(404, 'Post bulunamadi.', 'POST_NOT_FOUND');
	}

	if (post.cover_path) {
		await safeUnlink(absolutePath(post.cover_path));
	}

	sendSuccess(response, {
		statusCode: 200,
		message: 'Kapak gorseli guncellendi.',
		data: {
			id: post.id,
			title: post.title,
			cover_url: `/uploads/${newRelativePath}`,
		},
	});
}

async function deleteCover(request, response) {
	const post = request.coverPost;

	if (!post.cover_path) {
		throw new AppError(404, 'Bu postun kapak gorseli yok.', 'COVER_NOT_FOUND');
	}

	await postModel.updatePostCoverPath(post.id, null);

	await safeUnlink(absolutePath(post.cover_path));

	response.status(204).end();
}

module.exports = {
	uploadCover,
	deleteCover,
};
