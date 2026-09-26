const { Router } = require('express');

const postController = require('../controllers/post.controller');
const postCoverController = require('../controllers/post-cover.controller');

const postCommentRouter = require('./post-comment.routes');

const authenticate = require('../middlewares/authenticate.middleware');
const { loadPostForCover } = require('../middlewares/post-cover-access.middleware');
const { uploadCoverImage } = require('../middlewares/upload.middleware');
const { coverUploadLimiter } = require('../middlewares/rate-limiters');

const asyncHandler = require('../utils/async-handler');

const router = Router();

router.use(asyncHandler(authenticate));

router.use('/:postId/comments', postCommentRouter);

router.get('/', asyncHandler(postController.index));

router.get('/:id', asyncHandler(postController.show));

router.post('/', asyncHandler(postController.store));

router.put(
	'/:postId/cover',
	coverUploadLimiter,
	asyncHandler(loadPostForCover),
	uploadCoverImage,
	asyncHandler(postCoverController.uploadCover)
);

router.delete(
	'/:postId/cover',
	asyncHandler(loadPostForCover),
	asyncHandler(postCoverController.deleteCover)
);

router.put('/:id', asyncHandler(postController.replace));

router.patch('/:id/publish', asyncHandler(postController.publish));

router.patch('/:id/unpublish', asyncHandler(postController.unpublish));

router.patch('/:id/restore', asyncHandler(postController.restore));

router.patch('/:id', asyncHandler(postController.update));

router.delete('/:id', asyncHandler(postController.destroy));

module.exports = router;
