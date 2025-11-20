const Joi = require('joi');

const registerSchema = Joi.object({
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
  
  // Inventory
  numberOfRooms: Joi.number().integer().min(1).required().messages({
    'number.base': 'Number of rooms must be a number',
    'number.min': 'Number of rooms must be at least 1',
    'any.required': 'Number of rooms is required',
  }),
  
  // Password
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required',
  }),
});

const loginSchema = Joi.object({
  businessEmail: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid business email',
    'any.required': 'Business email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

/**
 * Validate register request
 */
const validateRegister = (req, res, next) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

/**
 * Validate login request
 */
const validateLogin = (req, res, next) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

/**
 * Validate refresh token request
 */
const validateRefreshToken = (req, res, next) => {
  const { error } = refreshTokenSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateRefreshToken,
};

