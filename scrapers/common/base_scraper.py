"""
Base scraper class for OTA scrapers
All scrapers should inherit from this class
"""
from abc import ABC, abstractmethod
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time


class BaseScraper(ABC):
    """Base class for all OTA scrapers"""
    
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.driver = None
        self.setup_driver()
    
    def setup_driver(self):
        """Setup Selenium WebDriver"""
        chrome_options = Options()
        if self.headless:
            chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        # Add user agent to avoid detection
        chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        
        self.driver = webdriver.Chrome(options=chrome_options)
        self.driver.maximize_window()
    
    @abstractmethod
    def scrape_rates(self, hotel_name: str, check_in: str, check_out: str, adults: int = 2):
        """
        Scrape hotel rates from the OTA
        :param hotel_name: Name of the hotel
        :param check_in: Check-in date (YYYY-MM-DD)
        :param check_out: Check-out date (YYYY-MM-DD)
        :param adults: Number of adults
        :return: Dictionary with rate data
        """
        pass
    
    def close(self):
        """Close the WebDriver"""
        if self.driver:
            self.driver.quit()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

