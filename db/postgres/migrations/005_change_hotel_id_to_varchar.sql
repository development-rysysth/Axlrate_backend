-- Migration: Change hotel_id from INTEGER to VARCHAR(100) in rates, ota_rates, and users tables
-- This aligns with the hotels table where hotel_id is VARCHAR(100) (the business key)
-- The foreign key now references hotels(hotel_id) instead of hotels(id)

-- Update users table
DO $$
BEGIN
    -- Check if hotel_id column exists and is INTEGER
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'hotel_id'
        AND data_type = 'integer'
    ) THEN
        -- Drop the foreign key constraint first
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_hotel_id_fkey;
        
        -- Change column type to VARCHAR(100)
        ALTER TABLE users 
        ALTER COLUMN hotel_id TYPE VARCHAR(100) USING hotel_id::VARCHAR(100);
        
        -- Recreate foreign key constraint referencing hotels(hotel_id)
        ALTER TABLE users 
        ADD CONSTRAINT users_hotel_id_fkey 
        FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id) ON DELETE SET NULL;
        
        RAISE NOTICE 'users.hotel_id changed from INTEGER to VARCHAR(100)';
    ELSE
        RAISE NOTICE 'users.hotel_id is already VARCHAR or does not exist';
    END IF;
END $$;

-- Update rates table
DO $$
BEGIN
    -- Check if hotel_id column exists and is INTEGER
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'rates' 
        AND column_name = 'hotel_id'
        AND data_type = 'integer'
    ) THEN
        -- Drop the foreign key constraint first
        ALTER TABLE rates DROP CONSTRAINT IF EXISTS rates_hotel_id_fkey;
        
        -- Drop the unique constraint if it exists (will recreate later)
        ALTER TABLE rates DROP CONSTRAINT IF EXISTS rates_hotel_id_source_check_in_date_check_out_date_adults_key;
        
        -- Change column type to VARCHAR(100)
        ALTER TABLE rates 
        ALTER COLUMN hotel_id TYPE VARCHAR(100) USING hotel_id::VARCHAR(100);
        
        -- Recreate foreign key constraint referencing hotels(hotel_id)
        ALTER TABLE rates 
        ADD CONSTRAINT rates_hotel_id_fkey 
        FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id) ON DELETE CASCADE;
        
        -- Recreate unique constraint
        ALTER TABLE rates 
        ADD CONSTRAINT rates_hotel_id_source_check_in_date_check_out_date_adults_key 
        UNIQUE(hotel_id, source, check_in_date, check_out_date, adults);
        
        RAISE NOTICE 'rates.hotel_id changed from INTEGER to VARCHAR(100)';
    ELSE
        RAISE NOTICE 'rates.hotel_id is already VARCHAR or does not exist';
    END IF;
END $$;

-- Update ota_rates table
DO $$
BEGIN
    -- Check if hotel_id column exists and is INTEGER
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ota_rates' 
        AND column_name = 'hotel_id'
        AND data_type = 'integer'
    ) THEN
        -- Drop the foreign key constraint first
        ALTER TABLE ota_rates DROP CONSTRAINT IF EXISTS ota_rates_hotel_id_fkey;
        
        -- Change column type to VARCHAR(100)
        ALTER TABLE ota_rates 
        ALTER COLUMN hotel_id TYPE VARCHAR(100) USING hotel_id::VARCHAR(100);
        
        -- Recreate foreign key constraint referencing hotels(hotel_id)
        ALTER TABLE ota_rates 
        ADD CONSTRAINT ota_rates_hotel_id_fkey 
        FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id) ON DELETE CASCADE;
        
        RAISE NOTICE 'ota_rates.hotel_id changed from INTEGER to VARCHAR(100)';
    ELSE
        RAISE NOTICE 'ota_rates.hotel_id is already VARCHAR or does not exist';
    END IF;
END $$;
