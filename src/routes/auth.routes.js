const { Router } = require('express');

const authController = require('../controllers/auth.controller');

const verificationController = require('../controllers/verification.controller');

const authenticate = require('../middlewares/authenticate.middleware');

const asyncHandler = require('../utils/async-handler');

const router = Router();

router.post('/login', asyncHandler(authController.login));

router.post('/register', asyncHandler(authController.register));

router.post('/email/verify', asyncHandler(verificationController.verifyEmail));

router.post('/email/verify/resend', asyncHandler(verificationController.resendEmailVerification));

router.post('/password/forgot', asyncHandler(verificationController.forgotPassword));

router.post('/password/reset', asyncHandler(verificationController.resetPassword));

router.use(asyncHandler(authenticate));

router.get('/me', asyncHandler(authController.me));

router.post('/logout', asyncHandler(authController.logout));

router.post('/password/change-code', asyncHandler(verificationController.requestPasswordChangeCode));

router.patch('/password', asyncHandler(authController.changePassword));

router.post('/email/change', asyncHandler(verificationController.requestEmailChange));

router.post('/email/change/confirm', asyncHandler(verificationController.confirmEmailChange));

module.exports = router;
