-- Cities table schema
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT cities_state_fk
    FOREIGN KEY (state_id)
    REFERENCES states(id)
    ON DELETE RESTRICT,
  CONSTRAINT cities_state_name_unique
    UNIQUE (state_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cities_state_id ON cities(state_id);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_is_active ON cities(is_active);

