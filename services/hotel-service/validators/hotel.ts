import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { FetchRatesRequestBody, SearchHotelRequestBody } from '../../../shared/types';

export const fetchRatesSchema = Joi.object<FetchRatesRequestBody>({
  hotelName: Joi.string().min(2).required().messages({
    'string.min': 'Hotel name must be at least 2 characters',
    'any.required': 'Hotel name is required',
  }),
  checkInDate: Joi.alternatives()
    .try(
      Joi.date().iso(),
      Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
    )
    .optional()
    .messages({
      'date.base': 'Check-in date must be a valid date',
      'string.pattern.base': 'Check-in date must be in YYYY-MM-DD format',
    }),
  checkOutDate: Joi.alternatives()
    .try(
      Joi.date().iso(),
      Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
    )
    .optional()
    .messages({
      'date.base': 'Check-out date must be a valid date',
      'string.pattern.base': 'Check-out date must be in YYYY-MM-DD format',
    }),
  country: Joi.string().optional().messages({
    'string.base': 'Country must be a string',
  }),
  state: Joi.string().optional().messages({
    'string.base': 'State must be a string',
  }),
  city: Joi.string().optional().messages({
    'string.base': 'City must be a string',
  }),
  adults: Joi.number().integer().min(1).max(10).optional().messages({
    'number.base': 'Adults must be a number',
    'number.integer': 'Adults must be an integer',
    'number.min': 'Adults must be at least 1',
    'number.max': 'Adults must be at most 10',
  }),
}).custom((value, helpers) => {
  // Only validate dates if both are provided
  if (value.checkInDate && value.checkOutDate) {
    const checkIn = new Date(value.checkInDate);
    const checkOut = new Date(value.checkOutDate);
    
    if (checkOut <= checkIn) {
      return helpers.error('any.custom', {
        message: 'Check-out date must be after check-in date',
      });
    }
    
    // Validate dates are not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkIn < today) {
      return helpers.error('any.custom', {
        message: 'Check-in date cannot be in the past',
      });
    }
  }
  
  return value;
});

/**
 * Transform field names from various formats to camelCase
 * Handles: snake_case, kebab-case, and other variations
 */
function transformToCamelCase(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const transformed: any = {};

  // 1. Map q → hotelName
  if (body.q) {
    transformed.hotelName = decodeURIComponent(body.q.replace(/\+/g, " "));
  }

  // 2. Map snake_case dates
  if (body.check_in_date) {
    transformed.checkInDate = body.check_in_date;
  }
  if (body.check_out_date) {
    transformed.checkOutDate = body.check_out_date;
  }

  // 3. If already camelCase, allow override
  if (body.hotelName) transformed.hotelName = body.hotelName;
  if (body.checkInDate) transformed.checkInDate = body.checkInDate;
  if (body.checkOutDate) transformed.checkOutDate = body.checkOutDate;

  // 4. Copy location filters
  if (body.country) transformed.country = body.country;
  if (body.state) transformed.state = body.state;
  if (body.city) transformed.city = body.city;
  if (body.adults) transformed.adults = body.adults;

  return transformed;
}

/**
 * Validate fetch rates request
 */
export const validateFetchRates = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.log('[VALIDATOR] Incoming req.body:', req.body);

  // Parse raw string (URL-encoded) if needed
  if (typeof req.body === "string") {
    req.body = Object.fromEntries(
      new URLSearchParams(req.body)
    );
  }

  // Normalize keys
  const transformedBody = transformToCamelCase(req.body);

  console.log('[VALIDATOR] Normalized body:', transformedBody);

  // Validate
  const { error, value } = fetchRatesSchema.validate(transformedBody, {
    abortEarly: false,
  });

  if (error) {
    const errors = error.details.map((d) => d.message);
    console.log('[VALIDATOR] Errors:', errors);
    res.status(400).json({
      error: "Validation failed",
      details: errors,
    });
    return;
  }

  // Overwrite req.body with clean validated data
  req.body = value;
  next();
};

export const searchHotelSchema = Joi.object<SearchHotelRequestBody>({
  hotelName: Joi.string().min(2).required().messages({
    'string.min': 'Hotel name must be at least 2 characters',
    'any.required': 'Hotel name is required',
  }),
  countryCode: Joi.string().length(2).required().messages({
    'string.length': 'Country code must be 2 characters',
    'any.required': 'Country code is required',
  }),
  stateName: Joi.string().min(2).required().messages({
    'string.min': 'State name must be at least 2 characters',
    'any.required': 'State name is required',
  }),
  checkInDate: Joi.alternatives()
    .try(
      Joi.date().iso(),
      Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
    )
    .optional()
    .messages({
      'date.base': 'Check-in date must be a valid date',
      'string.pattern.base': 'Check-in date must be in YYYY-MM-DD format',
    }),
  checkOutDate: Joi.alternatives()
    .try(
      Joi.date().iso(),
      Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
    )
    .optional()
    .messages({
      'date.base': 'Check-out date must be a valid date',
      'string.pattern.base': 'Check-out date must be in YYYY-MM-DD format',
    }),
  adults: Joi.number().integer().min(2).max(5).optional().default(2).messages({
    'number.base': 'Adults must be a number',
    'number.integer': 'Adults must be an integer',
    'number.min': 'Adults must be at least 2',
    'number.max': 'Adults must be at most 5',
  }),
}).custom((value, helpers) => {
  // Only validate dates if both are provided
  if (value.checkInDate && value.checkOutDate) {
    const checkIn = new Date(value.checkInDate);
    const checkOut = new Date(value.checkOutDate);
    
    if (checkOut <= checkIn) {
      return helpers.error('any.custom', {
        message: 'Check-out date must be after check-in date',
      });
    }
    
    // Validate dates are not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkIn < today) {
      return helpers.error('any.custom', {
        message: 'Check-in date cannot be in the past',
      });
    }
  }
  
  return value;
});

/**
 * Validate search hotel request
 */
export const validateSearchHotel = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.log('[VALIDATOR] Incoming search hotel req.body:', req.body);

  // Parse raw string (URL-encoded) if needed
  if (typeof req.body === "string") {
    req.body = Object.fromEntries(
      new URLSearchParams(req.body)
    );
  }

  // Validate
  const { error, value } = searchHotelSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    const errors = error.details.map((d) => d.message);
    console.log('[VALIDATOR] Search hotel errors:', errors);
    res.status(400).json({
      error: "Validation failed",
      details: errors,
    });
    return;
  }

  // Overwrite req.body with clean validated data
  req.body = value;
  next();
};

