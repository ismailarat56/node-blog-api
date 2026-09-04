USE simple_user_api;

ALTER TABLE users
    DROP COLUMN last_login_at,
    DROP COLUMN password_hash;
