-- Users table schema
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    business_email VARCHAR(255) NOT NULL UNIQUE,
    country VARCHAR(100) NOT NULL,
    hotel_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    current_pms VARCHAR(255) NOT NULL,
    business_type VARCHAR(50) NOT NULL CHECK (business_type IN ('Independent Hotel', 'Chain Hotel', 'Hotel Management Company', 'OTA''s')),
    number_of_rooms INTEGER NOT NULL CHECK (number_of_rooms >= 1),
    password VARCHAR(255) NOT NULL,
    refresh_tokens TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_business_email ON users(business_email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before UPDATE
CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

