-- States table schema
CREATE TABLE IF NOT EXISTS states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  code CHAR(2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT states_country_fk
    FOREIGN KEY (country_id)
    REFERENCES countries(id)
    ON DELETE RESTRICT,
  CONSTRAINT states_country_code_unique
    UNIQUE (country_id, code),
  CONSTRAINT states_country_name_unique
    UNIQUE (country_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_states_country_id ON states(country_id);
CREATE INDEX IF NOT EXISTS idx_states_code ON states(code);
CREATE INDEX IF NOT EXISTS idx_states_name ON states(name);
CREATE INDEX IF NOT EXISTS idx_states_is_active ON states(is_active);

