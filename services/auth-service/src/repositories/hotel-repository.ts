import { getPool } from '../config/database';
import { Hotel, CompetitorEntry, CompetitorType, COMPETITOR_LIMITS } from '../../../../shared';
import { mapSerpApiToHotel, HotelInsertData, generateHotelId } from '../../../hotel-service/src/utils/hotel-mapper';

/**
 * Helper function to serialize Date objects and other non-JSON-serializable values
 * for PostgreSQL JSONB fields. Recursively converts Date objects to ISO strings.
 * Also handles undefined values and ensures the result is valid JSON.
 */
function serializeForJSONB(value: any): any {
  if (value === null || value === undefined) {
    return null;
  }
  
  // If it's already a string, try to parse it first to ensure it's valid JSON
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return serializeForJSONB(parsed);
    } catch {
      // If it's not valid JSON, return as-is (might be a plain string)
      return value;
    }
  }
  
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  if (Array.isArray(value)) {
    return value.map(item => serializeForJSONB(item));
  }
  
  if (typeof value === 'object') {
    // Handle special objects that might cause issues
    if (value.constructor && value.constructor.name !== 'Object' && value.constructor.name !== 'Array') {
      // For non-plain objects, try to convert to plain object
      try {
        return JSON.parse(JSON.stringify(value, (key, val) => {
          if (val instanceof Date) {
            return val.toISOString();
          }
          if (val === undefined) {
            return null;
          }
          return val;
        }));
      } catch {
        return String(value);
      }
    }
    
    const serialized: any = {};
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        const val = value[key];
        // Skip undefined values
        if (val === undefined) {
          continue;
        }
        serialized[key] = serializeForJSONB(val);
      }
    }
    return serialized;
  }
  
  // For primitive types, return as-is
  return value;
}

export interface CreateHotelData {
  name: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  hotelClass?: string;
  propertyToken?: string;
  address?: string;
  phone?: string;
  // Allow full SerpAPI hotel data for complete mapping
  serpApiData?: any;
  // Override hotel_id when updating existing hotel
  existingHotelId?: string;
}

// Hotel search result interface - returns only essential fields as strings
export interface HotelSearchResult {
  hotelId: string;
  hotelKey: string;
  name: string;
  country: string;
  state: string;
  city: string;
  gpsLatitude: string | null;
  gpsLongitude: string | null;
  hotelClass: string | null;
}

export class HotelRepository {
  private getPool() {
    return getPool();
  }

  /**
   * Find hotel by id (UUID primary key) or hotel_key
   */
  async findByHotelId(hotelId: string): Promise<Hotel | null> {
    // Try to find by UUID first, then by hotel_key
    const query = `
      SELECT 
        id as "hotelId", 
        hotel_key as "hotelKey",
        name, 
        country,
        state,
        city,
        latitude as "gpsLatitude", 
        longitude as "gpsLongitude",
        star_rating as "hotelClass", 
        nearby_places as "nearbyPlaces",
        amenities as "amenitiesJson",
        COALESCE(competitors, '[]'::jsonb) as competitors,
        COALESCE(suggested_competitors, ARRAY[]::TEXT[]) as "suggestedCompetitors",
        is_active as "isActive"
      FROM hotels
      WHERE (id::text = $1 OR hotel_key = $1)
        AND is_active = true
      LIMIT 1
    `;

    const result = await this.getPool().query(query, [hotelId]);
    if (result.rows[0]) {
      const hotel = result.rows[0];
      return hotel;
    }
    return null;
  }

  /**
   * Search hotels by name with optional filters
   */
  async searchHotels(
    searchTerm: string,
    page: number = 1,
    pageSize: number = 20,
    city?: string,
    country?: string,
    state?: string
  ): Promise<{ hotels: HotelSearchResult[], total: number }> {
    const offset = (page - 1) * pageSize;
    const searchPattern = `%${searchTerm}%`;

    // Build WHERE conditions
    const conditions: string[] = [
      'LOWER(name) LIKE LOWER($1)',
      'is_active = true'
    ];
    const params: any[] = [searchPattern];
    let paramIndex = 2;

    if (city) {
      conditions.push(`LOWER(city) = LOWER($${paramIndex})`);
      params.push(city);
      paramIndex++;
    }

    if (country) {
      conditions.push(`LOWER(country) = LOWER($${paramIndex})`);
      params.push(country);
      paramIndex++;
    }

    if (state) {
      conditions.push(`LOWER(state) = LOWER($${paramIndex})`);
      params.push(state);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM hotels
      WHERE ${whereClause}
    `;

    // Data query - return only required hotel fields
    const dataQuery = `
      SELECT 
        id as "hotelId", 
        hotel_key as "hotelKey",
        name, 
        country,
        state,
        city,
        latitude as "gpsLatitude", 
        longitude as "gpsLongitude",
        star_rating as "hotelClass"
      FROM hotels
      WHERE ${whereClause}
      ORDER BY name
      OFFSET $${paramIndex} LIMIT $${paramIndex + 1}
    `;

    const countParams = params;
    const dataParams = [...params, offset, pageSize];

    const [countResult, dataResult] = await Promise.all([
      this.getPool().query(countQuery, countParams),
      this.getPool().query(dataQuery, dataParams)
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    const hotels = dataResult.rows.map((row: any) => {
      // Return only the required fields, converting numeric fields to strings
      return {
        hotelId: row.hotelId,
        hotelKey: row.hotelKey,
        name: row.name,
        country: row.country,
        state: row.state,
        city: row.city,
        gpsLatitude: row.gpsLatitude ? String(row.gpsLatitude) : null,
        gpsLongitude: row.gpsLongitude ? String(row.gpsLongitude) : null,
        hotelClass: row.hotelClass ? String(row.hotelClass) : null
      };
    });

    return { hotels, total };
  }

  /**
   * Find hotels by city with pagination
   */
  async findByCity(city: string, page: number = 1, pageSize: number = 20): Promise<{ hotels: Hotel[], total: number }> {
    const offset = (page - 1) * pageSize;

    // Count query - only active hotels
    const countQuery = `
      SELECT COUNT(*) as total
      FROM hotels
      WHERE LOWER(city) = LOWER($1)
        AND is_active = true
    `;

    // Data query - only active hotels, only return required fields
    const dataQuery = `
      SELECT 
        id as "hotelId", 
        hotel_key as "hotelKey",
        name, 
        country,
        state,
        city,
        star_rating as "hotelClass"
      FROM hotels
      WHERE LOWER(city) = LOWER($1)
        AND is_active = true
      ORDER BY name
      OFFSET $2 LIMIT $3
    `;

    const [countResult, dataResult] = await Promise.all([
      this.getPool().query(countQuery, [city]),
      this.getPool().query(dataQuery, [city, offset, pageSize])
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    const hotels = dataResult.rows;

    return { hotels, total };
  }

  /**
   * Generate hotel ID from name and coordinates
   */
  generateHotelId(name: string, latitude: number, longitude: number): string {
    return generateHotelId(name, latitude, longitude);
  }

  /**
   * Create hotel from SerpAPI data or basic hotel data
   */
  async create(hotelData: CreateHotelData): Promise<Hotel> {
    let hotelInsertData: HotelInsertData;

    // If SerpAPI data is provided, use the mapper
    if (hotelData.serpApiData) {
      hotelInsertData = mapSerpApiToHotel(hotelData.serpApiData);
      // Override hotel_id if existingHotelId is provided (for updates)
      if (hotelData.existingHotelId) {
        hotelInsertData.hotel_id = hotelData.existingHotelId;
      }
    } else {
      // Otherwise, create basic hotel data
      // Generate unique hotel_id using hotel name and coordinates
      const hotel_id = generateHotelId(
        hotelData.name,
        hotelData.gpsLatitude,
        hotelData.gpsLongitude
      );
      
      // Extract star rating from hotel_class
      let star_rating: number | null = null;
      if (hotelData.hotelClass) {
        const match = hotelData.hotelClass.toString().match(/\d+/);
        if (match) {
          const rating = parseInt(match[0], 10);
          if (rating >= 1 && rating <= 5) {
            star_rating = rating;
          }
        }
      }

      hotelInsertData = {
        hotel_id,
        hotel_name: hotelData.name,
        star_rating,
        address_full: hotelData.address || null,
        city: null,
        zip_code: null,
        phone: hotelData.phone || null,
        gps_lat: hotelData.gpsLatitude || null,
        gps_lon: hotelData.gpsLongitude || null,
        // All amenities default to false
        amenity_wi_fi: false,
        amenity_restaurant: false,
        amenity_breakfast: false,
        amenity_breakfast_buffet: false,
        amenity_smoke_free_property: false,
        amenity_golf: false,
        amenity_game_room: false,
        amenity_front_desk: false,
        amenity_pool: false,
        amenity_hot_tub: false,
        amenity_kid_friendly: false,
        amenity_parking: false,
        amenity_business_center: false,
        amenity_accessible: false,
        amenity_air_conditioning: false,
        amenity_pet_friendly: false,
        nearby_places: null,
        amenities_json: null,
        amenity_wi_fi_in_public_areas: false,
        amenity_public_internet_workstation: false,
        amenity_table_service: false,
        amenity_buffet_dinner: false,
        amenity_room_service: false,
        amenity_vending_machines: false,
        amenity_credit_cards: false,
        amenity_debit_cards: false,
        amenity_cash: false,
        amenity_checks: false,
        amenity_activities_for_kids: false,
        amenity_self_service_laundry: false,
        amenity_elevator: false,
        amenity_social_hour: false,
        amenity_wake_up_calls: false,
        amenity_housekeeping: false,
        amenity_turndown_service: false,
        amenity_indoor_pool: false,
        amenity_outdoor_pool: false,
        amenity_wading_pool: false,
        amenity_self_parking: false,
        amenity_valet_parking: false,
        amenity_ev_charger: false,
        amenity_fitness_center: false,
        amenity_elliptical_machine: false,
        amenity_treadmill: false,
        amenity_weight_machines: false,
        amenity_free_weights: false,
        amenity_accessible_parking: false,
        amenity_accessible_elevator: false,
        amenity_accessible_pool: false,
        amenity_meeting_rooms: false,
        amenity_english: false,
        amenity_spanish: false,
        amenity_kitchen_in_some_rooms: false,
        amenity_refrigerator: false,
        amenity_microwave: false,
        amenity_coffee_maker: false,
        amenity_minibar_in_some_rooms: false,
        amenity_private_bathroom: false,
        amenity_bathtub_in_some_rooms: false,
        amenity_shower: false,
        amenity_nfc_mobile_payments: false,
        amenity_kitchen: false,
        amenity_casino: false,
        amenity_dogs_allowed: false,
        amenity_cats_allowed: false,
        amenity_bar: false,
        review_score: null,
        review_count: null,
        review_tags: null,
        check_in_time: null,
        check_out_time: null,
      };
    }

    // Build the INSERT query with all columns
    const query = `
      INSERT INTO hotels (
        hotel_id, hotel_name, star_rating, address_full, city, zip_code, phone,
        gps_lat, gps_lon,
        amenity_wi_fi, amenity_restaurant, amenity_breakfast, amenity_breakfast_buffet,
        amenity_smoke_free_property, amenity_golf, amenity_game_room, amenity_front_desk,
        amenity_pool, amenity_hot_tub, amenity_kid_friendly, amenity_parking,
        amenity_business_center, amenity_accessible, amenity_air_conditioning, amenity_pet_friendly,
        nearby_places, amenities_json,
        amenity_wi_fi_in_public_areas, amenity_public_internet_workstation, amenity_table_service,
        amenity_buffet_dinner, amenity_room_service, amenity_vending_machines,
        amenity_credit_cards, amenity_debit_cards, amenity_cash, amenity_checks,
        amenity_activities_for_kids, amenity_self_service_laundry, amenity_elevator,
        amenity_social_hour, amenity_wake_up_calls, amenity_housekeeping, amenity_turndown_service,
        amenity_indoor_pool, amenity_outdoor_pool, amenity_wading_pool,
        amenity_self_parking, amenity_valet_parking, amenity_ev_charger,
        amenity_fitness_center, amenity_elliptical_machine, amenity_treadmill,
        amenity_weight_machines, amenity_free_weights,
        amenity_accessible_parking, amenity_accessible_elevator, amenity_accessible_pool,
        amenity_meeting_rooms, amenity_english, amenity_spanish,
        amenity_kitchen_in_some_rooms, amenity_refrigerator, amenity_microwave,
        amenity_coffee_maker, amenity_minibar_in_some_rooms, amenity_private_bathroom,
        amenity_bathtub_in_some_rooms, amenity_shower, amenity_nfc_mobile_payments,
        amenity_kitchen, amenity_casino, amenity_dogs_allowed, amenity_cats_allowed, amenity_bar,
        review_score, review_count, review_tags, check_in_time, check_out_time
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
        $26::jsonb, $27::jsonb,
        $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42,
        $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59,
        $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77,
        $78, $79, $80
      )
      ON CONFLICT (hotel_id) DO UPDATE SET
        hotel_name = EXCLUDED.hotel_name,
        star_rating = EXCLUDED.star_rating,
        address_full = EXCLUDED.address_full,
        city = EXCLUDED.city,
        zip_code = EXCLUDED.zip_code,
        phone = EXCLUDED.phone,
        gps_lat = EXCLUDED.gps_lat,
        gps_lon = EXCLUDED.gps_lon,
        review_score = EXCLUDED.review_score,
        review_count = EXCLUDED.review_count,
        review_tags = EXCLUDED.review_tags,
        check_in_time = EXCLUDED.check_in_time,
        check_out_time = EXCLUDED.check_out_time,
        nearby_places = EXCLUDED.nearby_places::jsonb,
        amenities_json = EXCLUDED.amenities_json::jsonb,
        amenity_wi_fi = EXCLUDED.amenity_wi_fi,
        amenity_restaurant = EXCLUDED.amenity_restaurant,
        amenity_breakfast = EXCLUDED.amenity_breakfast,
        amenity_breakfast_buffet = EXCLUDED.amenity_breakfast_buffet,
        amenity_smoke_free_property = EXCLUDED.amenity_smoke_free_property,
        amenity_golf = EXCLUDED.amenity_golf,
        amenity_game_room = EXCLUDED.amenity_game_room,
        amenity_front_desk = EXCLUDED.amenity_front_desk,
        amenity_pool = EXCLUDED.amenity_pool,
        amenity_hot_tub = EXCLUDED.amenity_hot_tub,
        amenity_kid_friendly = EXCLUDED.amenity_kid_friendly,
        amenity_parking = EXCLUDED.amenity_parking,
        amenity_business_center = EXCLUDED.amenity_business_center,
        amenity_accessible = EXCLUDED.amenity_accessible,
        amenity_air_conditioning = EXCLUDED.amenity_air_conditioning,
        amenity_pet_friendly = EXCLUDED.amenity_pet_friendly,
        amenity_wi_fi_in_public_areas = EXCLUDED.amenity_wi_fi_in_public_areas,
        amenity_public_internet_workstation = EXCLUDED.amenity_public_internet_workstation,
        amenity_table_service = EXCLUDED.amenity_table_service,
        amenity_buffet_dinner = EXCLUDED.amenity_buffet_dinner,
        amenity_room_service = EXCLUDED.amenity_room_service,
        amenity_vending_machines = EXCLUDED.amenity_vending_machines,
        amenity_credit_cards = EXCLUDED.amenity_credit_cards,
        amenity_debit_cards = EXCLUDED.amenity_debit_cards,
        amenity_cash = EXCLUDED.amenity_cash,
        amenity_checks = EXCLUDED.amenity_checks,
        amenity_activities_for_kids = EXCLUDED.amenity_activities_for_kids,
        amenity_self_service_laundry = EXCLUDED.amenity_self_service_laundry,
        amenity_elevator = EXCLUDED.amenity_elevator,
        amenity_social_hour = EXCLUDED.amenity_social_hour,
        amenity_wake_up_calls = EXCLUDED.amenity_wake_up_calls,
        amenity_housekeeping = EXCLUDED.amenity_housekeeping,
        amenity_turndown_service = EXCLUDED.amenity_turndown_service,
        amenity_indoor_pool = EXCLUDED.amenity_indoor_pool,
        amenity_outdoor_pool = EXCLUDED.amenity_outdoor_pool,
        amenity_wading_pool = EXCLUDED.amenity_wading_pool,
        amenity_self_parking = EXCLUDED.amenity_self_parking,
        amenity_valet_parking = EXCLUDED.amenity_valet_parking,
        amenity_ev_charger = EXCLUDED.amenity_ev_charger,
        amenity_fitness_center = EXCLUDED.amenity_fitness_center,
        amenity_elliptical_machine = EXCLUDED.amenity_elliptical_machine,
        amenity_treadmill = EXCLUDED.amenity_treadmill,
        amenity_weight_machines = EXCLUDED.amenity_weight_machines,
        amenity_free_weights = EXCLUDED.amenity_free_weights,
        amenity_accessible_parking = EXCLUDED.amenity_accessible_parking,
        amenity_accessible_elevator = EXCLUDED.amenity_accessible_elevator,
        amenity_accessible_pool = EXCLUDED.amenity_accessible_pool,
        amenity_meeting_rooms = EXCLUDED.amenity_meeting_rooms,
        amenity_english = EXCLUDED.amenity_english,
        amenity_spanish = EXCLUDED.amenity_spanish,
        amenity_kitchen_in_some_rooms = EXCLUDED.amenity_kitchen_in_some_rooms,
        amenity_refrigerator = EXCLUDED.amenity_refrigerator,
        amenity_microwave = EXCLUDED.amenity_microwave,
        amenity_coffee_maker = EXCLUDED.amenity_coffee_maker,
        amenity_minibar_in_some_rooms = EXCLUDED.amenity_minibar_in_some_rooms,
        amenity_private_bathroom = EXCLUDED.amenity_private_bathroom,
        amenity_bathtub_in_some_rooms = EXCLUDED.amenity_bathtub_in_some_rooms,
        amenity_shower = EXCLUDED.amenity_shower,
        amenity_nfc_mobile_payments = EXCLUDED.amenity_nfc_mobile_payments,
        amenity_kitchen = EXCLUDED.amenity_kitchen,
        amenity_casino = EXCLUDED.amenity_casino,
        amenity_dogs_allowed = EXCLUDED.amenity_dogs_allowed,
        amenity_cats_allowed = EXCLUDED.amenity_cats_allowed,
        amenity_bar = EXCLUDED.amenity_bar
      RETURNING 
        hotel_id as "hotelId", 
        hotel_name as name, 
        phone, 
        address_full as address,
        city,
        zip_code as "zipCode",
        gps_lat as "gpsLatitude", 
        gps_lon as "gpsLongitude",
        star_rating as "hotelClass", 
        review_score as "overallRating",
        review_count as "reviewsCount",
        review_tags as "reviewTags",
        check_in_time as "checkInTime", 
        check_out_time as "checkOutTime",
        nearby_places as "nearbyPlaces",
        amenities_json as "amenitiesJson"
    `;

    const values = [
      hotelInsertData.hotel_id,
      hotelInsertData.hotel_name,
      hotelInsertData.star_rating,
      hotelInsertData.address_full,
      hotelInsertData.city,
      hotelInsertData.zip_code,
      hotelInsertData.phone,
      hotelInsertData.gps_lat,
      hotelInsertData.gps_lon,
      hotelInsertData.amenity_wi_fi,
      hotelInsertData.amenity_restaurant,
      hotelInsertData.amenity_breakfast,
      hotelInsertData.amenity_breakfast_buffet,
      hotelInsertData.amenity_smoke_free_property,
      hotelInsertData.amenity_golf,
      hotelInsertData.amenity_game_room,
      hotelInsertData.amenity_front_desk,
      hotelInsertData.amenity_pool,
      hotelInsertData.amenity_hot_tub,
      hotelInsertData.amenity_kid_friendly,
      hotelInsertData.amenity_parking,
      hotelInsertData.amenity_business_center,
      hotelInsertData.amenity_accessible,
      hotelInsertData.amenity_air_conditioning,
      hotelInsertData.amenity_pet_friendly,
      // JSONB fields - serialize and stringify to ensure valid JSON
      hotelInsertData.nearby_places ? JSON.stringify(serializeForJSONB(hotelInsertData.nearby_places)) : null,
      hotelInsertData.amenities_json ? JSON.stringify(serializeForJSONB(hotelInsertData.amenities_json)) : null,
      hotelInsertData.amenity_wi_fi_in_public_areas,
      hotelInsertData.amenity_public_internet_workstation,
      hotelInsertData.amenity_table_service,
      hotelInsertData.amenity_buffet_dinner,
      hotelInsertData.amenity_room_service,
      hotelInsertData.amenity_vending_machines,
      hotelInsertData.amenity_credit_cards,
      hotelInsertData.amenity_debit_cards,
      hotelInsertData.amenity_cash,
      hotelInsertData.amenity_checks,
      hotelInsertData.amenity_activities_for_kids,
      hotelInsertData.amenity_self_service_laundry,
      hotelInsertData.amenity_elevator,
      hotelInsertData.amenity_social_hour,
      hotelInsertData.amenity_wake_up_calls,
      hotelInsertData.amenity_housekeeping,
      hotelInsertData.amenity_turndown_service,
      hotelInsertData.amenity_indoor_pool,
      hotelInsertData.amenity_outdoor_pool,
      hotelInsertData.amenity_wading_pool,
      hotelInsertData.amenity_self_parking,
      hotelInsertData.amenity_valet_parking,
      hotelInsertData.amenity_ev_charger,
      hotelInsertData.amenity_fitness_center,
      hotelInsertData.amenity_elliptical_machine,
      hotelInsertData.amenity_treadmill,
      hotelInsertData.amenity_weight_machines,
      hotelInsertData.amenity_free_weights,
      hotelInsertData.amenity_accessible_parking,
      hotelInsertData.amenity_accessible_elevator,
      hotelInsertData.amenity_accessible_pool,
      hotelInsertData.amenity_meeting_rooms,
      hotelInsertData.amenity_english,
      hotelInsertData.amenity_spanish,
      hotelInsertData.amenity_kitchen_in_some_rooms,
      hotelInsertData.amenity_refrigerator,
      hotelInsertData.amenity_microwave,
      hotelInsertData.amenity_coffee_maker,
      hotelInsertData.amenity_minibar_in_some_rooms,
      hotelInsertData.amenity_private_bathroom,
      hotelInsertData.amenity_bathtub_in_some_rooms,
      hotelInsertData.amenity_shower,
      hotelInsertData.amenity_nfc_mobile_payments,
      hotelInsertData.amenity_kitchen,
      hotelInsertData.amenity_casino,
      hotelInsertData.amenity_dogs_allowed,
      hotelInsertData.amenity_cats_allowed,
      hotelInsertData.amenity_bar,
      hotelInsertData.review_score,
      hotelInsertData.review_count,
      hotelInsertData.review_tags,
      hotelInsertData.check_in_time,
      hotelInsertData.check_out_time,
    ];

    try {
      const result = await this.getPool().query(query, values);
      return result.rows[0];
    } catch (error: any) {
      // Enhanced error logging for JSONB issues
      if (error.message && error.message.includes('invalid input syntax for type json')) {
        console.error('JSONB serialization error:');
        console.error('nearby_places:', JSON.stringify(hotelInsertData.nearby_places, null, 2));
        console.error('amenities_json:', JSON.stringify(hotelInsertData.amenities_json, null, 2));
        console.error('Serialized nearby_places:', hotelInsertData.nearby_places ? JSON.stringify(serializeForJSONB(hotelInsertData.nearby_places)) : null);
        console.error('Serialized amenities_json:', hotelInsertData.amenities_json ? JSON.stringify(serializeForJSONB(hotelInsertData.amenities_json)) : null);
      }
      throw error;
    }
  }

  /**
   * Get current competitors for a hotel
   */
  async getCompetitors(hotelId: string): Promise<CompetitorEntry[]> {
    const hotel = await this.findByHotelId(hotelId);
    return hotel?.competitors || [];
  }

  /**
   * Get competitors by type
   */
  async getCompetitorsByType(hotelId: string, type: CompetitorType): Promise<CompetitorEntry[]> {
    const competitors = await this.getCompetitors(hotelId);
    return competitors.filter(c => c.type === type);
  }

  /**
   * Validate competitor limits before adding
   */
  private validateCompetitorLimits(competitors: CompetitorEntry[], newType: CompetitorType): void {
    const primaryCount = competitors.filter(c => c.type === 'primary').length;
    const secondaryCount = competitors.filter(c => c.type === 'secondary').length;

    if (newType === 'primary' && primaryCount >= COMPETITOR_LIMITS.PRIMARY) {
      throw new Error(`Maximum ${COMPETITOR_LIMITS.PRIMARY} primary competitors allowed`);
    }
    if (newType === 'secondary' && secondaryCount >= COMPETITOR_LIMITS.SECONDARY) {
      throw new Error(`Maximum ${COMPETITOR_LIMITS.SECONDARY} secondary competitors allowed`);
    }
  }

  /**
   * Update competitors for a hotel (full replacement)
   */
  async updateCompetitors(hotelId: string, competitors: CompetitorEntry[]): Promise<void> {
    const query = `
      UPDATE hotels
      SET competitors = $1::jsonb
      WHERE (id::text = $2 OR hotel_key = $2)
    `;

    await this.getPool().query(query, [JSON.stringify(competitors), hotelId]);
  }

  /**
   * Add a competitor to a hotel
   */
  async addCompetitor(hotelId: string, competitorId: string, type: CompetitorType): Promise<void> {
    const competitors = await this.getCompetitors(hotelId);
    
    // Check if already exists
    if (competitors.some(c => c.hotelId === competitorId)) {
      throw new Error('Competitor already exists');
    }

    // Validate limits
    this.validateCompetitorLimits(competitors, type);

    // Add new competitor
    competitors.push({ hotelId: competitorId, type });
    await this.updateCompetitors(hotelId, competitors);
  }

  /**
   * Remove a competitor from a hotel
   */
  async removeCompetitor(hotelId: string, competitorId: string): Promise<void> {
    const competitors = await this.getCompetitors(hotelId);
    const filtered = competitors.filter(c => c.hotelId !== competitorId);
    
    if (filtered.length === competitors.length) {
      throw new Error('Competitor not found');
    }

    await this.updateCompetitors(hotelId, filtered);
  }

  /**
   * Update competitor type (primary ↔ secondary)
   */
  async updateCompetitorType(hotelId: string, competitorId: string, newType: CompetitorType): Promise<void> {
    const competitors = await this.getCompetitors(hotelId);
    const index = competitors.findIndex(c => c.hotelId === competitorId);
    
    if (index === -1) {
      throw new Error('Competitor not found');
    }

    // If changing type, validate limits for the new type
    if (competitors[index].type !== newType) {
      // Temporarily remove this competitor to check limits
      const tempCompetitors = competitors.filter(c => c.hotelId !== competitorId);
      this.validateCompetitorLimits(tempCompetitors, newType);
    }

    competitors[index].type = newType;
    await this.updateCompetitors(hotelId, competitors);
  }

  /**
   * Update suggested competitors for a hotel
   */
  async updateSuggestedCompetitors(hotelId: string, competitorIds: string[]): Promise<void> {
    const query = `
      UPDATE hotels
      SET suggested_competitors = $1
      WHERE (id::text = $2 OR hotel_key = $2)
    `;

    await this.getPool().query(query, [competitorIds, hotelId]);
  }
}
