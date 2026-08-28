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

    created_at TIMESTAMP
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_users_email (email)
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;
