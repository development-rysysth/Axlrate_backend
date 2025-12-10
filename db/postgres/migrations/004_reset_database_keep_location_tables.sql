-- Migration: Reset database, keep only countries, states, and cities
-- This migration drops all tables except countries, states, and cities
-- Run this to start fresh with only location data

-- Drop tables that reference hotels or users first (due to foreign key constraints)
DROP TABLE IF EXISTS ota_rates CASCADE;
DROP TABLE IF EXISTS rates CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS hotels CASCADE;

-- Note: countries, states, and cities are kept as they are
-- They will remain in the database
