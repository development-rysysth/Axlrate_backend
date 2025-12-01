-- Initial database schema migration
-- Run this to set up the initial database structure

-- Enable UUID extension if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Run individual schema files
\i schema/hotels.sql
\i schema/rates.sql
\i schema/ota_rates.sql

