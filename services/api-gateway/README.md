# API Gateway Service

## Overview

The **API Gateway** is the central entry point for all client requests in the Axlrate backend system. It acts as a reverse proxy that routes requests to appropriate microservices, providing a unified interface for the frontend and external consumers.

## What It Does

The API Gateway handles:

- **Request Routing**: Routes incoming requests to the appropriate backend microservice
- **Service Discovery**: Maintains configuration of all downstream services
- **Request/Response Transformation**: Handles body parsing and forwards requests with proper headers
- **Health Monitoring**: Monitors the availability of all connected services
- **CORS Management**: Handles Cross-Origin Resource Sharing for web clients
- **API Versioning**: Supports versioned APIs (currently v1) for backward compatibility
- **Legacy Route Support**: Maintains backward compatibility with older API endpoints

## How It Works

### Architecture

```
Client Request → API Gateway → Route to Service → Process → Return Response
```

The gateway uses `http-proxy-middleware` to proxy requests to backend services:

1. **Request arrives** at the gateway (e.g., `/api/v1/login`)
2. **Body parsing** occurs based on content type (JSON/URL-encoded)
3. **Route matching** determines the target service
4. **Request forwarding** to the appropriate microservice
5. **Response relay** back to the client

### Service Configuration

Services are configured in `src/config/services.ts`:
- Auth Service (User authentication and hotel/competitor management)
- Hotel Service (Hotel rate searches from database)
- Hotel Ingestion Service (Hotel data ingestion from SerpAPI)

### Special Handling

- **Hotel Service Routes**: Routes to hotel-service for rate searches and location data
- **Legacy Routes**: Backward compatibility for migration period

## API Endpoints

### Health & Status

#### `GET /health`
Returns the gateway health status and connected services.

**Response:**
```json
{
  "status": "ok",
  "service": "api-gateway",
  "services": {
    "AUTH_SERVICE": "http://localhost:3001",
    "HOTEL_SERVICE": "http://localhost:3003",
    "INGEST_SERVICE": "http://localhost:3004"
  }
}
```

#### `GET /`
Returns available endpoints and API information.

**Response:**
```json
{
  "message": "API Gateway is running",
  "version": "v1",
  "endpoints": {
    "v1": "/api/v1",
    "auth": "/api/v1",
    "serpapi": "/api/v1/serpapi",
    "hotelInfo": "/api/v1/hotel-info",
    "hotels": "/api/v1/hotels",
    "health": "/health"
  }
}
```

### V1 Proxied Routes

All routes under `/api/v1/` are proxied to their respective services:

#### Authentication (`/api/v1/`)
- `POST /register` → Auth Service
- `POST /login` → Auth Service
- `POST /logout` → Auth Service
- `POST /refresh` → Auth Service
- `GET /users/:id` → Auth Service
- `PUT /users/:id` → Auth Service

#### Hotels (`/api/v1/hotels`)
- All hotel and competitor management routes → Auth Service

#### Hotel Service (`/api/v1/serpapi`)
- `GET /fetch-rates` → Hotel Service (queries database)
- `POST /fetch-rates` → Hotel Service (queries database)
- `POST /batch-fetch-rates` → Hotel Service
- `GET /calendar-data` → Hotel Service
- `GET /countries` → Hotel Service
- `GET /states` → Hotel Service
- `GET /cities` → Hotel Service
- `POST /search-hotel` → Hotel Service

#### Hotel Info (`/api/v1/hotel-info`)
- `GET /countries` → Hotel Service (Fetch all countries from database)
- `GET /states?countryCode=US` → Hotel Service (Fetch states by country from database)
- `GET /cities?stateId=<uuid>` OR `GET /cities?countryCode=US&stateName=Wisconsin` → Hotel Service (Fetch cities by state)
- `POST /search-hotel` → Hotel Service (Search hotels from database with country and state)

### Legacy Routes (Backward Compatibility)

- `/api/v1/auth/*` → Auth Service (maintained for backward compatibility)
- `/api/serpapi/*` → Hotel Service (maintained for backward compatibility)

## Technologies Used

- **Express.js**: Web framework for Node.js
- **TypeScript**: Type-safe JavaScript
- **http-proxy-middleware**: Reverse proxy middleware
- **CORS**: Cross-Origin Resource Sharing support
- **dotenv**: Environment variable management

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Gateway Configuration
GATEWAY_PORT=3000

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
HOTEL_SERVICE_URL=http://localhost:3003
INGEST_SERVICE_URL=http://localhost:3004
# Legacy alias for backward compatibility
SERPAPI_SERVICE_URL=http://localhost:3003
```

## Installation

```bash
# Install dependencies
cd services/api-gateway
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

The service will start on port `3000` (or the port specified in `GATEWAY_PORT`).

## Dependencies

### Runtime Dependencies
- `express`: ^4.18.2
- `cors`: ^2.8.5
- `dotenv`: ^16.3.1
- `http-proxy-middleware`: ^2.0.6

### Development Dependencies
- `@types/cors`: ^2.8.17
- `@types/express`: ^4.17.21
- `@types/node`: ^20.10.6
- `typescript`: ^5.3.3
- `ts-node-dev`: ^2.0.0

## Why It's Useful

### 1. **Single Entry Point**
Clients only need to know one URL instead of multiple service endpoints.

### 2. **Service Abstraction**
Backend services can be changed, scaled, or moved without affecting clients.

### 3. **Centralized Management**
- CORS policies
- Authentication/authorization (future)
- Rate limiting (future)
- Request logging

### 4. **Load Balancing** (Future)
Can distribute requests across multiple instances of services.

### 5. **Security**
- Hide internal service architecture
- Add security layers (API keys, OAuth)
- SSL/TLS termination

### 6. **Monitoring**
- Centralized logging
- Service health checks
- Request tracking

### 7. **Version Management**
Supports multiple API versions for backward compatibility during updates.

## Error Handling

The gateway handles various error scenarios:

- **Service Unavailable (503)**: When a downstream service is unreachable
- **Proxy Errors**: Logged with detailed error messages
- **Timeout Handling**: Prevents hanging requests

## Logging

The gateway logs:
- All incoming requests with timestamp and IP
- Proxy forwarding details
- Service health check results
- Error messages with context

## Future Enhancements

- JWT validation at gateway level
- Rate limiting per client
- Request/response caching
- API analytics
- Circuit breaker pattern
- Load balancing across service instances
- WebSocket support
- GraphQL gateway

## Related Services

- [Auth Service](../auth-service/README.md)
- [Hotel Service](../hotel-service/README.md)
- [Hotel Ingestion Service](../hotel-ingestion-service/README.md)
- [Scraper Orchestrator](../scraper-orchestrator/README.md)

