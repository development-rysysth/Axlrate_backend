# Hotel Ingestion Service

## Overview

The **Hotel Ingestion Service** fetches hotel data from SerpAPI and stores it in PostgreSQL using a `hotel_key`-based upsert strategy. It implements the hotel data ingestion pipeline that populates the database with hotel information for use by other services.

## What It Does

The Hotel Ingestion Service handles:

- **Hotel Data Fetching**: Retrieves hotels from SerpAPI for specified cities
- **Deterministic Key Generation**: Generates SHA1-based `hotel_key` identifiers for deduplication
- **Database Upsert**: Stores hotels in PostgreSQL with safe deduplication
- **Pagination Handling**: Automatically handles SerpAPI pagination
- **Error Handling**: Retry logic with exponential backoff
- **Idle Mode Operation**: Runs as an idle service; ingestion is triggered manually

## How It Works

### Architecture

```
Ingestion Script → SerpAPI Client → SerpAPI (Google Hotels)
                            ↓
                    Hotel Ingestion Service
                            ↓
                    PostgreSQL (hotels table)
```

### Data Flow

1. **Manual trigger** via `npm run ingest:city <cityName>`
2. **Connect to database** and verify connection
3. **Fetch hotels from SerpAPI** for the specified city
4. **Generate hotel_key** using SHA1 hash of hotel data
5. **Upsert to database** using `hotel_key` for deduplication
6. **Handle pagination** automatically
7. **Log progress** and completion

### Database Schema

Uses `hotels` table with:
- `id` (UUID) - Primary key
- `hotel_key` (VARCHAR(40)) - Deterministic identifier for deduplication (SHA1 hash)
- Standard hotel fields (name, description, location, amenities, star_rating, etc.)

## Technologies Used

- **TypeScript**: Type-safe JavaScript
- **PostgreSQL**: Relational database for hotel storage
- **pg**: PostgreSQL client library
- **Axios**: HTTP client for SerpAPI calls
- **Express.js**: Web framework (for idle server mode)

## Environment Variables

Add to `.env` file in the root directory:

```env
# Hotel Ingestion Service Configuration
HOTEL_INGESTION_SERVICE_PORT=3004

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=axlrate_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# SerpAPI Configuration
SERP_API_KEY=your_serpapi_key_here
```

## Installation

```bash
# Install dependencies
cd services/hotel-ingestion-service
pnpm install
```

## Running the Service

### Idle Mode (Default)

The service runs in idle mode and does NOT automatically start ingestion when the server starts. It simply maintains a database connection.

**Development:**
```bash
pnpm dev
```

**Production:**
```bash
# Build the TypeScript code
pnpm build

# Start the service
pnpm start
```

The service will start on port `3004` (or the port specified in `HOTEL_INGESTION_SERVICE_PORT`) and wait in idle mode.

### Running Hotel Ingestion Manually

To ingest hotels for a specific city, use the dedicated command:

```bash
pnpm run ingest:city <cityName>
```

**Examples:**
```bash
pnpm run ingest:city Waupaca
pnpm run ingest:city "New York"
pnpm run ingest:city "Los Angeles"
```

The ingestion script will:
- Connect to the database
- Fetch hotels from SerpAPI for the specified city
- Generate `hotel_key` for each hotel
- Upsert hotels into the database (deduplication via `hotel_key`)
- Handle pagination automatically
- Log progress and completion
- Exit when complete

## Dependencies

### Runtime Dependencies
- `express`: ^4.18.2
- `cors`: ^2.8.5
- `dotenv`: ^16.3.1
- `axios`: ^1.6.2
- `pg`: ^8.11.3

### Development Dependencies
- `@types/cors`: ^2.8.17
- `@types/express`: ^4.17.21
- `@types/node`: ^20.10.6
- `@types/pg`: ^8.10.9
- `ts-node-dev`: ^2.0.0
- `typescript`: ^5.3.3

## Features

- **Deterministic Deduplication**: Uses SHA1-based `hotel_key` to prevent duplicate hotels
- **Pagination**: Automatically handles SerpAPI pagination
- **Rate Limiting**: 1.5s delay between API requests to respect SerpAPI limits
- **Error Handling**: Retry logic (max 3 attempts) with exponential backoff
- **Comprehensive Logging**: Detailed logging at every step
- **Idle Mode**: Service runs without automatic ingestion
- **Manual Trigger**: Ingestion triggered via command-line script

## Ingestion Configuration

The ingestion script uses the following default parameters:
- **Check-in date**: 2025-12-22
- **Check-out date**: 2025-12-23
- **Adults**: 2
- **Currency**: USD
- **City**: Specified via command line argument

## Why It's Useful

### 1. **Data Population**
Populates the database with hotel data that can be queried by other services.

### 2. **Safe Deduplication**
Uses deterministic `hotel_key` generation to safely handle repeated ingestion runs.

### 3. **Manual Control**
Idle mode allows manual control over when ingestion occurs, preventing unnecessary API calls.

### 4. **Error Resilience**
Retry logic and error handling ensure reliable data ingestion.

### 5. **Scalability**
Can be run for multiple cities independently.

## Logging

The service logs:
- Service startup/shutdown
- Database connection status
- API requests and responses
- Hotel processing (count, individual hotels)
- Pagination status
- Errors with stack traces
- Completion summary with statistics

## Error Handling

### Common Errors

- **Database Connection**: Returns error if PostgreSQL connection fails
- **SerpAPI Errors**: Handles API rate limits and errors with retry logic
- **Invalid City**: Returns error if city name is invalid or not found

### Retry Logic

- Maximum 3 retry attempts
- Exponential backoff between retries
- Logs all retry attempts

## Testing

Test the ingestion script:

```bash
# Ingest hotels for a test city
pnpm run ingest:city Waupaca

# Verify hotels in database
# (Use database client or hotel-service endpoints)
```

## Related Services

- [Hotel Service](../hotel-service/README.md) - Queries ingested hotel data
- [API Gateway](../api-gateway/README.md) - Entry point for hotel queries

