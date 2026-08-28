USE simple_user_api;

CREATE TABLE user_audit_logs (
    id BIGINT UNSIGNED
        NOT NULL
        AUTO_INCREMENT,

    user_id BIGINT UNSIGNED
        NULL,

    action VARCHAR(50)
        NOT NULL,

    details JSON
        NULL,

    created_at TIMESTAMP
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_user_audit_user_id (
        user_id
    ),

    CONSTRAINT fk_user_audit_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;
