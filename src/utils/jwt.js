const { randomUUID } = require('node:crypto');

const jwt = require('jsonwebtoken');

const authConfig = require('../config/auth');

function createAccessToken(user) {
	const accessToken = jwt.sign(
		{
			token_type: 'access',
		},
		authConfig.jwtSecret,
		{
			algorithm: 'HS256',
			subject: String(user.id),
			issuer: authConfig.jwtIssuer,
			audience: authConfig.jwtAudience,
			jwtid: randomUUID(),
			expiresIn: authConfig.jwtExpiresInSeconds,
		}
	);

	return {
		accessToken,
		tokenType: 'Bearer',
		expiresIn: authConfig.jwtExpiresInSeconds,
	};
}

function verifyAccessToken(token) {
	return jwt.verify(token, authConfig.jwtSecret, {
		algorithms: ['HS256'],
		issuer: authConfig.jwtIssuer,
		audience: authConfig.jwtAudience,
	});
}

module.exports = {
	createAccessToken,
	verifyAccessToken,
};
