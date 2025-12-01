"""
Selenium utility functions
"""
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException


def wait_for_element(driver, by: By, value: str, timeout: int = 10):
    """Wait for an element to be present"""
    try:
        element = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((by, value))
        )
        return element
    except TimeoutException:
        return None


def wait_for_clickable(driver, by: By, value: str, timeout: int = 10):
    """Wait for an element to be clickable"""
    try:
        element = WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable((by, value))
        )
        return element
    except TimeoutException:
        return None


def safe_find_element(driver, by: By, value: str):
    """Safely find an element, return None if not found"""
    try:
        return driver.find_element(by, value)
    except NoSuchElementException:
        return None


def safe_find_elements(driver, by: By, value: str):
    """Safely find elements, return empty list if not found"""
    try:
        return driver.find_elements(by, value)
    except NoSuchElementException:
        return []

