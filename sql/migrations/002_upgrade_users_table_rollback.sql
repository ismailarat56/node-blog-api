USE simple_user_api;

ALTER TABLE users
    DROP COLUMN deleted_at,
    DROP COLUMN updated_at,
    DROP COLUMN is_active;
