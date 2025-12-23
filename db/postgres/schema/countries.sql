-- Countries table schema
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  iso2 CHAR(2) NOT NULL,
  iso3 CHAR(3),
  phone_code VARCHAR(10),
  currency_code CHAR(3),
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT countries_iso2_unique UNIQUE (iso2),
  CONSTRAINT countries_name_unique UNIQUE (name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_countries_iso2 ON countries(iso2);
CREATE INDEX IF NOT EXISTS idx_countries_name ON countries(name);
CREATE INDEX IF NOT EXISTS idx_countries_is_active ON countries(is_active);

