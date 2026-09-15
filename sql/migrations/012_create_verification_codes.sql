USE simple_user_api;

CREATE TABLE verification_codes (
    id BIGINT UNSIGNED
        NOT NULL
        AUTO_INCREMENT,

    user_id BIGINT UNSIGNED
        NOT NULL,

    purpose ENUM(
        'email_verification',
        'password_reset',
        'password_change',
        'email_change'
    ) NOT NULL,

    code_hash CHAR(64)
        CHARACTER SET ascii
        COLLATE ascii_bin
        NOT NULL,

    target_email VARCHAR(255)
        NULL
        DEFAULT NULL,

    attempt_count TINYINT UNSIGNED
        NOT NULL
        DEFAULT 0,

    expires_at TIMESTAMP
        NOT NULL,

    consumed_at TIMESTAMP
        NULL
        DEFAULT NULL,

    created_at TIMESTAMP
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_verification_codes_lookup (
        user_id,
        purpose,
        id
    ),

    INDEX idx_verification_codes_expiry (
        expires_at
    ),

    CONSTRAINT fk_verification_codes_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;
