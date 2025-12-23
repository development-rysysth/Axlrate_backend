import { getPool } from '../config/database';
import { HotelData } from '../utils/field-mapper';

export class HotelRepository {
  /**
   * Upsert hotel data using hotel_key
   * Uses ON CONFLICT to update existing hotels or insert new ones
   * Sets is_active = true on upsert
   * 
   * @param hotelData - Hotel data to upsert
   */
  async upsertHotel(hotelData: HotelData): Promise<void> {
    const pool = getPool();

    const query = `
      INSERT INTO hotels (
        hotel_key,
        name,
        description,
        country,
        state,
        city,
        latitude,
        longitude,
        star_rating,
        check_in_time,
        check_out_time,
        nearby_places,
        amenities
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13
      )
      ON CONFLICT (hotel_key)
      DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        star_rating = EXCLUDED.star_rating,
        check_in_time = EXCLUDED.check_in_time,
        check_out_time = EXCLUDED.check_out_time,
        nearby_places = EXCLUDED.nearby_places,
        amenities = EXCLUDED.amenities,
        is_active = true
    `;

    try {
      await pool.query(query, [
        hotelData.hotel_key,
        hotelData.name,
        hotelData.description,
        hotelData.country,
        hotelData.state,
        hotelData.city,
        hotelData.latitude,
        hotelData.longitude,
        hotelData.star_rating,
        hotelData.check_in_time,
        hotelData.check_out_time,
        hotelData.nearby_places ? JSON.stringify(hotelData.nearby_places) : null,
        hotelData.amenities ? JSON.stringify(hotelData.amenities) : null,
      ]);
    } catch (error) {
      console.error(`[hotel-ingestion-service] Error upserting hotel ${hotelData.hotel_key}:`, error);
      throw error;
    }
  }
}

