import { Request } from 'express';
import { Document } from 'mongoose';

// JWT Token Payload
export interface TokenPayload {
  id: string;
  businessEmail: string;
}

// Extended Express Request with user
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

// Public User (without sensitive fields)
export type PublicUser = {
  _id: string;
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

// User Document Interface
export interface IUser extends Document {
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
  comparePassword(candidatePassword: string): Promise<boolean>;
  toJSON(): PublicUser;
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

