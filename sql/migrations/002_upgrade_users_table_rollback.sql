USE simple_user_api;

ALTER TABLE users
    DROP INDEX idx_users_active_deleted,
    DROP INDEX idx_users_created_at,
    DROP COLUMN deleted_at,
    DROP COLUMN updated_at,
    DROP COLUMN is_active;
