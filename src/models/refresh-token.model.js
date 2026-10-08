const pool = require('../config/database');

async function insertRefreshToken({ userId, familyId, tokenHash, ttlSeconds }, executor = pool) {
	await executor.execute(
		`
      INSERT INTO refresh_tokens (
        user_id,
        family_id,
        token_hash,
        expires_at
      )
      VALUES (
        ?,
        ?,
        ?,
        DATE_ADD(
          CURRENT_TIMESTAMP,
          INTERVAL ? SECOND
        )
      )
    `,
		[userId, familyId, tokenHash, ttlSeconds]
	);
}

async function findRefreshTokenForUpdate(tokenHash, executor) {
	const [rows] = await executor.execute(
		`
      SELECT
        id,
        user_id,
        family_id,
        used_at,
        revoked_at,
        expires_at <= CURRENT_TIMESTAMP AS is_expired
      FROM refresh_tokens
      WHERE token_hash = ?
      LIMIT 1
      FOR UPDATE
    `,
		[tokenHash]
	);

	return rows[0] || null;
}

async function findRefreshTokenByHash(tokenHash) {
	const [rows] = await pool.execute(
		`
      SELECT
        id,
        user_id,
        family_id
      FROM refresh_tokens
      WHERE token_hash = ?
      LIMIT 1
    `,
		[tokenHash]
	);

	return rows[0] || null;
}

async function markRefreshTokenUsed(id, executor) {
	const [result] = await executor.execute(
		`
      UPDATE refresh_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND used_at IS NULL
    `,
		[id]
	);

	return result.affectedRows;
}

async function revokeRefreshFamily(familyId, executor = pool) {
	const [result] = await executor.execute(
		`
      UPDATE refresh_tokens
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE family_id = ?
        AND revoked_at IS NULL
    `,
		[familyId]
	);

	return result.affectedRows;
}

async function revokeUserRefreshTokens(userId) {
	const [result] = await pool.execute(
		`
      UPDATE refresh_tokens
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
        AND revoked_at IS NULL
    `,
		[userId]
	);

	return result.affectedRows;
}

module.exports = {
	insertRefreshToken,
	findRefreshTokenForUpdate,
	findRefreshTokenByHash,
	markRefreshTokenUsed,
	revokeRefreshFamily,
	revokeUserRefreshTokens,
};
