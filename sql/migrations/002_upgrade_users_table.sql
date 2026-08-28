USE simple_user_api;

ALTER TABLE users
    ADD COLUMN is_active TINYINT(1)
        NOT NULL
        DEFAULT 1
        AFTER email,

    ADD COLUMN updated_at TIMESTAMP
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
        AFTER created_at,

    ADD COLUMN deleted_at TIMESTAMP
        NULL
        DEFAULT NULL
        AFTER updated_at;
