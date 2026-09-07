USE simple_user_api;

ALTER TABLE users
    ADD COLUMN role ENUM('user', 'admin')
        NOT NULL
        DEFAULT 'user'
        AFTER password_hash,

    ADD INDEX idx_users_role (
        role
    );
