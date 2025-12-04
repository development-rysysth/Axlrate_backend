# Export Service

## Overview

The **Export Service** provides data export functionality for the Axlrate platform. It allows users to export hotel rate data, analytics, and reports in various formats (CSV, Excel, JSON) for offline analysis, reporting, and integration with external systems.

## What It Does

The Export Service handles:

- **Data Export**: Export rate data in multiple formats (CSV, Excel, JSON)
- **Custom Reports**: Generate custom reports based on user filters
- **Scheduled Exports**: Automated recurring exports (future)
- **Large Dataset Handling**: Stream large datasets efficiently
- **Format Conversion**: Convert data between different formats
- **Compression**: Zip large exports for faster downloads
- **Export History**: Track and manage past exports
- **Template Support**: Pre-defined export templates for common use cases

## How It Works

### Architecture

```
Client → API Gateway → Export Service → PostgreSQL
                            ↓
                    Generate File (CSV/Excel/JSON)
                            ↓
                    Stream to Client / Store in S3
```

### Export Flow

1. **Request received** with filters and format preference
2. **Validate parameters** (date range, format, filters)
3. **Query PostgreSQL** for requested data
4. **Transform data** to export format
5. **Generate file** (CSV/Excel/JSON)
6. **Stream to client** or store in cloud storage
7. **Log export activity** for tracking
8. **Cleanup temporary files**

### Supported Formats

- **CSV**: Comma-separated values (universal compatibility)
- **Excel (XLSX)**: Microsoft Excel format with formatting
- **JSON**: JavaScript Object Notation (API integration)
- **PDF**: Reports with charts and visualizations (future)

## API Endpoints

### Export Endpoints

#### `POST /v1/export/rates`
Export hotel rate data.

**Request Body:**
```json
{
  "format": "csv",
  "filters": {
    "checkIn": "2024-03-01",
    "checkOut": "2024-03-31",
    "location": "New York",
    "otas": ["booking", "expedia"],
    "hotelId": "hotel_123"
  },
  "fields": [
    "date",
    "hotelName",
    "ota",
    "price",
    "currency",
    "roomType",
    "availability"
  ],
  "options": {
    "includeHeaders": true,
    "dateFormat": "YYYY-MM-DD",
    "compression": "zip"
  }
}
```

**Response (200):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="hotel_rates_2024-03-01_to_2024-03-31.csv"

Date,Hotel Name,OTA,Price,Currency,Room Type,Availability
2024-03-01,Grand Hotel,booking,150.00,USD,Standard Room,true
2024-03-01,Grand Hotel,expedia,155.00,USD,Standard Room,true
...
```

**Or if compression is enabled:**
```
Content-Type: application/zip
Content-Disposition: attachment; filename="hotel_rates_2024-03-01_to_2024-03-31.zip"

[Binary ZIP file content]
```

---

#### `POST /v1/export/excel`
Export data in Excel format with formatting.

**Request Body:**
```json
{
  "filters": {
    "checkIn": "2024-03-01",
    "checkOut": "2024-03-31",
    "location": "New York"
  },
  "options": {
    "includeCharts": true,
    "includeSummary": true,
    "sheetName": "Hotel Rates",
    "formatting": {
      "headerStyle": {
        "bold": true,
        "backgroundColor": "#4472C4",
        "fontColor": "#FFFFFF"
      },
      "currencyFormat": "$#,##0.00"
    }
  }
}
```

**Response (200):**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="hotel_rates_report_2024-03-01.xlsx"

[Binary Excel file content]
```

---

#### `POST /v1/export/json`
Export data in JSON format.

**Request Body:**
```json
{
  "filters": {
    "checkIn": "2024-03-01",
    "checkOut": "2024-03-31",
    "otas": ["booking"]
  },
  "options": {
    "pretty": true,
    "includeMetadata": true
  }
}
```

**Response (200):**
```json
{
  "metadata": {
    "exportDate": "2024-02-28T10:00:00Z",
    "recordCount": 90,
    "filters": {
      "checkIn": "2024-03-01",
      "checkOut": "2024-03-31",
      "otas": ["booking"]
    }
  },
  "data": [
    {
      "date": "2024-03-01",
      "hotelName": "Grand Hotel",
      "ota": "booking",
      "price": 150.00,
      "currency": "USD",
      "roomType": "Standard Room",
      "availability": true
    }
  ]
}
```

---

#### `POST /v1/export/summary`
Export aggregated summary report.

**Request Body:**
```json
{
  "format": "excel",
  "filters": {
    "checkIn": "2024-03-01",
    "checkOut": "2024-03-31",
    "location": "New York"
  },
  "aggregations": [
    "avgPriceByOta",
    "minMaxPriceByDate",
    "availabilityPercentage",
    "priceDistribution"
  ]
}
```

**Response (200):**
Excel file with multiple sheets:
- Summary Statistics
- Price by OTA
- Price Trends
- Availability Analysis

---

#### `GET /v1/export/templates`
Get available export templates.

**Response (200):**
```json
{
  "templates": [
    {
      "id": "daily_rates",
      "name": "Daily Rates Report",
      "description": "Daily breakdown of rates across OTAs",
      "format": "excel",
      "fields": ["date", "ota", "price", "availability"]
    },
    {
      "id": "competitive_analysis",
      "name": "Competitive Analysis",
      "description": "Compare your rates with competitors",
      "format": "excel",
      "fields": ["date", "myPrice", "competitorPrices", "priceDifference"]
    }
  ]
}
```

---

#### `GET /v1/export/history`
Get export history for current user.

**Response (200):**
```json
{
  "exports": [
    {
      "id": "exp_123",
      "format": "csv",
      "filters": {
        "checkIn": "2024-03-01",
        "checkOut": "2024-03-31"
      },
      "status": "completed",
      "fileSize": 1024000,
      "recordCount": 1000,
      "createdAt": "2024-02-28T10:00:00Z",
      "expiresAt": "2024-03-07T10:00:00Z"
    }
  ]
}
```

---

### Health Check

#### `GET /health`
Check service health.

**Response (200):**
```json
{
  "status": "ok",
  "service": "export-service"
}
```

## Technologies Used

- **Express.js**: Web framework
- **TypeScript**: Type-safe JavaScript
- **PostgreSQL**: Data source
- **xlsx**: Excel file generation
- **csv-writer**: CSV file generation
- **archiver**: ZIP compression
- **stream**: Node.js streams for large files
- **pg**: PostgreSQL client

## Environment Variables

Add to `.env` file in the root directory:

```env
# Export Service Configuration
EXPORT_SERVICE_PORT=3006

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=axlrate_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# Export Settings
MAX_EXPORT_ROWS=100000
EXPORT_TEMP_DIR=/tmp/exports
EXPORT_RETENTION_DAYS=7
ENABLE_COMPRESSION=true
COMPRESSION_THRESHOLD=1048576

# AWS S3 (for storing large exports - future)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=axlrate-exports
AWS_REGION=us-east-1
```

## Installation

```bash
# Install dependencies
cd services/export-service
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

The service will start on port `3006` (or the port specified in `EXPORT_SERVICE_PORT`).

## Dependencies

### Runtime Dependencies
- `express`: ^4.18.2
- `cors`: ^2.8.5
- `dotenv`: ^16.3.1
- `pg`: ^8.11.3
- `xlsx`: ^0.18.5

### Development Dependencies
- `@types/express`: ^4.17.21
- `@types/node`: ^20.10.6
- `@types/pg`: ^8.10.9
- `typescript`: ^5.3.3
- `ts-node-dev`: ^2.0.0

## Why It's Useful

### 1. **Data Portability**
Export data for use in:
- Excel/Google Sheets for manual analysis
- Business Intelligence tools (Tableau, Power BI)
- Accounting systems
- Custom reporting tools
- Offline access

### 2. **Flexible Formats**
Multiple export formats to suit different needs:
- **CSV**: Universal compatibility, lightweight
- **Excel**: Rich formatting, formulas, charts
- **JSON**: API integration, programmatic access

### 3. **Large Dataset Handling**
- Streaming for memory efficiency
- Chunked processing for large datasets
- Compression for faster downloads
- Progress tracking for long exports

### 4. **Customization**
- Select specific fields to export
- Apply filters and date ranges
- Choose formatting options
- Use pre-defined templates

### 5. **Performance**
- Optimized database queries
- Streaming responses (no buffering)
- Compression for bandwidth efficiency
- Caching for frequent exports

### 6. **Compliance**
- Data export for auditing
- GDPR compliance (data portability)
- Backup and archival
- Reporting requirements

## Export Formats Details

### CSV Format

**Advantages:**
- Universal compatibility
- Small file size
- Easy to parse programmatically
- Works with all spreadsheet software

**Options:**
- Custom delimiter (comma, semicolon, tab)
- Quote character
- Line endings (CRLF, LF)
- UTF-8 encoding with BOM

### Excel Format

**Advantages:**
- Rich formatting (colors, fonts, borders)
- Multiple sheets
- Formulas and calculations
- Charts and visualizations

**Features:**
- Auto-fit columns
- Freeze header rows
- Cell formatting (currency, dates, percentages)
- Conditional formatting
- Summary sheets

### JSON Format

**Advantages:**
- Native JavaScript format
- API integration
- Hierarchical data structures
- Human-readable (with pretty print)

**Options:**
- Pretty print (indentation)
- Metadata inclusion
- Nested structure vs flat
- JSONL (JSON Lines) for large files

## Performance Considerations

### Streaming

For large exports, use streaming instead of buffering:

```typescript
// Stream data directly to response
const stream = exportRepository.getDataStream(filters);
stream.pipe(csvFormatter).pipe(res);
```

### Pagination

Process data in chunks:
```typescript
const CHUNK_SIZE = 1000;
for (let offset = 0; offset < totalRows; offset += CHUNK_SIZE) {
  const chunk = await fetchDataChunk(offset, CHUNK_SIZE);
  writeToFile(chunk);
}
```

### Compression

Automatically compress large exports:
```typescript
if (fileSize > COMPRESSION_THRESHOLD) {
  zip.append(csvStream, { name: 'data.csv' });
  zip.pipe(res);
}
```

## Error Handling

### Common Errors

- **400 Bad Request**: Invalid filters or format
- **413 Payload Too Large**: Export exceeds row limit
- **422 Unprocessable Entity**: Invalid field names
- **500 Internal Server Error**: Database or file system error
- **503 Service Unavailable**: Database connection issue

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "EXPORT_TOO_LARGE",
    "message": "Export exceeds maximum row limit of 100,000",
    "details": {
      "requestedRows": 150000,
      "maxRows": 100000,
      "suggestion": "Apply more filters or export in multiple batches"
    }
  }
}
```

## Security Considerations

1. **Authentication**: Verify user identity before export
2. **Authorization**: Check user permissions for data access
3. **Rate Limiting**: Prevent abuse with rate limits
4. **File Cleanup**: Delete temporary files after download
5. **Secure Storage**: Use signed URLs for S3 exports
6. **Data Masking**: Mask sensitive fields if needed

## Testing

Test export endpoints:

```bash
# Export as CSV
curl -X POST http://localhost:3006/v1/export/rates \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "filters": {
      "checkIn": "2024-03-01",
      "checkOut": "2024-03-07"
    }
  }' \
  --output rates.csv

# Export as Excel
curl -X POST http://localhost:3006/v1/export/excel \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "location": "New York"
    }
  }' \
  --output rates.xlsx

# Export as JSON
curl -X POST http://localhost:3006/v1/export/json \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "otas": ["booking"]
    },
    "options": {
      "pretty": true
    }
  }'
```

## Future Enhancements

- PDF export with charts and visualizations
- Scheduled exports (daily, weekly, monthly)
- Email delivery of exports
- Custom templates builder UI
- Export to cloud storage (S3, Google Drive, Dropbox)
- Incremental exports (only new data)
- Export data transformation rules
- Multi-format batch exports
- Export API for third-party integrations
- Data anonymization for compliance

## Related Services

- [Aggregator Service](../aggregator-service/README.md)
- [API Gateway](../api-gateway/README.md)
- [Auth Service](../auth-service/README.md)

