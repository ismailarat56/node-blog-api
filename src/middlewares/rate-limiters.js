const { rateLimit, keyBy } = require('./rate-limit');

const MINUTE = 60;
const HOUR = 60 * MINUTE;

const loginIpLimiter = rateLimit({
	name: 'login_ip',
	limit: 30,
	windowSeconds: 15 * MINUTE,
	key: keyBy.ip,
});

const loginAccountLimiter = rateLimit({
	name: 'login_account',
	limit: 5,
	windowSeconds: 15 * MINUTE,
	key: keyBy.ipAndEmail,
});

const refreshLimiter = rateLimit({
	name: 'refresh_ip',
	limit: 60,
	windowSeconds: MINUTE,
	key: keyBy.ip,
});

const registerLimiter = rateLimit({
	name: 'register',
	limit: 10,
	windowSeconds: HOUR,
	key: keyBy.ip,
});

const publicCodeMailIpLimiter = rateLimit({
	name: 'public_code_mail_ip',
	limit: 10,
	windowSeconds: 15 * MINUTE,
	key: keyBy.ip,
});

const publicCodeMailEmailLimiter = rateLimit({
	name: 'public_code_mail_email',
	limit: 3,
	windowSeconds: HOUR,
	key: keyBy.email,
});

const codeCheckIpLimiter = rateLimit({
	name: 'code_check_ip',
	limit: 30,
	windowSeconds: 15 * MINUTE,
	key: keyBy.ip,
});

const codeCheckEmailLimiter = rateLimit({
	name: 'code_check_email',
	limit: 10,
	windowSeconds: HOUR,
	key: keyBy.email,
});

const accountCodeMailLimiter = rateLimit({
	name: 'account_code_mail',
	limit: 5,
	windowSeconds: HOUR,
	key: keyBy.user,
});

const commentCreateLimiter = rateLimit({
	name: 'comment_create',
	limit: 10,
	windowSeconds: MINUTE,
	key: keyBy.user,
});

const coverUploadLimiter = rateLimit({
	name: 'cover_upload',
	limit: 20,
	windowSeconds: HOUR,
	key: keyBy.user,
});

module.exports = {
	loginIpLimiter,
	loginAccountLimiter,
	refreshLimiter,
	registerLimiter,
	publicCodeMailIpLimiter,
	publicCodeMailEmailLimiter,
	codeCheckIpLimiter,
	codeCheckEmailLimiter,
	accountCodeMailLimiter,
	commentCreateLimiter,
	coverUploadLimiter,
};
