const { Router } = require('express');

const publicController = require('../controllers/public.controller');

const asyncHandler = require('../utils/async-handler');

const router = Router();

router.get('/posts', asyncHandler(publicController.listPosts));

router.get('/posts/:slug/comments', asyncHandler(publicController.listComments));

router.get('/posts/:slug', asyncHandler(publicController.showPost));

router.get('/categories', asyncHandler(publicController.listCategories));

module.exports = router;
