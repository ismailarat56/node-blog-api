const pool = require('../config/database');

async function findLoginUserByEmail(email) {
	const [rows] = await pool.execute(
		`
      SELECT
        id,
        name,
        email,
        password_hash,
        role,
        is_active,
        email_verified_at,
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

async function findAuthenticationStateById(id) {
	const [rows] = await pool.execute(
		`
      SELECT
        id,
        name,
        email,
        role,
        is_active,
        email_verified_at,
        created_at,
        updated_at,
        last_login_at,
        UNIX_TIMESTAMP(
          password_changed_at
        ) AS password_changed_at_epoch
      FROM users
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
		[id]
	);

	if (rows.length === 0) {
		return null;
	}

	const { password_changed_at_epoch: passwordChangedAtEpoch, ...user } = rows[0];

	return {
		user,
		passwordChangedAtEpoch:
			passwordChangedAtEpoch === null ? null : Number(passwordChangedAtEpoch),
	};
}

async function findAuthenticatedUserById(id) {
	const state = await findAuthenticationStateById(id);

	return state ? state.user : null;
}

async function findPasswordHashById(id) {
	const [rows] = await pool.execute(
		`
      SELECT password_hash
      FROM users
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
		[id]
	);

	return rows[0] ? rows[0].password_hash : null;
}

async function findCodeRecipientByEmail(email) {
	const [rows] = await pool.execute(
		`
      SELECT
        id,
        name,
        email,
        is_active,
        email_verified_at
      FROM users
      WHERE email = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
		[email]
	);

	return rows[0] || null;
}

async function markEmailVerified(id) {
	const [result] = await pool.execute(
		`
      UPDATE users
      SET email_verified_at =
        CURRENT_TIMESTAMP
      WHERE id = ?
        AND email_verified_at IS NULL
        AND deleted_at IS NULL
    `,
		[id]
	);

	return result.affectedRows;
}

async function updatePasswordHash(id, passwordHash) {
	const [result] = await pool.execute(
		`
      UPDATE users
      SET
        password_hash = ?,
        password_changed_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
        AND deleted_at IS NULL
    `,
		[passwordHash, id]
	);

	return result.affectedRows;
}

async function resetPasswordHash(id, passwordHash) {
	const [result] = await pool.execute(
		`
      UPDATE users
      SET
        password_hash = ?,
        password_changed_at =
          CURRENT_TIMESTAMP,
        email_verified_at =
          COALESCE(
            email_verified_at,
            CURRENT_TIMESTAMP
          )
      WHERE id = ?
        AND deleted_at IS NULL
    `,
		[passwordHash, id]
	);

	return result.affectedRows;
}

async function updateEmail(id, email) {
	const [result] = await pool.execute(
		`
      UPDATE users
      SET
        email = ?,
        email_verified_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
        AND deleted_at IS NULL
    `,
		[email, id]
	);

	return result.affectedRows;
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
	findAuthenticationStateById,
	findAuthenticatedUserById,
	findPasswordHashById,
	findCodeRecipientByEmail,
	markEmailVerified,
	updatePasswordHash,
	resetPasswordHash,
	updateEmail,
	updateLastLoginAt,
	isAccessTokenRevoked,
	revokeAccessToken,
	deleteExpiredRevocations,
};
