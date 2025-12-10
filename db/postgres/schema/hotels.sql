-- Hotels table schema
-- hotel_id is the primary key (VARCHAR) - generated from hotel name and coordinates
CREATE TABLE IF NOT EXISTS hotels (
    hotel_id VARCHAR(100) NOT NULL PRIMARY KEY,
    hotel_name VARCHAR(255) NULL,
    star_rating INTEGER NULL,
    address_full TEXT NULL,
    city VARCHAR(100) NULL,
    zip_code VARCHAR(20) NULL,
    phone VARCHAR(50) NULL,
    gps_lat DOUBLE PRECISION NULL,
    gps_lon DOUBLE PRECISION NULL,
    
    -- Basic amenities
    amenity_wi_fi BOOLEAN NULL DEFAULT FALSE,
    amenity_restaurant BOOLEAN NULL DEFAULT FALSE,
    amenity_breakfast BOOLEAN NULL DEFAULT FALSE,
    amenity_breakfast_buffet BOOLEAN NULL DEFAULT FALSE,
    amenity_smoke_free_property BOOLEAN NULL DEFAULT FALSE,
    amenity_golf BOOLEAN NULL DEFAULT FALSE,
    amenity_game_room BOOLEAN NULL DEFAULT FALSE,
    amenity_front_desk BOOLEAN NULL DEFAULT FALSE,
    amenity_pool BOOLEAN NULL DEFAULT FALSE,
    amenity_hot_tub BOOLEAN NULL DEFAULT FALSE,
    amenity_kid_friendly BOOLEAN NULL DEFAULT FALSE,
    amenity_parking BOOLEAN NULL DEFAULT FALSE,
    amenity_business_center BOOLEAN NULL DEFAULT FALSE,
    amenity_accessible BOOLEAN NULL DEFAULT FALSE,
    amenity_air_conditioning BOOLEAN NULL DEFAULT FALSE,
    amenity_pet_friendly BOOLEAN NULL DEFAULT FALSE,
    
    -- Additional amenities
    amenity_wi_fi_in_public_areas BOOLEAN NULL DEFAULT FALSE,
    amenity_public_internet_workstation BOOLEAN NULL DEFAULT FALSE,
    amenity_table_service BOOLEAN NULL DEFAULT FALSE,
    amenity_buffet_dinner BOOLEAN NULL DEFAULT FALSE,
    amenity_room_service BOOLEAN NULL DEFAULT FALSE,
    amenity_vending_machines BOOLEAN NULL DEFAULT FALSE,
    amenity_credit_cards BOOLEAN NULL DEFAULT FALSE,
    amenity_debit_cards BOOLEAN NULL DEFAULT FALSE,
    amenity_cash BOOLEAN NULL DEFAULT FALSE,
    amenity_checks BOOLEAN NULL DEFAULT FALSE,
    amenity_activities_for_kids BOOLEAN NULL DEFAULT FALSE,
    amenity_self_service_laundry BOOLEAN NULL DEFAULT FALSE,
    amenity_elevator BOOLEAN NULL DEFAULT FALSE,
    amenity_social_hour BOOLEAN NULL DEFAULT FALSE,
    amenity_wake_up_calls BOOLEAN NULL DEFAULT FALSE,
    amenity_housekeeping BOOLEAN NULL DEFAULT FALSE,
    amenity_turndown_service BOOLEAN NULL DEFAULT FALSE,
    amenity_indoor_pool BOOLEAN NULL DEFAULT FALSE,
    amenity_outdoor_pool BOOLEAN NULL DEFAULT FALSE,
    amenity_wading_pool BOOLEAN NULL DEFAULT FALSE,
    amenity_self_parking BOOLEAN NULL DEFAULT FALSE,
    amenity_valet_parking BOOLEAN NULL DEFAULT FALSE,
    amenity_ev_charger BOOLEAN NULL DEFAULT FALSE,
    amenity_fitness_center BOOLEAN NULL DEFAULT FALSE,
    amenity_elliptical_machine BOOLEAN NULL DEFAULT FALSE,
    amenity_treadmill BOOLEAN NULL DEFAULT FALSE,
    amenity_weight_machines BOOLEAN NULL DEFAULT FALSE,
    amenity_free_weights BOOLEAN NULL DEFAULT FALSE,
    amenity_accessible_parking BOOLEAN NULL DEFAULT FALSE,
    amenity_accessible_elevator BOOLEAN NULL DEFAULT FALSE,
    amenity_accessible_pool BOOLEAN NULL DEFAULT FALSE,
    amenity_meeting_rooms BOOLEAN NULL DEFAULT FALSE,
    amenity_english BOOLEAN NULL DEFAULT FALSE,
    amenity_spanish BOOLEAN NULL DEFAULT FALSE,
    amenity_kitchen_in_some_rooms BOOLEAN NULL DEFAULT FALSE,
    amenity_refrigerator BOOLEAN NULL DEFAULT FALSE,
    amenity_microwave BOOLEAN NULL DEFAULT FALSE,
    amenity_coffee_maker BOOLEAN NULL DEFAULT FALSE,
    amenity_minibar_in_some_rooms BOOLEAN NULL DEFAULT FALSE,
    amenity_private_bathroom BOOLEAN NULL DEFAULT FALSE,
    amenity_bathtub_in_some_rooms BOOLEAN NULL DEFAULT FALSE,
    amenity_shower BOOLEAN NULL DEFAULT FALSE,
    amenity_nfc_mobile_payments BOOLEAN NULL DEFAULT FALSE,
    amenity_kitchen BOOLEAN NULL DEFAULT FALSE,
    amenity_casino BOOLEAN NULL DEFAULT FALSE,
    amenity_dogs_allowed BOOLEAN NULL DEFAULT FALSE,
    amenity_cats_allowed BOOLEAN NULL DEFAULT FALSE,
    amenity_bar BOOLEAN NULL DEFAULT FALSE,
    
    -- Reviews and ratings
    review_score DOUBLE PRECISION NULL,
    review_count INTEGER NULL,
    review_tags TEXT NULL,
    
    -- Check-in/out times
    check_in_time VARCHAR(50) NULL,
    check_out_time VARCHAR(50) NULL,
    
    -- JSON fields for flexible data
    nearby_places JSONB NULL,
    amenities_json JSONB NULL
) TABLESPACE pg_default;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hotels_hotel_id ON hotels(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotels_hotel_name ON hotels(hotel_name);
CREATE INDEX IF NOT EXISTS idx_hotels_city ON hotels(city);
CREATE INDEX IF NOT EXISTS idx_hotels_gps ON hotels(gps_lat, gps_lon);
