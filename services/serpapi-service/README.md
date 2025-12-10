# SerpAPI Service

## Overview

The **SerpAPI Service** integrates with the SerpAPI (Search Engine Results Page API) to fetch real-time hotel rate data from various Online Travel Agencies (OTAs). It acts as the primary data collection layer that gathers hotel pricing information from Google Hotels search results and stores it in PostgreSQL for further processing.

## What It Does

The SerpAPI Service handles:

- **Rate Fetching**: Retrieves hotel rates from Google Hotels via SerpAPI
- **Batch Processing**: Supports bulk rate fetching for multiple hotels/dates
- **Data Transformation**: Converts SerpAPI responses into normalized formats
- **Data Storage**: Stores raw and transformed data in PostgreSQL
- **Calendar Data**: Provides calendar view of fetched rates
- **Request Validation**: Validates search parameters before API calls
- **Error Handling**: Manages API rate limits and errors

## How It Works

### Architecture

```
Client → API Gateway → SerpAPI Service → SerpAPI (Google Hotels)
                            ↓
                        PostgreSQL (serpdata table)
```

### Data Flow

1. **Request received** with search parameters (hotel, dates, location)
2. **Validate parameters** using Joi schemas
3. **Call SerpAPI** with formatted query
4. **Transform response** to standardized format
5. **Store in PostgreSQL** for historical tracking
6. **Return formatted data** to client

### SerpAPI Integration

The service queries Google Hotels through SerpAPI:
- Search by hotel name or location
- Filter by check-in/check-out dates
- Retrieve prices from multiple OTAs
- Get availability and room details

## API Endpoints

### Rate Fetching

#### `GET /v1/serpapi/fetch-rates`
Fetch hotel rates using query parameters.

**Query Parameters:**
- `q` (required): Hotel search query
- `check_in_date`: Check-in date (YYYY-MM-DD)
- `check_out_date`: Check-out date (YYYY-MM-DD)
- `adults`: Number of adults (default: 2)
- `currency`: Currency code (default: USD)

**Example:**
```
GET /v1/serpapi/fetch-rates?q=Hilton+New+York&check_in_date=2024-03-01&check_out_date=2024-03-03
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "searchParameters": {
      "query": "Hilton New York",
      "checkIn": "2024-03-01",
      "checkOut": "2024-03-03",
      "adults": 2,
      "currency": "USD"
    },
    "hotels": [
      {
        "name": "Hilton New York Midtown",
        "location": "New York, NY",
        "rating": 4.2,
        "reviews": 3450,
        "price": 250,
        "currency": "USD",
        "nights": 2,
        "pricePerNight": 125,
        "ota": "booking.com",
        "link": "https://...",
        "amenities": ["WiFi", "Gym", "Pool"]
      }
    ],
    "totalResults": 15
  },
  "storedId": "507f1f77bcf86cd799439011"
}
```

---

#### `POST /v1/serpapi/fetch-rates`
Fetch hotel rates using JSON body.

**Request Body:**
```json
{
  "q": "Marriott Miami Beach",
  "check_in_date": "2024-03-15",
  "check_out_date": "2024-03-18",
  "adults": 2,
  "children": 1,
  "currency": "USD",
  "gl": "us",
  "hl": "en"
}
```

**Response (200):** Same as GET endpoint

---

#### `POST /v1/serpapi/batch-fetch-rates`
Fetch rates for multiple hotels/dates in a single request.

**Request Body:**
```json
{
  "searches": [
    {
      "q": "Hilton New York",
      "check_in_date": "2024-03-01",
      "check_out_date": "2024-03-03"
    },
    {
      "q": "Marriott New York",
      "check_in_date": "2024-03-01",
      "check_out_date": "2024-03-03"
    }
  ],
  "currency": "USD",
  "adults": 2
}
```

**Response (200):**
```json
{
  "success": true,
  "results": [
    {
      "searchIndex": 0,
      "query": "Hilton New York",
      "success": true,
      "data": { /* hotel data */ },
      "storedId": "507f1f77bcf86cd799439011"
    },
    {
      "searchIndex": 1,
      "query": "Marriott New York",
      "success": true,
      "data": { /* hotel data */ },
      "storedId": "507f1f77bcf86cd799439012"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

---

#### `GET /v1/serpapi/calendar-data`
Get stored calendar data for a hotel.

**Query Parameters:**
- `hotelId`: Hotel identifier
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)

**Response (200):**
```json
{
  "hotelId": "hotel_123",
  "hotelName": "Hilton New York",
  "dateRange": {
    "start": "2024-03-01",
    "end": "2024-03-31"
  },
  "rates": [
    {
      "date": "2024-03-01",
      "price": 150,
      "currency": "USD",
      "ota": "booking.com",
      "availability": true
    }
  ]
}
```

---

### Health Check

#### `GET /health`
Check service health and SerpAPI key status.

**Response (200):**
```json
{
  "status": "ok",
  "service": "serpapi-service",
  "hasApiKey": true
}
```

## Data Models

### PostgreSQL Schema (SerpData)

```typescript
{
  searchParameters: {
    query: string,
    checkInDate: string,
    checkOutDate: string,
    adults: number,
    children?: number,
    currency: string
  },
  results: {
    hotels: Array<{
      name: string,
      location: string,
      rating: number,
      reviews: number,
      price: number,
      currency: string,
      ota: string,
      link: string,
      amenities: string[]
    }>,
    totalResults: number
  },
  metadata: {
    fetchedAt: Date,
    source: string,
    apiVersion: string
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Technologies Used

- **Express.js**: Web framework
- **TypeScript**: Type-safe JavaScript
- **PostgreSQL**: Relational database for storing API responses
- **pg**: PostgreSQL client library
- **Axios**: HTTP client for SerpAPI calls
- **Joi**: Request validation
- **date-fns**: Date manipulation

## Environment Variables

Add to `.env` file in the root directory:

```env
# SerpAPI Service Configuration
SERPAPI_SERVICE_PORT=3003

# SerpAPI Configuration
SERP_API_KEY=your_serpapi_key_here
SERP_API_BASE_URL=https://serpapi.com

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=axlrate_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
MONGO_DB_NAME=axlrate

# Rate Limiting
SERPAPI_RATE_LIMIT=100
SERPAPI_RATE_WINDOW=3600
```

## Installation

```bash
# Install dependencies
cd services/serpapi-service
pnpm install
```

## Running the Service

### Development Mode
```bash
pnpm dev
```

### Production Mode
```bash
# Build the TypeScript code
pnpm build

# Start the service
pnpm start
```

The service will start on port `3003` (or the port specified in `SERPAPI_SERVICE_PORT`).

⚠️ **Note**: Make sure to set `SERP_API_KEY` in your environment variables before starting the service.

## Dependencies

### Runtime Dependencies
- `express`: ^4.18.2
- `cors`: ^2.8.5
- `dotenv`: ^16.3.1
- `axios`: ^1.6.2
- `pg`: ^8.11.3
- `joi`: ^17.11.0
- `date-fns`: ^3.0.6

### Development Dependencies
- `@types/express`: ^4.17.21
- `@types/node`: ^20.10.6
- `typescript`: ^5.3.3
- `ts-node-dev`: ^2.0.0

## Why It's Useful

### 1. **Real-Time Rate Collection**
Fetches current hotel rates from multiple OTAs through Google Hotels.

### 2. **Centralized Data Source**
Single service for all SerpAPI interactions, separating external API concerns from business logic.

### 3. **Data Normalization**
Transforms SerpAPI's complex responses into consistent, usable formats.

### 4. **Historical Tracking**
Stores all fetched data in PostgreSQL for historical analysis and trend tracking.

### 5. **Batch Processing**
Efficiently fetch rates for multiple hotels/dates, reducing API calls and latency.

### 6. **Rate Limit Management**
Handles SerpAPI rate limits and provides graceful degradation.

### 7. **Cost Optimization**
- Caches recent queries
- Batch requests to minimize API calls
- Monitors API usage

## SerpAPI Parameters

### Supported Search Parameters

```typescript
{
  q: string;              // Search query (hotel name)
  engine: 'google_hotels'; // Fixed to Google Hotels
  check_in_date: string;  // YYYY-MM-DD
  check_out_date: string; // YYYY-MM-DD
  adults: number;         // Number of adults
  children?: number;      // Number of children
  currency: string;       // Currency code (USD, EUR, etc.)
  gl: string;            // Country code (us, uk, etc.)
  hl: string;            // Language code (en, es, etc.)
  api_key: string;       // Your SerpAPI key
}
```

### Response Structure

SerpAPI returns Google Hotels data including:
- Hotel listings with prices
- OTA links (Booking.com, Expedia, etc.)
- Hotel ratings and reviews
- Amenities and features
- Location information
- Images and descriptions

## Validation

### Request Validation Rules

```typescript
// Fetch rates validation
{
  q: Joi.string().required().min(3),
  check_in_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  check_out_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  adults: Joi.number().integer().min(1).max(10),
  children: Joi.number().integer().min(0).max(10),
  currency: Joi.string().length(3).uppercase()
}
```

## Error Handling

### Common Errors

- **400 Bad Request**: Invalid parameters
- **401 Unauthorized**: Missing or invalid SerpAPI key
- **429 Too Many Requests**: Rate limit exceeded
- **503 Service Unavailable**: SerpAPI is down
- **500 Internal Server Error**: Database or processing error

### Error Response Format

```json
{
  "success": false,
  "error": {
    "message": "Invalid check-in date format",
    "code": "VALIDATION_ERROR",
    "details": {
      "field": "check_in_date",
      "expected": "YYYY-MM-DD"
    }
  }
}
```

## Rate Limiting

To avoid exceeding SerpAPI limits:

1. **Monitor Usage**: Track API calls per time window
2. **Implement Caching**: Cache recent queries
3. **Batch Requests**: Use batch endpoint for multiple hotels
4. **Retry Logic**: Exponential backoff for failed requests
5. **Queue System**: Queue requests during high load

## Testing

Test endpoints using cURL:

```bash
# Fetch rates (GET)
curl "http://localhost:3003/v1/serpapi/fetch-rates?q=Hilton+New+York&check_in_date=2024-03-01&check_out_date=2024-03-03"

# Fetch rates (POST)
curl -X POST http://localhost:3003/v1/serpapi/fetch-rates \
  -H "Content-Type: application/json" \
  -d '{
    "q": "Marriott Miami",
    "check_in_date": "2024-03-15",
    "check_out_date": "2024-03-18",
    "adults": 2,
    "currency": "USD"
  }'

# Batch fetch
curl -X POST http://localhost:3003/v1/serpapi/batch-fetch-rates \
  -H "Content-Type: application/json" \
  -d '{
    "searches": [
      {"q": "Hilton New York", "check_in_date": "2024-03-01", "check_out_date": "2024-03-03"},
      {"q": "Marriott New York", "check_in_date": "2024-03-01", "check_out_date": "2024-03-03"}
    ]
  }'
```

## Best Practices

1. **API Key Security**: Store SerpAPI key securely, never commit to repo
2. **Cache Results**: Cache recent searches to reduce API costs
3. **Validate Dates**: Ensure check-in is before check-out
4. **Handle Errors**: Gracefully handle API failures
5. **Monitor Usage**: Track API quota and costs
6. **Batch When Possible**: Use batch endpoint for multiple queries
7. **Set Timeouts**: Configure appropriate timeouts for API calls

## Future Enhancements

- Webhook support for real-time updates
- Advanced caching strategies
- Rate limit queue management
- Automatic retry with exponential backoff
- Cost tracking and alerts
- Support for more search engines
- Integration with other hotel APIs
- Price change notifications
- Automated testing suite

## Related Services

- [API Gateway](../api-gateway/README.md)
- [Ingest Service](../ingest-service/README.md)
- [Aggregator Service](../aggregator-service/README.md)
- [Scraper Orchestrator](../scraper-orchestrator/README.md)

