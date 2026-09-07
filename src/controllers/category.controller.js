const AppError = require('../utils/app-error');

const categoryModel = require('../models/category.model');

const postModel = require('../models/post.model');

const { sendSuccess } = require('../utils/response');

const {
	parseCategoryId,
	parseCategoryListQuery,
	validateCreateCategory,
	validateReplaceCategory,
	validatePatchCategory,
} = require('../validators/category.validator');

async function assertSlugAvailable(slug, ignoredCategoryId = null) {
	const owner = await categoryModel.findCategoryBySlug(slug, ignoredCategoryId);

	if (owner) {
		throw new AppError(
			409,
			'Bu category slugı zaten kullanılıyor.',
			'CATEGORY_SLUG_ALREADY_EXISTS'
		);
	}
}

async function findExistingCategory(id) {
	const category = await categoryModel.findCategoryById(id);

	if (!category) {
		throw new AppError(404, 'Category bulunamadı.', 'CATEGORY_NOT_FOUND');
	}

	return category;
}

async function index(request, response) {
	const options = parseCategoryListQuery(request.query);

	const [categories, total] = await Promise.all([
		categoryModel.findAllCategories(options),
		categoryModel.countCategories(options),
	]);

	const totalPages = total === 0 ? 0 : Math.ceil(total / options.limit);

	return sendSuccess(response, {
		data: categories,
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
	const id = parseCategoryId(request.params.id);

	const category = await findExistingCategory(id);

	return sendSuccess(response, {
		data: category,
	});
}

async function store(request, response) {
	const data = validateCreateCategory(request.body);

	await assertSlugAvailable(data.slug);

	const id = await categoryModel.createCategory(data);

	const category = await categoryModel.findCategoryById(id);

	return sendSuccess(response, {
		statusCode: 201,
		message: 'Category oluşturuldu.',
		data: category,
	});
}

async function replace(request, response) {
	const id = parseCategoryId(request.params.id);

	await findExistingCategory(id);

	const data = validateReplaceCategory(request.body);

	await assertSlugAvailable(data.slug, id);

	await categoryModel.replaceCategory(id, data);

	const category = await categoryModel.findCategoryById(id);

	return sendSuccess(response, {
		message: 'Category tamamen güncellendi.',
		data: category,
	});
}

async function update(request, response) {
	const id = parseCategoryId(request.params.id);

	await findExistingCategory(id);

	const data = validatePatchCategory(request.body);

	if (data.slug !== undefined) {
		await assertSlugAvailable(data.slug, id);
	}

	await categoryModel.updateCategoryFields(id, data);

	const category = await categoryModel.findCategoryById(id);

	return sendSuccess(response, {
		message: 'Category güncellendi.',
		data: category,
	});
}

async function destroy(request, response) {
	const id = parseCategoryId(request.params.id);

	await findExistingCategory(id);

	const activePostCount = await postModel.countActivePostsByCategory(id);

	if (activePostCount > 0) {
		throw new AppError(409, 'Bu categoryye bağlı aktif postlar var.', 'CATEGORY_HAS_POSTS', {
			active_posts: activePostCount,
		});
	}

	await categoryModel.softDeleteCategory(id);

	return sendSuccess(response, {
		message: 'Category silindi.',
		data: {
			id,
		},
	});
}

async function restore(request, response) {
	const id = parseCategoryId(request.params.id);

	const deletedCategory = await categoryModel.findCategoryById(id, {
		includeDeleted: true,
	});

	if (!deletedCategory || deletedCategory.deleted_at === null) {
		throw new AppError(
			404,
			'Geri getirilecek silinmiş category bulunamadı.',
			'DELETED_CATEGORY_NOT_FOUND'
		);
	}

	await categoryModel.restoreCategory(id);

	const category = await categoryModel.findCategoryById(id);

	return sendSuccess(response, {
		message: 'Category geri getirildi.',
		data: category,
	});
}

module.exports = {
	index,
	show,
	store,
	replace,
	update,
	destroy,
	restore,
};
