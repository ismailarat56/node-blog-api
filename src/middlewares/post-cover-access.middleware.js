const AppError = require('../utils/app-error');
const postModel = require('../models/post.model');
const { assertPostOwnerOrAdmin } = require('../utils/post-visibility');

async function loadPostForCover(request, response, next) {
	const postId = Number(request.params.postId);

	if (!Number.isInteger(postId) || postId < 1) {
		next(new AppError(400, 'Gecersiz post id.', 'INVALID_POST_ID'));

		return;
	}

	try {
		const post = await postModel.findPostById(postId);

		if (!post) {
			next(new AppError(404, 'Post bulunamadi.', 'POST_NOT_FOUND'));

			return;
		}

		assertPostOwnerOrAdmin(post, request.user);

		request.coverPost = post;

		next();
	} catch (error) {
		next(error);
	}
}

module.exports = {
	loadPostForCover,
};
