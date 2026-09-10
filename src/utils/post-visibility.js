const { isAdmin } = require('../middlewares/authorize.middleware');

function isPostOwner(post, user) {
	return Boolean(user) && Number(post.author.id) === Number(user.id);
}

function canViewPost(post, user) {
	return post.status === 'published' || isAdmin(user) || isPostOwner(post, user);
}

function canManagePost(post, user) {
	return isAdmin(user) || isPostOwner(post, user);
}

module.exports = {
	isPostOwner,
	canViewPost,
	canManagePost,
};
