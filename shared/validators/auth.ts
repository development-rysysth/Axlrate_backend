import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { RegisterRequestBody, LoginRequestBody, RefreshTokenRequestBody } from '../types';

const registerSchema = Joi.object<RegisterRequestBody>({
  // Basic Info
  name: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 50 characters',
    'any.required': 'Name is required',
  }),
  businessEmail: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid business email',
    'any.required': 'Business email is required',
  }),
  country: Joi.string().min(2).required().messages({
    'any.required': 'Country is required',
  }),
  
  // Hotel Information
  hotelName: Joi.string().min(2).required().messages({
    'any.required': 'Hotel name is required',
  }),
  
  // Selected Hotel (optional)
  // If selectedHotel is provided, gps_coordinates is required
  selectedHotel: Joi.object({
    type: Joi.string().optional(),
    name: Joi.string().min(2).optional(),
    description: Joi.string().optional(),
    link: Joi.string().optional(),
    property_token: Joi.string().optional(),
    serpapi_property_details_link: Joi.string().optional(),
    address: Joi.string().optional(),
    directions: Joi.string().optional(),
    phone: Joi.string().optional(),
    phone_link: Joi.string().optional(),
    gps_coordinates: Joi.object({
      latitude: Joi.number().required().messages({
        'any.required': 'Latitude is required',
        'number.base': 'Latitude must be a number',
      }),
      longitude: Joi.number().required().messages({
        'any.required': 'Longitude is required',
        'number.base': 'Longitude must be a number',
      }),
    }).required().messages({
      'any.required': 'GPS coordinates are required when selectedHotel is provided',
    }),
    check_in_time: Joi.string().optional(),
    check_out_time: Joi.string().optional(),
    rate_per_night: Joi.any().optional(),
    total_rate: Joi.any().optional(),
    typical_price_range: Joi.any().optional(),
    deal: Joi.string().optional(),
    deal_description: Joi.string().optional(),
    featured_prices: Joi.any().optional(),
    prices: Joi.any().optional(),
    nearby_places: Joi.any().optional(),
    hotel_class: Joi.string().optional(),
    extracted_hotel_class: Joi.number().optional(),
    images: Joi.any().optional(),
    overall_rating: Joi.number().optional(),
    reviews: Joi.number().optional(),
    ratings: Joi.any().optional(),
    location_rating: Joi.number().optional(),
    reviews_breakdown: Joi.any().optional(),
    other_reviews: Joi.any().optional(),
    amenities: Joi.any().optional(),
    excluded_amenities: Joi.any().optional(),
    amenities_detailed: Joi.any().optional(),
    health_and_safety: Joi.any().optional(),
  }).optional(),
  
  // Optional fields
  state: Joi.string().optional(),
  city: Joi.string().optional(),
  role: Joi.string().optional(),
  
  // Contact
  phoneNumber: Joi.string().required().messages({
    'any.required': 'Phone number is required',
  }),
  
  // Property Management System
  currentPMS: Joi.string().required().messages({
    'any.required': 'Current Property Management System is required',
  }),
  
  // Business Type
  businessType: Joi.string()
    .valid('Independent Hotel', 'Chain Hotel', 'Hotel Management Company', "OTA's")
    .required()
    .messages({
      'any.only': 'Business type must be one of: Independent Hotel, Chain Hotel, Hotel Management Company, OTA\'s',
      'any.required': 'Business type is required',
    }),
  
  // Password
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required',
  }),
});

const loginSchema = Joi.object<LoginRequestBody>({
  businessEmail: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid business email',
    'any.required': 'Business email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

const refreshTokenSchema = Joi.object<RefreshTokenRequestBody>({
  refreshToken: Joi.string().required(),
});

/**
 * Validate register request
 */
export const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    res.status(400).json({ error: error.details[0].message });
    return;
  }
  next();
};

/**
 * Validate login request
 */
export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    res.status(400).json({ error: error.details[0].message });
    return;
  }
  next();
};

/**
 * Validate refresh token request
 */
export const validateRefreshToken = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = refreshTokenSchema.validate(req.body);
  if (error) {
    res.status(400).json({ error: error.details[0].message });
    return;
  }
  next();
};

