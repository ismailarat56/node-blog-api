const { Router } = require('express');

const authController = require('../controllers/auth.controller');

const verificationController = require('../controllers/verification.controller');

const authenticate = require('../middlewares/authenticate.middleware');

const {
	loginIpLimiter,
	loginAccountLimiter,
	registerLimiter,
	publicCodeMailIpLimiter,
	publicCodeMailEmailLimiter,
	codeCheckIpLimiter,
	codeCheckEmailLimiter,
	accountCodeMailLimiter,
} = require('../middlewares/rate-limiters');

const asyncHandler = require('../utils/async-handler');

const router = Router();

router.post('/login', loginIpLimiter, loginAccountLimiter, asyncHandler(authController.login));

router.post('/register', registerLimiter, asyncHandler(authController.register));

router.post(
	'/email/verify',
	codeCheckIpLimiter,
	codeCheckEmailLimiter,
	asyncHandler(verificationController.verifyEmail)
);

router.post(
	'/email/verify/resend',
	publicCodeMailIpLimiter,
	publicCodeMailEmailLimiter,
	asyncHandler(verificationController.resendEmailVerification)
);

router.post(
	'/password/forgot',
	publicCodeMailIpLimiter,
	publicCodeMailEmailLimiter,
	asyncHandler(verificationController.forgotPassword)
);

router.post(
	'/password/reset',
	codeCheckIpLimiter,
	codeCheckEmailLimiter,
	asyncHandler(verificationController.resetPassword)
);

router.use(asyncHandler(authenticate));

router.get('/me', asyncHandler(authController.me));

router.post('/logout', asyncHandler(authController.logout));

router.post(
	'/password/change-code',
	accountCodeMailLimiter,
	asyncHandler(verificationController.requestPasswordChangeCode)
);

router.patch('/password', asyncHandler(authController.changePassword));

router.post(
	'/email/change',
	accountCodeMailLimiter,
	asyncHandler(verificationController.requestEmailChange)
);

router.post('/email/change/confirm', asyncHandler(verificationController.confirmEmailChange));

module.exports = router;
