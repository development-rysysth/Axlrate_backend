"""
Rate limiting utilities for scrapers
"""
import time
from functools import wraps


class RateLimiter:
    """Simple rate limiter to avoid overwhelming target sites"""
    
    def __init__(self, min_delay: float = 1.0):
        """
        :param min_delay: Minimum delay between requests in seconds
        """
        self.min_delay = min_delay
        self.last_request_time = 0
    
    def wait(self):
        """Wait if necessary to respect rate limit"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.min_delay:
            sleep_time = self.min_delay - time_since_last
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def __call__(self, func):
        """Decorator for rate limiting"""
        @wraps(func)
        def wrapper(*args, **kwargs):
            self.wait()
            return func(*args, **kwargs)
        return wrapper

