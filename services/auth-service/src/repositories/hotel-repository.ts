import { getPool } from '../config/database';
import { Hotel } from '../../../../shared';
import { mapSerpApiToHotel, HotelInsertData, generateHotelId } from '../../../serpapi-service/src/utils/hotel-mapper';

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

export class HotelRepository {
  private getPool() {
    return getPool();
  }

  /**
   * Find hotel by hotel_id (VARCHAR primary key)
   */
  async findByHotelId(hotelId: string): Promise<Hotel | null> {
    const query = `
      SELECT hotel_id as "hotelId", hotel_name as name, phone, address_full as address,
             gps_lat as "gpsLatitude", gps_lon as "gpsLongitude",
             star_rating as "hotelClass", review_score as "overallRating",
             review_count as "reviewsCount",
             check_in_time as "checkInTime", check_out_time as "checkOutTime"
      FROM hotels
      WHERE hotel_id = $1
      LIMIT 1
    `;

    const result = await this.getPool().query(query, [hotelId]);
    return result.rows[0] || null;
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
        $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42,
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
        nearby_places = EXCLUDED.nearby_places,
        amenities_json = EXCLUDED.amenities_json,
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
      RETURNING hotel_id as "hotelId", hotel_name as name, phone, address_full as address,
                gps_lat as "gpsLatitude", gps_lon as "gpsLongitude",
                star_rating as "hotelClass", review_score as "overallRating",
                review_count as "reviewsCount",
                check_in_time as "checkInTime", check_out_time as "checkOutTime"
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
      hotelInsertData.nearby_places,
      hotelInsertData.amenities_json,
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

    const result = await this.getPool().query(query, values);
    return result.rows[0];
  }
}
