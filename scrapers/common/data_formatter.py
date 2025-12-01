"""
Data formatting utilities for scraped data
"""
from datetime import datetime
from typing import Dict, Any, Optional


def format_scraped_data(
    ota_name: str,
    hotel_name: str,
    check_in: str,
    check_out: str,
    rates: list,
    raw_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Format scraped data into standard format
    :param ota_name: Name of the OTA (booking, expedia, etc.)
    :param hotel_name: Name of the hotel
    :param check_in: Check-in date
    :param check_out: Check-out date
    :param rates: List of rate dictionaries
    :param raw_data: Optional raw scraped data
    :return: Formatted data dictionary
    """
    return {
        'ota_name': ota_name,
        'hotel_name': hotel_name,
        'check_in_date': check_in,
        'check_out_date': check_out,
        'scraped_at': datetime.now().isoformat(),
        'rates': rates,
        'raw_data': raw_data,
    }


def normalize_price(price_str: str) -> Optional[float]:
    """
    Normalize price string to float
    :param price_str: Price as string (e.g., "$123.45" or "123.45")
    :return: Price as float or None
    """
    if not price_str:
        return None
    
    # Remove currency symbols and whitespace
    cleaned = price_str.replace('$', '').replace(',', '').strip()
    
    try:
        return float(cleaned)
    except ValueError:
        return None

