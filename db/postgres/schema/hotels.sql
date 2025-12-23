-- Hotels table schema
-- id is the primary key (UUID) - auto-generated
CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_key VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  country VARCHAR(100) NOT NULL,
  state   VARCHAR(100) NOT NULL,
  city    VARCHAR(100) NOT NULL,
  latitude  DECIMAL(9,6),
  longitude DECIMAL(9,6),
  star_rating NUMERIC(2,1),
  nearby_places JSONB,
  amenities JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hotels_id ON hotels(id);
CREATE INDEX IF NOT EXISTS idx_hotels_hotel_key ON hotels(hotel_key);
CREATE INDEX IF NOT EXISTS idx_hotels_name ON hotels(name);
CREATE INDEX IF NOT EXISTS idx_hotels_country ON hotels(country);
CREATE INDEX IF NOT EXISTS idx_hotels_state ON hotels(state);
CREATE INDEX IF NOT EXISTS idx_hotels_city ON hotels(city);
CREATE INDEX IF NOT EXISTS idx_hotels_geo ON hotels(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_hotels_amenities ON hotels USING GIN(amenities);
CREATE INDEX IF NOT EXISTS idx_hotels_nearby_places ON hotels USING GIN(nearby_places);
CREATE INDEX IF NOT EXISTS idx_hotels_is_active ON hotels(is_active);
