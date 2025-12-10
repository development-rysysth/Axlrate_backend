-- OTA Rates table schema (for scraped data from OTAs)
CREATE TABLE IF NOT EXISTS ota_rates (
    id SERIAL PRIMARY KEY,
    hotel_id VARCHAR(100) REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    ota_name VARCHAR(50) NOT NULL, -- 'booking', 'expedia', 'agoda', etc.
    room_name VARCHAR(255),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    adults INTEGER DEFAULT 2,
    rate_per_night DECIMAL(10, 2),
    total_rate DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    free_cancellation BOOLEAN DEFAULT FALSE,
    cancellation_until_date DATE,
    cancellation_until_time TIME,
    official_rate BOOLEAN DEFAULT FALSE,
    raw_data JSONB, -- Store full scraped data
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ota_rates_hotel_id ON ota_rates(hotel_id);
CREATE INDEX IF NOT EXISTS idx_ota_rates_ota_name ON ota_rates(ota_name);
CREATE INDEX IF NOT EXISTS idx_ota_rates_dates ON ota_rates(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_ota_rates_scraped_at ON ota_rates(scraped_at);

