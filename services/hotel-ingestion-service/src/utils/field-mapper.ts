import { SerpApiHotel } from '../services/serpapi-client';

export interface HotelData {
  hotel_key: string;
  name: string | null;
  description: string | null;
  country: string;
  state: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  star_rating: number | null;
  check_in_time: string | null;
  check_out_time: string | null;
  nearby_places: unknown;
  amenities: unknown;
}

/**
 * Map SerpAPI hotel response to database format
 * Only maps the fields specified in hotels.md document
 * 
 * @param serpApiData - Hotel data from SerpAPI
 * @param country - Country name
 * @param state - State name
 * @param city - City name
 * @param hotelKey - Pre-generated hotel_key
 * @returns Mapped hotel data for database
 */
export function mapSerpApiToHotel(
  serpApiData: SerpApiHotel,
  country: string,
  state: string,
  city: string,
  hotelKey: string
): HotelData {
  return {
    hotel_key: hotelKey,
    name: serpApiData.name ?? null,
    description: serpApiData.description ?? null,
    country,
    state,
    city,
    latitude: serpApiData.gps_coordinates?.latitude ?? null,
    longitude: serpApiData.gps_coordinates?.longitude ?? null,
    star_rating: serpApiData.extracted_hotel_class ?? null,
    check_in_time: serpApiData.check_in_time ?? null,
    check_out_time: serpApiData.check_out_time ?? null,
    nearby_places: serpApiData.nearby_places ?? null,
    amenities: serpApiData.amenities ?? null,
  };
}

