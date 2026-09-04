USE simple_user_api;

ALTER TABLE users
    ADD COLUMN password_hash VARCHAR(255)
        NULL
        AFTER email,

    ADD COLUMN last_login_at TIMESTAMP
        NULL
        DEFAULT NULL
        AFTER deleted_at;
