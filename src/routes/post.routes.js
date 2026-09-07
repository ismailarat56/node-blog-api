const { Router } = require('express');

const postController = require('../controllers/post.controller');

const authenticate = require('../middlewares/authenticate.middleware');

const asyncHandler = require('../utils/async-handler');

const router = Router();

router.use(asyncHandler(authenticate));

router.get('/', asyncHandler(postController.index));

router.get('/:id', asyncHandler(postController.show));

router.post('/', asyncHandler(postController.store));

router.put('/:id', asyncHandler(postController.replace));

router.patch('/:id/publish', asyncHandler(postController.publish));

router.patch('/:id/unpublish', asyncHandler(postController.unpublish));

router.patch('/:id/restore', asyncHandler(postController.restore));

router.patch('/:id', asyncHandler(postController.update));

router.delete('/:id', asyncHandler(postController.destroy));

module.exports = router;
