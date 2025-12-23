import axios, { AxiosResponse } from 'axios';

const SERP_API_BASE_URL = 'https://serpapi.com/search';

export interface SerpApiHotel {
  name?: string;
  description?: string;
  gps_coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  check_in_time?: string;
  check_out_time?: string;
  extracted_hotel_class?: number;
  nearby_places?: unknown;
  amenities?: unknown;
  [key: string]: unknown;
}

export interface SerpApiResponse {
  properties?: SerpApiHotel[];
  serpapi_pagination?: {
    next_page_token?: string;
    next?: string;
  };
  error?: string;
  [key: string]: unknown;
}

export interface FetchHotelsResult {
  hotels: SerpApiHotel[];
  nextToken: string | null;
  nextUrl: string | null;
}

/**
 * Get SERP API key from environment
 */
function getSerpApiKey(): string {
  const key = process.env.SERP_API_KEY;
  if (!key) {
    throw new Error('SERP_API_KEY is not configured');
  }
  return key;
}

/**
 * Fetch hotels from SerpAPI with pagination support
 * @param city - City name
 * @param state - State name
 * @param nextToken - Optional pagination token
 * @param nextUrl - Optional next URL (preferred if available)
 * @returns Hotels array, next page token, and next URL
 */
export async function fetchHotels(
  city: string,
  state: string,
  nextToken: string | null = null,
  nextUrl: string | null = null
): Promise<FetchHotelsResult> {
  const apiKey = getSerpApiKey();

  try {
    let response: AxiosResponse<SerpApiResponse>;

    // If we have a next URL, use it directly (preferred method)
    if (nextUrl) {
      // The next URL already contains all parameters, just need to ensure API key is included
      const url = new URL(nextUrl);
      url.searchParams.set('api_key', apiKey);
      response = await axios.get(url.toString());
    } else {
      // Otherwise, construct the request with parameters
      const params: Record<string, string | number> = {
        engine: 'google_hotels',
        q: `hotels in ${city}, ${state}`,
        check_in_date: '2025-12-22',
        check_out_date: '2025-12-23',
        adults: 2,
        children: 0,
        currency: 'USD',
        gl: 'us',
        hl: 'en',
        api_key: apiKey,
      };

      if (nextToken) {
        params.next_page_token = nextToken;
      }

      response = await axios.get(SERP_API_BASE_URL, { params });
    }

    if (!response.data) {
      throw new Error('Empty response from SerpAPI');
    }

    // Check for "no results" error - this is a valid end state, not a fatal error
    if (response.data.error) {
      const errorMessage = response.data.error.toLowerCase();
      // If it's a "no results" error, return empty results instead of throwing
      if (errorMessage.includes('hasn\'t returned any results') || 
          errorMessage.includes('no results') ||
          errorMessage.includes('no hotels found')) {
        return {
          hotels: [],
          nextToken: null,
          nextUrl: null,
        };
      }
      // For other errors, throw as before
      throw new Error(`SerpAPI error: ${response.data.error}`);
    }

    const hotels = Array.isArray(response.data.properties) ? response.data.properties : [];
    const nextPageToken = response.data.serpapi_pagination?.next_page_token ?? null;
    const nextPageUrl = response.data.serpapi_pagination?.next ?? null;

    return {
      hotels,
      nextToken: nextPageToken,
      nextUrl: nextPageUrl,
    };
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { error?: string } }; message?: string; status?: number };
    
    if (axiosError.response) {
      throw new Error(`SerpAPI failed: ${axiosError.response.status} - ${axiosError.response.data?.error || axiosError.message}`);
    }
    
    throw new Error(`SerpAPI failed: ${axiosError.message || 'Unknown error'}`);
  }
}

