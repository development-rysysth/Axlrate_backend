import axios, { AxiosResponse } from 'axios';
// Remove direct type import to avoid TS rootDir lint error
// import { FetchHotelRatesParams } from '../../../shared/types';

// Redefine FetchHotelRatesParams locally to fix rootDir issue
export interface FetchHotelRatesParams {
  hotelQuery: string;
  checkInDate: string;
  checkOutDate: string;
  gl?: string;
  hl?: string;
  currency?: string;
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

import SerpData from '../models/SerpData';

/**
 * Fetches SerpData documents and returns them
 * in the following format:
 * {
 *   OTA,
 *   rate: {
 *     lowest,
 *     extracted_lowest,
 *     before_tax_fees,
 *     extracted_before_tax_fees
 *   },
 *   check_in_date,
 *   check_out_date,
 *   hotel_name,
 *   currency
 * }
 * 
 * Optionally accepts filter criteria.
 * @param filter - Optional filter for database query
 * @returns Array of formatted result objects
 */

export async function fetchSerpDataSummaries() {
  const serpDatas = await SerpData.find({})
    .sort({ 'search_metadata.created_at': -1 })
    .lean();

  if (!serpDatas || serpDatas.length === 0) return [];

  const WHITELIST_OTAS = ["Booking.com", "Expedia.com", "Hotels.com", "Agoda"];
  const results = [];

  for (const doc of serpDatas) {
    const checkInDate =
      doc.checkInDate ??
      doc.check_in_date ??
      doc.search_parameters?.check_in_date ??
      null;

    const checkOutDate =
      doc.checkOutDate ??
      doc.check_out_date ??
      doc.search_parameters?.check_out_date ??
      null;

    const hotelName =
      doc.hotelName ?? doc.hotel_name ?? doc.name ?? null;

    if (!hotelName) continue; // Skip if no hotel name

    const currency =
      doc.currency ?? doc.search_parameters?.currency ?? null;

    // ⬇ Only featured_prices
    const featuredPrices = doc.featured_prices || [];

    // Only add OTAs that are in the whitelist
    for (const requiredOta of WHITELIST_OTAS) {
      // Try to find it in featuredPrices (case-insensitive)
      const match = featuredPrices.find(
        p => p.source?.toLowerCase() === requiredOta.toLowerCase()
      );

      if (match) {
        results.push({
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
        });
      }
    }
  }

  return results;
}


