-- Migration: Remove number_of_rooms column from users table

DO $$
BEGIN
    -- Check if number_of_rooms column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'number_of_rooms'
    ) THEN
        -- Drop the column
        ALTER TABLE users DROP COLUMN number_of_rooms;
        
        RAISE NOTICE 'Removed number_of_rooms column from users table';
    ELSE
        RAISE NOTICE 'number_of_rooms column does not exist in users table';
    END IF;
END $$;
