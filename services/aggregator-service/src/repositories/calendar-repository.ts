import { getPool } from '../config/database';

export interface CalendarDataRequest {
  month: string; // Format: "YYYY-MM" (e.g., "2024-01")
  otas?: string[];
  los?: number; // Single value: 1, 2, 3, etc.
  guests?: number; // Single value: 1, 2, 3, 4, etc.
  hotelName?: string;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}

export interface RateData {
  lowest: number | null;
  extracted_lowest: number | null;
  before_tax_fees: number | null;
  extracted_before_tax_fees: number | null;
}

export interface CalendarDataItem {
  _id: number;
  OTA: string;
  rate: RateData;
  check_in_date: string;
  check_out_date: string;
  hotel_name: string;
  room_name: string;
  currency: string;
  adults: number;
}

export interface CalendarDataResponse {
  message: string;
  filters: CalendarDataRequest;
  resultCount: number;
  data: CalendarDataItem[];
}

export interface AggregatedDataItem {
  checkin_date: string;
  checkout_date: string;
  ota_platform: string;
  room_count: number;
  min_price: number;
  max_price: number;
  avg_price: number;
}

export interface AggregatedCalendarDataResponse {
  message: string;
  filters: CalendarDataRequest;
  resultCount: number;
  data: AggregatedDataItem[];
}

export class CalendarRepository {
  private getPool() {
    return getPool();
  }

  /**
   * Fetch calendar data from room_data table based on filters
   * Logs the request and returns filtered data from PostgreSQL
   */
  async getCalendarData(filters: CalendarDataRequest): Promise<CalendarDataResponse> {
    try {
      // Validate month parameter
      if (!filters.month) {
        throw new Error('Month parameter is required (format: YYYY-MM)');
      }

      // Parse month to get start and end dates
      const [year, month] = filters.month.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Build dynamic query based on filters
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Filter by Month (required)
      conditions.push(`checkin_date >= $${paramIndex}`);
      values.push(startDateStr);
      paramIndex++;

      conditions.push(`checkin_date <= $${paramIndex}`);
      values.push(endDateStr);
      paramIndex++;

      // Filter by OTAs
      if (filters.otas && filters.otas.length > 0) {
        conditions.push(`ota_platform = ANY($${paramIndex})`);
        values.push(filters.otas);
        paramIndex++;
      }

      // Filter by Length of Stay (single value)
      if (filters.los) {
        conditions.push(`length_of_stay = $${paramIndex}`);
        values.push(filters.los);
        paramIndex++;
      }

      // Filter by Guests (room_capacity - single value)
      if (filters.guests) {
        conditions.push(`room_capacity LIKE $${paramIndex}`);
        values.push(`%${filters.guests}%`);
        paramIndex++;
      }

      // Filter by Hotel Name
      if (filters.hotelName) {
        conditions.push(`"Hotel_Name" ILIKE $${paramIndex}`);
        values.push(`%${filters.hotelName}%`);
        paramIndex++;
      }

      // Build the final query
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      const query = `
        SELECT 
          id,
          ota_platform,
          scraped_at,
          checkin_date,
          checkout_date,
          length_of_stay,
          "Hotel_Name" as hotel_name,
          room_name,
          room_size,
          bed_types,
          room_capacity,
          room_amenities,
          base_price,
          taxes_and_fees,
          total_price,
          breakfast_included,
          cancellation_policy,
          available_rooms
        FROM room_data
        ${whereClause}
        ORDER BY checkin_date, ota_platform, room_name
        LIMIT 1000;
      `;

      const result = await this.getPool().query(query, values);

      // Extract numeric values from price strings
      const extractPrice = (priceStr: string | null): number | null => {
        if (!priceStr) return null;
        const match = priceStr.match(/[\d,]+\.?\d*/);
        return match ? parseFloat(match[0].replace(/,/g, '')) : null;
      };

      // Extract currency from price string (e.g., "$180" -> "USD", "€180" -> "EUR")
      const extractCurrency = (priceStr: string | null): string => {
        if (!priceStr) return 'USD';
        if (priceStr.includes('$')) return 'USD';
        if (priceStr.includes('€')) return 'EUR';
        if (priceStr.includes('£')) return 'GBP';
        return 'USD';
      };

      // Get adults from request filters, or extract from room_capacity as fallback
      const getAdults = (capacityStr: string | null): number => {
        // If guests filter is provided, use it
        if (filters.guests) {
          return filters.guests;
        }
        // Otherwise, extract from room_capacity
        if (!capacityStr) return 2;
        const match = capacityStr.match(/\d+/);
        return match ? parseInt(match[0], 10) : 2;
      };

      // Transform data to match the required format
      const formattedData: CalendarDataItem[] = result.rows.map((row) => {
        const totalPrice = extractPrice(row.total_price);
        const basePrice = extractPrice(row.base_price);

        return {
          _id: row.id,
          OTA: row.ota_platform,
          rate: {
            lowest: totalPrice,
            extracted_lowest: totalPrice,
            before_tax_fees: basePrice,
            extracted_before_tax_fees: basePrice,
          },
          check_in_date: row.checkin_date,
          check_out_date: row.checkout_date,
          hotel_name: row.hotel_name,
          room_name: row.room_name,
          currency: extractCurrency(row.total_price),
          adults: getAdults(row.room_capacity),
        };
      });

      return {
        message: 'Calendar data fetched successfully',
        filters,
        resultCount: formattedData.length,
        data: formattedData,
      };
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      throw error;
    }
  }

  /**
   * Get aggregated calendar data (e.g., min/max prices by date)
   */
  async getAggregatedCalendarData(filters: CalendarDataRequest): Promise<AggregatedCalendarDataResponse> {
    console.log('=== AGGREGATED CALENDAR DATA REQUEST ===');
    console.log('Filters received:', JSON.stringify(filters, null, 2));
    console.log('========================================');

    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Apply same filters as above
      if (filters.otas && filters.otas.length > 0) {
        conditions.push(`ota_platform = ANY($${paramIndex})`);
        values.push(filters.otas);
        paramIndex++;
      }

      if (filters.hotelName) {
        conditions.push(`"Hotel_Name" ILIKE $${paramIndex}`);
        values.push(`%${filters.hotelName}%`);
        paramIndex++;
      }

      if (filters.dateRange) {
        if (filters.dateRange.startDate) {
          conditions.push(`checkin_date >= $${paramIndex}`);
          values.push(filters.dateRange.startDate);
          paramIndex++;
        }
        if (filters.dateRange.endDate) {
          conditions.push(`checkout_date <= $${paramIndex}`);
          values.push(filters.dateRange.endDate);
          paramIndex++;
        }
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = `
        SELECT 
          checkin_date,
          checkout_date,
          ota_platform,
          COUNT(*) as room_count,
          MIN(CAST(REGEXP_REPLACE(total_price, '[^0-9.]', '', 'g') AS NUMERIC)) as min_price,
          MAX(CAST(REGEXP_REPLACE(total_price, '[^0-9.]', '', 'g') AS NUMERIC)) as max_price,
          AVG(CAST(REGEXP_REPLACE(total_price, '[^0-9.]', '', 'g') AS NUMERIC)) as avg_price
        FROM room_data
        ${whereClause}
        GROUP BY checkin_date, checkout_date, ota_platform
        ORDER BY checkin_date, ota_platform;
      `;

      const result = await this.getPool().query(query, values);

      return {
        message: 'Aggregated calendar data fetched successfully',
        filters,
        resultCount: result.rows.length,
        data: result.rows,
      };
    } catch (error) {
      console.error('Error fetching aggregated calendar data:', error);
      throw error;
    }
  }
}

