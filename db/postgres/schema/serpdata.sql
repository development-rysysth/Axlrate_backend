-- SerpAPI Data table schema
-- Stores SerpAPI responses from Google Hotels API
CREATE TABLE IF NOT EXISTS serpdata (
    id SERIAL PRIMARY KEY,
    
    -- Search metadata and parameters (stored as JSONB for flexibility)
    search_metadata JSONB DEFAULT '{}',
    search_parameters JSONB DEFAULT '{}',
    
    -- Basic hotel information
    type VARCHAR(50),
    name VARCHAR(500),
    description TEXT,
    link TEXT,
    property_token VARCHAR(255),
    serpapi_property_details_link TEXT,
    address TEXT,
    directions TEXT,
    phone VARCHAR(50),
    phone_link VARCHAR(255),
    
    -- GPS coordinates
    gps_latitude DOUBLE PRECISION,
    gps_longitude DOUBLE PRECISION,
    
    -- Check-in/out times
    check_in_time VARCHAR(50),
    check_out_time VARCHAR(50),
    
    -- Pricing information (stored as JSONB for complex nested structure)
    rate_per_night JSONB,
    total_rate JSONB,
    typical_price_range JSONB,
    
    -- Deal information
    deal TEXT,
    deal_description TEXT,
    
    -- Featured prices and prices arrays (stored as JSONB)
    featured_prices JSONB DEFAULT '[]',
    prices JSONB DEFAULT '[]',
    
    -- Nearby places (stored as JSONB array)
    nearby_places JSONB DEFAULT '[]',
    
    -- Hotel classification
    hotel_class VARCHAR(10),
    extracted_hotel_class INTEGER,
    
    -- Images (stored as JSONB array)
    images JSONB DEFAULT '[]',
    
    -- Ratings and reviews
    overall_rating DOUBLE PRECISION,
    reviews INTEGER,
    ratings JSONB DEFAULT '[]',
    location_rating DOUBLE PRECISION,
    reviews_breakdown JSONB DEFAULT '[]',
    other_reviews JSONB DEFAULT '[]',
    
    -- Amenities
    amenities TEXT[] DEFAULT '{}',
    excluded_amenities TEXT[] DEFAULT '{}',
    amenities_detailed JSONB,
    
    -- Health and safety
    health_and_safety JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_serpdata_property_token ON serpdata(property_token);
CREATE INDEX IF NOT EXISTS idx_serpdata_name ON serpdata(name);
CREATE INDEX IF NOT EXISTS idx_serpdata_created_at ON serpdata(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_serpdata_search_params ON serpdata USING GIN(search_parameters);
CREATE INDEX IF NOT EXISTS idx_serpdata_gps ON serpdata(gps_latitude, gps_longitude);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_serpdata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before UPDATE
CREATE TRIGGER trigger_update_serpdata_updated_at
    BEFORE UPDATE ON serpdata
    FOR EACH ROW
    EXECUTE FUNCTION update_serpdata_updated_at();
