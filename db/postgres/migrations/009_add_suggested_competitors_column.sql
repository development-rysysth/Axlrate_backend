-- Migration: Add suggested_competitors column to hotels table
-- This migration adds a suggested_competitors TEXT[] column to store suggested competitor hotel_ids
-- It migrates existing competitors data to suggested_competitors and clears competitors

-- Add suggested_competitors column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'hotels' 
        AND column_name = 'suggested_competitors'
    ) THEN
        -- Add suggested_competitors column
        ALTER TABLE hotels 
        ADD COLUMN suggested_competitors TEXT[] DEFAULT '{}';
        
        -- Migrate existing competitors data to suggested_competitors
        UPDATE hotels 
        SET suggested_competitors = competitors
        WHERE competitors IS NOT NULL AND array_length(competitors, 1) > 0;
        
        -- Clear competitors column (set to empty array)
        UPDATE hotels 
        SET competitors = '{}'
        WHERE competitors IS NOT NULL;
        
        -- Create GIN index for efficient array operations
        CREATE INDEX IF NOT EXISTS idx_hotels_suggested_competitors ON hotels USING GIN(suggested_competitors);
        
        RAISE NOTICE 'Added suggested_competitors column, migrated existing data, and created index';
    ELSE
        RAISE NOTICE 'suggested_competitors column already exists in hotels table';
    END IF;
END $$;

