import { Request } from 'express';

// JWT Token Payload
export interface TokenPayload {
  id: string; // UUID
  businessEmail: string;
}

// Extended Express Request with user
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

// Public User (without sensitive fields)
export type PublicUser = {
  id: string; // UUID
  name: string;
  businessEmail: string;
  country: string;
  state?: string;
  hotelName: string;
  hotelId?: string; // Changed to string (VARCHAR) to match hotel_id
  phoneNumber: string;
  currentPMS: string;
  businessType: 'Independent Hotel' | 'Chain Hotel' | 'Hotel Management Company' | "OTA's";
  createdAt?: Date;
  updatedAt?: Date;
};

// Hotel Interface
export interface Hotel {
  hotelId: string; // Changed from id (number) to hotelId (string) - primary key
  name: string;
  propertyToken?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  phone?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  hotelClass?: number; // star_rating from schema
  overallRating?: number; // review_score from schema
  reviewsCount?: number; // review_count from schema
  reviewTags?: string; // review_tags from schema
  description?: string;
  checkInTime?: string;
  checkOutTime?: string;
  nearbyPlaces?: any; // JSONB field
  amenitiesJson?: any; // JSONB field containing comprehensive SerpAPI data
  competitors?: Array<{hotelId: string, type: "primary" | "secondary"}>; // Array of competitor objects with type
  suggestedCompetitors?: string[]; // Array of suggested competitor hotel_ids (initially populated)
  createdAt?: Date;
  updatedAt?: Date;
}

// User Interface (PostgreSQL)
export interface User {
  id: string; // UUID
  name: string;
  businessEmail: string;
  country: string;
  state?: string;
  hotelName: string;
  hotelId?: string; // Changed to string (VARCHAR) to match hotel_id
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
  password: string;
  hotelId?: string; // Hotel ID from hotels table
  state?: string;
  city?: string;
  role?: string;
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

// Hotel Rates Request Body
export interface FetchRatesRequestBody {
  hotelName: string;
  checkInDate?: string | Date;
  checkOutDate?: string | Date;
  country?: string;
  state?: string;
  city?: string;
  adults?: number;
  // Legacy SerpAPI fields (kept for backward compatibility)
  gl?: string;
  hl?: string;
  currency?: string;
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

// Hotel Search Request Body (with location)
export interface SearchHotelRequestBody {
  hotelName: string;
  countryCode: string;
  stateName: string;
  checkInDate?: string | Date;
  checkOutDate?: string | Date;
  adults?: number;
  // Legacy SerpAPI fields (kept for backward compatibility)
  hl?: string;
  currency?: string;
}

// Competitor limits
export const COMPETITOR_LIMITS = {
  PRIMARY: 10,
  SECONDARY: 10
} as const;

// Competitor type
export type CompetitorType = "primary" | "secondary";

// Competitor entry
export interface CompetitorEntry {
  hotelId: string;
  type: CompetitorType;
}

// Add Competitor Request Body
export interface AddCompetitorRequestBody {
  // New format (recommended)
  name?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  phone?: string;
  hotelClass?: string;
  serpApiData?: any;
  type: 'primary' | 'secondary';
  
  // Backward compatibility (old format)
  competitorId?: string;
}

