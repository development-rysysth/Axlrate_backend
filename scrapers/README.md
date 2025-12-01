# OTA Scrapers

This directory contains Python scrapers for various OTA (Online Travel Agency) platforms.

## Structure

- `common/` - Shared utilities and base classes
- `booking/` - Booking.com scraper
- `expedia/` - Expedia scraper
- `agoda/` - Agoda scraper
- `trip/` - Trip.com scraper
- `airbnb/` - Airbnb scraper

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install ChromeDriver (required for Selenium):
```bash
# macOS
brew install chromedriver

# Or use webdriver-manager (handled automatically)
```

3. Set up environment variables in `.env`:
```
RABBITMQ_URL=amqp://localhost:5672
```

## Usage

Each scraper inherits from `BaseScraper` and implements the `scrape_rates` method.

Example:
```python
from scrapers.booking.scraper import BookingScraper

with BookingScraper() as scraper:
    rates = scraper.scrape_rates(
        hotel_name="Hotel California",
        check_in="2025-12-01",
        check_out="2025-12-05",
        adults=2
    )
```

## Implementation Status

All scrapers are currently placeholders. Implementation code will be provided separately.

