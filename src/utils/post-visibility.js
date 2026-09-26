const { isAdmin } = require('../middlewares/authorize.middleware');
const AppError = require('./app-error');

function isPostOwner(post, user) {
	return Boolean(user) && Number(post.author.id) === Number(user.id);
}

function canViewPost(post, user) {
	return post.status === 'published' || isAdmin(user) || isPostOwner(post, user);
}

function canManagePost(post, user) {
	return isAdmin(user) || isPostOwner(post, user);
}

function assertPostOwnerOrAdmin(post, user) {
	if (canManagePost(post, user)) {
		return;
	}

	throw new AppError(403, 'Bu post üzerinde işlem yapma yetkiniz yok.', 'POST_FORBIDDEN');
}

module.exports = {
	isPostOwner,
	canViewPost,
	canManagePost,
	assertPostOwnerOrAdmin,
};
