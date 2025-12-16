-- Migration: Add state column to users table
-- This migration adds a state VARCHAR(100) column to store user's state/location

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS state VARCHAR(100);

-- Add index for state if needed for queries
CREATE INDEX IF NOT EXISTS idx_users_state ON users(state);

