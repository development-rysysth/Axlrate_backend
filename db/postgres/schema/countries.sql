-- Countries table schema
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    iso_code VARCHAR(10),
    country_name_from_states VARCHAR(255), -- Name extracted from states in raw_data
    raw_data JSONB, -- Store full raw data from API for reference
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_name ON countries(name);
CREATE INDEX IF NOT EXISTS idx_countries_created_at ON countries(created_at);
CREATE INDEX IF NOT EXISTS idx_countries_country_name_from_states ON countries(country_name_from_states);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_countries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before UPDATE
CREATE TRIGGER trigger_update_countries_updated_at
    BEFORE UPDATE ON countries
    FOR EACH ROW
    EXECUTE FUNCTION update_countries_updated_at();

-- Migration: Add country_name_from_states column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'countries' 
        AND column_name = 'country_name_from_states'
    ) THEN
        ALTER TABLE countries ADD COLUMN country_name_from_states VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_countries_country_name_from_states ON countries(country_name_from_states);
    END IF;
END $$;

