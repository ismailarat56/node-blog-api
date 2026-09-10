const AppError = require('../utils/app-error');

const commentModel = require('../models/comment.model');

const postModel = require('../models/post.model');

const { isAdmin } = require('../middlewares/authorize.middleware');

const { canViewPost, canManagePost } = require('../utils/post-visibility');

const { sendSuccess } = require('../utils/response');

const { buildPaginationMeta } = require('../utils/pagination');

const { parsePostId } = require('../validators/post.validator');

const {
	parseCommentId,
	parseCommentListQuery,
	validateCreateComment,
	validatePatchComment,
} = require('../validators/comment.validator');

function presentComment(comment) {
	const { post, ...data } = comment;

	return data;
}

function isSameUser(left, right) {
	return Number(left) === Number(right);
}

async function findVisiblePost(postId, user) {
	const post = await postModel.findPostById(postId);

	if (!post || !canViewPost(post, user)) {
		throw new AppError(404, 'Post bulunamadı.', 'POST_NOT_FOUND');
	}

	return post;
}

async function findExistingComment(id) {
	const comment = await commentModel.findCommentById(id);

	if (!comment || comment.post.deleted_at !== null) {
		throw new AppError(404, 'Yorum bulunamadı.', 'COMMENT_NOT_FOUND');
	}

	return comment;
}

function isCommentAuthor(comment, user) {
	return isSameUser(comment.author.id, user.id);
}

function isPostAuthor(comment, user) {
	return isSameUser(comment.post.author_id, user.id);
}

function canEditComment(comment, user) {
	return isAdmin(user) || isCommentAuthor(comment, user);
}

function canModerateComment(comment, user) {
	return isAdmin(user) || isPostAuthor(comment, user);
}

function canDeleteComment(comment, user) {
	return canEditComment(comment, user) || canModerateComment(comment, user);
}

function assertCommentVisibleTo(comment, user) {
	if (comment.status === 'hidden' && !canModerateComment(comment, user)) {
		throw new AppError(404, 'Yorum bulunamadı.', 'COMMENT_NOT_FOUND');
	}
}

function assertCommentPermission(allowed) {
	if (!allowed) {
		throw new AppError(403, 'Bu yorum üzerinde işlem yapma yetkiniz yok.', 'COMMENT_FORBIDDEN');
	}
}

async function index(request, response) {
	const postId = parsePostId(request.params.postId);

	const options = parseCommentListQuery(request.query);

	const post = await findVisiblePost(postId, request.user);

	if (options.includeHidden && !canManagePost(post, request.user)) {
		throw new AppError(
			403,
			'Gizli yorumları yalnızca post yazarı veya admin listeleyebilir.',
			'FORBIDDEN'
		);
	}

	const listOptions = {
		...options,
		postId,
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

async function store(request, response) {
	const postId = parsePostId(request.params.postId);

	const post = await findVisiblePost(postId, request.user);

	if (post.status !== 'published') {
		throw new AppError(
			409,
			'Yalnızca yayındaki posta yorum yapılabilir.',
			'POST_NOT_PUBLISHED'
		);
	}

	const data = validateCreateComment(request.body);

	if (data.parentId !== null) {
		const parent = await commentModel.findCommentById(data.parentId);

		const parentUsable =
			parent &&
			Number(parent.post_id) === postId &&
			parent.parent_id === null &&
			parent.status === 'visible';

		if (!parentUsable) {
			throw new AppError(
				422,
				'parent_id bu posttaki görünür bir üst yorum olmalıdır.',
				'COMMENT_PARENT_INVALID',
				{
					field: 'parent_id',
				}
			);
		}
	}

	const id = await commentModel.createComment({
		postId,
		userId: request.user.id,
		parentId: data.parentId,
		body: data.body,
	});

	const comment = await commentModel.findCommentById(id);

	return sendSuccess(response, {
		statusCode: 201,
		message: 'Yorum eklendi.',
		data: presentComment(comment),
	});
}

async function update(request, response) {
	const id = parseCommentId(request.params.id);

	const comment = await findExistingComment(id);

	assertCommentVisibleTo(comment, request.user);

	assertCommentPermission(canEditComment(comment, request.user));

	const data = validatePatchComment(request.body);

	await commentModel.updateCommentBody(id, data.body);

	const updatedComment = await commentModel.findCommentById(id);

	return sendSuccess(response, {
		message: 'Yorum güncellendi.',
		data: presentComment(updatedComment),
	});
}

async function destroy(request, response) {
	const id = parseCommentId(request.params.id);

	const comment = await findExistingComment(id);

	assertCommentVisibleTo(comment, request.user);

	assertCommentPermission(canDeleteComment(comment, request.user));

	await commentModel.softDeleteComment(id);

	return sendSuccess(response, {
		message: 'Yorum silindi.',
		data: {
			id,
		},
	});
}

async function hide(request, response) {
	const id = parseCommentId(request.params.id);

	const comment = await findExistingComment(id);

	assertCommentPermission(canModerateComment(comment, request.user));

	if (comment.status === 'hidden') {
		throw new AppError(409, 'Yorum zaten gizli.', 'COMMENT_ALREADY_HIDDEN');
	}

	const affectedRows = await commentModel.hideComment(id);

	if (affectedRows === 0) {
		throw new AppError(
			409,
			'Yorum durumu değiştiği için gizlenemedi.',
			'COMMENT_STATE_CONFLICT'
		);
	}

	const hiddenComment = await commentModel.findCommentById(id);

	return sendSuccess(response, {
		message: 'Yorum gizlendi.',
		data: presentComment(hiddenComment),
	});
}

async function unhide(request, response) {
	const id = parseCommentId(request.params.id);

	const comment = await findExistingComment(id);

	assertCommentPermission(canModerateComment(comment, request.user));

	if (comment.status === 'visible') {
		throw new AppError(409, 'Yorum zaten görünür.', 'COMMENT_NOT_HIDDEN');
	}

	const affectedRows = await commentModel.unhideComment(id);

	if (affectedRows === 0) {
		throw new AppError(
			409,
			'Yorum durumu değiştiği için görünür yapılamadı.',
			'COMMENT_STATE_CONFLICT'
		);
	}

	const visibleComment = await commentModel.findCommentById(id);

	return sendSuccess(response, {
		message: 'Yorum tekrar görünür yapıldı.',
		data: presentComment(visibleComment),
	});
}

module.exports = {
	index,
	store,
	update,
	destroy,
	hide,
	unhide,
};
