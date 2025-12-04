# Ingest Service

## Overview

The **Ingest Service** is responsible for receiving, validating, normalizing, and storing hotel rate data from various sources into the PostgreSQL database. It acts as the data ingestion pipeline that ensures data quality and consistency before storage.

## What It Does

The Ingest Service handles:

- **Data Reception**: Receives rate data from scrapers via RabbitMQ or HTTP
- **Data Validation**: Validates incoming data against schemas
- **Data Normalization**: Standardizes data formats across different OTA sources
- **Data Transformation**: Converts raw scraper data to database schema
- **Duplicate Detection**: Prevents duplicate rate entries
- **Error Handling**: Manages invalid data and processing errors
- **PostgreSQL Storage**: Stores validated data in the rates and hotels tables
- **Message Queue Processing**: Consumes rate data from RabbitMQ queues

## How It Works

### Architecture

```
Scrapers → RabbitMQ → Ingest Service → PostgreSQL
    ↓                       ↓
HTTP/API           Validation & Normalization
```

### Data Flow

1. **Data arrives** from scrapers (via RabbitMQ or HTTP POST)
2. **Validate schema** using validators
3. **Normalize data** across different OTA formats
4. **Check for duplicates** in database
5. **Transform to DB schema** (rates, hotels tables)
6. **Insert into PostgreSQL** with proper relations
7. **Acknowledge message** or return HTTP response
8. **Log processing results** for monitoring

### Message Queue Integration

The service consumes messages from RabbitMQ queues:
- Queue: `rates_ingestion_queue`
- Exchange: `hotel_rates_exchange`
- Routing Key: `rates.scraped`

### Data Sources

- **Web Scrapers**: Booking.com, Expedia, Agoda, Trip.com
- **SerpAPI Service**: Google Hotels data
- **Manual Uploads**: CSV/JSON imports (future)
- **Partner APIs**: Direct OTA integrations (future)

## Data Model

### Input Data Format

Expected JSON structure from scrapers:

```typescript
{
  hotel: {
    name: string;
    location: string;
    address?: string;
    city: string;
    country: string;
    latitude?: number;
    longitude?: number;
    starRating?: number;
  },
  rates: [
    {
      date: string;              // YYYY-MM-DD
      price: number;
      currency: string;
      ota: string;               // booking, expedia, agoda, trip
      roomType: string;
      availability: boolean;
      mealPlan?: string;
      refundable?: boolean;
      maxOccupancy?: number;
      scraped_at: string;        // ISO 8601
    }
  ],
  metadata: {
    scraper_version: string;
    source: string;
    timestamp: string;
  }
}
```

### PostgreSQL Schema

#### Hotels Table
```sql
CREATE TABLE hotels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  star_rating INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Rates Table
```sql
CREATE TABLE rates (
  id SERIAL PRIMARY KEY,
  hotel_id INTEGER REFERENCES hotels(id),
  rate_date DATE NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  ota_source VARCHAR(50) NOT NULL,
  room_type VARCHAR(255),
  availability BOOLEAN DEFAULT true,
  meal_plan VARCHAR(100),
  refundable BOOLEAN,
  max_occupancy INTEGER,
  scraped_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(hotel_id, rate_date, ota_source, room_type)
);
```

## API Endpoints

### Data Ingestion

#### `POST /v1/ingest/rates`
Ingest hotel rate data (HTTP endpoint).

**Request Body:**
```json
{
  "hotel": {
    "name": "Hilton New York Midtown",
    "location": "New York, NY",
    "city": "New York",
    "country": "USA",
    "starRating": 4
  },
  "rates": [
    {
      "date": "2024-03-01",
      "price": 150.00,
      "currency": "USD",
      "ota": "booking",
      "roomType": "Standard Room",
      "availability": true,
      "refundable": true,
      "maxOccupancy": 2,
      "scraped_at": "2024-02-28T10:30:00Z"
    }
  ],
  "metadata": {
    "scraper_version": "1.0.0",
    "source": "booking_scraper",
    "timestamp": "2024-02-28T10:30:00Z"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Data ingested successfully",
  "results": {
    "hotelId": 123,
    "ratesIngested": 1,
    "duplicatesSkipped": 0,
    "errors": []
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "rates[0].date",
        "message": "Invalid date format"
      }
    ]
  }
}
```

---

#### `POST /v1/ingest/batch`
Ingest multiple hotels and rates in a single request.

**Request Body:**
```json
{
  "entries": [
    {
      "hotel": { /* hotel data */ },
      "rates": [ /* rate data */ ],
      "metadata": { /* metadata */ }
    },
    {
      "hotel": { /* hotel data */ },
      "rates": [ /* rate data */ ],
      "metadata": { /* metadata */ }
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "totalRatesIngested": 60,
    "duplicatesSkipped": 5
  },
  "details": [
    {
      "index": 0,
      "hotelId": 123,
      "ratesIngested": 30,
      "status": "success"
    },
    {
      "index": 1,
      "hotelId": 124,
      "ratesIngested": 30,
      "status": "success"
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
  "service": "ingest-service"
}
```

## Technologies Used

- **Express.js**: Web framework for HTTP endpoints
- **TypeScript**: Type-safe JavaScript
- **PostgreSQL**: Primary data store
- **RabbitMQ (amqplib)**: Message queue for async processing
- **pg**: PostgreSQL client
- **Joi**: Data validation

## Environment Variables

Add to `.env` file in the root directory:

```env
# Ingest Service Configuration
INGEST_SERVICE_PORT=3004

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=axlrate_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# RabbitMQ Configuration
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_QUEUE=rates_ingestion_queue
RABBITMQ_EXCHANGE=hotel_rates_exchange

# Processing Configuration
BATCH_SIZE=100
ENABLE_DUPLICATE_CHECK=true
```

## Installation

```bash
# Install dependencies
cd services/ingest-service
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

The service will start on port `3004` (or the port specified in `INGEST_SERVICE_PORT`).

## Dependencies

### Runtime Dependencies
- `express`: ^4.18.2
- `cors`: ^2.8.5
- `dotenv`: ^16.3.1
- `pg`: ^8.11.3
- `amqplib`: ^0.10.3

### Development Dependencies
- `@types/express`: ^4.17.21
- `@types/node`: ^20.10.6
- `@types/pg`: ^8.10.9
- `typescript`: ^5.3.3
- `ts-node-dev`: ^2.0.0

## Why It's Useful

### 1. **Data Quality Assurance**
- Validates all incoming data before storage
- Ensures data consistency across sources
- Prevents invalid data from corrupting the database

### 2. **Data Normalization**
Standardizes data from different OTAs:
- Date formats (YYYY-MM-DD)
- Currency codes (ISO 4217)
- OTA identifiers (booking, expedia, agoda, trip)
- Price formats (decimal with 2 places)

### 3. **Duplicate Prevention**
Uses database constraints to prevent duplicate rate entries:
```sql
UNIQUE(hotel_id, rate_date, ota_source, room_type)
```

### 4. **Async Processing**
RabbitMQ integration allows:
- Decoupling scrapers from data storage
- Reliable message delivery
- Load balancing across multiple ingest instances
- Retry logic for failed ingestions

### 5. **Scalability**
- Horizontal scaling through message queues
- Batch processing for high-volume ingestion
- Connection pooling for database efficiency

### 6. **Error Handling**
- Detailed error messages for debugging
- Failed message requeuing
- Error logging and monitoring
- Partial success handling in batch operations

### 7. **Data Transformation**
Transforms various input formats into a consistent database schema.

## Data Validation

### Validation Rules

```typescript
// Hotel validation
{
  name: required, string, min 3 chars
  location: required, string
  city: required, string
  country: required, string
  starRating: optional, integer 1-5
}

// Rate validation
{
  date: required, ISO date format (YYYY-MM-DD)
  price: required, positive number
  currency: required, 3-letter code
  ota: required, enum [booking, expedia, agoda, trip]
  roomType: required, string
  availability: boolean, default true
}
```

## Normalizers

### OTA Normalizer
Standardizes OTA names:
- `booking.com` → `booking`
- `Expedia` → `expedia`
- `Agoda.com` → `agoda`
- `Trip.com` → `trip`

### Date Normalizer
Ensures consistent date format:
- Converts various formats to `YYYY-MM-DD`
- Validates date ranges
- Handles time zones

### Currency Normalizer
Standardizes currency codes:
- Converts to uppercase
- Validates against ISO 4217 codes
- Handles currency symbols

### Price Normalizer
Standardizes price formats:
- Removes currency symbols
- Converts to decimal with 2 places
- Handles different decimal separators

## RabbitMQ Consumer

### Message Format

```json
{
  "type": "rate_data",
  "payload": {
    "hotel": { /* hotel data */ },
    "rates": [ /* rate array */ ],
    "metadata": { /* metadata */ }
  },
  "messageId": "uuid",
  "timestamp": "2024-02-28T10:30:00Z"
}
```

### Consumer Configuration

```typescript
{
  queue: 'rates_ingestion_queue',
  prefetch: 10,           // Process 10 messages at a time
  noAck: false,          // Manual acknowledgment
  durable: true,         // Survive RabbitMQ restarts
}
```

## Error Handling

### Error Types

1. **Validation Errors**: Invalid data format
2. **Database Errors**: Connection or constraint violations
3. **Duplicate Errors**: Rate already exists
4. **Network Errors**: RabbitMQ or database connectivity

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data validation failed",
    "details": [
      {
        "field": "rates[0].price",
        "message": "Price must be a positive number"
      }
    ]
  }
}
```

## Monitoring

### Metrics to Track

- Ingestion rate (messages/second)
- Validation failure rate
- Duplicate rate percentage
- Database write latency
- Queue depth and processing lag
- Error rates by type

### Logging

The service logs:
- Incoming data volume
- Validation failures with details
- Database insertion results
- RabbitMQ message acknowledgments
- Error stack traces

## Testing

Test the HTTP endpoint:

```bash
# Ingest single hotel rates
curl -X POST http://localhost:3004/v1/ingest/rates \
  -H "Content-Type: application/json" \
  -d '{
    "hotel": {
      "name": "Test Hotel",
      "location": "New York, NY",
      "city": "New York",
      "country": "USA"
    },
    "rates": [
      {
        "date": "2024-03-01",
        "price": 150,
        "currency": "USD",
        "ota": "booking",
        "roomType": "Standard Room",
        "availability": true,
        "scraped_at": "2024-02-28T10:00:00Z"
      }
    ],
    "metadata": {
      "scraper_version": "1.0.0",
      "source": "test",
      "timestamp": "2024-02-28T10:00:00Z"
    }
  }'
```

## Performance Optimization

### Batch Inserts
Use PostgreSQL batch insert for better performance:
```sql
INSERT INTO rates (hotel_id, rate_date, price, ...)
VALUES ($1, $2, $3, ...), ($4, $5, $6, ...), ...
ON CONFLICT (hotel_id, rate_date, ota_source, room_type) DO UPDATE ...
```

### Connection Pooling
Configure PostgreSQL pool:
```typescript
{
  max: 20,          // Maximum connections
  min: 5,           // Minimum connections
  idle: 10000,      // Idle timeout
}
```

### Bulk Processing
Process messages in batches for efficiency.

## Future Enhancements

- Data quality scoring
- Automated data correction
- Machine learning for anomaly detection
- Support for more data sources
- Real-time data streaming
- Data versioning and history
- Automated schema migration
- Data lineage tracking
- ETL pipeline visualization
- Integration with data lakes

## Related Services

- [Scraper Orchestrator](../scraper-orchestrator/README.md)
- [Aggregator Service](../aggregator-service/README.md)
- [SerpAPI Service](../serpapi-service/README.md)
- [API Gateway](../api-gateway/README.md)

