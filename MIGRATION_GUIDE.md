# Migration Guide

This document explains the new folder structure and how to migrate from the old structure.

## New Structure Overview

The backend has been restructured into a more scalable microservices architecture:

```
axlrate-backend/
├── scrapers/              # Python OTA scrapers (Selenium)
├── serpapi-service/       # SerpAPI data collection
├── scraper-orchestrator/  # Orchestrates Python scrapers
├── ingest-service/        # Data ingestion & normalization
├── aggregator-service/    # Rate aggregation & analytics
├── api-gateway/           # Main API entry point
├── auth-service/          # Authentication & authorization
├── export-service/        # Data export functionality
├── db/                    # Shared database configurations
├── config/                # Shared configuration files
├── message-broker/        # RabbitMQ configuration
├── cache/                 # Redis configuration
├── monitoring/            # Monitoring & logging
└── shared/                # Shared TypeScript code
```

## Key Changes

### 1. API Versioning
All API endpoints now use versioning:
- **New**: `/api/v1/auth/login`
- **Legacy** (temporary): `/api/auth/login` (still works for backward compatibility)

### 2. Service Structure
Each service now follows this structure:
```
service-name/
├── src/
│   ├── routes/v1/      # Versioned routes
│   ├── controllers/    # Request handlers
│   ├── repositories/   # Data access layer
│   ├── services/       # Business logic
│   └── config/         # Service configuration
├── package.json
└── tsconfig.json
```

### 3. Database Connections
- **Shared utilities** in `db/mongodb/connection.ts` and `db/postgres/connection.ts`
- Each service manages its own connection pool
- MongoDB: Used by `auth-service` and `serpapi-service`
- PostgreSQL: Used by `ingest-service`, `aggregator-service`, and `export-service`

### 4. Service Communication
- **Synchronous**: HTTP/REST via API Gateway
- **Asynchronous**: RabbitMQ for background tasks

## Migration Steps

### Step 1: Update Environment Variables
Copy `config/env.example` to `.env` at the root and update with your values:

```bash
cp config/env.example .env
```

### Step 2: Update Service Entry Points

#### Auth Service
- **Old**: `services/auth-service/server.ts`
- **New**: `services/auth-service/src/server.ts`

Update `package.json` scripts if needed, or run:
```bash
cd services/auth-service
pnpm run dev  # Uses src/server.ts by default
```

#### SerpAPI Service
- **Old**: `services/serpapi-service/server.ts`
- **New**: `services/serpapi-service/src/server.ts`

#### API Gateway
- **Old**: `services/api-gateway/server.ts`
- **New**: `services/api-gateway/src/server.ts`

### Step 3: Install Dependencies
```bash
pnpm install
```

### Step 4: Start Infrastructure Services
```bash
cd config
docker-compose up -d
```

This starts:
- MongoDB (port 27017)
- PostgreSQL (port 5432)
- Redis (port 6379)
- RabbitMQ (port 5672, Management UI: 15672)

### Step 5: Run Services

#### Development (all services):
```bash
pnpm run dev:all
```

#### Development (core services only):
```bash
pnpm run dev
```

#### Individual services:
```bash
pnpm run dev:gateway
pnpm run dev:auth
pnpm run dev:serpapi
# etc.
```

## Testing the Migration

### 1. Health Checks
```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3003/health
```

### 2. Test API Endpoints

#### New Versioned Endpoints:
```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","businessEmail":"test@example.com",...}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"businessEmail":"test@example.com","password":"password"}'

# Fetch Rates
curl -X POST http://localhost:3000/api/v1/serpapi/fetch-rates \
  -H "Content-Type: application/json" \
  -d '{"hotelName":"Hotel California","checkInDate":"2025-12-01","checkOutDate":"2025-12-05"}'
```

#### Legacy Endpoints (still work):
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"businessEmail":"test@example.com","password":"password"}'
```

## Breaking Changes

### None (Backward Compatible)
- Legacy endpoints still work
- Old file structure is preserved (but deprecated)
- New structure is additive

## Next Steps

1. **Test all endpoints** using the new versioned paths
2. **Update frontend/client code** to use `/api/v1/` endpoints
3. **Implement new services**:
   - `ingest-service`: Data normalization
   - `aggregator-service`: Rate aggregation
   - `export-service`: Data export
   - `scraper-orchestrator`: Python scraper orchestration
4. **Add Python scrapers**: Implement the placeholder scrapers in `scrapers/`

## Troubleshooting

### Service won't start
- Check environment variables in `.env`
- Ensure infrastructure services are running (MongoDB, PostgreSQL, etc.)
- Check service logs

### Database connection errors
- Verify database credentials in `.env`
- Ensure databases are running: `docker-compose ps`
- Check connection strings match your setup

### Port conflicts
- Update port numbers in `.env` if needed
- Check what's using ports: `lsof -i :3000`

## Support

For issues or questions, refer to:
- `RESTRUCTURE_PLAN.md` - Detailed architecture plan
- `README.md` - General project documentation
- Service-specific README files in each service directory

