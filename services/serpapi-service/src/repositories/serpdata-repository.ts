import { Pool } from 'pg';
import { getPool } from '../config/database';
import { ISerpData } from '../types/serpdata';
import { WHITELIST_OTAS } from '../../../../shared';

export class SerpDataRepository {
  /**
   * Get the PostgreSQL pool (lazy initialization)
   * This ensures the pool is available when methods are called, not at construction time
   */
  private getPool(): Pool {
    return getPool();
  }

  /**
   * Find one serpdata record by query
   * Supports querying by property_token, name, and search_parameters
   */
  async findOne(query: any): Promise<any> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Handle property_token
    if (query.property_token) {
      conditions.push(`property_token = $${paramIndex}`);
      values.push(query.property_token);
      paramIndex++;
    }

    // Handle name
    if (query.name) {
      conditions.push(`name = $${paramIndex}`);
      values.push(query.name);
      paramIndex++;
    }

    // Handle $or conditions (MongoDB-style query compatibility)
    if (query.$or && Array.isArray(query.$or)) {
      const orConditions: string[] = [];
      for (const orQuery of query.$or) {
        if (orQuery.property_token) {
          orConditions.push(`property_token = $${paramIndex}`);
          values.push(orQuery.property_token);
          paramIndex++;
        }
        if (orQuery.name) {
          orConditions.push(`name = $${paramIndex}`);
          values.push(orQuery.name);
          paramIndex++;
        }
      }
      if (orConditions.length > 0) {
        conditions.push(`(${orConditions.join(' OR ')})`);
      }
    }

    // Handle search_parameters date range queries
    if (query['search_parameters.check_in_date']) {
      const dateRange = query['search_parameters.check_in_date'];
      if (dateRange.$gte && dateRange.$lte) {
        conditions.push(`(search_parameters->>'check_in_date')::date BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        values.push(dateRange.$gte.toISOString().split('T')[0]);
        values.push(dateRange.$lte.toISOString().split('T')[0]);
        paramIndex += 2;
      }
    }

    if (query['search_parameters.check_out_date']) {
      const dateRange = query['search_parameters.check_out_date'];
      if (dateRange.$gte && dateRange.$lte) {
        conditions.push(`(search_parameters->>'check_out_date')::date BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        values.push(dateRange.$gte.toISOString().split('T')[0]);
        values.push(dateRange.$lte.toISOString().split('T')[0]);
        paramIndex += 2;
      }
    }

    if (query['search_parameters.adults']) {
      conditions.push(`(search_parameters->>'adults')::integer = $${paramIndex}`);
      values.push(query['search_parameters.adults']);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM serpdata ${whereClause} LIMIT 1`;

    const result = await this.getPool().query(sql, values);
    return result.rows[0] || null;
  }

  /**
   * Create a new serpdata record
   */
  async create(data: Partial<ISerpData>): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    // Helper to add field
    const addField = (fieldName: string, value: any, dbFieldName?: string) => {
      if (value !== undefined && value !== null) {
        fields.push(dbFieldName || fieldName);
        values.push(value);
        placeholders.push(`$${paramIndex}`);
        paramIndex++;
      }
    };

    // Add all fields
    addField('search_metadata', data.search_metadata);
    addField('search_parameters', data.search_parameters);
    addField('type', data.type);
    addField('name', data.name);
    addField('description', data.description);
    addField('link', data.link);
    addField('property_token', data.property_token);
    addField('serpapi_property_details_link', data.serpapi_property_details_link);
    addField('address', data.address);
    addField('directions', data.directions);
    addField('phone', data.phone);
    addField('phone_link', data.phone_link);
    
    // GPS coordinates
    if (data.gps_coordinates) {
      addField('gps_latitude', data.gps_coordinates.latitude);
      addField('gps_longitude', data.gps_coordinates.longitude);
    }

    addField('check_in_time', data.check_in_time);
    addField('check_out_time', data.check_out_time);
    addField('rate_per_night', JSON.stringify(data.rate_per_night));
    addField('total_rate', JSON.stringify(data.total_rate));
    addField('typical_price_range', JSON.stringify(data.typical_price_range));
    addField('deal', data.deal);
    addField('deal_description', data.deal_description);
    addField('featured_prices', JSON.stringify(data.featured_prices));
    addField('prices', JSON.stringify(data.prices));
    addField('nearby_places', JSON.stringify(data.nearby_places));
    addField('hotel_class', data.hotel_class);
    addField('extracted_hotel_class', data.extracted_hotel_class);
    addField('images', JSON.stringify(data.images));
    addField('overall_rating', data.overall_rating);
    addField('reviews', data.reviews);
    addField('ratings', JSON.stringify(data.ratings));
    addField('location_rating', data.location_rating);
    addField('reviews_breakdown', JSON.stringify(data.reviews_breakdown));
    addField('other_reviews', JSON.stringify(data.other_reviews));
    addField('amenities', data.amenities);
    addField('excluded_amenities', data.excluded_amenities);
    addField('amenities_detailed', JSON.stringify(data.amenities_detailed));
    addField('health_and_safety', JSON.stringify(data.health_and_safety));

    const sql = `
      INSERT INTO serpdata (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await this.getPool().query(sql, values);
    return result.rows[0];
  }

  /**
   * Find and update a record
   */
  async findAndUpdate(query: any, updateData: Partial<ISerpData>): Promise<any> {
    const existing = await this.findOne(query);
    if (!existing) {
      return null;
    }

    // Merge updateData with existing data
    const mergedData = { ...existing, ...updateData };
    return this.updateById(existing.id, mergedData);
  }

  /**
   * Update a record by ID
   */
  async updateById(id: number, updateData: Partial<ISerpData>): Promise<any> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const addUpdate = (fieldName: string, value: any, dbFieldName?: string) => {
      if (value !== undefined && value !== null) {
        updates.push(`${dbFieldName || fieldName} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    };

    // Add all update fields
    addUpdate('search_metadata', updateData.search_metadata);
    addUpdate('search_parameters', updateData.search_parameters);
    addUpdate('type', updateData.type);
    addUpdate('name', updateData.name);
    addUpdate('description', updateData.description);
    addUpdate('link', updateData.link);
    addUpdate('property_token', updateData.property_token);
    addUpdate('serpapi_property_details_link', updateData.serpapi_property_details_link);
    addUpdate('address', updateData.address);
    addUpdate('directions', updateData.directions);
    addUpdate('phone', updateData.phone);
    addUpdate('phone_link', updateData.phone_link);
    
    if (updateData.gps_coordinates) {
      addUpdate('gps_latitude', updateData.gps_coordinates.latitude);
      addUpdate('gps_longitude', updateData.gps_coordinates.longitude);
    }

    addUpdate('check_in_time', updateData.check_in_time);
    addUpdate('check_out_time', updateData.check_out_time);
    addUpdate('rate_per_night', JSON.stringify(updateData.rate_per_night));
    addUpdate('total_rate', JSON.stringify(updateData.total_rate));
    addUpdate('typical_price_range', JSON.stringify(updateData.typical_price_range));
    addUpdate('deal', updateData.deal);
    addUpdate('deal_description', updateData.deal_description);
    addUpdate('featured_prices', JSON.stringify(updateData.featured_prices));
    addUpdate('prices', JSON.stringify(updateData.prices));
    addUpdate('nearby_places', JSON.stringify(updateData.nearby_places));
    addUpdate('hotel_class', updateData.hotel_class);
    addUpdate('extracted_hotel_class', updateData.extracted_hotel_class);
    addUpdate('images', JSON.stringify(updateData.images));
    addUpdate('overall_rating', updateData.overall_rating);
    addUpdate('reviews', updateData.reviews);
    addUpdate('ratings', JSON.stringify(updateData.ratings));
    addUpdate('location_rating', updateData.location_rating);
    addUpdate('reviews_breakdown', JSON.stringify(updateData.reviews_breakdown));
    addUpdate('other_reviews', JSON.stringify(updateData.other_reviews));
    addUpdate('amenities', updateData.amenities);
    addUpdate('excluded_amenities', updateData.excluded_amenities);
    addUpdate('amenities_detailed', JSON.stringify(updateData.amenities_detailed));
    addUpdate('health_and_safety', JSON.stringify(updateData.health_and_safety));

    if (updates.length === 0) {
      return existing;
    }

    values.push(id);
    const sql = `
      UPDATE serpdata
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.getPool().query(sql, values);
    return result.rows[0];
  }

  /**
   * Find all summaries for calendar data
   */
  async findAllSummaries(): Promise<any[]> {
    const sql = `
      SELECT *
      FROM serpdata
      ORDER BY created_at DESC
    `;

    const result = await this.getPool().query(sql);
    const serpDatas = result.rows;

    if (!serpDatas || serpDatas.length === 0) return [];

    const results = [];

    for (const doc of serpDatas) {
      // Parse JSONB fields
      const searchParams = doc.search_parameters || {};
      const featuredPrices = doc.featured_prices || [];

      const checkInDate =
        searchParams.check_in_date ||
        searchParams.checkInDate ||
        null;

      const checkOutDate =
        searchParams.check_out_date ||
        searchParams.checkOutDate ||
        null;

      const hotelName = doc.name || null;

      if (!hotelName) continue; // Skip if no hotel name

      const currency = searchParams.currency || null;
      const adults = searchParams.adults || null;

      // Only add OTAs that are in the whitelist
      for (const requiredOta of WHITELIST_OTAS) {
        // Try to find it in featuredPrices (case-insensitive)
        const match = featuredPrices.find(
          (p: any) => p.source?.toLowerCase() === requiredOta.toLowerCase()
        );

        if (match) {
          results.push({
            _id: doc.id,
            OTA: requiredOta,
            rate: {
              lowest: match.rate_per_night?.extracted_lowest ?? null,
              extracted_lowest: match.rate_per_night?.extracted_lowest ?? null,
              before_tax_fees: match.rate_per_night?.extracted_before_taxes_fees ?? null,
              extracted_before_tax_fees: match.rate_per_night?.extracted_before_taxes_fees ?? null,
            },
            check_in_date: checkInDate,
            check_out_date: checkOutDate,
            hotel_name: hotelName,
            currency,
            adults,
          });
        }
      }
    }

    return results;
  }
}
