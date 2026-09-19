const { Router } = require('express');

const commentController = require('../controllers/comment.controller');

const { commentCreateLimiter } = require('../middlewares/rate-limiters');

const asyncHandler = require('../utils/async-handler');

const router = Router({
	mergeParams: true,
});

router.get('/', asyncHandler(commentController.index));

router.post('/', commentCreateLimiter, asyncHandler(commentController.store));

module.exports = router;
