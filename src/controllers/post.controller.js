const AppError = require('../utils/app-error');

const postModel = require('../models/post.model');

const categoryModel = require('../models/category.model');

const { slugify } = require('../utils/slugify');

const { isAdmin } = require('../middlewares/authorize.middleware');

const { canViewPost, canManagePost } = require('../utils/post-visibility');

const { sendSuccess } = require('../utils/response');

const {
	parsePostId,
	parsePostListQuery,
	validateCreatePost,
	validateReplacePost,
	validatePatchPost,
} = require('../validators/post.validator');

const maxSlugAttempts = 50;

async function generateUniqueSlug(title) {
	const baseSlug =
		slugify(title, {
			maxLength: 200,
		}) || 'post';

	let candidate = baseSlug;

	for (let attempt = 2; attempt <= maxSlugAttempts + 1; attempt += 1) {
		const owner = await postModel.findPostBySlug(candidate);

		if (!owner) {
			return candidate;
		}

		candidate = `${baseSlug}-${attempt}`;
	}

	throw new AppError(409, 'Bu başlık için benzersiz slug üretilemedi.', 'POST_SLUG_UNAVAILABLE');
}

async function assertCategoryAvailable(categoryId) {
	const category = await categoryModel.findCategoryById(categoryId);

	if (!category || Number(category.is_active) !== 1) {
		throw new AppError(422, 'Seçilen category kullanılamıyor.', 'CATEGORY_NOT_AVAILABLE', {
			field: 'category_id',
		});
	}

	return category;
}

async function findExistingPost(id, { includeDeleted = false } = {}) {
	const post = await postModel.findPostById(id, {
		includeDeleted,
	});

	if (!post) {
		throw new AppError(404, 'Post bulunamadı.', 'POST_NOT_FOUND');
	}

	return post;
}

function assertPostOwnerOrAdmin(post, user) {
	if (canManagePost(post, user)) {
		return;
	}

	throw new AppError(403, 'Bu post üzerinde işlem yapma yetkiniz yok.', 'POST_FORBIDDEN');
}

async function index(request, response) {
	const options = parsePostListQuery(request.query);

	if (options.includeDeleted && !isAdmin(request.user)) {
		throw new AppError(403, 'Silinmiş postları yalnızca admin listeleyebilir.', 'FORBIDDEN');
	}

	const listOptions = {
		...options,

		visibility: isAdmin(request.user) ? 'all' : 'own_or_published',

		viewerId: request.user.id,
	};

	const [posts, total] = await Promise.all([
		postModel.findAllPosts(listOptions),
		postModel.countPosts(listOptions),
	]);

	const totalPages = total === 0 ? 0 : Math.ceil(total / options.limit);

	return sendSuccess(response, {
		data: posts,

		meta: {
			page: options.page,
			limit: options.limit,
			total,
			total_pages: totalPages,

			has_next_page: options.page < totalPages,

			has_previous_page: options.page > 1,
		},
	});
}

async function show(request, response) {
	const id = parsePostId(request.params.id);

	const post = await findExistingPost(id);

	if (!canViewPost(post, request.user)) {
		throw new AppError(404, 'Post bulunamadı.', 'POST_NOT_FOUND');
	}

	return sendSuccess(response, {
		data: post,
	});
}

async function store(request, response) {
	const data = validateCreatePost(request.body);

	await assertCategoryAvailable(data.categoryId);

	const slug = await generateUniqueSlug(data.title);

	const id = await postModel.createPost({
		userId: request.user.id,
		categoryId: data.categoryId,
		title: data.title,
		slug,
		excerpt: data.excerpt,
		content: data.content,
	});

	const post = await postModel.findPostById(id);

	return sendSuccess(response, {
		statusCode: 201,
		message: 'Post oluşturuldu.',
		data: post,
	});
}

async function replace(request, response) {
	const id = parsePostId(request.params.id);

	const post = await findExistingPost(id);

	assertPostOwnerOrAdmin(post, request.user);

	const data = validateReplacePost(request.body);

	await assertCategoryAvailable(data.categoryId);

	await postModel.replacePost(id, data);

	const updatedPost = await postModel.findPostById(id);

	return sendSuccess(response, {
		message: 'Post tamamen güncellendi.',
		data: updatedPost,
	});
}

async function update(request, response) {
	const id = parsePostId(request.params.id);

	const post = await findExistingPost(id);

	assertPostOwnerOrAdmin(post, request.user);

	const data = validatePatchPost(request.body);

	if (data.categoryId !== undefined) {
		await assertCategoryAvailable(data.categoryId);
	}

	await postModel.updatePostFields(id, data);

	const updatedPost = await postModel.findPostById(id);

	return sendSuccess(response, {
		message: 'Post güncellendi.',
		data: updatedPost,
	});
}

async function publish(request, response) {
	const id = parsePostId(request.params.id);

	const post = await findExistingPost(id);

	assertPostOwnerOrAdmin(post, request.user);

	if (post.status === 'published') {
		throw new AppError(409, 'Post zaten yayında.', 'POST_ALREADY_PUBLISHED');
	}

	const affectedRows = await postModel.publishPost(id);

	if (affectedRows === 0) {
		throw new AppError(409, 'Post durumu değiştiği için yayınlanamadı.', 'POST_STATE_CONFLICT');
	}

	const publishedPost = await postModel.findPostById(id);

	return sendSuccess(response, {
		message: 'Post yayınlandı.',
		data: publishedPost,
	});
}

async function unpublish(request, response) {
	const id = parsePostId(request.params.id);

	const post = await findExistingPost(id);

	assertPostOwnerOrAdmin(post, request.user);

	if (post.status === 'draft') {
		throw new AppError(409, 'Post zaten yayında değil.', 'POST_NOT_PUBLISHED');
	}

	const affectedRows = await postModel.unpublishPost(id);

	if (affectedRows === 0) {
		throw new AppError(
			409,
			'Post durumu değiştiği için yayından kaldırılamadı.',
			'POST_STATE_CONFLICT'
		);
	}

	const draftPost = await postModel.findPostById(id);

	return sendSuccess(response, {
		message: 'Post yayından kaldırıldı.',
		data: draftPost,
	});
}

async function destroy(request, response) {
	const id = parsePostId(request.params.id);

	const post = await findExistingPost(id);

	assertPostOwnerOrAdmin(post, request.user);

	await postModel.softDeletePost(id);

	return sendSuccess(response, {
		message: 'Post silindi.',
		data: {
			id,
		},
	});
}

async function restore(request, response) {
	const id = parsePostId(request.params.id);

	const deletedPost = await postModel.findPostById(id, {
		includeDeleted: true,
	});

	if (!deletedPost || deletedPost.deleted_at === null) {
		throw new AppError(
			404,
			'Geri getirilecek silinmiş post bulunamadı.',
			'DELETED_POST_NOT_FOUND'
		);
	}

	assertPostOwnerOrAdmin(deletedPost, request.user);

	await postModel.restorePost(id);

	const post = await postModel.findPostById(id);

	return sendSuccess(response, {
		message: 'Post geri getirildi.',
		data: post,
	});
}

module.exports = {
	index,
	show,
	store,
	replace,
	update,
	publish,
	unpublish,
	destroy,
	restore,
};
