import { getPool } from '../config/database';

export interface CountryData {
  id?: number;
  code: string;
  name: string;
  description?: string;
  isoCode?: string;
  rawData?: unknown;
}

export interface StateData {
  id?: number;
  code: string;
  name: string;
  countryCode: string;
  description?: string;
  rawData?: unknown;
}

export class CountryRepository {
  /**
   * Get all countries
   * Returns: Array of countries with id, name, and code (code needed for gl parameter lookup)
   */
  async getAllCountries(): Promise<CountryData[]> {
    const pool = getPool();
    
    const query = `
      SELECT id, code, name, description, iso_code as "isoCode", raw_data as "rawData"
      FROM countries
      ORDER BY name
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get country by code
   * Used to get country code for gl parameter lookup
   */
  async getCountryByCode(countryCode: string): Promise<CountryData | null> {
    const pool = getPool();
    
    const query = `
      SELECT id, code, name, description, iso_code as "isoCode", raw_data as "rawData"
      FROM countries
      WHERE code = $1
      LIMIT 1
    `;

    const result = await pool.query(query, [countryCode]);
    return result.rows[0] || null;
  }

  /**
   * Get states by country code
   * Returns: Array of states with id and name (removed code from response, using name only)
   */
  async getStatesByCountryCode(countryCode: string): Promise<StateData[]> {
    const pool = getPool();
    
    const query = `
      SELECT id, code, name, country_code as "countryCode", description, raw_data as "rawData"
      FROM states
      WHERE country_code = $1
      ORDER BY name
    `;

    const result = await pool.query(query, [countryCode]);
    return result.rows;
  }

  /**
   * Get state by name and country code
   * Used to validate state name exists for the given country
   */
  async getStateByNameAndCountry(stateName: string, countryCode: string): Promise<StateData | null> {
    const pool = getPool();
    
    const query = `
      SELECT id, code, name, country_code as "countryCode", description, raw_data as "rawData"
      FROM states
      WHERE LOWER(name) = LOWER($1) AND country_code = $2
      LIMIT 1
    `;

    const result = await pool.query(query, [stateName, countryCode]);
    return result.rows[0] || null;
  }
}
