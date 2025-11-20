const axios = require('axios');

const SERP_API_KEY = process.env.SERP_API_KEY;
const SERP_API_BASE_URL = 'https://serpapi.com/search';

/**
 * Fetch hotel rates from SerpAPI
 * @param {Object} params - Search parameters
 * @param {string} params.hotelQuery - Formatted hotel query string
 * @param {string} params.checkInDate - Check-in date (YYYY-MM-DD)
 * @param {string} params.checkOutDate - Check-out date (YYYY-MM-DD)
 * @param {string} params.gl - Country code (default: 'us')
 * @param {string} params.hl - Language code (default: 'en')
 * @param {string} params.currency - Currency code (default: 'USD')
 * @returns {Promise<Object>} SerpAPI response
 */
async function fetchHotelRates({
  hotelQuery,
  checkInDate,
  checkOutDate,
  gl = 'us',
  hl = 'en',
  currency = 'USD',
}) {
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
    const response = await axios.get(SERP_API_BASE_URL, { params });
    return response.data;
  } catch (error) {
    console.error('SerpAPI Error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.error || 
      'Failed to fetch hotel rates from SerpAPI'
    );
  }
}

module.exports = {
  fetchHotelRates,
};

