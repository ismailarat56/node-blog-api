CREATE DATABASE IF NOT EXISTS simple_user_api
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE simple_user_api;


CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED
        NOT NULL
        AUTO_INCREMENT,

    name VARCHAR(100)
        NOT NULL,

    email VARCHAR(255)
        NOT NULL,

    email_verified_at TIMESTAMP
        NULL
        DEFAULT NULL,

    password_hash VARCHAR(255)
        NULL,

    password_changed_at TIMESTAMP
        NULL
        DEFAULT NULL,

    role ENUM('user', 'admin')
        NOT NULL
        DEFAULT 'user',

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

    last_login_at TIMESTAMP
        NULL
        DEFAULT NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uq_users_email (
        email
    ),

    INDEX idx_users_role (
        role
    ),

    INDEX idx_users_active_deleted (
        is_active,
        deleted_at
    ),

    INDEX idx_users_created_at (
        created_at
    )
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS user_audit_logs (
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


CREATE TABLE IF NOT EXISTS revoked_access_tokens (
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


CREATE TABLE IF NOT EXISTS categories (
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

    UNIQUE KEY uq_categories_slug (
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


CREATE TABLE IF NOT EXISTS posts (
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


CREATE TABLE IF NOT EXISTS comments (
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


CREATE TABLE IF NOT EXISTS verification_codes (
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
