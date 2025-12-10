import { getPool } from '../config/database';

export interface FilterOptions {
  otas: string[];
  devices: string[];
  los: number[]; // Length of Stay (number of nights)
  guests: number[]; // Number of guests (e.g., [1, 2, 3, 4])
  roomTypes: string[];
  mealTypes: string[]; // Breakfast included options: ['true', 'false']
  compsets: string[];
}

export class InsightRepository {
  private getPool() {
    // Lazy initialization - get pool when needed, not in constructor
    return getPool();
  }

  /**
   * Get all available OTAs from room_data table
   */
  async getAvailableOTAs(): Promise<string[]> {
    try {
      const query = `
        SELECT DISTINCT ota_platform
        FROM room_data
        WHERE ota_platform IS NOT NULL AND ota_platform != ''
        ORDER BY ota_platform;
      `;
      
      const result = await this.getPool().query(query);
      return result.rows.map(row => row.ota_platform);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all available guest options from room_data table (room_capacity)
   * Extracts numeric values from strings like "Max persons: 2" and returns [1, 2, 3, ...]
   */
  async getAvailableGuests(): Promise<number[]> {
    try {
      const query = `
        SELECT DISTINCT room_capacity
        FROM room_data
        WHERE room_capacity IS NOT NULL AND room_capacity != ''
        ORDER BY room_capacity;
      `;
      
      const result = await this.getPool().query(query);
      
      // Extract numbers from strings like "Max persons: 2"
      const guestNumbers = result.rows
        .map(row => {
          const match = row.room_capacity.match(/\d+/);
          return match ? parseInt(match[0], 10) : null;
        })
        .filter((num): num is number => num !== null);
      
      // Remove duplicates and sort numerically
      const uniqueGuests = Array.from(new Set(guestNumbers)).sort((a, b) => a - b);
      
      return uniqueGuests;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all available room types from room_data table
   */
  async getAvailableRoomTypes(): Promise<string[]> {
    try {
      const query = `
        SELECT DISTINCT room_name
        FROM room_data
        WHERE room_name IS NOT NULL AND room_name != ''
        ORDER BY room_name;
      `;
      
      const result = await this.getPool().query(query);
      return result.rows.map(row => row.room_name);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all available Length of Stay (LOS) values from room_data table
   */
  async getAvailableLOS(): Promise<number[]> {
    try {
      const query = `
        SELECT DISTINCT length_of_stay
        FROM room_data
        WHERE length_of_stay IS NOT NULL
        ORDER BY length_of_stay;
      `;
      
      const result = await this.getPool().query(query);
      return result.rows.map(row => parseInt(row.length_of_stay, 10));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get available devices from room_data table
   * Currently returns ['desktop'] as default since device column is not yet available.
   * When device column is added to room_data table, this will query distinct device values.
   */
  async getAvailableDevices(): Promise<string[]> {
    try {
      // Check if device column exists by attempting to query it
      // If column doesn't exist, PostgreSQL will throw an error which we catch and return default
      const query = `
        SELECT DISTINCT device
        FROM room_data
        WHERE device IS NOT NULL AND device != ''
        ORDER BY device;
      `;
      
      const result = await this.getPool().query(query);
      const devices = result.rows.map(row => row.device);
      
      // Return devices if found, otherwise return default
      return devices.length > 0 ? devices : ['desktop'];
    } catch (error) {
      // Column doesn't exist yet, return default
      return ['desktop'];
    }
  }

  /**
   * Get available meal types from room_data table (breakfast_included boolean)
   * Returns ['true', 'false'] as string options
   */
  async getAvailableMealTypes(): Promise<string[]> {
    try {
      const query = `
        SELECT DISTINCT breakfast_included
        FROM room_data
        WHERE breakfast_included IS NOT NULL
        ORDER BY breakfast_included;
      `;
      
      const result = await this.getPool().query(query);
      // Convert boolean to string options
      return result.rows.map(row => String(row.breakfast_included));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get available compsets (competitive sets)
   * Returns empty array - compsets feature not implemented yet
   */
  async getAvailableCompsets(): Promise<string[]> {
    // Return empty array - compsets not available
    return [];
  }

  /**
   * Get all filter options in a single call
   * Uses Promise.allSettled to ensure partial results even if some queries fail
   */
  async getAllFilterOptions(): Promise<FilterOptions> {
    const results = await Promise.allSettled([
      this.getAvailableOTAs(),
      this.getAvailableDevices(),
      this.getAvailableLOS(),
      this.getAvailableGuests(),
      this.getAvailableRoomTypes(),
      this.getAvailableMealTypes(),
      this.getAvailableCompsets(),
    ]);

    // Extract values from settled promises, using empty arrays as fallback
    const [otas, devices, los, guests, roomTypes, mealTypes, compsets] = results.map(
      (result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return [];
        }
      }
    );

    return {
      otas: otas as string[],
      devices: devices as string[],
      los: los as number[],
      guests: guests as number[],
      roomTypes: roomTypes as string[],
      mealTypes: mealTypes as string[],
      compsets: compsets as string[],
    };
  }
}

