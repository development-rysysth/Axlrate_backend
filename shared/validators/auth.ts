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
  
  // Hotel ID (optional - from hotels list)
  hotelId: Joi.string().optional().messages({
    'string.base': 'Hotel ID must be a string',
  }),
  
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

