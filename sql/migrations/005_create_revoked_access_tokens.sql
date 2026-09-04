USE simple_user_api;

CREATE TABLE revoked_access_tokens (
    jti CHAR(36)
        CHARACTER SET ascii
        COLLATE ascii_bin
        NOT NULL,

    user_id BIGINT UNSIGNED
        NOT NULL,

    expires_at_epoch BIGINT UNSIGNED
        NOT NULL,

    revoked_at TIMESTAMP
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (jti),

    INDEX idx_revoked_access_tokens_user_id (
        user_id
    ),

    INDEX idx_revoked_access_tokens_expiry (
        expires_at_epoch
    ),

    CONSTRAINT fk_revoked_access_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;
