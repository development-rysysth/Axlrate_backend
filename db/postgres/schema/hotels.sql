-- Hotels table schema
CREATE TABLE IF NOT EXISTS hotels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    property_token VARCHAR(255) UNIQUE,
    address TEXT,
    phone VARCHAR(50),
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    hotel_class VARCHAR(10),
    overall_rating DECIMAL(3, 2),
    reviews_count INTEGER DEFAULT 0,
    description TEXT,
    check_in_time VARCHAR(20),
    check_out_time VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hotels_property_token ON hotels(property_token);
CREATE INDEX IF NOT EXISTS idx_hotels_name ON hotels(name);
CREATE INDEX IF NOT EXISTS idx_hotels_created_at ON hotels(created_at);

