const { Router } = require('express');

const userController = require('../controllers/user.controller');

const router = Router();

router.get('/', userController.index);

router.get('/:id', userController.show);

router.post('/', userController.store);

router.put('/:id', userController.replace);

router.delete('/:id', userController.destroy);

module.exports = router;
