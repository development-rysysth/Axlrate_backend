# Aggregator Service

## Overview

The **Aggregator Service** is responsible for aggregating, analyzing, and providing calendar-based hotel rate data from multiple Online Travel Agencies (OTAs). It serves as the data analysis and insight layer that processes rate information stored in PostgreSQL and provides optimized queries for calendar views, price comparisons, and filter options.

## What It Does

The Aggregator Service handles:

- **Calendar Data Retrieval**: Provides filtered calendar data based on date ranges, locations, and OTAs
- **Price Aggregation**: Calculates minimum, maximum, and average prices across OTAs and date ranges
- **Filter Options**: Provides available filter options (OTAs, locations, date ranges)
- **Data Caching**: Uses Redis to cache frequently accessed data for performance
- **Query Optimization**: Optimizes complex PostgreSQL queries for large datasets
- **Data Formatting**: Transforms database results into frontend-friendly formats

## How It Works

### Architecture

```
Client → API Gateway → Aggregator Service → PostgreSQL (rates, hotels)
                                        ↓
                                    Redis Cache (optional)
```

### Data Flow

1. **Request arrives** with filters (dates, location, OTAs)
2. **Check Redis cache** for existing results (if available)
3. **Query PostgreSQL** if cache miss
4. **Aggregate data** by date, OTA, and property
5. **Calculate statistics** (min/max/avg prices)
6. **Cache results** in Redis
7. **Return formatted data** to client

### Database Schema

The service works with PostgreSQL tables:
- `hotels`: Hotel information (ID, name, location)
- `rates`: Daily rate data from OTAs
- `ota_rates`: Normalized OTA rate information

## API Endpoints

### Calendar Data

#### `POST /v1/calendar-data`
Get detailed calendar data with filters.

**Request Body:**
```json
{
  "checkIn": "2024-03-01",
  "checkOut": "2024-03-31",
  "location": "New York",
  "otas": ["booking", "expedia", "agoda"],
  "hotelId": "hotel_123"
}
```

**Response (200):**
```json
{
  "data": [
    {
      "date": "2024-03-01",
      "ota": "booking",
      "price": 150.00,
      "currency": "USD",
      "availability": true,
      "roomType": "Standard Room",
      "hotelName": "Grand Hotel"
    },
    {
      "date": "2024-03-01",
      "ota": "expedia",
      "price": 155.00,
      "currency": "USD",
      "availability": true,
      "roomType": "Standard Room",
      "hotelName": "Grand Hotel"
    }
  ],
  "count": 90,
  "filters": {
    "checkIn": "2024-03-01",
    "checkOut": "2024-03-31",
    "location": "New York",
    "otas": ["booking", "expedia", "agoda"]
  }
}
```

---

#### `POST /v1/calendar-data/aggregated`
Get aggregated statistics (min/max/avg prices) by date.

**Request Body:**
```json
{
  "checkIn": "2024-03-01",
  "checkOut": "2024-03-31",
  "location": "New York",
  "otas": ["booking", "expedia", "agoda"],
  "hotelId": "hotel_123"
}
```

**Response (200):**
```json
{
  "data": [
    {
      "date": "2024-03-01",
      "minPrice": 150.00,
      "maxPrice": 180.00,
      "avgPrice": 162.50,
      "currency": "USD",
      "otaCount": 4,
      "availableOtas": ["booking", "expedia", "agoda", "trip"]
    },
    {
      "date": "2024-03-02",
      "minPrice": 145.00,
      "maxPrice": 175.00,
      "avgPrice": 158.75,
      "currency": "USD",
      "otaCount": 4,
      "availableOtas": ["booking", "expedia", "agoda", "trip"]
    }
  ],
  "summary": {
    "totalDays": 31,
    "overallMinPrice": 145.00,
    "overallMaxPrice": 180.00,
    "overallAvgPrice": 160.25,
    "currency": "USD"
  }
}
```

---

### Insights & Filters

#### `GET /v1/insights/filters`
Get available filter options for the dataset.

**Response (200):**
```json
{
  "otas": [
    { "id": "booking", "name": "Booking.com" },
    { "id": "expedia", "name": "Expedia" },
    { "id": "agoda", "name": "Agoda" },
    { "id": "trip", "name": "Trip.com" }
  ],
  "locations": [
    "New York",
    "Los Angeles",
    "Miami",
    "Chicago"
  ],
  "dateRange": {
    "earliest": "2024-01-01",
    "latest": "2024-12-31"
  },
  "hotels": [
    {
      "id": "hotel_123",
      "name": "Grand Hotel",
      "location": "New York"
    }
  ]
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
  "service": "aggregator-service"
}
```

## Technologies Used

- **Express.js**: Web framework
- **TypeScript**: Type-safe JavaScript
- **PostgreSQL**: Primary data store for rates and hotels
- **Redis**: Cache layer for performance optimization
- **pg**: PostgreSQL client with connection pooling
- **date-fns**: Date manipulation and formatting

## Environment Variables

Add to `.env` file in the root directory:

```env
# Aggregator Service Configuration
AGGREGATOR_SERVICE_PORT=3005

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=axlrate_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=3600

# Cache Settings
ENABLE_CACHE=true
CACHE_TTL_SECONDS=3600
```

## Installation

```bash
# Install dependencies
cd services/aggregator-service
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

The service will start on port `3005` (or the port specified in `AGGREGATOR_SERVICE_PORT`).

## Dependencies

### Runtime Dependencies
- `express`: ^4.18.2
- `cors`: ^2.8.5
- `dotenv`: ^16.3.1
- `pg`: ^8.11.3
- `redis`: ^4.6.12

### Development Dependencies
- `@types/cors`: ^2.8.17
- `@types/express`: ^4.17.21
- `@types/node`: ^20.10.6
- `@types/pg`: ^8.10.9
- `typescript`: ^5.3.3
- `ts-node-dev`: ^2.0.0

## Why It's Useful

### 1. **Data Aggregation**
Combines rate data from multiple OTAs into a unified view for easy comparison.

### 2. **Performance Optimization**
- Redis caching reduces database load
- Connection pooling for PostgreSQL
- Optimized queries with proper indexing
- Aggregated data reduces response size

### 3. **Business Intelligence**
- Price trends analysis
- OTA comparison
- Market rate insights
- Availability tracking

### 4. **Flexible Filtering**
Query data by:
- Date ranges
- Specific OTAs
- Geographic locations
- Hotel properties
- Price ranges

### 5. **Scalability**
- Separation of concerns (reads vs writes)
- Cache layer for high-traffic queries
- Independent scaling from data ingestion
- Database query optimization

### 6. **Calendar View Support**
Specifically designed for calendar-based hotel rate viewing and comparison.

## Query Optimization

### Indexing Strategy

```sql
-- Indexes for optimal query performance
CREATE INDEX idx_rates_hotel_date ON rates(hotel_id, rate_date);
CREATE INDEX idx_rates_ota ON rates(ota_source);
CREATE INDEX idx_rates_date_range ON rates(rate_date);
CREATE INDEX idx_hotels_location ON hotels(location);
```

### Caching Strategy

1. **Cache Key Structure**: `calendar:{hotelId}:{checkIn}:{checkOut}:{otas}`
2. **TTL**: 1 hour (configurable)
3. **Invalidation**: On new rate data ingestion
4. **Warm-up**: Pre-cache popular queries

## Data Repositories

### CalendarRepository
Handles calendar-specific data queries:
- `getCalendarData(filters)`: Get detailed rate data
- `getAggregatedData(filters)`: Get min/max/avg statistics
- `getDateRange(hotelId)`: Get available date range

### InsightRepository
Provides filter and insight data:
- `getAvailableOtas()`: List of active OTAs
- `getLocations()`: Available locations
- `getHotels(location?)`: Hotel list
- `getDateRange()`: Available date range

## Performance Considerations

### Database Queries
- Use prepared statements to prevent SQL injection
- Limit result sets with pagination
- Use database-level aggregation (MIN, MAX, AVG)
- Leverage database indexes

### Caching
- Cache expensive aggregation queries
- Set appropriate TTL based on data freshness requirements
- Monitor cache hit/miss ratios
- Implement cache warming for popular queries

### Connection Pooling
```typescript
// PostgreSQL connection pool configuration
{
  max: 20,          // Maximum pool size
  min: 2,           // Minimum pool size
  idle: 10000,      // Idle timeout
  acquire: 30000,   // Acquire timeout
}
```

## Error Handling

Common error scenarios:
- **Database Connection**: Returns 503 with connection error details
- **Invalid Filters**: Returns 400 with validation errors
- **Missing Data**: Returns empty array with metadata
- **Redis Unavailable**: Falls back to direct database queries

## Monitoring & Logging

The service logs:
- Incoming requests with filters
- Database query execution times
- Cache hit/miss events
- Redis connection status
- Error details with stack traces

## Testing

Test endpoints using cURL:

```bash
# Get calendar data
curl -X POST http://localhost:3005/v1/calendar-data \
  -H "Content-Type: application/json" \
  -d '{
    "checkIn": "2024-03-01",
    "checkOut": "2024-03-31",
    "location": "New York",
    "otas": ["booking", "expedia"]
  }'

# Get aggregated statistics
curl -X POST http://localhost:3005/v1/calendar-data/aggregated \
  -H "Content-Type: application/json" \
  -d '{
    "checkIn": "2024-03-01",
    "checkOut": "2024-03-31",
    "hotelId": "hotel_123"
  }'

# Get filter options
curl http://localhost:3005/v1/insights/filters
```

## Future Enhancements

- Predictive pricing analysis
- Historical trend analysis
- Rate parity monitoring
- Automated price alerts
- Competitor rate tracking
- Machine learning for price predictions
- Real-time rate change notifications
- Advanced analytics dashboard

## Related Services

- [API Gateway](../api-gateway/README.md)
- [SerpAPI Service](../serpapi-service/README.md)
- [Ingest Service](../ingest-service/README.md)
- [Export Service](../export-service/README.md)

