USE simple_user_api;

ALTER TABLE users
    ADD COLUMN email_verified_at TIMESTAMP
        NULL
        DEFAULT NULL
        AFTER email;

UPDATE users
SET email_verified_at = created_at
WHERE email_verified_at IS NULL;
