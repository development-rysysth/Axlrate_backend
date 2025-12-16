-- Migration: Add competitors column to hotels table
-- This migration adds a competitors TEXT[] column to store competitor hotel_ids

-- Add competitors column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'hotels' 
        AND column_name = 'competitors'
    ) THEN
        ALTER TABLE hotels 
        ADD COLUMN competitors TEXT[] DEFAULT '{}';
        
        -- Create GIN index for efficient array operations
        CREATE INDEX IF NOT EXISTS idx_hotels_competitors ON hotels USING GIN(competitors);
        
        RAISE NOTICE 'Added competitors column and index to hotels table';
    ELSE
        RAISE NOTICE 'competitors column already exists in hotels table';
    END IF;
END $$;

