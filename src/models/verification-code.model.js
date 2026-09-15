const pool = require('../config/database');

async function findPendingCodeAge({ userId, purpose }) {
	const [rows] = await pool.execute(
		`
      SELECT TIMESTAMPDIFF(
        SECOND,
        created_at,
        CURRENT_TIMESTAMP
      ) AS age_seconds
      FROM verification_codes
      WHERE user_id = ?
        AND purpose = ?
        AND consumed_at IS NULL
      ORDER BY id DESC
      LIMIT 1
    `,
		[userId, purpose]
	);

	return rows[0] ? Number(rows[0].age_seconds) : null;
}

async function invalidatePendingCodes({ userId, purpose }) {
	const [result] = await pool.execute(
		`
      UPDATE verification_codes
      SET consumed_at =
        CURRENT_TIMESTAMP
      WHERE user_id = ?
        AND purpose = ?
        AND consumed_at IS NULL
    `,
		[userId, purpose]
	);

	return result.affectedRows;
}

async function createCode({ userId, purpose, codeHash, targetEmail, ttlSeconds }) {
	const [result] = await pool.execute(
		`
      INSERT INTO verification_codes (
        user_id,
        purpose,
        code_hash,
        target_email,
        expires_at
      )
      VALUES (
        ?, ?, ?, ?,
        DATE_ADD(
          CURRENT_TIMESTAMP,
          INTERVAL ? SECOND
        )
      )
    `,
		[userId, purpose, codeHash, targetEmail, ttlSeconds]
	);

	return result.insertId;
}

async function findLatestLiveCode({ userId, purpose }) {
	const [rows] = await pool.execute(
		`
      SELECT
        id,
        code_hash,
        target_email
      FROM verification_codes
      WHERE user_id = ?
        AND purpose = ?
        AND consumed_at IS NULL
        AND expires_at >
          CURRENT_TIMESTAMP
      ORDER BY id DESC
      LIMIT 1
    `,
		[userId, purpose]
	);

	return rows[0] || null;
}

async function reserveAttempt({ id, maxAttempts }) {
	const [result] = await pool.execute(
		`
      UPDATE verification_codes
      SET attempt_count =
        attempt_count + 1
      WHERE id = ?
        AND consumed_at IS NULL
        AND expires_at >
          CURRENT_TIMESTAMP
        AND attempt_count < ?
    `,
		[id, maxAttempts]
	);

	return result.affectedRows;
}

async function consumeCode(id) {
	const [result] = await pool.execute(
		`
      UPDATE verification_codes
      SET consumed_at =
        CURRENT_TIMESTAMP
      WHERE id = ?
        AND consumed_at IS NULL
    `,
		[id]
	);

	return result.affectedRows;
}

module.exports = {
	findPendingCodeAge,
	invalidatePendingCodes,
	createCode,
	findLatestLiveCode,
	reserveAttempt,
	consumeCode,
};
