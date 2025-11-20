const { format } = require('date-fns');

/**
 * Formats hotel name to query string format
 * @param {string} hotelName - The hotel name to format
 * @returns {string} Formatted hotel query string
 */
function formatHotelQuery(hotelName) {
  return hotelName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '+')
    .replace(/[^a-z0-9+]/g, '');
}

/**
 * Formats date to YYYY-MM-DD format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  // If it's a string, convert to Date first
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Validate date
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  return format(dateObj, 'yyyy-MM-dd');
}

module.exports = {
  formatHotelQuery,
  formatDate,
};

