import { format } from 'date-fns';

/**
 * Formats hotel name to query string format
 * @param hotelName - The hotel name to format
 * @returns Formatted hotel query string
 */
export function formatHotelQuery(hotelName: string): string {
  return hotelName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '+')
    .replace(/[^a-z0-9+]/g, '');
}

/**
 * Formats date to YYYY-MM-DD format
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  // If it's a string, convert to Date first
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Validate date
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  return format(dateObj, 'yyyy-MM-dd');
}

/**
 * Formats hotel search query by combining hotel name and state name
 * @param hotelName - The hotel name
 * @param stateName - The state name
 * @returns Formatted query string: "hotelName stateName"
 */
export function formatHotelSearchQuery(hotelName: string, stateName: string): string {
  const query = `${hotelName.trim()} ${stateName.trim()}`.trim();
  return query;
}

