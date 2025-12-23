import { getPool } from '../config/database';

export interface HotelRateQuery {
  hotelName: string;
  checkInDate?: string;
  checkOutDate?: string;
  country?: string;
  state?: string;
  city?: string;
  adults?: number;
}

export interface HotelRateResult {
  hotel: {
    id: string;
    hotelKey: string;
    name: string;
    country: string;
    state: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
    starRating: number | null;
    amenities: any;
  };
  rates: Array<{
    date: string;
    price: number;
    currency: string;
    ota: string;
    roomType?: string;
    availability: boolean;
  }>;
}

export class HotelRateRepository {
  private getPool() {
    return getPool();
  }

  /**
   * Search hotels by name with optional location filters
   */
  async searchHotelsByName(
    hotelName: string,
    country?: string,
    state?: string,
    city?: string
  ) {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Hotel name search (case-insensitive)
    conditions.push(`name ILIKE $${paramIndex}`);
    values.push(`%${hotelName}%`);
    paramIndex++;

    // Location filters
    if (country) {
      conditions.push(`country = $${paramIndex}`);
      values.push(country);
      paramIndex++;
    }

    if (state) {
      conditions.push(`state = $${paramIndex}`);
      values.push(state);
      paramIndex++;
    }

    if (city) {
      conditions.push(`city = $${paramIndex}`);
      values.push(city);
      paramIndex++;
    }

    // Only active hotels
    conditions.push(`is_active = true`);

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    const query = `
      SELECT 
        id,
        hotel_key,
        name,
        country,
        state,
        city,
        latitude,
        longitude,
        star_rating,
        amenities
      FROM hotels
      ${whereClause}
      ORDER BY name
      LIMIT 50
    `;

    const result = await this.getPool().query(query, values);
    return result.rows;
  }

  /**
   * Get hotel rates from rates table (placeholder schema)
   * This queries the rates table which stores hotel rate data
   * Schema is flexible and will be finalized later
   */
  async getHotelRatesFromRates(
    hotelId: string,
    checkInDate?: string,
    checkOutDate?: string,
    adults?: number
  ) {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Hotel ID match
    conditions.push(`hotel_id = $${paramIndex}`);
    values.push(hotelId);
    paramIndex++;

    // Date range filters
    if (checkInDate) {
      conditions.push(`check_in_date >= $${paramIndex}`);
      values.push(checkInDate);
      paramIndex++;
    }

    if (checkOutDate) {
      conditions.push(`check_out_date <= $${paramIndex}`);
      values.push(checkOutDate);
      paramIndex++;
    }

    // Adults filter (if stored in rates table)
    if (adults) {
      conditions.push(`adults = $${paramIndex}`);
      values.push(adults);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    const query = `
      SELECT 
        id,
        hotel_id,
        date,
        check_in_date,
        check_out_date,
        price,
        currency,
        ota,
        room_type,
        availability,
        adults,
        created_at
      FROM rates
      ${whereClause}
      ORDER BY date, ota
      LIMIT 100
    `;

    const result = await this.getPool().query(query, values);
    return result.rows;
  }

  /**
   * Get hotel rates by hotel name (searches hotels first, then rates)
   */
  async getHotelRatesByName(
    hotelName: string,
    checkInDate?: string,
    checkOutDate?: string,
    adults?: number
  ) {
    // First find hotels matching the name
    const hotels = await this.searchHotelsByName(hotelName);
    
    if (hotels.length === 0) {
      return [];
    }

    // Get rates for all matching hotels
    const allRates: any[] = [];
    for (const hotel of hotels) {
      const rates = await this.getHotelRatesFromRates(
        hotel.id,
        checkInDate,
        checkOutDate,
        adults
      );
      allRates.push(...rates.map(rate => ({ ...rate, hotel })));
    }

    return allRates;
  }

  /**
   * Get all active hotels for batch processing
   */
  async getAllActiveHotels() {
    const query = `
      SELECT 
        id,
        hotel_key,
        name,
        country,
        state,
        city,
        latitude,
        longitude,
        star_rating
      FROM hotels
      WHERE is_active = true
      ORDER BY name
    `;

    const result = await this.getPool().query(query);
    return result.rows;
  }
}

