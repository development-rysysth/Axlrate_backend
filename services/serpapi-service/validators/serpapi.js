const Joi = require('joi');

const fetchRatesSchema = Joi.object({
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
 * Validate fetch rates request
 */
const validateFetchRates = (req, res, next) => {
  const { error, value } = fetchRatesSchema.validate(req.body, {
    abortEarly: false,
  });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors,
    });
  }
  
  // Replace req.body with validated and sanitized value
  req.body = value;
  next();
};

module.exports = {
  validateFetchRates,
};

