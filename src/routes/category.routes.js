const { Router } = require('express');

const categoryController = require('../controllers/category.controller');

const authenticate = require('../middlewares/authenticate.middleware');

const asyncHandler = require('../utils/async-handler');

const router = Router();

router.use(asyncHandler(authenticate));

router.get('/', asyncHandler(categoryController.index));

router.get('/:id', asyncHandler(categoryController.show));

router.post('/', asyncHandler(categoryController.store));

router.put('/:id', asyncHandler(categoryController.replace));

router.patch('/:id/restore', asyncHandler(categoryController.restore));

router.patch('/:id', asyncHandler(categoryController.update));

router.delete('/:id', asyncHandler(categoryController.destroy));

module.exports = router;
