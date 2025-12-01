import axios, { AxiosResponse } from 'axios';

export interface FetchHotelRatesParams {
  hotelQuery: string;
  checkInDate: string;
  checkOutDate: string;
  gl?: string;
  hl?: string;
  currency?: string;
  adults?: number;
}

const SERP_API_KEY = process.env.SERP_API_KEY;
const SERP_API_BASE_URL = 'https://serpapi.com/search';

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
  if (!SERP_API_KEY) {
    throw new Error('SERP_API_KEY is not configured');
  }

  const params = {
    engine: 'google_hotels',
    q: hotelQuery,
    gl,
    hl,
    currency,
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    adults,
    api_key: SERP_API_KEY,
  };

  try {
    const response: AxiosResponse = await axios.get(SERP_API_BASE_URL, { params });
    console.log('SerpAPI Response:', response.data);
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { error?: string } }; message?: string };
    console.error('SerpAPI Error:', axiosError.response?.data || axiosError.message);
    throw new Error(
      axiosError.response?.data?.error ||
      'Failed to fetch hotel rates from SerpAPI'
    );
  }
}

