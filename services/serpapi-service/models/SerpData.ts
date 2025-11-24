import mongoose, { Schema, Document, Model } from 'mongoose';

// ---------------------------- //
//      INTERFACE DEFINITIONS
// ---------------------------- //

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

export interface ISerpData extends Document {
  search_metadata: any;
  search_parameters: any;
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
}


// ---------------------------- //
//       SUB-SCHEMAS
// ---------------------------- //



const coordinatesSchema = new Schema<ICoordinates>({
  latitude: Number,
  longitude: Number,
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
  type: String,
  duration: String,
}, { _id: false });

const nearbyPlaceSchema = new Schema<INearbyPlace>({
  category: String,
  name: String,
  link: String,
  thumbnail: String,
  transportations: [transportationSchema],
  rating: Number,
  reviews: Number,
  description: String,
  gps_coordinates: coordinatesSchema,
}, { _id: false });

const imageSchema = new Schema<IImage>({
  thumbnail: String,
  original_image: String,
}, { _id: false });

const ratingSchema = new Schema<IRating>({
  stars: Number,
  count: Number,
}, { _id: false });

const reviewBreakdownSchema = new Schema<IReviewBreakdown>({
  name: String,
  description: String,
  total_mentioned: Number,
  positive: Number,
  negative: Number,
  neutral: Number,
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
  title: String,
  available: Boolean,
  label: String,
  details: amenityDetailsSchema,
}, { _id: false });

const amenitiesDetailedSchema = new Schema<IAmenitiesDetailed>({
  groups: [{ title: String, list: [amenitySchema] }],
  popular: [amenitySchema],
}, { _id: false });

const roomSchema = new Schema<IRoom>({
  name: String,
  images: [String],
  link: String,
  num_guests: Number,
  rate_per_night: priceSchema,
  total_rate: priceSchema,
}, { _id: false });

const featuredPriceSchema = new Schema<IFeaturedPrice>({
  source: String,
  link: String,
  logo: String,
  remarks: [String],
  rooms: [roomSchema],
  num_guests: Number,
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
  username: String,
  date: String,
  rating: { score: Number, max_score: Number },
  comment: String,
  link: String,
}, { _id: false });

const otherReviewSchema = new Schema<IOtherReview>({
  source: String,
  source_icon: String,
  source_rating: { score: Number, max_score: Number },
  reviews: Number,
  user_review: userReviewSchema,
}, { _id: false });


// Health & Safety

const healthSafetyGroupSchema = new Schema<IHealthSafetyGroup>({
  title: String,
  list: [amenitySchema],
}, { _id: false });

const healthSafetySchema = new Schema<IHealthSafety>({
  groups: [healthSafetyGroupSchema],
}, { _id: false });


// ---------------------------- //
//       MAIN SCHEMA
// ---------------------------- //

const serpDataSchema = new Schema<ISerpData>(
  {
    search_metadata: { type: Schema.Types.Mixed, default: {} },
    search_parameters: { type: Schema.Types.Mixed, default: {} },

    type: String,
    name: String,
    description: String,
    link: String,
    property_token: String,
    serpapi_property_details_link: String,
    address: String,
    directions: String,
    phone: String,
    phone_link: String,

    gps_coordinates: coordinatesSchema,

    check_in_time: String,
    check_out_time: String,

    rate_per_night: priceSchema,
    total_rate: priceSchema,
    typical_price_range: priceSchema,

    deal: String,
    deal_description: String,

    featured_prices: [featuredPriceSchema],
    prices: [featuredPriceSchema],

    nearby_places: [nearbyPlaceSchema],

    hotel_class: String,
    extracted_hotel_class: Number,

    images: [imageSchema],

    overall_rating: Number,
    reviews: Number,
    ratings: [ratingSchema],
    location_rating: Number,

    reviews_breakdown: [reviewBreakdownSchema],
    other_reviews: [otherReviewSchema],

    amenities: [String],
    excluded_amenities: [String],
    amenities_detailed: amenitiesDetailedSchema,

    health_and_safety: {
      type: healthSafetySchema,
      default: undefined,
    }
  },
  { timestamps: true }
);


// ---------------------------- //
//        MODEL EXPORT
// ---------------------------- //

const SerpData =
  mongoose.models.SerpData ||
  mongoose.model<ISerpData>('SerpData', serpDataSchema);

export default SerpData;
