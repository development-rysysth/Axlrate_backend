# Auth Service

## Overview

The **Auth Service** is responsible for user authentication and authorization in the Axlrate backend system. It manages user registration, login, token generation, and user profile management using JWT (JSON Web Tokens) for secure authentication.

## What It Does

The Auth Service handles:

- **User Registration**: Creates new user accounts with encrypted passwords
- **User Login**: Authenticates users and issues JWT tokens
- **Token Management**: Generates and validates access/refresh tokens
- **Token Refresh**: Issues new access tokens using refresh tokens
- **User Logout**: Invalidates refresh tokens
- **User Profile Management**: Retrieves and updates user information
- **Password Security**: Uses bcrypt for password hashing

## How It Works

### Authentication Flow

```
1. Registration/Login → Validate credentials → Hash password → Store in PostgreSQL
2. Generate JWT tokens (access + refresh)
3. Store refresh token in database
4. Return tokens to client
5. Client uses access token for authenticated requests
6. When access token expires, use refresh token to get new access token
```

### Token Types

- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens

### Security Features

- Password hashing using bcrypt (10 salt rounds)
- JWT-based authentication
- Refresh token rotation
- Token validation middleware
- Secure password storage (never returned in responses)

## API Endpoints

### Public Endpoints (No Authentication Required)

#### `POST /v1/register`
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "businessEmail": "john@hotel.com",
  "password": "SecurePass123!",
  "country": "United States",
  "hotelName": "Grand Hotel",
  "phoneNumber": "+1234567890",
  "currentPMS": "Opera",
  "businessType": "hotel",
  "numberOfRooms": 150
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "businessEmail": "john@hotel.com",
    "country": "United States",
    "hotelName": "Grand Hotel",
    "phoneNumber": "+1234567890",
    "currentPMS": "Opera",
    "businessType": "hotel",
    "numberOfRooms": 150,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Error Responses:**
- `409`: User already exists
- `400`: Invalid data (validation errors)
- `503`: Database not initialized or connection failed

---

#### `POST /v1/login`
Authenticate a user and receive JWT tokens.

**Request Body:**
```json
{
  "businessEmail": "john@hotel.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "businessEmail": "john@hotel.com",
    ...
  },
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Error Responses:**
- `401`: Invalid credentials
- `503`: Database not initialized or connection failed

---

#### `POST /v1/refresh`
Get a new access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGc..."
}
```

**Error Responses:**
- `403`: Invalid or expired refresh token
- `503`: Database connection failed

---

#### `POST /v1/logout`
Logout and invalidate the refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200):**
```json
{
  "message": "Logged out successfully",
  "success": true
}
```

**Error Responses:**
- `400`: Missing refresh token
- `500`: Internal server error

---

### Protected Endpoints (Authentication Required)

Add the JWT access token to the request header:
```
Authorization: Bearer <access_token>
```

#### `GET /v1/users/:id`
Get user information by ID.

**Response (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "businessEmail": "john@hotel.com",
  "country": "United States",
  "hotelName": "Grand Hotel",
  "phoneNumber": "+1234567890",
  "currentPMS": "Opera",
  "businessType": "hotel",
  "numberOfRooms": 150,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid user ID
- `404`: User not found
- `401`: Unauthorized (invalid/missing token)

---

#### `PUT /v1/users/:id`
Update user information.

**Request Body:**
```json
{
  "name": "John Smith",
  "phoneNumber": "+9876543210",
  "hotelName": "Grand Plaza Hotel"
}
```

**Response (200):**
```json
{
  "id": 1,
  "name": "John Smith",
  "businessEmail": "john@hotel.com",
  "phoneNumber": "+9876543210",
  "hotelName": "Grand Plaza Hotel",
  ...
}
```

**Error Responses:**
- `400`: Invalid user ID or data
- `404`: User not found
- `401`: Unauthorized

---

### Health Check

#### `GET /health`
Check service health status.

**Response (200):**
```json
{
  "status": "ok",
  "service": "auth-service"
}
```

## Database Schema

The service uses PostgreSQL with the following user schema:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  business_email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  country VARCHAR(100) NOT NULL,
  hotel_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  current_pms VARCHAR(100) NOT NULL,
  business_type VARCHAR(50) NOT NULL CHECK (business_type IN ('hotel', 'hostel', 'resort', 'motel', 'bnb')),
  number_of_rooms INTEGER CHECK (number_of_rooms > 0),
  refresh_tokens TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Technologies Used

- **Express.js**: Web framework
- **TypeScript**: Type-safe JavaScript
- **PostgreSQL**: Relational database
- **JWT (jsonwebtoken)**: Token generation and verification
- **bcryptjs**: Password hashing
- **Joi**: Request validation
- **pg**: PostgreSQL client

## Environment Variables

Add to `.env` file in the root directory:

```env
# Auth Service Configuration
AUTH_SERVICE_PORT=3001

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=axlrate_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

## Installation

```bash
# Install dependencies
cd services/auth-service
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

The service will start on port `3001` (or the port specified in `AUTH_SERVICE_PORT`).

## Dependencies

### Runtime Dependencies
- `express`: ^4.18.2
- `cors`: ^2.8.5
- `dotenv`: ^16.3.1
- `jsonwebtoken`: ^9.0.2
- `bcryptjs`: ^2.4.3
- `joi`: ^17.11.0
- `pg`: ^8.11.3

### Development Dependencies
- `@types/bcryptjs`: ^2.4.6
- `@types/express`: ^4.17.21
- `@types/jsonwebtoken`: ^9.0.5
- `@types/pg`: ^8.10.9
- `typescript`: ^5.3.3
- `ts-node-dev`: ^2.0.0

## Why It's Useful

### 1. **Centralized Authentication**
Single source of truth for user authentication across all microservices.

### 2. **Secure Token Management**
- JWT tokens for stateless authentication
- Refresh token rotation for enhanced security
- Automatic token expiration

### 3. **Password Security**
- Bcrypt hashing with salt rounds
- Passwords never exposed in responses
- Secure password comparison

### 4. **Scalability**
- Stateless JWT authentication allows horizontal scaling
- Can be deployed independently
- Database connection pooling

### 5. **Validation & Error Handling**
- Request validation using Joi
- Comprehensive error responses
- Database error handling

### 6. **User Management**
Complete user lifecycle management from registration to profile updates.

## Error Codes

The service uses consistent error codes:

- `USER_EXISTS`: User with email already exists
- `USER_NOT_FOUND`: User not found in database
- `INVALID_CREDENTIALS`: Wrong email/password
- `INVALID_TOKEN`: Invalid or expired token
- `INVALID_ID`: Invalid user ID format
- `INVALID_DATA`: Data validation failed
- `MISSING_TOKEN`: Token not provided
- `DB_NOT_INITIALIZED`: Database tables not created
- `DB_CONNECTION_ERROR`: Database connection failed
- `INTERNAL_ERROR`: Unexpected server error

## Security Best Practices

1. **Use HTTPS** in production
2. **Rotate JWT secrets** regularly
3. **Implement rate limiting** for login/register endpoints
4. **Add password strength requirements**
5. **Enable account lockout** after failed attempts
6. **Implement email verification**
7. **Add two-factor authentication** (future)
8. **Regular security audits**

## Testing

Test endpoints using cURL or Postman:

```bash
# Register a user
curl -X POST http://localhost:3001/v1/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "businessEmail": "test@hotel.com",
    "password": "SecurePass123!",
    "country": "USA",
    "hotelName": "Test Hotel",
    "phoneNumber": "+1234567890",
    "currentPMS": "Opera",
    "businessType": "hotel",
    "numberOfRooms": 100
  }'

# Login
curl -X POST http://localhost:3001/v1/login \
  -H "Content-Type: application/json" \
  -d '{
    "businessEmail": "test@hotel.com",
    "password": "SecurePass123!"
  }'
```

## Related Services

- [API Gateway](../api-gateway/README.md)
- [Aggregator Service](../aggregator-service/README.md)
- [SerpAPI Service](../serpapi-service/README.md)

