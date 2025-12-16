import axios, { AxiosResponse } from 'axios';
import { CountryRepository } from '../repositories/country-repository';
import { formatHotelSearchQuery } from '../utils/formatters';

export interface FetchHotelRatesParams {
  hotelQuery: string;
  checkInDate: string;
  checkOutDate: string;
  gl?: string;
  hl?: string;
  currency?: string;
  adults?: number;
}

export interface SearchHotelWithLocationParams {
  hotelName: string;
  countryCode: string;
  stateName: string;
  checkInDate: string;
  checkOutDate: string;
  hl?: string;
  currency?: string;
  adults?: number;
}

export interface SearchHotelsByLocationParams {
  location: string; // city or state name
  countryCode: string;
  checkInDate: string;
  checkOutDate: string;
  gl?: string;
  hl?: string;
  currency?: string;
  adults?: number;
}

const SERP_API_BASE_URL = 'https://serpapi.com/search';

/**
 * Get SERP API key from environment (reads dynamically)
 */
function getSerpApiKey(): string {
  const key = process.env.SERP_API_KEY;
  if (!key) {
    throw new Error('SERP_API_KEY is not configured');
  }
  return key;
}

/**
 * Fetch hotel rates from SerpAPI
 * @param params - Search parameters
 * @returns SerpAPI response
 */
export async function fetchHotelRates({
  hotelQuery,
  checkInDate,
  checkOutDate,
  gl = 'us',
  hl = 'en',
  currency = 'USD',
  adults = 2,
}: FetchHotelRatesParams): Promise<unknown> {
  const apiKey = getSerpApiKey();

  const params = {
    engine: 'google_hotels',
    q: hotelQuery,
    gl,
    hl,
    currency,
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    adults,
    api_key: apiKey,
  };

  try {
    const response: AxiosResponse = await axios.get(SERP_API_BASE_URL, { params });
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { error?: string } }; message?: string };
    throw new Error(
      axiosError.response?.data?.error ||
      'Failed to fetch hotel rates from SerpAPI'
    );
  }
}

/**
 * Search hotel with location (country and state)
 * Looks up country code from database to get 2-letter code for gl parameter
 * Builds query: "hotelName stateName"
 * @param params - Search parameters including hotel name, country code, state name, dates
 * @returns SerpAPI response
 */
export async function searchHotelWithLocation({
  hotelName,
  countryCode,
  stateName,
  checkInDate,
  checkOutDate,
  hl = 'en',
  currency = 'USD',
  adults = 2,
}: SearchHotelWithLocationParams): Promise<unknown> {
  const apiKey = getSerpApiKey();

  // Look up country from database to get 2-letter code for gl parameter
  const countryRepository = new CountryRepository();
  const country = await countryRepository.getCountryByCode(countryCode);
  
  if (!country) {
    throw new Error(`Country with code "${countryCode}" not found in database`);
  }

  // Validate state exists for the country
  const state = await countryRepository.getStateByNameAndCountry(stateName, countryCode);
  if (!state) {
    throw new Error(`State "${stateName}" not found for country "${countryCode}"`);
  }

  // Build query: "hotelName stateName"
  const hotelQuery = formatHotelSearchQuery(hotelName, stateName);

  // Use country code (lowercase) for gl parameter
  const gl = countryCode.toLowerCase();

  const params = {
    engine: 'google_hotels',
    q: hotelQuery,
    gl,
    hl,
    currency,
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    adults,
    api_key: apiKey,
  };

  try {
    const response: AxiosResponse = await axios.get(SERP_API_BASE_URL, { params });
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { error?: string } }; message?: string };
    throw new Error(
      axiosError.response?.data?.error ||
      'Failed to search hotel from SerpAPI'
    );
  }
}

/**
 * Search hotels by location (city or state)
 * Searches for "hotels in ${location}" to get multiple hotels in the area
 * @param params - Search parameters including location, country code, dates
 * @returns SerpAPI response with properties array containing multiple hotels
 */
export async function searchHotelsByLocation({
  location,
  countryCode,
  checkInDate,
  checkOutDate,
  gl,
  hl = 'en',
  currency = 'USD',
  adults = 2,
}: SearchHotelsByLocationParams): Promise<unknown> {
  const apiKey = getSerpApiKey();

  // Build query: "hotels in ${location}"
  const hotelQuery = `hotels in ${location}`;

  // Use provided gl or derive from countryCode
  const glParam = gl || countryCode.toLowerCase();

  const params = {
    engine: 'google_hotels',
    q: hotelQuery,
    gl: glParam,
    hl,
    currency,
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    adults,
    api_key: apiKey,
  };

  try {
    const response: AxiosResponse = await axios.get(SERP_API_BASE_URL, { params });
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { error?: string } }; message?: string };
    throw new Error(
      axiosError.response?.data?.error ||
      'Failed to search hotels by location from SerpAPI'
    );
  }
}

