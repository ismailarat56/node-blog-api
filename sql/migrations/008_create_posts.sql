USE simple_user_api;

CREATE TABLE posts (
    id BIGINT UNSIGNED
        NOT NULL
        AUTO_INCREMENT,

    user_id BIGINT UNSIGNED
        NOT NULL,

    category_id BIGINT UNSIGNED
        NOT NULL,

    title VARCHAR(200)
        NOT NULL,

    slug VARCHAR(220)
        NOT NULL,

    excerpt VARCHAR(500)
        NULL,

    content MEDIUMTEXT
        NOT NULL,

    status ENUM('draft', 'published')
        NOT NULL
        DEFAULT 'draft',

    published_at TIMESTAMP
        NULL
        DEFAULT NULL,

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

    UNIQUE INDEX uq_posts_slug (
        slug
    ),

    INDEX idx_posts_user_id (
        user_id
    ),

    INDEX idx_posts_category_id (
        category_id
    ),

    INDEX idx_posts_status_published_at (
        status,
        published_at
    ),

    INDEX idx_posts_deleted_created (
        deleted_at,
        created_at
    ),

    CONSTRAINT fk_posts_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_posts_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE RESTRICT
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;
