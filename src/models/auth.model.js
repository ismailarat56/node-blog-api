const pool = require('../config/database');

async function findLoginUserByEmail(email) {
	const [rows] = await pool.execute(
		`
      SELECT
        id,
        name,
        email,
        password_hash,
        is_active,
        created_at,
        updated_at,
        last_login_at
      FROM users
      WHERE email = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
		[email]
	);

	return rows[0] || null;
}

async function findAuthenticatedUserById(id) {
	const [rows] = await pool.execute(
		`
      SELECT
        id,
        name,
        email,
        is_active,
        created_at,
        updated_at,
        last_login_at
      FROM users
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
		[id]
	);

	return rows[0] || null;
}

async function updateLastLoginAt(id) {
	const [result] = await pool.execute(
		`
      UPDATE users
      SET last_login_at =
        CURRENT_TIMESTAMP
      WHERE id = ?
        AND deleted_at IS NULL
    `,
		[id]
	);

	return result.affectedRows;
}

async function isAccessTokenRevoked(jti) {
	const [rows] = await pool.execute(
		`
      SELECT 1
      FROM revoked_access_tokens
      WHERE jti = ?
        AND expires_at_epoch >
          UNIX_TIMESTAMP()
      LIMIT 1
    `,
		[jti]
	);

	return rows.length > 0;
}

async function revokeAccessToken({ jti, userId, expiresAtEpoch }) {
	const [result] = await pool.execute(
		`
      INSERT INTO revoked_access_tokens (
        jti,
        user_id,
        expires_at_epoch
      )
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        jti = jti
    `,
		[jti, userId, expiresAtEpoch]
	);

	return result.affectedRows;
}

async function deleteExpiredRevocations() {
	const [result] = await pool.execute(
		`
      DELETE FROM revoked_access_tokens
      WHERE expires_at_epoch <=
        UNIX_TIMESTAMP()
    `
	);

	return result.affectedRows;
}

module.exports = {
	findLoginUserByEmail,
	findAuthenticatedUserById,
	updateLastLoginAt,
	isAccessTokenRevoked,
	revokeAccessToken,
	deleteExpiredRevocations,
};
