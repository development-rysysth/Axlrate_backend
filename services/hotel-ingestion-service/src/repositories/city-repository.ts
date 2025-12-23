import { getPool } from '../config/database';

export interface CityData {
  country: string;
  state: string;
  city: string;
}

export class CityRepository {
  /**
   * Get city data by city name
   * Joins cities, states, and countries tables
   * 
   * @param cityName - Name of the city
   * @returns City data with country, state, and city names
   */
  async getCityByName(cityName: string): Promise<CityData | null> {
    const pool = getPool();

    const query = `
      SELECT
        c.name AS country,
        s.name AS state,
        ci.name AS city
      FROM cities ci
      JOIN states s ON s.id = ci.state_id
      JOIN countries c ON c.id = s.country_id
      WHERE ci.name = $1
        AND ci.is_active = true
        AND s.is_active = true
        AND c.is_active = true
      LIMIT 1
    `;

    try {
      const result = await pool.query(query, [cityName]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return {
        country: result.rows[0].country,
        state: result.rows[0].state,
        city: result.rows[0].city,
      };
    } catch (error) {
      console.error(`[hotel-ingestion-service] Error fetching city ${cityName}:`, error);
      throw error;
    }
  }
}

