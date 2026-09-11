USE simple_user_api;

ALTER TABLE users
    DROP COLUMN password_changed_at;
