function readRequiredString(name, { minByteLength = 1 } = {}) {
	const value = process.env[name];

	if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') < minByteLength) {
		throw new Error(`${name} environment değişkeni geçersiz.`);
	}

	return value;
}

function readInteger(name, defaultValue, { min, max }) {
	const rawValue = process.env[name] ?? String(defaultValue);

	const value = Number(rawValue);

	if (!Number.isInteger(value) || value < min || value > max) {
		throw new Error(`${name} ${min} ile ${max} arasında integer olmalıdır.`);
	}

	return value;
}

const authConfig = Object.freeze({
	jwtSecret: readRequiredString('JWT_SECRET', {
		minByteLength: 32,
	}),

	jwtIssuer: readRequiredString('JWT_ISSUER'),

	jwtAudience: readRequiredString('JWT_AUDIENCE'),

	jwtExpiresInSeconds: readInteger('JWT_EXPIRES_IN_SECONDS', 900, {
		min: 60,
		max: 86_400,
	}),
});

module.exports = authConfig;
