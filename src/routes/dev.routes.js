const { Router } = require('express');
const AppError = require('../utils/app-error');
const { sendSuccess } = require('../utils/response');
const { findLatestMailTo } = require('../utils/dev-mail-outbox');

const router = Router();

router.get('/mail-outbox/latest', (request, response) => {
	const mail = findLatestMailTo(typeof request.query.to === 'string' ? request.query.to : '');

	if (!mail) {
		throw new AppError(404, 'Bu adrese gonderilmis mail yok.', 'DEV_MAIL_NOT_FOUND');
	}

	response.setHeader('Cache-Control', 'no-store');

	return sendSuccess(response, {
		message: 'Son mail.',
		data: mail,
	});
});

module.exports = router;
