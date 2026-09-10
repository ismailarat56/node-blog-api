const { Router } = require('express');

const commentController = require('../controllers/comment.controller');

const authenticate = require('../middlewares/authenticate.middleware');

const asyncHandler = require('../utils/async-handler');

const router = Router();

router.use(asyncHandler(authenticate));

router.patch('/:id/hide', asyncHandler(commentController.hide));

router.patch('/:id/unhide', asyncHandler(commentController.unhide));

router.patch('/:id', asyncHandler(commentController.update));

router.delete('/:id', asyncHandler(commentController.destroy));

module.exports = router;
