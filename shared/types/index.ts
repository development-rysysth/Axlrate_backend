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
  competitors?: string[]; // Array of accepted competitor hotel_ids
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
  selectedHotel?: {
    type?: string;
    name: string;
    description?: string;
    link?: string;
    property_token?: string;
    serpapi_property_details_link?: string;
    address?: string;
    directions?: string;
    phone?: string;
    phone_link?: string;
    gps_coordinates: {
      latitude: number;
      longitude: number;
    };
    check_in_time?: string;
    check_out_time?: string;
    rate_per_night?: any;
    total_rate?: any;
    typical_price_range?: any;
    deal?: string;
    deal_description?: string;
    featured_prices?: any;
    prices?: any;
    nearby_places?: any;
    hotel_class?: string;
    extracted_hotel_class?: number;
    images?: any;
    overall_rating?: number;
    reviews?: number;
    ratings?: any;
    location_rating?: number;
    reviews_breakdown?: any;
    other_reviews?: any;
    amenities?: any;
    excluded_amenities?: any;
    amenities_detailed?: any;
    health_and_safety?: any;
  };
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

// Hotel Search Request Body (with location)
export interface SearchHotelRequestBody {
  hotelName: string;
  countryCode: string;
  stateName: string;
  checkInDate: string | Date;
  checkOutDate: string | Date;
  hl?: string;
  currency?: string;
  adults?: number;
}

