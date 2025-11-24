import mongoose, { Schema, Document, Model } from 'mongoose';

// Interfaces

export interface ICoordinates {
  latitude: number;
  longitude: number;
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
  type: string;
  duration: string;
}

export interface INearbyPlace {
  category?: string;
  name: string;
  link?: string;
  thumbnail?: string;
  transportations?: ITransportation[];
  rating?: number;
  reviews?: number;
  description?: string;
  gps_coordinates?: ICoordinates;
}

export interface IImage {
  thumbnail: string;
  original_image: string;
}

export interface IRating {
  stars: number;
  count: number;
}

export interface IReviewBreakdown {
  name: string;
  description: string;
  total_mentioned: number;
  positive: number;
  negative: number;
  neutral: number;
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
  title: string;
  available: boolean;
  label?: string;
  details?: IAmenityDetails;
}

export interface IAmenityGroup {
  title: string;
  list: IAmenity[];
}

export interface IAmenitiesDetailed {
  groups: IAmenityGroup[];
  popular: IAmenity[];
}

export interface IHealthSafetyGroup {
  title: string;
  list: IAmenity[];
}

export interface IHealthSafety {
  groups: IHealthSafetyGroup[];
}

export interface IRoom {
  name: string;
  images?: string[];
  link: string;
  num_guests: number;
  rate_per_night?: IPrice;
  total_rate?: IPrice;
}

export interface IFeaturedPrice {
  source: string;
  link: string;
  logo: string;
  remarks?: string[];
  rooms?: IRoom[];
  num_guests: number;
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
  username: string;
  date: string;
  rating: {
    score: number;
    max_score: number;
  };
  comment: string;
  link?: string;
}

export interface IOtherReview {
  source: string;
  source_icon: string;
  source_rating: {
    score: number;
    max_score: number;
  };
  reviews: number;
  user_review?: IUserReview;
}

export interface ISerpData extends Document {
  // Search Metadata
  search_metadata: {
    id: string;
    status: string;
    json_endpoint: string;
    created_at: Date;
    processed_at: Date;
    google_hotels_url: string;
    raw_html_file: string;
    prettify_html_file: string;
    total_time_taken: number;
  };

  // Search Parameters
  search_parameters: {
    engine: string;
    q: string;
    gl: string;
    hl: string;
    currency: string;
    check_in_date: Date;
    check_out_date: Date;
    adults: number;
    children: number;
  };

  // Basic Information
  type: string;
  name: string;
  description?: string;
  link: string;
  property_token: string;
  serpapi_property_details_link: string;
  address?: string;
  directions?: string;
  phone?: string;
  phone_link?: string;
  gps_coordinates: ICoordinates;
  check_in_time: string;
  check_out_time: string;

  // Pricing
  rate_per_night: IPrice;
  total_rate: IPrice;
  typical_price_range?: IPrice;
  deal?: string;
  deal_description?: string;

  // Featured Prices & Rooms
  featured_prices: IFeaturedPrice[];
  prices: IFeaturedPrice[];

  // Nearby Places
  nearby_places: INearbyPlace[];

  // Hotel Classification
  hotel_class: string;
  extracted_hotel_class: number;

  // Images
  images: IImage[];

  // Reviews & Ratings
  overall_rating: number;
  reviews: number;
  ratings: IRating[];
  location_rating?: number;
  reviews_breakdown: IReviewBreakdown[];
  other_reviews?: IOtherReview[];

  // Amenities
  amenities: string[];
  excluded_amenities?: string[];
  amenities_detailed: IAmenitiesDetailed;

  // Health & Safety
  health_and_safety?: IHealthSafety;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

// Schemas

const coordinatesSchema = new Schema<ICoordinates>({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
}, { _id: false });

const priceSchema = new Schema<IPrice>({
  lowest: String,
  extracted_lowest: Number,
  before_taxes_fees: String,
  extracted_before_taxes_fees: Number,
  highest: String,
  extracted_highest: Number,
}, { _id: false });

const transportationSchema = new Schema<ITransportation>({
  type: { type: String, required: true },
  duration: { type: String, required: true },
}, { _id: false });

const nearbyPlaceSchema = new Schema<INearbyPlace>({
  category: String,
  name: { type: String, required: true },
  link: String,
  thumbnail: String,
  transportations: [transportationSchema],
  rating: Number,
  reviews: Number,
  description: String,
  gps_coordinates: coordinatesSchema,
}, { _id: false });

const imageSchema = new Schema<IImage>({
  thumbnail: { type: String, required: true },
  original_image: { type: String, required: true },
}, { _id: false });

const ratingSchema = new Schema<IRating>({
  stars: { type: Number, required: true },
  count: { type: Number, required: true },
}, { _id: false });

const reviewBreakdownSchema = new Schema<IReviewBreakdown>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  total_mentioned: { type: Number, required: true },
  positive: { type: Number, required: true },
  negative: { type: Number, required: true },
  neutral: { type: Number, required: true },
}, { _id: false });

const amenityDetailsSchema = new Schema<IAmenityDetails>({
  snippet: String,
  snippet_original: String,
  snippet_highlighted_words: [String],
  link: String,
  displayed_link: String,
  title: String,
  source_logo: String,
}, { _id: false });

const amenitySchema = new Schema<IAmenity>({
  title: { type: String, required: true },
  available: { type: Boolean, required: true },
  label: String,
  details: amenityDetailsSchema,
}, { _id: false });

const amenityGroupSchema = new Schema<IAmenityGroup>({
  title: { type: String, required: true },
  list: [amenitySchema],
}, { _id: false });

const amenitiesDetailedSchema = new Schema<IAmenitiesDetailed>({
  groups: [amenityGroupSchema],
  popular: [amenitySchema],
}, { _id: false });

const healthSafetyGroupSchema = new Schema<IHealthSafetyGroup>({
  title: { type: String, required: true },
  list: [amenitySchema],
}, { _id: false });

const healthSafetySchema = new Schema<IHealthSafety>({
  groups: [healthSafetyGroupSchema],
}, { _id: false });

const roomSchema = new Schema<IRoom>({
  name: { type: String, required: true },
  images: [String],
  link: { type: String, required: true },
  num_guests: { type: Number, required: true },
  rate_per_night: priceSchema,
  total_rate: priceSchema,
}, { _id: false });

const featuredPriceSchema = new Schema<IFeaturedPrice>({
  source: { type: String, required: true },
  link: { type: String, required: true },
  logo: { type: String, required: true },
  remarks: [String],
  rooms: [roomSchema],
  num_guests: { type: Number, required: true },
  rate_per_night: priceSchema,
  total_rate: priceSchema,
  original_rate_per_night: priceSchema,
  original_total_rate: priceSchema,
  discount_remarks: [String],
  official: Boolean,
  free_cancellation: Boolean,
  free_cancellation_until_date: String,
  free_cancellation_until_time: String,
}, { _id: false });

const userReviewSchema = new Schema<IUserReview>({
  username: { type: String, required: true },
  date: { type: String, required: true },
  rating: {
    score: { type: Number, required: true },
    max_score: { type: Number, required: true },
  },
  comment: { type: String, required: true },
  link: String,
}, { _id: false });

const otherReviewSchema = new Schema<IOtherReview>({
  source: { type: String, required: true },
  source_icon: { type: String, required: true },
  source_rating: {
    score: { type: Number, required: true },
    max_score: { type: Number, required: true },
  },
  reviews: { type: Number, required: true },
  user_review: userReviewSchema,
}, { _id: false });

// Main SerpData Schema
const serpDataSchema = new Schema<ISerpData>(
  {
    search_metadata: {
      id: { type: String, required: true, unique: true },
      status: { type: String, required: true },
      json_endpoint: { type: String, required: true },
      created_at: { type: Date, required: true },
      processed_at: { type: Date, required: true },
      google_hotels_url: { type: String, required: true },
      raw_html_file: { type: String, required: true },
      prettify_html_file: { type: String, required: true },
      total_time_taken: { type: Number, required: true },
    },

    search_parameters: {
      engine: { type: String, required: true },
      q: { type: String, required: true },
      gl: { type: String, required: true },
      hl: { type: String, required: true },
      currency: { type: String, required: true },
      check_in_date: { type: Date, required: true },
      check_out_date: { type: Date, required: true },
      adults: { type: Number, required: true },
      children: { type: Number, required: true },
    },

    type: { type: String, required: true },
    name: { 
      type: String, 
      required: true,
      trim: true,
      index: true,
    },
    description: { type: String, index: true },
    link: { type: String, required: true },
    property_token: { 
      type: String, 
      required: true,
      unique: true,
      index: true,
    },
    serpapi_property_details_link: { type: String, required: true },
    address: { 
      type: String, 
      index: true,
    },
    directions: String,
    phone: String,
    phone_link: String,
    gps_coordinates: {
      type: coordinatesSchema,
      required: true,
      index: '2dsphere', // For geospatial queries
    },
    check_in_time: { type: String, required: true },
    check_out_time: { type: String, required: true },

    rate_per_night: priceSchema,
    total_rate: priceSchema,
    typical_price_range: priceSchema,
    deal: String,
    deal_description: String,

    featured_prices: [featuredPriceSchema],
    prices: [featuredPriceSchema],

    nearby_places: [nearbyPlaceSchema],

    hotel_class: { type: String, required: true },
    extracted_hotel_class: { 
      type: Number, 
      required: true,
      min: 1,
      max: 5,
      index: true,
    },

    images: [imageSchema],

    overall_rating: { 
      type: Number, 
      required: true,
      min: 0,
      max: 5,
      index: true,
    },
    reviews: { 
      type: Number, 
      required: true,
      index: true,
    },
    ratings: [ratingSchema],
    location_rating: Number,
    reviews_breakdown: [reviewBreakdownSchema],
    other_reviews: [otherReviewSchema],

    amenities: [{ type: String, index: true }],
    excluded_amenities: [String],
    amenities_detailed: amenitiesDetailedSchema,

    health_and_safety: healthSafetySchema,
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
serpDataSchema.index({ name: 'text', description: 'text', address: 'text' });
serpDataSchema.index({ 'search_parameters.check_in_date': 1, 'search_parameters.check_out_date': 1 });
serpDataSchema.index({ overall_rating: -1, reviews: -1 });
serpDataSchema.index({ 'rate_per_night.extracted_lowest': 1 });

// Virtual for price range
serpDataSchema.virtual('priceRange').get(function() {
  if (this.rate_per_night?.extracted_lowest && this.rate_per_night?.extracted_highest) {
    return `$${this.rate_per_night.extracted_lowest} - $${this.rate_per_night.extracted_highest}`;
  }
  return 'Price not available';
});

// Method to check if hotel has specific amenity
serpDataSchema.methods.hasAmenity = function(amenityName: string): boolean {
  return this.amenities.includes(amenityName);
};

// Method to get available rooms count
serpDataSchema.methods.getAvailableRoomsCount = function(): number {
  return this.featured_prices.reduce((total: number, price: IFeaturedPrice) => {
    return total + (price.rooms?.length || 0);
  }, 0);
};

// Interface for static methods
interface ISerpDataModel extends Model<ISerpData> {
  findNearby(
    longitude: number,
    latitude: number,
    maxDistanceInMeters?: number
  ): Promise<ISerpData[]>;
  findByPriceRange(minPrice: number, maxPrice: number): Promise<ISerpData[]>;
  findByMinimumRating(minRating: number): Promise<ISerpData[]>;
}

// Static method to find hotels by location
serpDataSchema.statics.findNearby = function(
  longitude: number, 
  latitude: number, 
  maxDistanceInMeters: number = 5000
) {
  return this.find({
    gps_coordinates: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistanceInMeters
      }
    }
  });
};

// Static method to find hotels by price range
serpDataSchema.statics.findByPriceRange = function(minPrice: number, maxPrice: number) {
  return this.find({
    'rate_per_night.extracted_lowest': {
      $gte: minPrice,
      $lte: maxPrice
    }
  });
};

// Static method to find hotels by rating
serpDataSchema.statics.findByMinimumRating = function(minRating: number) {
  return this.find({
    overall_rating: { $gte: minRating }
  }).sort({ overall_rating: -1, reviews: -1 });
};

const SerpData = mongoose.model<ISerpData, ISerpDataModel>('SerpData', serpDataSchema);

export default SerpData;

