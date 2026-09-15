USE simple_user_api;

ALTER TABLE users
    DROP COLUMN email_verified_at;
