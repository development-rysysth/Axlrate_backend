require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const { formatHotelQuery, formatDate } = require('./utils/formatters');
const { fetchHotelRates } = require('./utils/serpapi');
const { validateFetchRates } = require('./validators/serpapi');

const app = express();
const PORT = process.env.SERPAPI_SERVICE_PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Fetch hotel rates endpoint
 * POST /serpapi/fetch-rates
 */
app.post('/serpapi/fetch-rates', validateFetchRates, async (req, res) => {
  try {
    const {
      hotelName,
      checkInDate,
      checkOutDate,
      gl,
      hl,
      currency,
    } = req.body;

    // Format hotel query
    const hotelQuery = formatHotelQuery(hotelName);

    // Format dates
    const formattedCheckIn = formatDate(checkInDate);
    const formattedCheckOut = formatDate(checkOutDate);

    // Fetch rates from SerpAPI
    const ratesData = await fetchHotelRates({
      hotelQuery,
      checkInDate: formattedCheckIn,
      checkOutDate: formattedCheckOut,
      gl,
      hl,
      currency,
    });

    res.json({
      success: true,
      data: ratesData,
      query: {
        hotelName,
        hotelQuery,
        checkInDate: formattedCheckIn,
        checkOutDate: formattedCheckOut,
        gl,
        hl,
        currency,
      },
    });
  } catch (error) {
    console.error('Fetch rates error:', error);
    
    // Handle specific error types
    if (error.message.includes('SERP_API_KEY')) {
      return res.status(500).json({ 
        error: 'SerpAPI configuration error',
        message: error.message,
      });
    }
    
    if (error.message.includes('Invalid date')) {
      return res.status(400).json({ 
        error: 'Invalid date format',
        message: error.message,
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch hotel rates',
      message: error.message,
    });
  }
});

/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'serpapi-service',
    hasApiKey: !!process.env.SERP_API_KEY,
  });
});

app.listen(PORT, () => {
  console.log(`SerpAPI service running on port ${PORT}`);
  if (!process.env.SERP_API_KEY) {
    console.warn('⚠️  WARNING: SERP_API_KEY is not set in environment variables');
  }
});

module.exports = app;

