import { ISerpData } from '../types/serpdata';

/**
 * Helper function to extract numeric value from SerpAPI response
 * Handles cases where numbers come as objects like { float: 1.23 } or { int: 5 }
 */
function extractNumericValue(value: any, defaultValue: number = 0): number {
  if (typeof value === 'number') {
    return value;
  }
  if (value && typeof value === 'object') {
    if ('float' in value && typeof value.float === 'number') {
      return value.float;
    }
    if ('int' in value && typeof value.int === 'number') {
      return value.int;
    }
  }
  return defaultValue;
}

/**
 * Transform SerpAPI response to SerpData format
 * @param serpApiResponse - Raw response from SerpAPI
 * @param searchParams - Search parameters used for the query
 * @returns Transformed data matching ISerpData interface
 */
/**
 * Recursively serialize Date objects to ISO strings for JSONB storage
 */
function serializeDates(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => serializeDates(item));
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeDates(obj[key]);
      }
    }
    return serialized;
  }
  
  return obj;
}

export function transformSerpApiResponse(serpApiResponse: any, searchParams: any) {
  const hotelData = serpApiResponse.properties?.[0] || serpApiResponse;

  const safeString = (v: any) =>
    v !== undefined && v !== null && v !== "" ? String(v) : undefined;

  const safeNumber = (v: any) =>
    v !== undefined && v !== null && !isNaN(Number(v))
      ? Number(v)
      : undefined;

  // Create metadata with Date objects first, then serialize
  const searchMetadata = {
    id: serpApiResponse.search_metadata?.id || `serp_${Date.now()}`,
    status: serpApiResponse.search_metadata?.status,
    json_endpoint: serpApiResponse.search_metadata?.json_endpoint,
    created_at: serpApiResponse.search_metadata?.created_at
      ? new Date(serpApiResponse.search_metadata.created_at)
      : new Date(),
    processed_at: serpApiResponse.search_metadata?.processed_at
      ? new Date(serpApiResponse.search_metadata.processed_at)
      : new Date(),
    google_hotels_url: serpApiResponse.search_metadata?.google_hotels_url,
    raw_html_file: serpApiResponse.search_metadata?.raw_html_file,
    prettify_html_file: serpApiResponse.search_metadata?.prettify_html_file,
    total_time_taken: safeNumber(serpApiResponse.search_metadata?.total_time_taken),
  };

  // Create search parameters with Date objects first, then serialize
  const searchParameters = {
    engine: serpApiResponse.search_parameters?.engine || 'google_hotels',
    q: searchParams.hotelQuery,
    gl: searchParams.gl || 'us',
    hl: searchParams.hl || 'en',
    currency: searchParams.currency || 'USD',
    check_in_date: new Date(searchParams.checkInDate),
    check_out_date: new Date(searchParams.checkOutDate),
    adults: safeNumber(searchParams.adults) ?? safeNumber(serpApiResponse.search_parameters?.adults) ?? 2,
    children: safeNumber(serpApiResponse.search_parameters?.children) ?? 0,
  };

  return {
    search_metadata: serializeDates(searchMetadata),
    search_parameters: serializeDates(searchParameters),

    type: safeString(hotelData.type),
    name: safeString(hotelData.name),
    description: safeString(hotelData.description),
    link: safeString(hotelData.link),
    property_token: safeString(hotelData.property_token),
    serpapi_property_details_link: safeString(hotelData.serpapi_property_details_link),
    address: safeString(hotelData.address),
    directions: safeString(hotelData.directions),
    phone: safeString(hotelData.phone),
    phone_link: safeString(hotelData.phone_link),

    gps_coordinates: hotelData.gps_coordinates
      ? {
          latitude: safeNumber(hotelData.gps_coordinates.latitude),
          longitude: safeNumber(hotelData.gps_coordinates.longitude),
        }
      : undefined,

    check_in_time: safeString(hotelData.check_in_time),
    check_out_time: safeString(hotelData.check_out_time),

    rate_per_night: hotelData.rate_per_night,
    total_rate: hotelData.total_rate,
    typical_price_range: hotelData.typical_price_range,

    deal: safeString(hotelData.deal),
    deal_description: safeString(hotelData.deal_description),

    featured_prices: Array.isArray(hotelData.featured_prices)
      ? hotelData.featured_prices
      : undefined,
    prices: Array.isArray(hotelData.prices) ? hotelData.prices : undefined,

    nearby_places: Array.isArray(hotelData.nearby_places)
      ? hotelData.nearby_places
      : undefined,

    hotel_class: safeString(hotelData.hotel_class),
    extracted_hotel_class: safeNumber(hotelData.extracted_hotel_class),

    images: Array.isArray(hotelData.images) ? hotelData.images : undefined,

    overall_rating: safeNumber(hotelData.overall_rating),
    reviews: safeNumber(hotelData.reviews),
    ratings: Array.isArray(hotelData.ratings) ? hotelData.ratings : undefined,
    location_rating: safeNumber(hotelData.location_rating),

    reviews_breakdown: Array.isArray(hotelData.reviews_breakdown)
      ? hotelData.reviews_breakdown
      : undefined,
    other_reviews: Array.isArray(hotelData.other_reviews)
      ? hotelData.other_reviews
      : undefined,

    amenities: Array.isArray(hotelData.amenities) ? hotelData.amenities : undefined,
    excluded_amenities: Array.isArray(hotelData.excluded_amenities)
      ? hotelData.excluded_amenities
      : undefined,
    amenities_detailed: serializeDates(hotelData.amenities_detailed || undefined),
    health_and_safety: serializeDates(hotelData.health_and_safety || undefined),
  };
}

