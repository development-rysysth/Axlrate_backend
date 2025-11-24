import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { FetchRatesRequestBody } from '../../../shared/types';

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
    .required()
    .messages({
      'date.base': 'Check-in date must be a valid date',
      'string.pattern.base': 'Check-in date must be in YYYY-MM-DD format',
      'any.required': 'Check-in date is required',
    }),
  checkOutDate: Joi.alternatives()
    .try(
      Joi.date().iso(),
      Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
    )
    .required()
    .messages({
      'date.base': 'Check-out date must be a valid date',
      'string.pattern.base': 'Check-out date must be in YYYY-MM-DD format',
      'any.required': 'Check-out date is required',
    }),
  gl: Joi.string().length(2).optional().default('us').messages({
    'string.length': 'Country code (gl) must be 2 characters',
  }),
  hl: Joi.string().length(2).optional().default('en').messages({
    'string.length': 'Language code (hl) must be 2 characters',
  }),
  currency: Joi.string().length(3).optional().default('USD').messages({
    'string.length': 'Currency code must be 3 characters',
  }),
}).custom((value, helpers) => {
  // Validate that check-out date is after check-in date
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

  // 4. Copy basic fields
  if (body.gl) transformed.gl = body.gl;
  if (body.hl) transformed.hl = body.hl;
  if (body.currency) transformed.currency = body.currency;

  // 5. Ignore engine (validator doesn't expect it)
  //    If you want to keep it, add it here.

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

  // --- FIX 1: Parse raw string (URL-encoded) if needed ---
  if (typeof req.body === "string") {
    req.body = Object.fromEntries(
      new URLSearchParams(req.body)
    );
  }

  // --- FIX 2: Normalize keys ---
  const transformedBody = transformToCamelCase(req.body);

  console.log('[VALIDATOR] Normalized body:', transformedBody);

  // --- FIX 3: Validate ---
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

  // --- FIX 4: Overwrite req.body with clean validated data ---
  req.body = value;
  next();
};


