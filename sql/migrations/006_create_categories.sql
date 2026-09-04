USE simple_user_api;

CREATE TABLE categories (
    id BIGINT UNSIGNED
        NOT NULL
        AUTO_INCREMENT,

    name VARCHAR(100)
        NOT NULL,

    slug VARCHAR(120)
        NOT NULL,

    description TEXT
        NULL,

    is_active TINYINT(1)
        NOT NULL
        DEFAULT 1,

    created_at TIMESTAMP
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    deleted_at TIMESTAMP
        NULL
        DEFAULT NULL,

    PRIMARY KEY (id),

    UNIQUE INDEX uq_categories_slug (
        slug
    ),

    INDEX idx_categories_active_deleted (
        is_active,
        deleted_at
    ),

    INDEX idx_categories_created_at (
        created_at
    )
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;
