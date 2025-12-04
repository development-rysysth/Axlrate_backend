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
- Auth Service (User authentication)
- SerpAPI Service (Hotel rate searches)
- Aggregator Service (Calendar data aggregation)
- Export Service (Data export functionality)

### Special Handling

- **SerpAPI Routes**: Custom raw body capture for URL-encoded form data
- **Calendar Data**: Routes to Aggregator Service with PostgreSQL backend
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
    "SERPAPI_SERVICE": "http://localhost:3003",
    "AGGREGATOR_SERVICE": "http://localhost:3005",
    "EXPORT_SERVICE": "http://localhost:3006"
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
    "auth": "/api/v1/auth",
    "serpapi": "/api/v1/serpapi",
    "calendarData": "/api/v1/calendar-data",
    "aggregator": "/api/v1/aggregator",
    "export": "/api/v1/export",
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

#### SerpAPI (`/api/v1/serpapi`)
- `GET /fetch-rates` → SerpAPI Service
- `POST /fetch-rates` → SerpAPI Service
- `POST /batch-fetch-rates` → SerpAPI Service
- `GET /calendar-data` → SerpAPI Service

#### Calendar Data (`/api/v1/calendar-data`)
- `POST /` → Aggregator Service (filtered calendar data)
- `POST /aggregated` → Aggregator Service (aggregated statistics)

#### Insights (`/api/v1/aggregator`)
- All aggregator routes → Aggregator Service

#### Export (`/api/v1/export`)
- All export routes → Export Service

### Legacy Routes (Backward Compatibility)

- `/api/auth/*` → Auth Service
- `/api/users/*` → Auth Service
- `/api/serpapi/*` → SerpAPI Service
- `/api/calendarData` → Aggregator Service

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
SERPAPI_SERVICE_URL=http://localhost:3003
AGGREGATOR_SERVICE_URL=http://localhost:3005
EXPORT_SERVICE_URL=http://localhost:3006
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
- [SerpAPI Service](../serpapi-service/README.md)
- [Aggregator Service](../aggregator-service/README.md)
- [Export Service](../export-service/README.md)

