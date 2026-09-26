const AppError = require('../utils/app-error');

const postModel = require('../models/post.model');

const categoryModel = require('../models/category.model');

const commentModel = require('../models/comment.model');

const { sendSuccess } = require('../utils/response');
const { withCoverUrl } = require('../utils/cover-url');

const { buildPaginationMeta } = require('../utils/pagination');

const { parsePostSlug, parsePublicPostListQuery } = require('../validators/post.validator');

const { parseCommentListQuery } = require('../validators/comment.validator');

async function listPosts(request, response) {
	const options = parsePublicPostListQuery(request.query);

	const [posts, total] = await Promise.all([
		postModel.findAllPosts(options),
		postModel.countPosts(options),
	]);

	return sendSuccess(response, {
		data: posts.map(withCoverUrl),
		meta: buildPaginationMeta(options.page, options.limit, total),
	});
}

async function showPost(request, response) {
	const slug = parsePostSlug(request.params.slug);

	const post = await postModel.findPublishedPostBySlug(slug);

	if (!post) {
		throw new AppError(404, 'Post bulunamadı.', 'POST_NOT_FOUND');
	}

	return sendSuccess(response, {
		data: withCoverUrl(post),
	});
}

async function listComments(request, response) {
	if ('include_hidden' in request.query) {
		throw new AppError(
			422,
			'Desteklenmeyen query parameter gönderildi.',
			'UNSUPPORTED_QUERY_PARAMETERS',
			{
				fields: ['include_hidden'],
			}
		);
	}

	const slug = parsePostSlug(request.params.slug);

	const options = parseCommentListQuery(request.query);

	const post = await postModel.findPublishedPostBySlug(slug);

	if (!post) {
		throw new AppError(404, 'Post bulunamadı.', 'POST_NOT_FOUND');
	}

	const listOptions = {
		...options,
		includeHidden: 0,
		postId: post.id,
	};

	const [comments, total] = await Promise.all([
		commentModel.findCommentTree(listOptions),

		commentModel.countTopLevelComments(listOptions),
	]);

	return sendSuccess(response, {
		data: comments,
		meta: buildPaginationMeta(options.page, options.limit, total),
	});
}

async function listCategories(request, response) {
	const categories = await categoryModel.findPublicCategories();

	return sendSuccess(response, {
		data: categories,
	});
}

module.exports = {
	listPosts,
	showPost,
	listComments,
	listCategories,
};
