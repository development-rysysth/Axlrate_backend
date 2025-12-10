-- Cities/Destinations table schema
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    country_code VARCHAR(10) NOT NULL,
    state_code VARCHAR(50) NOT NULL,
    description TEXT,
    raw_data JSONB, -- Store full raw data from API for reference
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_code) REFERENCES countries(code) ON DELETE CASCADE,
    FOREIGN KEY (state_code, country_code) REFERENCES states(code, country_code) ON DELETE CASCADE,
    UNIQUE(code, country_code, state_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cities_code ON cities(code);
CREATE INDEX IF NOT EXISTS idx_cities_country_code ON cities(country_code);
CREATE INDEX IF NOT EXISTS idx_cities_state_code ON cities(state_code);
CREATE INDEX IF NOT EXISTS idx_cities_country_state ON cities(country_code, state_code);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_created_at ON cities(created_at);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before UPDATE
CREATE TRIGGER trigger_update_cities_updated_at
    BEFORE UPDATE ON cities
    FOR EACH ROW
    EXECUTE FUNCTION update_cities_updated_at();

