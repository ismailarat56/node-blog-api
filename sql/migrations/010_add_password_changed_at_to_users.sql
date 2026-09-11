USE simple_user_api;

ALTER TABLE users
    ADD COLUMN password_changed_at TIMESTAMP
        NULL
        DEFAULT NULL
        AFTER password_hash;
