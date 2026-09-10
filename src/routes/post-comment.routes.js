const { Router } = require('express');

const commentController = require('../controllers/comment.controller');

const asyncHandler = require('../utils/async-handler');

const router = Router({
	mergeParams: true,
});

router.get('/', asyncHandler(commentController.index));

router.post('/', asyncHandler(commentController.store));

module.exports = router;
