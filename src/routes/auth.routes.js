const { Router } = require('express');

const authController = require('../controllers/auth.controller');

const authenticate = require('../middlewares/authenticate.middleware');

const asyncHandler = require('../utils/async-handler');

const router = Router();

router.post('/login', asyncHandler(authController.login));

router.post('/register', asyncHandler(authController.register));

router.use(asyncHandler(authenticate));

router.get('/me', asyncHandler(authController.me));

router.post('/logout', asyncHandler(authController.logout));

router.patch('/password', asyncHandler(authController.changePassword));

module.exports = router;
