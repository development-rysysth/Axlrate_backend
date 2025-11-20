// JWT utilities
const jwtUtils = require('./utils/jwt');
const passwordUtils = require('./utils/password');

// Middleware
const authMiddleware = require('./middleware/auth');

// Validators
const validators = require('./validators/auth');

module.exports = {
  // JWT utilities
  generateAccessToken: jwtUtils.generateAccessToken,
  generateRefreshToken: jwtUtils.generateRefreshToken,
  verifyAccessToken: jwtUtils.verifyAccessToken,
  verifyRefreshToken: jwtUtils.verifyRefreshToken,
  
  // Password utilities
  hashPassword: passwordUtils.hashPassword,
  comparePassword: passwordUtils.comparePassword,
  
  // Middleware
  authenticateToken: authMiddleware.authenticateToken,
  
  // Validators
  validateRegister: validators.validateRegister,
  validateLogin: validators.validateLogin,
  validateRefreshToken: validators.validateRefreshToken,
};

