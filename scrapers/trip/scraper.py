"""
Trip.com scraper
Placeholder - user will provide implementation
"""
from scrapers.common.base_scraper import BaseScraper


class TripScraper(BaseScraper):
    """Trip.com scraper implementation"""
    
    def scrape_rates(self, hotel_name: str, check_in: str, check_out: str, adults: int = 2):
        """
        Scrape hotel rates from Trip.com
        :param hotel_name: Name of the hotel
        :param check_in: Check-in date (YYYY-MM-DD)
        :param check_out: Check-out date (YYYY-MM-DD)
        :param adults: Number of adults
        :return: Dictionary with rate data
        """
        # TODO: Implement Trip.com scraping logic
        raise NotImplementedError("Trip.com scraper not yet implemented")

