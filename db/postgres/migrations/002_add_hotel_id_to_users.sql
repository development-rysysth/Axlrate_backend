-- Migration: Add hotel_id column to users table
-- This migration adds the missing hotel_id foreign key column
-- Run this if the users table exists but is missing the hotel_id column

-- Check if hotels table exists first (required for foreign key)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'hotels'
    ) THEN
        RAISE EXCEPTION 'hotels table does not exist. Please create hotels table first.';
    END IF;
END $$;

-- Add hotel_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'hotel_id'
    ) THEN
        -- Add the column as VARCHAR(100) to match hotels.hotel_id
        ALTER TABLE users 
        ADD COLUMN hotel_id VARCHAR(100) REFERENCES hotels(hotel_id) ON DELETE SET NULL;
        
        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_users_hotel_id ON users(hotel_id);
        
        RAISE NOTICE 'hotel_id column added successfully to users table';
    ELSE
        RAISE NOTICE 'hotel_id column already exists in users table';
    END IF;
END $$;
