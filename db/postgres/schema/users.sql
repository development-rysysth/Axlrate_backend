-- Enable UUID support (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,
    business_email VARCHAR(255) NOT NULL UNIQUE,

    phone_number VARCHAR(50) NOT NULL,
    country VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    hotel_name VARCHAR(255),

    -- Reference hotels using UUID primary key
    hotel_id UUID
        REFERENCES hotels(id)
        ON DELETE SET NULL,

    current_pms VARCHAR(255) NOT NULL,

    business_type VARCHAR(50) NOT NULL
        CHECK (
            business_type IN (
                'Independent Hotel',
                'Chain Hotel',
                'Hotel Management Company',
                'OTA''s'
            )
        ),

    -- Store hashed password only
    password VARCHAR(255) NOT NULL,

    -- Refresh tokens for session management
    refresh_tokens TEXT[] DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_business_email
    ON users(business_email);

CREATE INDEX IF NOT EXISTS idx_users_hotel_id
    ON users(hotel_id);

CREATE INDEX IF NOT EXISTS idx_users_created_at
    ON users(created_at);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on every update
DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON users;

CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();
