-- Migration: Add id column to hotels table
-- This adds a SERIAL id column to hotels table for foreign key relationships
-- The existing hotel_id (VARCHAR) remains as the business key

-- Add id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hotels' 
        AND column_name = 'id'
    ) THEN
        -- Add the id column as SERIAL (auto-incrementing integer)
        ALTER TABLE hotels 
        ADD COLUMN id SERIAL;
        
        -- Make it unique (since hotel_id is already the primary key)
        CREATE UNIQUE INDEX IF NOT EXISTS idx_hotels_id ON hotels(id);
        
        -- Populate id with sequential values for existing rows
        -- This ensures existing hotels get an id value
        DO $$
        DECLARE
            rec RECORD;
            counter INTEGER := 1;
        BEGIN
            FOR rec IN SELECT hotel_id FROM hotels ORDER BY hotel_id LOOP
                UPDATE hotels SET id = counter WHERE hotel_id = rec.hotel_id;
                counter := counter + 1;
            END LOOP;
        END $$;
        
        RAISE NOTICE 'id column added successfully to hotels table';
    ELSE
        RAISE NOTICE 'id column already exists in hotels table';
    END IF;
END $$;
