# Axlrate Backend - Microservices Architecture

A Node.js and Express backend with microservices architecture, featuring authentication with access and refresh tokens.

## Architecture

This project follows a microservices architecture with separation of concerns:

### Core Services
- **API Gateway** (`services/api-gateway`) - Entry point for all client requests, routes to appropriate services with API versioning (`/api/v1/`)
- **Auth Service** (`services/auth-service`) - Handles authentication (register, login, token refresh, logout) and user management
- **SerpAPI Service** (`services/serpapi-service`) - Fetches Google Hotel API data via SerpAPI

### New Services (Skeletons)
- **Ingest Service** (`services/ingest-service`) - Ingests and normalizes scraped data into PostgreSQL
- **Aggregator Service** (`services/aggregator-service`) - Aggregates rates from multiple sources and provides analytics
- **Export Service** (`services/export-service`) - Handles data export functionality (CSV, Excel, JSON)
- **Scraper Orchestrator** (`services/scraper-orchestrator`) - Orchestrates Python OTA scrapers via RabbitMQ

### Scrapers
- **Python Scrapers** (`scrapers/`) - Selenium-based scrapers for Booking.com, Expedia, Agoda, Trip.com, and Airbnb

### Shared Resources
- **Shared** (`shared`) - Common utilities, middleware, and validators used across services
- **Database Config** (`db/`) - Shared database connection utilities (PostgreSQL)
- **Config** (`config/`) - Shared configuration files and Docker Compose setup

## Features

- ✅ User registration
- ✅ User login
- ✅ JWT access tokens (15min expiry)
- ✅ JWT refresh tokens (7 days expiry)
- ✅ Token refresh endpoint
- ✅ Logout functionality
- ✅ Input validation
- ✅ Password hashing with bcrypt
- ✅ Hotel rate search via SerpAPI
- ✅ Date formatting and validation
- ✅ Microservices architecture
- ✅ API Gateway for routing

## Setup

### 1. Install pnpm (if not already installed)

```bash
npm install -g pnpm
```

Or using other methods:
```bash
# Using Homebrew (macOS)
brew install pnpm

# Using npm
npm install -g pnpm

# Using curl
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all dependencies for all workspaces (root, services, and shared) in one command thanks to pnpm workspaces.

### 3. Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# API Gateway
GATEWAY_PORT=3000

# Auth Service
AUTH_SERVICE_PORT=3001
AUTH_SERVICE_URL=http://localhost:3001

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=axlrate_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
ACCESS_TOKEN_SECRET=your-super-secret-access-token-key-change-this
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key-change-this

# Token Expiry
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# SerpAPI Service
SERPAPI_SERVICE_PORT=3003
SERPAPI_SERVICE_URL=http://localhost:3003
SERP_API_KEY=apikey
```

**Important Notes:**
- Make sure PostgreSQL is running locally or update PostgreSQL connection settings
- Change the JWT secrets in production
- SerpAPI key is already configured, but you can update it if needed
- Run database migrations before starting services: `pnpm run migration:run`

### 4. Start Services

#### Option 1: Start all services together (recommended for development)

```bash
pnpm run dev
```

This will start the API Gateway, Auth Service, and SerpAPI Service concurrently.

#### Option 2: Start services separately

Terminal 1 - API Gateway:
```bash
pnpm run dev:gateway
```

Terminal 2 - Auth Service:
```bash
pnpm run dev:auth
```

Terminal 3 - SerpAPI Service:
```bash
pnpm run dev:serpapi
```

#### Option 3: Start in production mode
```bash
pnpm start
```

Or separately:
```bash
pnpm run start:gateway
pnpm run start:auth
pnpm run start:serpapi
```

#### Build for production
```bash
pnpm run build
```

## API Endpoints

All endpoints are accessed through the API Gateway at `http://localhost:3000`

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "businessEmail": "john@hotel.com",
  "country": "United States",
  "hotelName": "Grand Hotel",
  "phoneNumber": "+1234567890",
  "currentPMS": "Opera PMS",
  "businessType": "Independent Hotel",
  "numberOfRooms": 150,
  "password": "password123"
}
```

**Business Type Options:**
- `Independent Hotel`
- `Chain Hotel`
- `Hotel Management Company`
- `OTA's`

Response:
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "businessEmail": "john@hotel.com",
    "country": "United States",
    "hotelName": "Grand Hotel",
    "phoneNumber": "+1234567890",
    "currentPMS": "Opera PMS",
    "businessType": "Independent Hotel",
    "numberOfRooms": 150,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "businessEmail": "john@hotel.com",
  "password": "password123"
}
```

Response:
```json
{
  "message": "Login successful",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "businessEmail": "john@hotel.com",
    "country": "United States",
    "hotelName": "Grand Hotel",
    "phoneNumber": "+1234567890",
    "currentPMS": "Opera PMS",
    "businessType": "Independent Hotel",
    "numberOfRooms": 150,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Logout
```http
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### User Endpoints

#### Get User Profile
```http
GET /api/users/:id
Authorization: Bearer <accessToken>
```

Response:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "businessEmail": "john@hotel.com",
  "country": "United States",
  "hotelName": "Grand Hotel",
  "phoneNumber": "+1234567890",
  "currentPMS": "Opera PMS",
  "businessType": "Independent Hotel",
  "numberOfRooms": 150,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Update User Profile
```http
PUT /api/users/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Updated Name",
  "hotelName": "Updated Hotel Name",
  "numberOfRooms": 200
}
```

Note: You can update any field except `password` and `refreshTokens`. Password updates should be handled through a separate endpoint.

### SerpAPI Endpoints

#### Fetch Hotel Rates (New Versioned Endpoint)
```http
POST /api/v1/serpapi/fetch-rates
Content-Type: application/json

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

**Note**: Legacy endpoint `/api/serpapi/fetch-rates` still works for backward compatibility.

**Request Parameters:**
- `hotelName` (required): Name of the hotel to search for
- `checkInDate` (required): Check-in date in YYYY-MM-DD format or ISO date string
- `checkOutDate` (required): Check-out date in YYYY-MM-DD format or ISO date string
- `gl` (optional): Country code (default: "us")
- `hl` (optional): Language code (default: "en")
- `currency` (optional): Currency code (default: "USD")

**Validation:**
- Check-out date must be after check-in date
- Dates cannot be in the past
- Hotel name must be at least 2 characters

Response:
```json
{
  "success": true,
  "data": {
    // SerpAPI response data
  },
  "query": {
    "hotelName": "Grand Hotel New York",
    "hotelQuery": "grand+hotel+new+york",
    "checkInDate": "2024-02-15",
    "checkOutDate": "2024-02-20",
    "gl": "us",
    "hl": "en",
    "currency": "USD"
  }
}
```

## Service Ports

- API Gateway: `3000`
- Auth Service: `3001`
- SerpAPI Service: `3003`
- Ingest Service: `3004`
- Aggregator Service: `3005`
- Export Service: `3006`
- Scraper Orchestrator: `3007`

## Infrastructure Services

Start infrastructure services using Docker Compose:

```bash
cd config
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- RabbitMQ (port 5672, Management UI: 15672)

## Project Structure

```
Axlrate_backend/
├── scrapers/              # Python OTA scrapers (Selenium)
│   ├── booking/           # Booking.com scraper
│   ├── expedia/           # Expedia scraper
│   ├── agoda/             # Agoda scraper
│   ├── trip/              # Trip.com scraper
│   ├── airbnb/            # Airbnb scraper
│   └── common/            # Shared scraper utilities
├── services/
│   ├── api-gateway/       # API Gateway service
│   │   └── src/
│   │       ├── routes/v1/ # Versioned routes
│   │       └── services/  # Proxy services
│   ├── auth-service/      # Authentication service
│   │   ├── src/
│   │   │   ├── routes/v1/
│   │   │   ├── controllers/
│   │   │   └── repositories/
│   ├── serpapi-service/   # SerpAPI service
│   │   ├── src/
│   │   │   ├── collectors/
│   │   │   ├── transformers/
│   │   │   └── repositories/
│   │   └── models/
│   ├── ingest-service/    # Data ingestion service
│   ├── aggregator-service/# Rate aggregation service
│   ├── export-service/     # Data export service
│   └── scraper-orchestrator/# Scraper orchestration
├── db/                    # Shared database configurations
│   └── postgres/          # PostgreSQL schemas & migrations
├── config/                # Configuration files
│   ├── docker-compose.yml # Infrastructure services
│   └── env.example        # Environment variables template
├── shared/                # Shared TypeScript utilities
│   ├── middleware/        # Authentication middleware
│   ├── utils/             # JWT and password utilities
│   └── validators/        # Request validators
├── MIGRATION_GUIDE.md     # Migration guide for new structure
├── RESTRUCTURE_PLAN.md    # Detailed architecture plan
└── README.md              # This file
```

**Note**: See `MIGRATION_GUIDE.md` for details on the new structure and migration steps.

## Database

This project uses **PostgreSQL** for all data storage. The database includes:

- **Users Table**: User accounts with authentication
- **Hotels Table**: Hotel information and details
- **Rates Table**: Rate data from SerpAPI
- **OTA Rates Table**: Normalized OTA rate data
- **SerpData Table**: Raw SerpAPI responses
- **Location Tables**: Countries, states, cities

### PostgreSQL Setup

1. **Local PostgreSQL**: Install PostgreSQL locally and ensure it's running
   ```bash
   # macOS
   brew install postgresql@14
   brew services start postgresql@14
   ```

2. **PostgreSQL Configuration**: Update connection settings in `.env`
   - `POSTGRES_HOST`: Database host (default: localhost)
   - `POSTGRES_PORT`: Database port (default: 5432)
   - `POSTGRES_DB`: Database name
   - `POSTGRES_USER`: Database user
   - `POSTGRES_PASSWORD`: Database password

3. **Run Migrations**: Create all tables by running migrations
   ```bash
   pnpm run migration:run
   ```

## Security Notes

1. **Change JWT Secrets**: Always change the default JWT secrets in production
2. **Use HTTPS**: Always use HTTPS in production
3. **PostgreSQL Security**: 
   - Use strong passwords for PostgreSQL
   - Enable SSL connections in production
   - Restrict database access to application servers only
4. **Token Storage**: Refresh tokens are stored in the database for better security
5. **Rate Limiting**: Add rate limiting to prevent brute force attacks
6. **CORS**: Configure CORS properly for your frontend domain
7. **Password Hashing**: Passwords are automatically hashed using bcrypt before storage

## Development

- Uses `pnpm` workspaces for efficient dependency management
- Uses `nodemon` for auto-reloading during development
- Each service can be developed and deployed independently
- Shared utilities ensure consistency across services

### Package Manager

This project uses **pnpm** for package management, which provides:
- Faster installation times
- Efficient disk space usage (shared dependencies)
- Better monorepo support with workspaces
- Stricter dependency resolution

## Next Steps

- [x] Database integration (PostgreSQL)
- [ ] Implement token blacklisting
- [ ] Add rate limiting
- [ ] Add request logging
- [ ] Add unit and integration tests
- [ ] Add Docker containerization
- [ ] Add API documentation (Swagger/OpenAPI)

