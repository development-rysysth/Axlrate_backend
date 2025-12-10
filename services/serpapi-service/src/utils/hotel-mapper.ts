/**
 * Maps SerpAPI hotel response to the hotels table schema
 * Converts amenities array to individual boolean columns
 */

/**
 * Generate a unique hotel_id
 * Generates a concise identifier based on hotel name and coordinates
 * Format: RBWWD43-89 (First letters of words + first 2 digits of lat/lon)
 * Example: "Ramada by Wyndham Wisconsin Dells" at (44.35, -89.11) -> "RBWWD44-89"
 */
export function generateHotelId(hotelName?: string, latitude?: number, longitude?: number): string {
  // Generate concise ID: First letter of each word + coordinates
  // Example: "Ramada by Wyndham Wisconsin Dells" -> "RBWWD" + "43" + "-89" = "RBWWD43-89"
  let initials = '';
  if (hotelName) {
    // Split by spaces and get first letter of each word
    const words = hotelName.split(/\s+/).filter(word => word.length > 0);
    initials = words
      .map(word => {
        // Get first alphanumeric character (skip special chars)
        const match = word.match(/[a-zA-Z0-9]/);
        return match ? match[0].toUpperCase() : '';
      })
      .filter(letter => letter.length > 0)
      .join('')
      .substring(0, 10); // Limit to 10 characters max
  }
  
  // If no initials generated, use "H" for hotel
  if (!initials) {
    initials = 'H';
  }

  // Get 2 digits after decimal point for latitude
  // Example: 43.22 -> "22", 43.2 -> "20", 43 -> "00"
  let latDigits = '00';
  if (latitude !== undefined && latitude !== null) {
    const latStr = Math.abs(latitude).toString();
    const decimalIndex = latStr.indexOf('.');
    if (decimalIndex !== -1 && decimalIndex + 1 < latStr.length) {
      // Extract 2 digits after decimal, pad if needed
      latDigits = latStr.substring(decimalIndex + 1, decimalIndex + 3).padEnd(2, '0').substring(0, 2);
    }
  }
  
  // Get 2 digits after decimal point for longitude
  // Example: -89.22 -> "22", -89.2 -> "20", -89 -> "00"
  let lonDigits = '00';
  if (longitude !== undefined && longitude !== null) {
    const lonStr = Math.abs(longitude).toString();
    const decimalIndex = lonStr.indexOf('.');
    if (decimalIndex !== -1 && decimalIndex + 1 < lonStr.length) {
      // Extract 2 digits after decimal, pad if needed
      lonDigits = lonStr.substring(decimalIndex + 1, decimalIndex + 3).padEnd(2, '0').substring(0, 2);
    }
  }
  
  return `${initials}${latDigits}${lonDigits}`;
}

export interface SerpApiHotelResponse {
  type?: string;
  name?: string;
  description?: string;
  link?: string;
  property_token?: string;
  serpapi_property_details_link?: string;
  directions?: string;
  phone_link?: string;
  gps_coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  check_in_time?: string;
  check_out_time?: string;
  hotel_class?: string;
  extracted_hotel_class?: number;
  overall_rating?: number;
  reviews?: number;
  ratings?: Array<{ stars: number; count: number }>;
  location_rating?: number;
  reviews_breakdown?: Array<{
    name: string;
    description: string;
    total_mentioned: number;
    positive: number;
    negative: number;
    neutral: number;
  }>;
  other_reviews?: Array<{
    source?: string;
    source_icon?: string;
    source_rating?: { score?: number; max_score?: number };
    reviews?: number;
  }>;
  amenities?: string[];
  excluded_amenities?: string[];
  amenities_detailed?: any;
  health_and_safety?: any;
  images?: Array<{
    thumbnail?: string;
    original_image?: string;
  }>;
  nearby_places?: Array<{
    name?: string;
    transportations?: Array<{ type?: string; duration?: string }>;
  }>;
  address?: string;
  phone?: string;
}

export interface HotelInsertData {
  hotel_id: string;
  hotel_name: string | null;
  star_rating: number | null;
  address_full: string | null;
  city: string | null;
  zip_code: string | null;
  phone: string | null;
  gps_lat: number | null;
  gps_lon: number | null;
  amenity_wi_fi: boolean;
  amenity_restaurant: boolean;
  amenity_breakfast: boolean;
  amenity_breakfast_buffet: boolean;
  amenity_smoke_free_property: boolean;
  amenity_golf: boolean;
  amenity_game_room: boolean;
  amenity_front_desk: boolean;
  amenity_pool: boolean;
  amenity_hot_tub: boolean;
  amenity_kid_friendly: boolean;
  amenity_parking: boolean;
  amenity_business_center: boolean;
  amenity_accessible: boolean;
  amenity_air_conditioning: boolean;
  amenity_pet_friendly: boolean;
  nearby_places: any | null;
  amenities_json: any | null;
  amenity_wi_fi_in_public_areas: boolean;
  amenity_public_internet_workstation: boolean;
  amenity_table_service: boolean;
  amenity_buffet_dinner: boolean;
  amenity_room_service: boolean;
  amenity_vending_machines: boolean;
  amenity_credit_cards: boolean;
  amenity_debit_cards: boolean;
  amenity_cash: boolean;
  amenity_checks: boolean;
  amenity_activities_for_kids: boolean;
  amenity_self_service_laundry: boolean;
  amenity_elevator: boolean;
  amenity_social_hour: boolean;
  amenity_wake_up_calls: boolean;
  amenity_housekeeping: boolean;
  amenity_turndown_service: boolean;
  amenity_indoor_pool: boolean;
  amenity_outdoor_pool: boolean;
  amenity_wading_pool: boolean;
  amenity_self_parking: boolean;
  amenity_valet_parking: boolean;
  amenity_ev_charger: boolean;
  amenity_fitness_center: boolean;
  amenity_elliptical_machine: boolean;
  amenity_treadmill: boolean;
  amenity_weight_machines: boolean;
  amenity_free_weights: boolean;
  amenity_accessible_parking: boolean;
  amenity_accessible_elevator: boolean;
  amenity_accessible_pool: boolean;
  amenity_meeting_rooms: boolean;
  amenity_english: boolean;
  amenity_spanish: boolean;
  amenity_kitchen_in_some_rooms: boolean;
  amenity_refrigerator: boolean;
  amenity_microwave: boolean;
  amenity_coffee_maker: boolean;
  amenity_minibar_in_some_rooms: boolean;
  amenity_private_bathroom: boolean;
  amenity_bathtub_in_some_rooms: boolean;
  amenity_shower: boolean;
  amenity_nfc_mobile_payments: boolean;
  amenity_kitchen: boolean;
  amenity_casino: boolean;
  amenity_dogs_allowed: boolean;
  amenity_cats_allowed: boolean;
  amenity_bar: boolean;
  review_score: number | null;
  review_count: number | null;
  review_tags: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
}

/**
 * Maps amenity name from SerpAPI to database column name
 */
const amenityMapping: Record<string, keyof HotelInsertData> = {
  'Wi-Fi': 'amenity_wi_fi',
  'Free Wi-Fi': 'amenity_wi_fi',
  'WiFi': 'amenity_wi_fi',
  'Restaurant': 'amenity_restaurant',
  'Free breakfast': 'amenity_breakfast',
  'Breakfast': 'amenity_breakfast',
  'Breakfast buffet': 'amenity_breakfast_buffet',
  'Buffet breakfast': 'amenity_breakfast_buffet',
  'Smoke-free property': 'amenity_smoke_free_property',
  'Golf': 'amenity_golf',
  'Game room': 'amenity_game_room',
  'Front desk': 'amenity_front_desk',
  '24-hour front desk': 'amenity_front_desk',
  'Pool': 'amenity_pool',
  'Hot tub': 'amenity_hot_tub',
  'Kid-friendly': 'amenity_kid_friendly',
  'Free parking': 'amenity_parking',
  'Parking': 'amenity_parking',
  'Business center': 'amenity_business_center',
  'Accessible': 'amenity_accessible',
  'Air conditioning': 'amenity_air_conditioning',
  'Pet-friendly': 'amenity_pet_friendly',
  'Wi-Fi in public areas': 'amenity_wi_fi_in_public_areas',
  'Public internet workstation': 'amenity_public_internet_workstation',
  'Table service': 'amenity_table_service',
  'Buffet dinner': 'amenity_buffet_dinner',
  'Room service': 'amenity_room_service',
  'Vending machines': 'amenity_vending_machines',
  'Credit cards': 'amenity_credit_cards',
  'Debit cards': 'amenity_debit_cards',
  'Cash': 'amenity_cash',
  'Checks': 'amenity_checks',
  'Activities for kids': 'amenity_activities_for_kids',
  'Self-service laundry': 'amenity_self_service_laundry',
  'Elevator': 'amenity_elevator',
  'Social hour': 'amenity_social_hour',
  'Wake-up calls': 'amenity_wake_up_calls',
  'Housekeeping': 'amenity_housekeeping',
  'Turndown service': 'amenity_turndown_service',
  'Indoor pool': 'amenity_indoor_pool',
  'Outdoor pool': 'amenity_outdoor_pool',
  'Wading pool': 'amenity_wading_pool',
  'Self parking': 'amenity_self_parking',
  'Valet parking': 'amenity_valet_parking',
  'EV charger': 'amenity_ev_charger',
  'Fitness center': 'amenity_fitness_center',
  'Gym': 'amenity_fitness_center',
  'Elliptical machine': 'amenity_elliptical_machine',
  'Treadmill': 'amenity_treadmill',
  'Weight machines': 'amenity_weight_machines',
  'Free weights': 'amenity_free_weights',
  'Accessible parking': 'amenity_accessible_parking',
  'Accessible elevator': 'amenity_accessible_elevator',
  'Accessible pool': 'amenity_accessible_pool',
  'Meeting rooms': 'amenity_meeting_rooms',
  'English': 'amenity_english',
  'Spanish': 'amenity_spanish',
  'Kitchen in some rooms': 'amenity_kitchen_in_some_rooms',
  'Refrigerator': 'amenity_refrigerator',
  'Microwave': 'amenity_microwave',
  'Coffee maker': 'amenity_coffee_maker',
  'Minibar in some rooms': 'amenity_minibar_in_some_rooms',
  'Private bathroom': 'amenity_private_bathroom',
  'Bathtub in some rooms': 'amenity_bathtub_in_some_rooms',
  'Shower': 'amenity_shower',
  'NFC mobile payments': 'amenity_nfc_mobile_payments',
  'Kitchen': 'amenity_kitchen',
  'Casino': 'amenity_casino',
  'Dogs allowed': 'amenity_dogs_allowed',
  'Cats allowed': 'amenity_cats_allowed',
  'Bar': 'amenity_bar',
};

/**
 * Extracts city and zip code from address string
 */
function extractCityAndZip(address: string | undefined): { city: string | null; zip_code: string | null } {
  if (!address) {
    return { city: null, zip_code: null };
  }

  // Try to extract zip code (5 digits or 5+4 format)
  const zipMatch = address.match(/\b(\d{5}(?:-\d{4})?)\b/);
  const zip_code = zipMatch ? zipMatch[1] : null;

  // Try to extract city (usually before state or zip)
  // Common pattern: "City, State ZIP" or "City State ZIP"
  const cityMatch = address.match(/([^,]+?)(?:,\s*[A-Z]{2}|\s+[A-Z]{2}\s+\d{5})/);
  const city = cityMatch ? cityMatch[1].trim() : null;

  return { city, zip_code };
}

/**
 * Generates review tags from reviews_breakdown
 */
function generateReviewTags(reviewsBreakdown?: Array<{
  name: string;
  description: string;
  total_mentioned: number;
  positive: number;
  negative: number;
  neutral: number;
}>): string | null {
  if (!reviewsBreakdown || reviewsBreakdown.length === 0) {
    return null;
  }

  // Extract names of review categories
  const tags = reviewsBreakdown.map(r => r.name).filter(Boolean);
  return tags.length > 0 ? tags.join(', ') : null;
}

/**
 * Maps SerpAPI hotel response to database insert format
 */
export function mapSerpApiToHotel(serpApiData: SerpApiHotelResponse): HotelInsertData {
  // Generate unique hotel_id using hotel name and coordinates
  // Format: First letters of hotel name + latitude digits + longitude digits
  const hotel_id = generateHotelId(
    serpApiData.name,
    serpApiData.gps_coordinates?.latitude,
    serpApiData.gps_coordinates?.longitude
  );

  // Extract star rating from hotel_class
  const star_rating = serpApiData.extracted_hotel_class || null;

  // Extract city and zip from address
  const { city, zip_code } = extractCityAndZip(serpApiData.address);

  // Initialize all amenities to false
  const amenities: Partial<Record<keyof HotelInsertData, boolean>> = {};

  // Map amenities from SerpAPI response
  if (serpApiData.amenities && Array.isArray(serpApiData.amenities)) {
    for (const amenity of serpApiData.amenities) {
      const normalizedAmenity = amenity.trim();
      const dbColumn = amenityMapping[normalizedAmenity];
      if (dbColumn) {
        amenities[dbColumn] = true;
      }
    }
  }

  // Generate review tags
  const review_tags = generateReviewTags(serpApiData.reviews_breakdown);

  return {
    hotel_id,
    hotel_name: serpApiData.name || null,
    star_rating,
    address_full: serpApiData.address || null,
    city,
    zip_code,
    phone: serpApiData.phone || null,
    gps_lat: serpApiData.gps_coordinates?.latitude || null,
    gps_lon: serpApiData.gps_coordinates?.longitude || null,
    
    // Amenities (default to false if not found)
    amenity_wi_fi: amenities.amenity_wi_fi || false,
    amenity_restaurant: amenities.amenity_restaurant || false,
    amenity_breakfast: amenities.amenity_breakfast || false,
    amenity_breakfast_buffet: amenities.amenity_breakfast_buffet || false,
    amenity_smoke_free_property: amenities.amenity_smoke_free_property || false,
    amenity_golf: amenities.amenity_golf || false,
    amenity_game_room: amenities.amenity_game_room || false,
    amenity_front_desk: amenities.amenity_front_desk || false,
    amenity_pool: amenities.amenity_pool || false,
    amenity_hot_tub: amenities.amenity_hot_tub || false,
    amenity_kid_friendly: amenities.amenity_kid_friendly || false,
    amenity_parking: amenities.amenity_parking || false,
    amenity_business_center: amenities.amenity_business_center || false,
    amenity_accessible: amenities.amenity_accessible || false,
    amenity_air_conditioning: amenities.amenity_air_conditioning || false,
    amenity_pet_friendly: amenities.amenity_pet_friendly || false,
    nearby_places: serpApiData.nearby_places || null, // Store as JSONB (PostgreSQL will handle conversion)
    // Store comprehensive SerpAPI data in amenities_json for future reference
    amenities_json: {
      // Store raw amenities array
      amenities: serpApiData.amenities || [],
      excluded_amenities: serpApiData.excluded_amenities || [],
      // Store detailed amenities structure
      amenities_detailed: serpApiData.amenities_detailed || null,
      // Store additional SerpAPI metadata
      property_token: serpApiData.property_token || null,
      serpapi_property_details_link: serpApiData.serpapi_property_details_link || null,
      link: serpApiData.link || null,
      description: serpApiData.description || null,
      directions: serpApiData.directions || null,
      phone_link: serpApiData.phone_link || null,
      type: serpApiData.type || null,
      // Store ratings and reviews data
      ratings: serpApiData.ratings || [],
      location_rating: serpApiData.location_rating || null,
      reviews_breakdown: serpApiData.reviews_breakdown || [],
      other_reviews: serpApiData.other_reviews || [],
      // Store images
      images: serpApiData.images || [],
      // Store health and safety info
      health_and_safety: serpApiData.health_and_safety || null,
    } as any, // Store as JSONB (PostgreSQL will handle conversion)
    amenity_wi_fi_in_public_areas: amenities.amenity_wi_fi_in_public_areas || false,
    amenity_public_internet_workstation: amenities.amenity_public_internet_workstation || false,
    amenity_table_service: amenities.amenity_table_service || false,
    amenity_buffet_dinner: amenities.amenity_buffet_dinner || false,
    amenity_room_service: amenities.amenity_room_service || false,
    amenity_vending_machines: amenities.amenity_vending_machines || false,
    amenity_credit_cards: amenities.amenity_credit_cards || false,
    amenity_debit_cards: amenities.amenity_debit_cards || false,
    amenity_cash: amenities.amenity_cash || false,
    amenity_checks: amenities.amenity_checks || false,
    amenity_activities_for_kids: amenities.amenity_activities_for_kids || false,
    amenity_self_service_laundry: amenities.amenity_self_service_laundry || false,
    amenity_elevator: amenities.amenity_elevator || false,
    amenity_social_hour: amenities.amenity_social_hour || false,
    amenity_wake_up_calls: amenities.amenity_wake_up_calls || false,
    amenity_housekeeping: amenities.amenity_housekeeping || false,
    amenity_turndown_service: amenities.amenity_turndown_service || false,
    amenity_indoor_pool: amenities.amenity_indoor_pool || false,
    amenity_outdoor_pool: amenities.amenity_outdoor_pool || false,
    amenity_wading_pool: amenities.amenity_wading_pool || false,
    amenity_self_parking: amenities.amenity_self_parking || false,
    amenity_valet_parking: amenities.amenity_valet_parking || false,
    amenity_ev_charger: amenities.amenity_ev_charger || false,
    amenity_fitness_center: amenities.amenity_fitness_center || false,
    amenity_elliptical_machine: amenities.amenity_elliptical_machine || false,
    amenity_treadmill: amenities.amenity_treadmill || false,
    amenity_weight_machines: amenities.amenity_weight_machines || false,
    amenity_free_weights: amenities.amenity_free_weights || false,
    amenity_accessible_parking: amenities.amenity_accessible_parking || false,
    amenity_accessible_elevator: amenities.amenity_accessible_elevator || false,
    amenity_accessible_pool: amenities.amenity_accessible_pool || false,
    amenity_meeting_rooms: amenities.amenity_meeting_rooms || false,
    amenity_english: amenities.amenity_english || false,
    amenity_spanish: amenities.amenity_spanish || false,
    amenity_kitchen_in_some_rooms: amenities.amenity_kitchen_in_some_rooms || false,
    amenity_refrigerator: amenities.amenity_refrigerator || false,
    amenity_microwave: amenities.amenity_microwave || false,
    amenity_coffee_maker: amenities.amenity_coffee_maker || false,
    amenity_minibar_in_some_rooms: amenities.amenity_minibar_in_some_rooms || false,
    amenity_private_bathroom: amenities.amenity_private_bathroom || false,
    amenity_bathtub_in_some_rooms: amenities.amenity_bathtub_in_some_rooms || false,
    amenity_shower: amenities.amenity_shower || false,
    amenity_nfc_mobile_payments: amenities.amenity_nfc_mobile_payments || false,
    amenity_kitchen: amenities.amenity_kitchen || false,
    amenity_casino: amenities.amenity_casino || false,
    amenity_dogs_allowed: amenities.amenity_dogs_allowed || false,
    amenity_cats_allowed: amenities.amenity_cats_allowed || false,
    amenity_bar: amenities.amenity_bar || false,
    
    review_score: serpApiData.overall_rating || null,
    review_count: serpApiData.reviews || null,
    review_tags,
    check_in_time: serpApiData.check_in_time || null,
    check_out_time: serpApiData.check_out_time || null,
  };
}
