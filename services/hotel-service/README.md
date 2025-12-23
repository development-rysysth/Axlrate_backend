# Hotel Service

## Overview

The **Hotel Service** provides hotel rate data and location information by querying the PostgreSQL database. It serves as the primary interface for searching hotels, fetching rates, and retrieving location data (countries, states, cities) that have been ingested into the system.

## What It Does

The Hotel Service handles:

- **Rate Fetching**: Retrieves hotel rates from the database based on search criteria
- **Hotel Search**: Searches hotels by name, location (country, state, city)
- **Location Data**: Provides countries, states, and cities from the database
- **Batch Processing**: Supports bulk rate fetching for multiple hotels/dates
- **Calendar Data**: Provides calendar view of stored rates
- **Request Validation**: Validates search parameters using Joi schemas
- **Data Transformation**: Formats database results into standardized API responses

## How It Works

### Architecture

```
Client → API Gateway → Hotel Service → PostgreSQL (hotels, rates, countries, states, cities)
```

### Data Flow

1. **Request received** with search parameters (hotel name, dates, location)
2. **Validate parameters** using Joi schemas
3. **Query PostgreSQL** for hotel and rate data
4. **Transform response** to standardized format
5. **Return formatted data** to client

### Database Schema

The service queries data from PostgreSQL tables:
- **hotels**: Hotel information (name, location, GPS coordinates, amenities, star rating)
- **rates**: Daily rate data from OTAs (price, currency, OTA source, availability, room type)
- **countries**: Country reference data
- **states**: State reference data
- **cities**: City reference data

## API Endpoints

All endpoints are prefixed with `/v1/serpapi` (maintained for backward compatibility) or `/v1/hotel`.

### Rate Fetching

#### `GET /v1/serpapi/fetch-rates`
Fetch hotel rates using query parameters.

**Query Parameters:**
- `q` (required): Hotel search query (hotel name)
- `check_in_date`: Check-in date (YYYY-MM-DD)
- `check_out_date`: Check-out date (YYYY-MM-DD)
- `country`: Country name (optional filter)
- `state`: State name (optional filter)
- `city`: City name (optional filter)
- `adults`: Number of adults (default: 2, must be between 2-5)

**Example:**
```
GET /v1/serpapi/fetch-rates?q=Hilton+New+York&check_in_date=2024-03-01&check_out_date=2024-03-03&adults=2
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "hotels": [
      {
        "name": "Hilton New York Midtown",
        "location": "New York, NY, United States",
        "rating": 4.2,
        "gps_coordinates": {
          "latitude": 40.7589,
          "longitude": -73.9851
        },
        "hotel_class": "4",
        "rates": [
          {
            "date": "2024-03-01",
            "price": 250.00,
            "currency": "USD",
            "ota": "booking",
            "roomType": "Standard Room",
            "availability": true
          }
        ]
      }
    ],
    "totalResults": 1
  },
  "query": {
    "hotelName": "Hilton New York",
    "checkInDate": "2024-03-01",
    "checkOutDate": "2024-03-03",
    "adults": 2
  }
}
```

---

#### `POST /v1/serpapi/fetch-rates`
Fetch hotel rates using JSON body.

**Request Body:**
```json
{
  "hotelName": "Marriott Miami Beach",
  "checkInDate": "2024-03-15",
  "checkOutDate": "2024-03-18",
  "country": "United States",
  "state": "Florida",
  "city": "Miami",
  "adults": 2
}
```

**Response (200):** Same format as GET endpoint

---

#### `POST /v1/serpapi/batch-fetch-rates`
Fetch rates for multiple hotels/dates in a single request.

**Request Body:**
```json
{
  "checkInDate": "2024-03-01",
  "checkOutDate": "2024-03-03",
  "adults": 2,
  "hotels": [
    {
      "hotelName": "Hilton New York",
      "country": "United States",
      "state": "New York",
      "city": "New York"
    },
    {
      "hotelName": "Marriott New York",
      "country": "United States",
      "state": "New York",
      "city": "New York"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "results": [
    {
      "hotelName": "Hilton New York",
      "success": true,
      "data": { /* hotel data */ }
    },
    {
      "hotelName": "Marriott New York",
      "success": true,
      "data": { /* hotel data */ }
    }
  ]
}
```

---

#### `GET /v1/serpapi/calendar-data`
Get stored calendar data for a hotel.

**Query Parameters:**
- `hotelId`: Hotel identifier (UUID)
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)

**Response (200):**
```json
{
  "hotelId": "uuid-here",
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
      "ota": "booking",
      "availability": true
    }
  ]
}
```

---

### Location Data

#### `GET /v1/serpapi/countries`
Get all countries from the database.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "United States",
      "code": "US"
    }
  ]
}
```

---

#### `GET /v1/serpapi/states`
Get states by country code.

**Query Parameters:**
- `countryCode` (required): Country code (e.g., "US")

**Response (200):**
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "id": "uuid-here",
      "name": "New York",
      "country_code": "US"
    }
  ]
}
```

---

#### `GET /v1/serpapi/cities`
Get cities by state ID or by state name and country code.

**Query Parameters (choose one option):**
- Option 1: `stateId` (required): State UUID
- Option 2: `countryCode` (required) AND `stateName` (required): Country code and state name

**Examples:**
- `GET /v1/serpapi/cities?stateId=e4f5974b-e79a-46a4-97ec-1c142b270322`
- `GET /v1/serpapi/cities?countryCode=US&stateName=Wisconsin`

**Response (200):**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "uuid-here",
      "name": "Waupaca",
      "state_id": "uuid-here"
    }
  ]
}
```

---

#### `POST /v1/serpapi/search-hotel`
Search hotels from database using SerpAPI-style parameters.

**Request Body:**
```json
{
  "hotelName": "Hilton New York",
  "countryCode": "US",
  "stateCode": "NY",
  "checkInDate": "2024-03-01",
  "checkOutDate": "2024-03-03",
  "adults": 2,
  "currency": "USD"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "hotels": [
      {
        "name": "Hilton New York Midtown",
        "location": "New York, NY",
        "rating": 4.2,
        "rates": [ /* rate data */ ]
      }
    ]
  }
}
```

---

### Health Check

#### `GET /health`
Check service health and database connectivity.

**Response (200):**
```json
{
  "status": "ok",
  "service": "hotel-service"
}
```

## Technologies Used

- **Express.js**: Web framework
- **TypeScript**: Type-safe JavaScript
- **PostgreSQL**: Relational database for hotel and rate data
- **pg**: PostgreSQL client library
- **Joi**: Request validation
- **date-fns**: Date manipulation and formatting

## Environment Variables

Add to `.env` file in the root directory:

```env
# Hotel Service Configuration
HOTEL_SERVICE_PORT=3003

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=axlrate_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
```

## Installation

```bash
# Install dependencies
cd services/hotel-service
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

The service will start on port `3003` (or the port specified in `HOTEL_SERVICE_PORT`).

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
- `@types/cors`: ^2.8.17
- `@types/express`: ^4.17.21
- `@types/node`: ^20.10.6
- `@types/pg`: ^8.10.9
- `ts-node-dev`: ^2.0.0
- `typescript`: ^5.3.3

## Why It's Useful

### 1. **Database-First Approach**
Queries pre-ingested hotel and rate data from PostgreSQL, providing fast responses without external API calls.

### 2. **Centralized Hotel Data Access**
Single service for all hotel-related queries, separating data access from business logic.

### 3. **Location Data Management**
Provides structured access to countries, states, and cities for filtering and search.

### 4. **Flexible Search**
Supports searching by hotel name with optional location filters (country, state, city).

### 5. **Rate Data Access**
Retrieves historical and current rate data from multiple OTAs stored in the database.

### 6. **Validation & Error Handling**
Comprehensive request validation and error handling for reliable API responses.

## Data Repositories

### HotelRateRepository
Handles hotel and rate data queries:
- `searchHotelsByName()`: Search hotels by name and location filters
- `getHotelRatesFromRates()`: Get rates for a specific hotel and date range
- `getCalendarData()`: Get calendar view of rates

### CountryRepository
Provides location reference data:
- `getAllCountries()`: List all countries
- `getStatesByCountryCode()`: Get states for a country
- `getCitiesByStateId()`: Get cities for a state
- `getCitiesByStateName()`: Get cities by state name and country code

## Validation

### Request Validation Rules

```typescript
// Fetch rates validation
{
  hotelName: Joi.string().required().min(1),
  checkInDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkOutDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  country: Joi.string().optional(),
  state: Joi.string().optional(),
  city: Joi.string().optional(),
  adults: Joi.number().integer().min(2).max(5).optional()
}
```

## Error Handling

### Common Errors

- **400 Bad Request**: Invalid parameters or validation errors
- **500 Internal Server Error**: Database connection or query errors

### Error Response Format

```json
{
  "error": "Validation failed",
  "details": ["hotelName is required", "adults must be between 2 and 5"]
}
```

## Testing

Test endpoints using cURL:

```bash
# Fetch rates (GET)
curl "http://localhost:3003/v1/serpapi/fetch-rates?q=Hilton+New+York&check_in_date=2024-03-01&check_out_date=2024-03-03&adults=2"

# Fetch rates (POST)
curl -X POST http://localhost:3003/v1/serpapi/fetch-rates \
  -H "Content-Type: application/json" \
  -d '{
    "hotelName": "Marriott Miami",
    "checkInDate": "2024-03-15",
    "checkOutDate": "2024-03-18",
    "adults": 2
  }'

# Get countries
curl http://localhost:3003/v1/serpapi/countries

# Get states
curl "http://localhost:3003/v1/serpapi/states?countryCode=US"

# Get cities
curl "http://localhost:3003/v1/serpapi/cities?countryCode=US&stateName=Wisconsin"
```

## Performance Considerations

### Database Queries
- Uses connection pooling for efficient database access
- Indexed queries on hotel names and locations
- Optimized date range queries for rate data

### Response Formatting
- Efficient data transformation
- Minimal data processing overhead
- Fast response times for database queries

## Related Services

- [API Gateway](../api-gateway/README.md) - Entry point for all requests
- [Hotel Ingestion Service](../hotel-ingestion-service/README.md) - Ingests hotel data into database
- [Auth Service](../auth-service/README.md) - User authentication and hotel management

## Notes

- The service maintains `/v1/serpapi` routes for backward compatibility
- All data is read from PostgreSQL; no external API calls are made
- Hotel data must be ingested via Hotel Ingestion Service before it can be queried
- Rate data is stored by the scraping/orchestration system
