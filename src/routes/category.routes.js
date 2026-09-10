const { Router } = require('express');

const categoryController = require('../controllers/category.controller');

const authenticate = require('../middlewares/authenticate.middleware');

const { requireRole } = require('../middlewares/authorize.middleware');

const asyncHandler = require('../utils/async-handler');

const router = Router();

const adminOnly = requireRole('admin');

router.use(asyncHandler(authenticate));

router.get('/', asyncHandler(categoryController.index));

router.get('/:id', asyncHandler(categoryController.show));

router.post('/', adminOnly, asyncHandler(categoryController.store));

router.put('/:id', adminOnly, asyncHandler(categoryController.replace));

router.patch('/:id/restore', adminOnly, asyncHandler(categoryController.restore));

router.patch('/:id', adminOnly, asyncHandler(categoryController.update));

router.delete('/:id', adminOnly, asyncHandler(categoryController.destroy));

module.exports = router;
