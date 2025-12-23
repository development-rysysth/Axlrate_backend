import { HotelRepository } from '../repositories/hotel-repository';
import { getPool } from '../config/database';

const hotelRepository = new HotelRepository();

/**
 * Find competitors for a hotel (database-only)
 * TODO: Replace random selection with logic based on star rating and distance
 */
export async function findCompetitors(
  hotelId: string,
  hotelClass: number | null,
  city?: string
): Promise<string[]> {
  if (!city) {
    console.log('Cannot find competitors: missing city');
    return [];
  }

  try {
    const pool = getPool();
    
    // Query for random hotels in the same city, excluding the current hotel
    // TODO: Replace RANDOM() with logic based on star rating and distance
    const query = `
      SELECT id
      FROM hotels
      WHERE LOWER(city) = LOWER($1)
        AND (id::text != $2 AND hotel_key != $2)
        AND is_active = true
      ORDER BY RANDOM()
      LIMIT 5
    `;

    const result = await pool.query(query, [city, hotelId]);
    
    const competitorIds = result.rows.map((row: any) => row.id);
    
    console.log(`Found ${competitorIds.length} competitors in ${city} for hotel ${hotelId}`);
    
    return competitorIds;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Failed to find competitors: ${errorMessage}`);
    return [];
  }
}

/**
 * Store suggested competitors for a hotel
 * Competitors are stored in suggested_competitors initially
 */
export async function storeCompetitors(hotelId: string, competitorIds: string[]): Promise<void> {
  try {
    await hotelRepository.updateSuggestedCompetitors(hotelId, competitorIds);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to store suggested competitors: ${errorMessage}`);
  }
}

