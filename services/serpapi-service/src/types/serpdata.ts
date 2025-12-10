// SerpData TypeScript interfaces
// These types match the PostgreSQL serpdata table structure

export interface ICoordinates {
  latitude?: number;
  longitude?: number;
}

export interface IPrice {
  lowest?: string;
  extracted_lowest?: number;
  before_taxes_fees?: string;
  extracted_before_taxes_fees?: number;
  highest?: string;
  extracted_highest?: number;
}

export interface ITransportation {
  type?: string;
  duration?: string;
}

export interface INearbyPlace {
  category?: string;
  name?: string;
  link?: string;
  thumbnail?: string;
  transportations?: ITransportation[];
  rating?: number;
  reviews?: number;
  description?: string;
  gps_coordinates?: ICoordinates;
}

export interface IImage {
  thumbnail?: string;
  original_image?: string;
}

export interface IRating {
  stars?: number;
  count?: number;
}

export interface IReviewBreakdown {
  name?: string;
  description?: string;
  total_mentioned?: number;
  positive?: number;
  negative?: number;
  neutral?: number;
}

export interface IAmenityDetails {
  snippet?: string;
  snippet_original?: string;
  snippet_highlighted_words?: string[];
  link?: string;
  displayed_link?: string;
  title?: string;
  source_logo?: string;
}

export interface IAmenity {
  title?: string;
  available?: boolean;
  label?: string;
  details?: IAmenityDetails;
}

export interface IAmenityGroup {
  title?: string;
  list?: IAmenity[];
}

export interface IAmenitiesDetailed {
  groups?: IAmenityGroup[];
  popular?: IAmenity[];
}

export interface IHealthSafetyGroup {
  title?: string;
  list?: IAmenity[];
}

export interface IHealthSafety {
  groups?: IHealthSafetyGroup[];
}

export interface IRoom {
  name?: string;
  images?: string[];
  link?: string;
  num_guests?: number;
  rate_per_night?: IPrice;
  total_rate?: IPrice;
}

export interface IFeaturedPrice {
  source?: string;
  link?: string;
  logo?: string;
  remarks?: string[];
  rooms?: IRoom[];
  num_guests?: number;
  rate_per_night?: IPrice;
  total_rate?: IPrice;
  original_rate_per_night?: IPrice;
  original_total_rate?: IPrice;
  discount_remarks?: string[];
  official?: boolean;
  free_cancellation?: boolean;
  free_cancellation_until_date?: string;
  free_cancellation_until_time?: string;
}

export interface IUserReview {
  username?: string;
  date?: string;
  rating?: {
    score?: number;
    max_score?: number;
  };
  comment?: string;
  link?: string;
}

export interface IOtherReview {
  source?: string;
  source_icon?: string;
  source_rating?: {
    score?: number;
    max_score?: number;
  };
  reviews?: number;
  user_review?: IUserReview;
}

export interface ISerpData {
  id?: number;
  search_metadata?: any;
  search_parameters?: any;
  type?: string;
  name?: string;
  description?: string;
  link?: string;
  property_token?: string;
  serpapi_property_details_link?: string;
  address?: string;
  directions?: string;
  phone?: string;
  phone_link?: string;
  gps_coordinates?: ICoordinates;
  check_in_time?: string;
  check_out_time?: string;
  rate_per_night?: IPrice;
  total_rate?: IPrice;
  typical_price_range?: IPrice;
  deal?: string;
  deal_description?: string;
  featured_prices?: IFeaturedPrice[];
  prices?: IFeaturedPrice[];
  nearby_places?: INearbyPlace[];
  hotel_class?: string;
  extracted_hotel_class?: number;
  images?: IImage[];
  overall_rating?: number;
  reviews?: number;
  ratings?: IRating[];
  location_rating?: number;
  reviews_breakdown?: IReviewBreakdown[];
  other_reviews?: IOtherReview[];
  amenities?: string[];
  excluded_amenities?: string[];
  amenities_detailed?: IAmenitiesDetailed;
  health_and_safety?: IHealthSafety;
  created_at?: Date;
  updated_at?: Date;
}
