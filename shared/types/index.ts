import { Request } from 'express';

// JWT Token Payload
export interface TokenPayload {
  id: number;
  businessEmail: string;
}

// Extended Express Request with user
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

// Public User (without sensitive fields)
export type PublicUser = {
  id: number;
  name: string;
  businessEmail: string;
  country: string;
  hotelName: string;
  phoneNumber: string;
  currentPMS: string;
  businessType: 'Independent Hotel' | 'Chain Hotel' | 'Hotel Management Company' | "OTA's";
  numberOfRooms: number;
  createdAt?: Date;
  updatedAt?: Date;
};

// User Interface (PostgreSQL)
export interface User {
  id: number;
  name: string;
  businessEmail: string;
  country: string;
  hotelName: string;
  phoneNumber: string;
  currentPMS: string;
  businessType: 'Independent Hotel' | 'Chain Hotel' | 'Hotel Management Company' | "OTA's";
  numberOfRooms: number;
  password: string;
  refreshTokens: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Register Request Body
export interface RegisterRequestBody {
  name: string;
  businessEmail: string;
  country: string;
  hotelName: string;
  phoneNumber: string;
  currentPMS: string;
  businessType: 'Independent Hotel' | 'Chain Hotel' | 'Hotel Management Company' | "OTA's";
  numberOfRooms: number;
  password: string;
}

// Login Request Body
export interface LoginRequestBody {
  businessEmail: string;
  password: string;
}

// Refresh Token Request Body
export interface RefreshTokenRequestBody {
  refreshToken: string;
}

// SerpAPI Request Body
export interface FetchRatesRequestBody {
  hotelName: string;
  checkInDate: string | Date;
  checkOutDate: string | Date;
  gl?: string;
  hl?: string;
  currency?: string;
  adults?: number;
}

// SerpAPI Fetch Parameters
export interface FetchHotelRatesParams {
  hotelQuery: string;
  checkInDate: string;
  checkOutDate: string;
  gl?: string;
  hl?: string;
  currency?: string;
}

