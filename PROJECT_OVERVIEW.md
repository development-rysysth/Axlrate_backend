# Axlrate Backend - Complete Project Overview

## 🎯 Project Purpose

**Axlrate** is a hotel rate intelligence platform that aggregates and analyzes hotel pricing data from multiple Online Travel Agencies (OTAs). It helps hotels monitor competitor rates, track market pricing trends, and make data-driven pricing decisions.

### Core Value Proposition
- **Rate Aggregation**: Collects hotel rates from multiple OTAs (Booking.com, Expedia, Agoda, Trip.com)
- **Price Intelligence**: Provides calendar-based views of rates across different OTAs
- **Market Analysis**: Enables hotels to compare their rates with competitors
- **Data-Driven Decisions**: Supports revenue management through comprehensive rate analytics

---

## 🏗️ Architecture Overview

### Microservices Architecture

The project follows a **microservices architecture** with clear separation of concerns:

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│      API Gateway (Port 3000)        │  ← Single Entry Point
└──────┬──────────────────────────────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
       ▼                                     ▼
┌──────────────────┐              ┌──────────────────┐
│  Auth Service    │              │ SerpAPI Service   │
│   (Port 3001)    │              │   (Port 3003)    │
└──────────────────┘              └──────────────────┘
       │                                     │
       ▼                                     ▼
┌──────────────────┐
│  PostgreSQL      │
│  (Users, Hotels, │
│   Rates,        │
│   SerpData)     │
└──────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   Aggregator Service (Port 3005)   │
└──────┬──────────────────────────────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
       ▼                                     ▼
┌──────────────────┐              ┌──────────────────┐
│  PostgreSQL      │              │      Redis       │
│  (Rates, Hotels) │              │     (Cache)      │
└──────────────────┘              └──────────────────┘
```

---

## 📁 Project Structure

```
Axlrate_backend/
├── services/                    # Microservices
│   ├── api-gateway/            # Entry point, routes requests
│   ├── auth-service/           # Authentication & user management
│   ├── serpapi-service/        # Google Hotels API via SerpAPI
│   ├── aggregator-service/     # Rate aggregation & analytics
│   ├── ingest-service/         # Data ingestion (skeleton)
│   ├── export-service/         # Data export (skeleton)
│   └── scraper-orchestrator/   # Scraper coordination (skeleton)
│
├── scrapers/                   # Python Selenium scrapers
│   ├── booking/                # Booking.com scraper
│   ├── expedia/                # Expedia scraper
│   ├── agoda/                  # Agoda scraper
│   ├── trip/                   # Trip.com scraper
│   └── common/                 # Shared scraper utilities
│
├── db/                         # Database configurations
│   └── postgres/               # PostgreSQL schemas & migrations
│       ├── schema/            # Table definitions
│       └── migrations/       # Database migrations
│
├── shared/                     # Shared TypeScript utilities
│   ├── middleware/            # Authentication middleware
│   ├── utils/                 # JWT, password utilities
│   ├── validators/            # Request validators
│   └── types/                 # TypeScript type definitions
│
├── scripts/                    # Utility scripts
│   ├── run-migration.ts       # Run database migrations
│   ├── check-database.ts      # Database health check
│   └── add-hotel-id-column.ts # Migration script
│
└── docs/                       # Documentation
    └── api/                    # API documentation
```

---

## 🔧 Services Breakdown

### 1. API Gateway (Port 3000)
**Purpose**: Single entry point for all client requests

**Responsibilities**:
- Routes requests to appropriate microservices
- Handles API versioning (`/api/v1/`)
- Manages CORS
- Provides health monitoring
- Maintains backward compatibility with legacy routes

**Technology**: Express.js, http-proxy-middleware

---

### 2. Auth Service (Port 3001)
**Purpose**: User authentication and management

**Responsibilities**:
- User registration with hotel linking
- User login/logout
- JWT token generation and refresh
- User profile management
- Password hashing (bcrypt)

**Database**: PostgreSQL (`users` table)

**Key Features**:
- Access tokens (15min expiry)
- Refresh tokens (7 days expiry)
- Hotel registration during user signup
- Token blacklisting on logout

---

### 3. SerpAPI Service (Port 3003)
**Purpose**: Fetch hotel rates from Google Hotels via SerpAPI

**Responsibilities**:
- Search hotels by name and location
- Fetch hotel rates for date ranges
- Store SerpAPI responses in PostgreSQL
- Provide country/state/city data
- Batch rate fetching

**Database**: PostgreSQL (`serpdata` table)

**Key Features**:
- Hotel search with location filtering
- Rate fetching with date validation
- Data persistence for analytics
- Support for multiple countries/currencies

---

### 4. Aggregator Service (Port 3005)
**Purpose**: Aggregate and analyze rate data from multiple sources

**Responsibilities**:
- Calendar data retrieval with filters
- Price aggregation (min/max/avg)
- Filter options (OTAs, locations, dates)
- Redis caching for performance
- Query optimization

**Database**: PostgreSQL (`rates`, `ota_rates`, `hotels` tables)

**Key Features**:
- Calendar view support
- Multi-OTA comparison
- Price trend analysis
- Filter-based queries

---

### 5. Ingest Service (Port 3004)
**Status**: Skeleton/Placeholder

**Planned Purpose**: Normalize and ingest scraped OTA data into PostgreSQL

---

### 6. Export Service (Port 3006)
**Status**: Skeleton/Placeholder

**Planned Purpose**: Export data in various formats (CSV, Excel, JSON)

---

### 7. Scraper Orchestrator (Port 3007)
**Status**: Skeleton/Placeholder

**Planned Purpose**: Coordinate Python scrapers via RabbitMQ

---

## 🗄️ Database Schema

### PostgreSQL Tables

#### `users`
- User accounts with hotel associations
- Fields: id, name, business_email, country, hotel_name, hotel_id, phone_number, current_pms, business_type, number_of_rooms, password, refresh_tokens
- Foreign Key: `hotel_id` → `hotels.hotel_id`

#### `hotels`
- Hotel information
- Fields: hotel_id (PK), hotel_name, star_rating, address_full, city, zip_code, phone, gps_lat, gps_lon, amenities (many boolean fields), review_score, review_count, check_in_time, check_out_time
- Indexes: hotel_id, hotel_name, city, GPS coordinates

#### `rates`
- Rate data from SerpAPI
- Fields: id, hotel_id, source, check_in_date, check_out_date, adults, rate_per_night_lowest, rate_per_night_highest, total_rate_lowest, total_rate_highest, currency, raw_data (JSONB)
- Unique constraint: (hotel_id, source, check_in_date, check_out_date, adults)

#### `ota_rates`
- Normalized OTA rate data (for scraped data)
- Fields: id, hotel_id, ota_name, room_name, check_in_date, check_out_date, adults, rate_per_night, total_rate, currency, free_cancellation, cancellation_until_date, official_rate, raw_data (JSONB)

#### `countries`, `states`, `cities`
- Location reference data for hotel search

### PostgreSQL Tables (continued)

#### `serpdata`
- Raw SerpAPI responses
- Stores complete hotel search results with rates, amenities, reviews, etc.
- Fields: id, search_metadata (JSONB), search_parameters (JSONB), name, property_token, featured_prices (JSONB), etc.
- Indexes: property_token, name, created_at, GPS coordinates

---

## 🔌 API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication Endpoints

#### `POST /register`
Register a new user account with optional hotel linking.

**Request Body**:
```json
{
  "name": "John Doe",
  "businessEmail": "john@hotel.com",
  "country": "United States",
  "hotelName": "Grand Hotel",
  "phoneNumber": "+1234567890",
  "currentPMS": "Opera PMS",
  "businessType": "Independent Hotel",
  "numberOfRooms": 150,
  "password": "password123",
  "selectedHotel": { /* Optional: hotel object from search */ }
}
```

**Response**: User object + access/refresh tokens

---

#### `POST /login`
Authenticate user and get tokens.

**Request Body**:
```json
{
  "businessEmail": "john@hotel.com",
  "password": "password123"
}
```

**Response**: User object + access/refresh tokens

---

#### `POST /refresh`
Refresh access token using refresh token.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response**: New access token

---

#### `POST /logout`
Invalidate refresh token.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### `GET /users/:id`
Get user profile (requires authentication).

**Headers**: `Authorization: Bearer <accessToken>`

---

#### `PUT /users/:id`
Update user profile (requires authentication).

**Headers**: `Authorization: Bearer <accessToken>`

---

### SerpAPI Endpoints

#### `POST /serpapi/fetch-rates`
Fetch hotel rates from Google Hotels via SerpAPI.

**Request Body**:
```json
{
  "hotelName": "Grand Hotel New York",
  "checkInDate": "2024-02-15",
  "checkOutDate": "2024-02-20",
  "gl": "us",
  "hl": "en",
  "currency": "USD",
  "adults": 2
}
```

**Response**: SerpAPI response data + database save status

---

#### `GET /serpapi/fetch-rates`
Same as POST but using query parameters.

**Query Params**: `q`, `check_in_date`, `check_out_date`, `gl`, `hl`, `currency`, `adults`

---

#### `POST /serpapi/batch-fetch-rates`
Fetch rates for multiple hotels (from constants).

**Request Body**:
```json
{
  "checkInDate": "2024-02-15",
  "checkOutDate": "2024-02-20",
  "adults": 2
}
```

---

#### `GET /serpapi/countries`
Get all available countries.

**Response**: Array of countries with id, name, code

---

#### `GET /serpapi/states?countryCode=US`
Get states for a country.

**Query Params**: `countryCode` (required)

**Response**: Array of states with id, name

---

#### `POST /serpapi/search-hotel`
Search hotels with location filtering.

**Request Body**:
```json
{
  "hotelName": "ramada by wyndham",
  "countryCode": "US",
  "stateName": "Wisconsin",
  "checkInDate": "2025-12-11",
  "checkOutDate": "2025-12-12",
  "hl": "en",
  "currency": "USD",
  "adults": 2
}
```

**Response**: Hotel property data with rates, amenities, reviews

---

### Aggregator Service Endpoints

#### `POST /calendar-data`
Get detailed calendar data with filters.

**Request Body**:
```json
{
  "checkIn": "2024-03-01",
  "checkOut": "2024-03-31",
  "location": "New York",
  "otas": ["booking", "expedia", "agoda"],
  "hotelId": "hotel_123"
}
```

**Response**: Array of rate data by date and OTA

---

#### `POST /calendar-data/aggregated`
Get aggregated statistics (min/max/avg prices).

**Request Body**: Same as `/calendar-data`

**Response**: Aggregated price statistics by date

---

#### `GET /insights/filters`
Get available filter options.

**Response**: Available OTAs, locations, date ranges, hotels

---

### Legacy Endpoints (Backward Compatibility)

- `/api/auth/*` → Routes to Auth Service
- `/api/users/*` → Routes to Auth Service
- `/api/serpapi/*` → Routes to SerpAPI Service
- `/api/calendarData` → Routes to Aggregator Service

---

## 🔄 Data Flow

### User Registration Flow
```
1. User submits registration form
2. API Gateway receives POST /api/v1/register
3. Gateway forwards to Auth Service
4. Auth Service:
   - Validates input
   - Creates hotel record (if selectedHotel provided)
   - Creates user record with hotel_id
   - Hashes password
   - Generates JWT tokens
5. Returns user + tokens to client
```

### Hotel Rate Fetching Flow
```
1. Client requests rates via POST /api/v1/serpapi/fetch-rates
2. API Gateway forwards to SerpAPI Service
3. SerpAPI Service:
   - Formats hotel query
   - Validates dates
   - Calls SerpAPI (Google Hotels API)
   - Transforms response
   - Saves to PostgreSQL (serpdata table)
4. Returns rates data to client
```

### Calendar Data Flow
```
1. Client requests calendar data via POST /api/v1/calendar-data
2. API Gateway forwards to Aggregator Service
3. Aggregator Service:
   - Checks Redis cache
   - Queries PostgreSQL (rates, hotels tables)
   - Aggregates by date/OTA
   - Calculates statistics
   - Caches results
4. Returns formatted calendar data
```

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Package Manager**: pnpm (workspaces)

### Databases
- **PostgreSQL**: Primary database (users, hotels, rates, serpdata, locations)
- **Redis**: Caching layer (optional, for Aggregator Service)

### Authentication
- **JWT**: Access and refresh tokens
- **bcrypt**: Password hashing

### External Services
- **SerpAPI**: Google Hotels API proxy
- **RabbitMQ**: Message queue (planned, for scraper orchestration)

### Scrapers
- **Python**: Selenium-based scrapers
- **OTAs**: Booking.com, Expedia, Agoda, Trip.com

---

## 🚀 How to Run

### Prerequisites
- Node.js (v18+)
- pnpm
- PostgreSQL
- Redis (optional)

### Setup Steps

1. **Install dependencies**:
```bash
pnpm install
```

2. **Configure environment**:
Create `.env` file in root:
```env
# API Gateway
GATEWAY_PORT=3000

# Auth Service
AUTH_SERVICE_PORT=3001
AUTH_SERVICE_URL=http://localhost:3001

# SerpAPI Service
SERPAPI_SERVICE_PORT=3003
SERPAPI_SERVICE_URL=http://localhost:3003
SERP_API_KEY=your_serpapi_key

# Aggregator Service
AGGREGATOR_SERVICE_PORT=3005
AGGREGATOR_SERVICE_URL=http://localhost:3005

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=axlrate_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secrets
ACCESS_TOKEN_SECRET=your_secret
REFRESH_TOKEN_SECRET=your_secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
```

3. **Run database migrations**:
```bash
pnpm run migration:run
```

4. **Start services**:
```bash
# Development (all services)
pnpm run dev

# Or individually
pnpm run dev:gateway
pnpm run dev:auth
pnpm run dev:serpapi
pnpm run dev:aggregator
```

---

## 📊 Key Features

### ✅ Implemented
- User authentication (register, login, logout, refresh)
- JWT token management
- Hotel search via SerpAPI
- Rate fetching from Google Hotels
- Calendar data aggregation
- Multi-OTA rate comparison
- Country/state/city selection
- Hotel registration during signup
- Data persistence (PostgreSQL)
- API versioning
- Request validation
- Error handling

### 🚧 In Progress / Planned
- OTA scraping (Python scrapers)
- Data ingestion pipeline
- Export functionality
- Scraper orchestration
- Advanced analytics
- Rate parity monitoring
- Price alerts
- Historical trend analysis

---

## 🔐 Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Refresh token rotation
- Token blacklisting on logout
- Input validation
- SQL injection prevention (parameterized queries)
- CORS configuration
- Environment variable secrets

---

## 📈 Performance Optimizations

- **Connection Pooling**: PostgreSQL connection pools
- **Caching**: Redis for frequently accessed data
- **Database Indexing**: Indexes on frequently queried columns
- **Query Optimization**: Aggregated queries for calendar data
- **Rate Limiting**: Protection against API abuse

---

## 🧪 Testing

### Database Health Check
```bash
pnpm run db:check
```

### Migration Scripts
```bash
pnpm run migration:run
```

---

## 📝 Development Notes

### Service Ports
- API Gateway: 3000
- Auth Service: 3001
- SerpAPI Service: 3003
- Ingest Service: 3004
- Aggregator Service: 3005
- Export Service: 3006
- Scraper Orchestrator: 3007

### Database Migrations
Migrations are in `db/postgres/migrations/`:
- `001_initial_schema.sql`
- `002_add_hotel_id_to_users.sql`
- `003_add_id_to_hotels.sql`
- `004_reset_database_keep_location_tables.sql`

### Shared Code
Common utilities in `shared/`:
- JWT utilities
- Password hashing
- Authentication middleware
- Request validators
- Type definitions

---

## 🎯 Use Cases

1. **Hotel Manager Registration**
   - Search for their hotel
   - Register account
   - Link hotel to account

2. **Rate Monitoring**
   - Fetch current rates from Google Hotels
   - View calendar of rates across OTAs
   - Compare prices

3. **Market Analysis**
   - View aggregated price trends
   - Filter by location, OTA, date range
   - Analyze competitor pricing

4. **Data Export** (planned)
   - Export rate data for analysis
   - Generate reports

---

## 🔮 Future Enhancements

- Real-time rate monitoring
- Automated price alerts
- Machine learning price predictions
- Rate parity detection
- Competitor analysis dashboard
- Historical trend visualization
- API rate limiting
- Webhook support
- Multi-tenant support
- Advanced filtering and search

---

## 📚 Documentation

- Main README: `README.md`
- API Integration Guide: `docs/api/frontend-integration.md`
- Service-specific READMEs in each service directory

---

## 🤝 Contributing

This is a microservices architecture with:
- Independent service deployment
- Shared utilities in `shared/`
- Database migrations for schema changes
- API versioning for backward compatibility

---

## 📞 Support

For issues or questions:
- Check service-specific READMEs
- Review API documentation in `docs/api/`
- Check database migration scripts
- Review environment variable configuration

---

**Last Updated**: Based on current codebase structure
**Version**: 1.0.0
