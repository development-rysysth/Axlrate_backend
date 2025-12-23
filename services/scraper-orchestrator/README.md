# Scraper Orchestrator Service

## Overview

The **Scraper Orchestrator** is responsible for coordinating and managing web scraper jobs across multiple OTA (Online Travel Agency) sources. It acts as the control center for scheduling, executing, and monitoring scraping operations, ensuring efficient data collection from Booking.com, Expedia, Agoda, and Trip.com.

## What It Does

The Scraper Orchestrator handles:

- **Job Scheduling**: Schedules scraper jobs based on time or events
- **Task Distribution**: Distributes scraping tasks via RabbitMQ
- **Scraper Coordination**: Manages multiple Python scrapers
- **Job Monitoring**: Tracks scraper status and progress
- **Rate Limiting**: Enforces rate limits to avoid IP blocks
- **Error Handling**: Manages scraper failures and retries
- **Load Balancing**: Distributes work across available scrapers
- **Queue Management**: Manages message queues for different OTAs
- **Health Checks**: Monitors scraper availability

## How It Works

### Architecture

```
Orchestrator → RabbitMQ Exchanges → Queues → Python Scrapers
     ↓                                            ↓
Job Scheduler                                 Scrape Data
     ↓                                            ↓
Monitor Status                              Publish Results
                                                   ↓
                                            Ingest Service
```

### Data Flow

1. **Job created** (manually, scheduled, or event-triggered)
2. **Validate job parameters** (hotel, dates, OTA)
3. **Publish to RabbitMQ** exchange with routing key
4. **Scraper consumes** message from queue
5. **Execute scraping** using appropriate scraper
6. **Results published** to ingestion queue
7. **Job status updated** in orchestrator
8. **Monitor and retry** if needed

### RabbitMQ Architecture

#### Exchanges
- `scraper_exchange` (topic): Routes jobs to scrapers
- `hotel_rates_exchange` (topic): Routes scraped data to ingest

#### Queues
- `booking_scraper_queue`: Booking.com scraping jobs
- `expedia_scraper_queue`: Expedia scraping jobs
- `agoda_scraper_queue`: Agoda scraping jobs
- `trip_scraper_queue`: Trip.com scraping jobs
- `rates_ingestion_queue`: Scraped data for ingestion

#### Routing Keys
- `scraper.booking`: Route to Booking.com scraper
- `scraper.expedia`: Route to Expedia scraper
- `scraper.agoda`: Route to Agoda scraper
- `scraper.trip`: Route to Trip.com scraper
- `rates.scraped`: Route scraped data to ingest service

## Message Formats

### Scraper Job Message

Published to scraper queues:

```json
{
  "jobId": "job_12345",
  "ota": "booking",
  "hotel": {
    "name": "Hilton New York Midtown",
    "location": "New York, NY",
    "url": "https://www.booking.com/hotel/us/hilton-new-york.html"
  },
  "searchParams": {
    "checkIn": "2024-03-01",
    "checkOut": "2024-03-03",
    "adults": 2,
    "children": 0,
    "rooms": 1
  },
  "options": {
    "maxRetries": 3,
    "timeout": 30000,
    "headless": true,
    "proxy": null
  },
  "createdAt": "2024-02-28T10:00:00Z",
  "priority": "normal"
}
```

### Scraper Result Message

Published to ingestion queue:

```json
{
  "jobId": "job_12345",
  "ota": "booking",
  "status": "success",
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
      "roomType": "Standard Room",
      "availability": true,
      "mealPlan": "Breakfast included",
      "refundable": true,
      "maxOccupancy": 2,
      "scraped_at": "2024-02-28T10:15:00Z"
    }
  ],
  "metadata": {
    "scraper_version": "1.0.0",
    "execution_time_ms": 15000,
    "timestamp": "2024-02-28T10:15:00Z"
  },
  "completedAt": "2024-02-28T10:15:00Z"
}
```

### Scraper Error Message

```json
{
  "jobId": "job_12345",
  "ota": "booking",
  "status": "failed",
  "error": {
    "code": "SCRAPER_TIMEOUT",
    "message": "Scraper timed out after 30 seconds",
    "retryable": true
  },
  "attempts": 2,
  "maxRetries": 3,
  "timestamp": "2024-02-28T10:15:00Z"
}
```

## Configuration

### RabbitMQ Connection

Located in `src/config/rabbitmq.ts`:

```typescript
const rabbitMQConfig = {
  host: process.env.RABBITMQ_HOST || 'localhost',
  port: parseInt(process.env.RABBITMQ_PORT || '5672'),
  username: process.env.RABBITMQ_USER || 'guest',
  password: process.env.RABBITMQ_PASSWORD || 'guest',
  vhost: process.env.RABBITMQ_VHOST || '/',
  heartbeat: 60,
  reconnectDelay: 5000,
};
```

### Queue Configuration

```typescript
const queues = {
  booking: {
    name: 'booking_scraper_queue',
    durable: true,
    prefetch: 1,        // Process one job at a time
    deadLetter: 'scraper_dlx'
  },
  expedia: {
    name: 'expedia_scraper_queue',
    durable: true,
    prefetch: 1,
    deadLetter: 'scraper_dlx'
  },
  // ... other OTAs
};
```

## Orchestrator Features

### 1. Job Scheduling

**Cron-based Scheduling**:
```typescript
// Schedule daily rate updates at 2 AM
schedule: '0 2 * * *'

// Schedule hourly updates for high-priority hotels
schedule: '0 * * * *'
```

**Event-based Triggering**:
- On-demand user requests
- Price threshold alerts
- Availability changes
- API webhooks

### 2. Rate Limiting

Prevent IP blocks and respect robots.txt:

```typescript
const rateLimits = {
  booking: {
    requestsPerMinute: 10,
    delayBetweenRequests: 6000,  // 6 seconds
  },
  expedia: {
    requestsPerMinute: 15,
    delayBetweenRequests: 4000,  // 4 seconds
  },
  // ... other OTAs
};
```

### 3. Retry Logic

```typescript
const retryConfig = {
  maxRetries: 3,
  backoffStrategy: 'exponential',
  initialDelay: 5000,      // 5 seconds
  maxDelay: 60000,         // 60 seconds
  retryableErrors: [
    'TIMEOUT',
    'NETWORK_ERROR',
    'RATE_LIMIT',
    'TEMPORARY_BAN'
  ]
};
```

### 4. Dead Letter Queue

Failed jobs after max retries go to DLQ for manual inspection:
- Queue: `scraper_dlq`
- TTL: 7 days
- Manual reprocess or discard

### 5. Job Priority

```typescript
enum JobPriority {
  LOW = 1,      // Batch background updates
  NORMAL = 5,   // Regular scheduled jobs
  HIGH = 8,     // User-initiated searches
  URGENT = 10   // Time-sensitive alerts
}
```

## Technologies Used

- **Node.js**: Runtime environment
- **TypeScript**: Type-safe JavaScript
- **RabbitMQ (amqplib)**: Message broker for job distribution
- **dotenv**: Environment configuration
- **node-cron**: Job scheduling (future)

## Environment Variables

Add to `.env` file in the root directory:

```env
# Scraper Orchestrator Configuration
SCRAPER_ORCHESTRATOR_PORT=3007

# RabbitMQ Configuration
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VHOST=/

# Scraper Configuration
SCRAPER_TIMEOUT=30000
MAX_RETRIES=3
RETRY_DELAY=5000

# Rate Limiting
BOOKING_RATE_LIMIT=10
EXPEDIA_RATE_LIMIT=15
AGODA_RATE_LIMIT=12
TRIP_RATE_LIMIT=10

# Monitoring
ENABLE_JOB_MONITORING=true
JOB_HISTORY_RETENTION_DAYS=30
```

## Installation

```bash
# Install dependencies
cd services/scraper-orchestrator
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

The orchestrator will:
1. Connect to RabbitMQ
2. Set up exchanges and queues
3. Start consuming messages
4. Log status: "Waiting for scraper tasks..."

## Dependencies

### Runtime Dependencies
- `dotenv`: ^16.3.1
- `amqplib`: ^0.10.3

### Development Dependencies
- `@types/node`: ^20.10.6
- `@types/amqplib`: ^0.10.4
- `typescript`: ^5.3.3
- `ts-node-dev`: ^2.0.0

## Why It's Useful

### 1. **Centralized Control**
Single point of control for all scraping operations across multiple OTAs.

### 2. **Scalability**
- Horizontal scaling of scrapers
- Add more scraper workers without code changes
- Distribute load across multiple machines

### 3. **Reliability**
- Automatic retry on failures
- Dead letter queue for problematic jobs
- Message persistence (survives restarts)
- Graceful shutdown handling

### 4. **Rate Limit Management**
- Prevents IP blocks
- Respects OTA terms of service
- Distributes requests over time

### 5. **Job Prioritization**
High-priority jobs (user requests) processed before batch jobs.

### 6. **Monitoring & Observability**
- Track job status in real-time
- Monitor scraper health
- Analyze success/failure rates
- Identify problematic hotels/OTAs

### 7. **Decoupling**
Separates orchestration logic from scraping logic, allowing independent updates.

### 8. **Resource Optimization**
- Load balancing across scrapers
- Queue-based backpressure
- Controlled concurrency

## Scraper Workers

Python scrapers consume jobs from RabbitMQ queues. Located in `/scrapers/` directory:

### Booking.com Scraper
- File: `scrapers/booking/scraper.py`
- Queue: `booking_scraper_queue`
- Technology: Selenium + BeautifulSoup

### Expedia Scraper
- File: `scrapers/expedia/scraper.py`
- Queue: `expedia_scraper_queue`
- Technology: Playwright

### Agoda Scraper
- File: `scrapers/agoda/scraper.py`
- Queue: `agoda_scraper_queue`
- Technology: Selenium

### Trip.com Scraper
- File: `scrapers/trip/scraper.py`
- Queue: `trip_scraper_queue`
- Technology: Selenium

## Job Lifecycle

```
1. Created      → Job created with parameters
2. Queued       → Published to RabbitMQ queue
3. Assigned     → Picked up by scraper worker
4. Running      → Scraper executing
5. Completed    → Successfully scraped data
   OR
5. Failed       → Error occurred
   ↓
6. Retry        → Retry if retryable error
   OR
6. Dead Letter  → Moved to DLQ if max retries exceeded
```

## Monitoring

### Metrics to Track

1. **Job Metrics**
   - Total jobs processed
   - Success rate by OTA
   - Average execution time
   - Jobs in queue (backlog)

2. **Scraper Health**
   - Active scrapers by OTA
   - Scraper uptime
   - Error rates
   - Rate limit violations

3. **Queue Metrics**
   - Queue depth
   - Message processing rate
   - Dead letter queue size
   - Unacknowledged messages

### Logging

The orchestrator logs:
- RabbitMQ connection status
- Job publications
- Job completions and failures
- Rate limit events
- Error details with stack traces

## Error Handling

### Error Types

1. **Retryable Errors**
   - Timeout
   - Network errors
   - Rate limiting (429)
   - Temporary site issues

2. **Non-Retryable Errors**
   - Invalid job parameters
   - Hotel not found
   - Scraper code errors
   - Permanent bans

3. **Dead Letter Errors**
   - Max retries exceeded
   - Undeliverable messages
   - Queue full

## Testing

### Manual Job Publishing

Test the orchestrator by publishing a test job:

```bash
# Install RabbitMQ management tools
npm install -g amqplib

# Publish test job
node scripts/publish-test-job.js
```

### Monitor Queues

Use RabbitMQ Management UI:
```
http://localhost:15672
Username: guest
Password: guest
```

## Graceful Shutdown

The orchestrator handles SIGTERM for graceful shutdown:

```typescript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await closeRabbitMQConnection();
  process.exit(0);
});
```

This ensures:
- In-flight messages are processed
- Connections are closed properly
- No data loss

## Performance Considerations

### Prefetch Count

Set appropriate prefetch for each scraper:
```typescript
channel.prefetch(1); // Process 1 message at a time
```

### Connection Pooling

Reuse RabbitMQ connections and channels for efficiency.

### Message TTL

Set TTL for time-sensitive jobs:
```typescript
{
  expiration: '3600000' // 1 hour in milliseconds
}
```

## Security Considerations

1. **Credentials**: Use environment variables, never hardcode
2. **RabbitMQ Access**: Limit queue permissions
3. **SSL/TLS**: Use encrypted connections in production
4. **Network Isolation**: Run scrapers in isolated network
5. **Proxy Rotation**: Use proxies to avoid IP bans
6. **User-Agent Rotation**: Rotate user agents

## Future Enhancements

- Web dashboard for job management
- Real-time job status updates (WebSocket)
- Advanced scheduling with cron expressions
- Multi-region scraper distribution
- Intelligent job batching
- Machine learning for optimal timing
- Automated proxy management
- Scraper performance analytics
- Alert system for failures
- Job history and reporting
- API for external job submission
- Integration with monitoring tools (Prometheus, Grafana)

## Troubleshooting

### Scrapers Not Picking Up Jobs

**Check:**
1. RabbitMQ is running: `docker ps | grep rabbitmq`
2. Scrapers are running: Check scraper logs
3. Queue exists: Check RabbitMQ management UI
4. Connection credentials: Verify `.env` file

### Jobs Stuck in Queue

**Possible causes:**
1. No active scraper workers
2. Scraper crashed or hung
3. Rate limiting delays
4. Network issues

**Solution:**
- Restart scrapers
- Check scraper logs
- Verify network connectivity

### High Dead Letter Queue Count

**Investigate:**
1. Common error patterns
2. Specific OTA failures
3. Invalid hotel URLs
4. Rate limit violations

## Related Services

- [Hotel Ingestion Service](../hotel-ingestion-service/README.md) - Receives scraped data
- [Hotel Service](../hotel-service/README.md) - Provides hotel data queries
- [API Gateway](../api-gateway/README.md) - Entry point for job requests

## Related Scrapers

- [Booking.com Scraper](../../scrapers/booking/README.md)
- [Expedia Scraper](../../scrapers/expedia/README.md)
- [Agoda Scraper](../../scrapers/agoda/README.md)
- [Trip.com Scraper](../../scrapers/trip/README.md)

