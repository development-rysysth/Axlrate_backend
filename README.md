# Axlrate Backend - Microservices Architecture

A Node.js and Express backend with microservices architecture, featuring authentication with access and refresh tokens.

## Architecture

This project follows a microservices architecture with separation of concerns:

- **API Gateway** (`services/api-gateway`) - Entry point for all client requests, routes to appropriate services
- **Auth Service** (`services/auth-service`) - Handles authentication (register, login, token refresh, logout) and user management
- **SerpAPI Service** (`services/serpapi-service`) - Handles hotel rate searches via SerpAPI
- **Shared** (`shared`) - Common utilities, middleware, and validators used across services

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

### 1. Install Dependencies

```bash
npm run install:all
```

Or install manually in each directory:
```bash
npm install
cd services/api-gateway && npm install
cd ../auth-service && npm install
cd ../serpapi-service && npm install
cd ../.. && cd shared && npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# API Gateway
GATEWAY_PORT=3000

# Auth Service
AUTH_SERVICE_PORT=3001
AUTH_SERVICE_URL=http://localhost:3001

# MongoDB Connection
# For local MongoDB: mongodb://localhost:27017/axlrate
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/axlrate?retryWrites=true&w=majority
MONGODB_URI=mongodb://localhost:27017/axlrate

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
ACCESS_TOKEN_SECRET=your-super-secret-access-token-key-change-this
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key-change-this

# Token Expiry
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# SerpAPI Service
SERPAPI_SERVICE_PORT=3003
SERPAPI_SERVICE_URL=http://localhost:3003
SERP_API_KEY=1df98094870e92f06610b9973c259ad6ee4e00b031f30f736c39fe303b0e1952
```

**Important Notes:**
- Make sure MongoDB is running locally or update `MONGODB_URI` with your MongoDB Atlas connection string
- Change the JWT secrets in production
- The database name `axlrate` will be created automatically if it doesn't exist
- SerpAPI key is already configured, but you can update it if needed

### 3. Start Services

#### Option 1: Start all services together (recommended for development)

```bash
npm run dev
```

This will start the API Gateway, Auth Service, and SerpAPI Service concurrently.

#### Option 2: Start services separately

Terminal 1 - API Gateway:
```bash
npm run dev:gateway
```

Terminal 2 - Auth Service:
```bash
npm run dev:auth
```

Terminal 3 - SerpAPI Service:
```bash
npm run dev:serpapi
```

#### Option 3: Start in production mode
```bash
npm start
```

Or separately:
```bash
npm run start:gateway
npm run start:auth
npm run start:serpapi
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

#### Fetch Hotel Rates
```http
POST /api/serpapi/fetch-rates
Content-Type: application/json

{
  "hotelName": "Grand Hotel New York",
  "checkInDate": "2024-02-15",
  "checkOutDate": "2024-02-20",
  "gl": "us",
  "hl": "en",
  "currency": "USD"
}
```

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

## Project Structure

```
Axlrate_backend/
├── services/
│   ├── api-gateway/       # API Gateway service
│   ├── auth-service/      # Authentication and user management service
│   │   ├── config/         # Database configuration
│   │   └── models/         # Mongoose models
│   └── serpapi-service/    # SerpAPI hotel rate search service
│       ├── utils/          # Formatters and SerpAPI utilities
│       └── validators/     # Request validators
├── shared/                # Shared utilities and middleware
│   ├── middleware/        # Authentication middleware
│   ├── utils/             # JWT and password utilities
│   └── validators/        # Request validators
├── .env.example           # Environment variables template
├── package.json           # Root package.json
└── README.md              # This file
```

## Database

This project uses **MongoDB** for data storage. The User model includes:

- **Basic Info**: Name, Business Email, Country
- **Hotel Information**: Hotel Name
- **Contact**: Phone Number
- **Property Management**: Current PMS
- **Business Type**: Independent Hotel, Chain Hotel, Hotel Management Company, or OTA's
- **Inventory**: Number of Rooms
- **Authentication**: Password (hashed), Refresh Tokens

### MongoDB Setup

1. **Local MongoDB**: Install MongoDB locally and ensure it's running
   ```bash
   # macOS
   brew install mongodb-community
   brew services start mongodb-community
   ```

2. **MongoDB Atlas** (Cloud): Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Get your connection string
   - Update `MONGODB_URI` in `.env`

3. The database and collection will be created automatically on first use.

## Security Notes

1. **Change JWT Secrets**: Always change the default JWT secrets in production
2. **Use HTTPS**: Always use HTTPS in production
3. **MongoDB Security**: 
   - Use strong passwords for MongoDB
   - Enable authentication in production
   - Use MongoDB Atlas IP whitelist for cloud deployments
4. **Token Storage**: Refresh tokens are stored in the database for better security
5. **Rate Limiting**: Add rate limiting to prevent brute force attacks
6. **CORS**: Configure CORS properly for your frontend domain
7. **Password Hashing**: Passwords are automatically hashed using bcrypt before storage

## Development

- Uses `nodemon` for auto-reloading during development
- Each service can be developed and deployed independently
- Shared utilities ensure consistency across services

## Next Steps

- [ ] Add database integration (MongoDB/PostgreSQL)
- [ ] Implement token blacklisting
- [ ] Add rate limiting
- [ ] Add request logging
- [ ] Add unit and integration tests
- [ ] Add Docker containerization
- [ ] Add API documentation (Swagger/OpenAPI)

