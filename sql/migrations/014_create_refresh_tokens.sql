CREATE TABLE refresh_tokens (
    id BIGINT UNSIGNED
        NOT NULL
        AUTO_INCREMENT,

    user_id BIGINT UNSIGNED
        NOT NULL,

    family_id CHAR(36)
        CHARACTER SET ascii
        COLLATE ascii_bin
        NOT NULL,

    token_hash CHAR(64)
        CHARACTER SET ascii
        COLLATE ascii_bin
        NOT NULL,

    expires_at TIMESTAMP
        NOT NULL,

    used_at TIMESTAMP
        NULL
        DEFAULT NULL,

    revoked_at TIMESTAMP
        NULL
        DEFAULT NULL,

    created_at TIMESTAMP
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE INDEX uq_refresh_tokens_hash (
        token_hash
    ),

    INDEX idx_refresh_tokens_family (
        family_id
    ),

    INDEX idx_refresh_tokens_user (
        user_id
    ),

    INDEX idx_refresh_tokens_expiry (
        expires_at
    ),

    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;
