const { Router } = require('express');

const userController = require('../controllers/user.controller');

const asyncHandler = require('../utils/async-handler');

const router = Router();

router.get('/', asyncHandler(userController.index));

router.get('/:id', asyncHandler(userController.show));

router.post('/', asyncHandler(userController.store));

router.put('/:id', asyncHandler(userController.replace));

router.patch('/:id/restore', asyncHandler(userController.restore));

router.patch('/:id', asyncHandler(userController.update));

router.delete('/:id', asyncHandler(userController.destroy));

module.exports = router;
