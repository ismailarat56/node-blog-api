USE simple_user_api;

CREATE TABLE comments (
    id BIGINT UNSIGNED
        NOT NULL
        AUTO_INCREMENT,

    post_id BIGINT UNSIGNED
        NOT NULL,

    user_id BIGINT UNSIGNED
        NOT NULL,

    parent_id BIGINT UNSIGNED
        NULL
        DEFAULT NULL,

    body TEXT
        NOT NULL,

    status ENUM('visible', 'hidden')
        NOT NULL
        DEFAULT 'visible',

    edited_at TIMESTAMP
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

    INDEX idx_comments_post_parent_created (
        post_id,
        parent_id,
        created_at
    ),

    INDEX idx_comments_parent_id (
        parent_id
    ),

    INDEX idx_comments_user_id (
        user_id
    ),

    CONSTRAINT fk_comments_post
        FOREIGN KEY (post_id)
        REFERENCES posts(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_comments_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_comments_parent
        FOREIGN KEY (parent_id)
        REFERENCES comments(id)
        ON DELETE RESTRICT
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;
