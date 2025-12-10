-- Rates table schema
CREATE TABLE IF NOT EXISTS rates (
    id SERIAL PRIMARY KEY,
    hotel_id VARCHAR(100) REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    source VARCHAR(100) NOT NULL, -- 'serpapi', 'booking', 'expedia', etc.
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    adults INTEGER DEFAULT 2,
    rate_per_night_lowest DECIMAL(10, 2),
    rate_per_night_highest DECIMAL(10, 2),
    total_rate_lowest DECIMAL(10, 2),
    total_rate_highest DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    raw_data JSONB, -- Store full raw data for reference
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hotel_id, source, check_in_date, check_out_date, adults)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rates_hotel_id ON rates(hotel_id);
CREATE INDEX IF NOT EXISTS idx_rates_source ON rates(source);
CREATE INDEX IF NOT EXISTS idx_rates_dates ON rates(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_rates_created_at ON rates(created_at);

