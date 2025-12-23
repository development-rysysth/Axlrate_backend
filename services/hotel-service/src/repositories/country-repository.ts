import { getPool } from '../config/database';

export interface CountryData {
  id?: string; // UUID
  name: string;
  iso2: string;
  iso3?: string;
  phoneCode?: string;
  currencyCode?: string;
  isActive?: boolean;
}

export interface StateData {
  id?: string; // UUID
  countryId: string; // UUID
  name: string;
  code: string;
  isActive?: boolean;
}

export interface CityData {
  id?: string; // UUID
  stateId: string; // UUID
  name: string;
  isActive?: boolean;
}

export class CountryRepository {
  /**
   * Get all countries
   * Returns: Array of countries with id, name, and iso2 (iso2 needed for gl parameter lookup)
   */
  async getAllCountries(): Promise<CountryData[]> {
    const pool = getPool();
    
    const query = `
      SELECT id, name, iso2, iso3, phone_code as "phoneCode", currency_code as "currencyCode", is_active as "isActive"
      FROM countries
      WHERE is_active = true
      ORDER BY name
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get country by iso2 code
   * Used to get country code for gl parameter lookup
   */
  async getCountryByCode(countryCode: string): Promise<CountryData | null> {
    const pool = getPool();
    
    const query = `
      SELECT id, name, iso2, iso3, phone_code as "phoneCode", currency_code as "currencyCode", is_active as "isActive"
      FROM countries
      WHERE UPPER(iso2) = UPPER($1) AND is_active = true
      LIMIT 1
    `;

    const result = await pool.query(query, [countryCode]);
    return result.rows[0] || null;
  }

  /**
   * Get country by UUID
   */
  async getCountryById(countryId: string): Promise<CountryData | null> {
    const pool = getPool();
    
    const query = `
      SELECT id, name, iso2, iso3, phone_code as "phoneCode", currency_code as "currencyCode", is_active as "isActive"
      FROM countries
      WHERE id = $1 AND is_active = true
      LIMIT 1
    `;

    const result = await pool.query(query, [countryId]);
    return result.rows[0] || null;
  }

  /**
   * Get states by country iso2 code
   * Returns: Array of states with id and name
   */
  async getStatesByCountryCode(countryCode: string): Promise<StateData[]> {
    const pool = getPool();
    
    const query = `
      SELECT s.id, s.country_id as "countryId", s.name, s.code, s.is_active as "isActive"
      FROM states s
      JOIN countries c ON c.id = s.country_id
      WHERE UPPER(c.iso2) = UPPER($1) AND s.is_active = true AND c.is_active = true
      ORDER BY s.name
    `;

    const result = await pool.query(query, [countryCode]);
    return result.rows;
  }

  /**
   * Get states by country UUID
   */
  async getStatesByCountryId(countryId: string): Promise<StateData[]> {
    const pool = getPool();
    
    const query = `
      SELECT id, country_id as "countryId", name, code, is_active as "isActive"
      FROM states
      WHERE country_id = $1 AND is_active = true
      ORDER BY name
    `;

    const result = await pool.query(query, [countryId]);
    return result.rows;
  }

  /**
   * Get state by name and country iso2 code
   * Used to validate state name exists for the given country
   */
  async getStateByNameAndCountry(stateName: string, countryCode: string): Promise<StateData | null> {
    const pool = getPool();
    
    const query = `
      SELECT s.id, s.country_id as "countryId", s.name, s.code, s.is_active as "isActive"
      FROM states s
      JOIN countries c ON c.id = s.country_id
      WHERE LOWER(s.name) = LOWER($1) AND UPPER(c.iso2) = UPPER($2) AND s.is_active = true AND c.is_active = true
      LIMIT 1
    `;

    const result = await pool.query(query, [stateName, countryCode]);
    return result.rows[0] || null;
  }

  /**
   * Get cities by state UUID
   * Returns: Array of cities with id and name
   */
  async getCitiesByStateId(stateId: string): Promise<CityData[]> {
    const pool = getPool();
    
    const query = `
      SELECT id, state_id as "stateId", name, is_active as "isActive"
      FROM cities
      WHERE state_id = $1 AND is_active = true
      ORDER BY name
    `;

    const result = await pool.query(query, [stateId]);
    return result.rows;
  }

  /**
   * Get cities by state name and country iso2 code
   * Returns: Array of cities with id and name
   */
  async getCitiesByStateAndCountry(stateName: string, countryCode: string): Promise<CityData[]> {
    const pool = getPool();
    
    const query = `
      SELECT ci.id, ci.state_id as "stateId", ci.name, ci.is_active as "isActive"
      FROM cities ci
      JOIN states s ON s.id = ci.state_id
      JOIN countries c ON c.id = s.country_id
      WHERE LOWER(s.name) = LOWER($1) AND UPPER(c.iso2) = UPPER($2) 
        AND ci.is_active = true AND s.is_active = true AND c.is_active = true
      ORDER BY ci.name
    `;

    const result = await pool.query(query, [stateName, countryCode]);
    return result.rows;
  }
}
