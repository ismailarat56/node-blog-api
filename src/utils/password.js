const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');

const { promisify } = require('node:util');

const scryptAsync = promisify(scrypt);

const ALGORITHM = 'scrypt';
const KEY_LENGTH = 64;

const CURRENT_PARAMS = Object.freeze({
	N: 2 ** 15,
	r: 8,
	p: 3,
});

const MIN_MAXMEM = 64 * 1024 * 1024;

function calculateMaxmem(N, r) {
	return Math.max(MIN_MAXMEM, 128 * N * r + 1024 * 1024);
}

function isSafeScryptParams({ N, r, p, keyLength }) {
	const isPowerOfTwo = N > 1 && (N & (N - 1)) === 0;

	return (
		Number.isInteger(N) &&
		isPowerOfTwo &&
		N >= 2 ** 13 &&
		N <= 2 ** 17 &&
		Number.isInteger(r) &&
		r >= 1 &&
		r <= 16 &&
		Number.isInteger(p) &&
		p >= 1 &&
		p <= 10 &&
		keyLength === KEY_LENGTH
	);
}

async function derivePasswordKey(password, salt, { N, r, p, keyLength = KEY_LENGTH }) {
	const derivedKey = await scryptAsync(password, salt, keyLength, {
		N,
		r,
		p,
		maxmem: calculateMaxmem(N, r),
	});

	return Buffer.from(derivedKey);
}

async function hashPassword(password) {
	const salt = randomBytes(16);

	const derivedKey = await derivePasswordKey(password, salt, {
		...CURRENT_PARAMS,
		keyLength: KEY_LENGTH,
	});

	return [
		ALGORITHM,
		CURRENT_PARAMS.N,
		CURRENT_PARAMS.r,
		CURRENT_PARAMS.p,
		KEY_LENGTH,
		salt.toString('hex'),
		derivedKey.toString('hex'),
	].join('$');
}

async function verifyPassword(password, encodedHash) {
	if (typeof encodedHash !== 'string') {
		return false;
	}

	const parts = encodedHash.split('$');

	if (parts.length !== 7) {
		return false;
	}

	const [algorithm, NText, rText, pText, keyLengthText, saltHex, hashHex] = parts;

	if (algorithm !== ALGORITHM) {
		return false;
	}

	const params = {
		N: Number(NText),
		r: Number(rText),
		p: Number(pText),
		keyLength: Number(keyLengthText),
	};

	if (!isSafeScryptParams(params)) {
		return false;
	}

	if (!/^[a-f0-9]+$/i.test(saltHex) || !/^[a-f0-9]+$/i.test(hashHex)) {
		return false;
	}

	const salt = Buffer.from(saltHex, 'hex');

	const storedKey = Buffer.from(hashHex, 'hex');

	if (salt.length < 16 || storedKey.length !== params.keyLength) {
		return false;
	}

	const derivedKey = await derivePasswordKey(password, salt, params);

	if (storedKey.length !== derivedKey.length) {
		return false;
	}

	return timingSafeEqual(storedKey, derivedKey);
}

async function performDummyPasswordWork(password) {
	const dummySalt = Buffer.alloc(16, 0x5a);

	await derivePasswordKey(password, dummySalt, {
		...CURRENT_PARAMS,
		keyLength: KEY_LENGTH,
	});
}

module.exports = {
	hashPassword,
	verifyPassword,
	performDummyPasswordWork,
};
