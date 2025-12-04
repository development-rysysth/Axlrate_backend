import { Request, Response } from 'express';
import { 
  RegisterRequestBody, 
  LoginRequestBody, 
  RefreshTokenRequestBody,
  AuthenticatedRequest,
  User
} from '../../../../shared';
import { UserRepository } from '../repositories/user-repository';
import { JwtService } from '../services/jwt-service';
import { comparePassword } from '../../../../shared/utils/password';

const userRepository = new UserRepository();

// Helper function to exclude sensitive fields from user object
const sanitizeUser = (user: User) => {
  const { password, refreshTokens, ...publicUser } = user;
  return publicUser;
};

export class AuthController {
  async register(req: Request<{}, {}, RegisterRequestBody>, res: Response) {
    try {
      const {
        name,
        businessEmail,
        country,
        hotelName,
        phoneNumber,
        currentPMS,
        businessType,
        numberOfRooms,
        password,
      } = req.body;

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(businessEmail);
      if (existingUser) {
        return res.status(409).json({ 
          error: 'User with this business email already exists',
          code: 'USER_EXISTS' 
        });
      }

      // Create user (password will be hashed in repository)
      const user = await userRepository.create({
        name,
        businessEmail,
        country,
        hotelName,
        phoneNumber,
        currentPMS,
        businessType,
        numberOfRooms,
        password,
      });

      // Generate tokens
      const tokenPayload = { id: user.id, businessEmail: user.businessEmail };
      const tokens = JwtService.generateTokens(tokenPayload);

      // Store refresh token
      await userRepository.addRefreshToken(user.id, tokens.refreshToken);

      // Return user data (exclude sensitive fields)
      return res.status(201).json({
        message: 'User registered successfully',
        user: sanitizeUser(user),
        tokens,
      });
    } catch (error: unknown) {
      
      // Handle PostgreSQL errors
      if (error && typeof error === 'object' && 'code' in error) {
        // Table does not exist
        if (error.code === '42P01') {
          return res.status(503).json({ 
            error: 'Database not initialized. Please run database migrations.',
            code: 'DB_NOT_INITIALIZED',
            details: 'The users table does not exist. Contact system administrator.'
          });
        }
        
        // Unique constraint violation
        if (error.code === '23505') {
          return res.status(409).json({ 
            error: 'User with this business email already exists',
            code: 'USER_EXISTS'
          });
        }
        
        // Check constraint violation
        if (error.code === '23514') {
          return res.status(400).json({ 
            error: 'Invalid data: check business type and number of rooms',
            code: 'INVALID_DATA'
          });
        }

        // Connection errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          return res.status(503).json({ 
            error: 'Database connection failed',
            code: 'DB_CONNECTION_ERROR'
          });
        }
      }
      
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async login(req: Request<{}, {}, LoginRequestBody>, res: Response) {
    try {
      const { businessEmail, password } = req.body;

      // Find user (password is included in query results)
      const user = await userRepository.findByEmail(businessEmail);
      if (!user) {
        return res.status(401).json({ 
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Verify password using shared utility
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Generate tokens
      const tokenPayload = { id: user.id, businessEmail: user.businessEmail };
      const tokens = JwtService.generateTokens(tokenPayload);

      // Store refresh token
      await userRepository.addRefreshToken(user.id, tokens.refreshToken);

      // Return user data (exclude sensitive fields)
      return res.json({
        message: 'Login successful',
        user: sanitizeUser(user),
        tokens,
      });
    } catch (error: unknown) {
      
      // Handle PostgreSQL errors
      if (error && typeof error === 'object' && 'code' in error) {
        // Table does not exist
        if (error.code === '42P01') {
          return res.status(503).json({ 
            error: 'Database not initialized. Please run database migrations.',
            code: 'DB_NOT_INITIALIZED',
            details: 'The users table does not exist. Contact system administrator.'
          });
        }

        // Connection errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          return res.status(503).json({ 
            error: 'Database connection failed',
            code: 'DB_CONNECTION_ERROR'
          });
        }
      }
      
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async refreshToken(req: Request<{}, {}, RefreshTokenRequestBody>, res: Response) {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const decoded = JwtService.verifyRefreshToken(refreshToken);

      // Find user and check if refresh token exists in their tokens array
      const user = await userRepository.findById(decoded.id);
      if (!user || !user.refreshTokens.includes(refreshToken)) {
        return res.status(403).json({ 
          error: 'Invalid refresh token',
          code: 'INVALID_TOKEN'
        });
      }

      // Generate new access token
      const tokenPayload = { id: user.id, businessEmail: user.businessEmail };
      const newAccessToken = JwtService.generateAccessToken(tokenPayload);

      return res.json({
        accessToken: newAccessToken,
      });
    } catch (error: unknown) {
      
      // Handle PostgreSQL errors
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === '42P01') {
          return res.status(503).json({ 
            error: 'Database not initialized',
            code: 'DB_NOT_INITIALIZED'
          });
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          return res.status(503).json({ 
            error: 'Database connection failed',
            code: 'DB_CONNECTION_ERROR'
          });
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Invalid refresh token';
      return res.status(403).json({ 
        error: errorMessage,
        code: 'INVALID_TOKEN'
      });
    }
  }

  async logout(req: Request<{}, {}, RefreshTokenRequestBody>, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ 
          error: 'Refresh token is required',
          code: 'MISSING_TOKEN'
        });
      }

      // Remove refresh token
      await userRepository.removeRefreshToken(refreshToken);

      return res.json({ 
        message: 'Logged out successfully',
        success: true
      });
    } catch (error: unknown) {
      
      // Handle PostgreSQL errors
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === '42P01') {
          return res.status(503).json({ 
            error: 'Database not initialized',
            code: 'DB_NOT_INITIALIZED',
            details: 'The users table does not exist. Contact system administrator.'
          });
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          return res.status(503).json({ 
            error: 'Database connection failed',
            code: 'DB_CONNECTION_ERROR'
          });
        }
      }
      
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async getUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = parseInt(id, 10);

      // Validate numeric ID
      if (isNaN(userId)) {
        return res.status(400).json({ 
          error: 'Invalid user ID',
          code: 'INVALID_ID'
        });
      }

      // Find user by ID
      const user = await userRepository.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Return user (exclude sensitive fields)
      return res.json(sanitizeUser(user));
    } catch (error: unknown) {
      
      // Handle PostgreSQL errors
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === '42P01') {
          return res.status(503).json({ 
            error: 'Database not initialized',
            code: 'DB_NOT_INITIALIZED'
          });
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          return res.status(503).json({ 
            error: 'Database connection failed',
            code: 'DB_CONNECTION_ERROR'
          });
        }
      }
      
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async updateUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = parseInt(id, 10);

      // Validate numeric ID
      if (isNaN(userId)) {
        return res.status(400).json({ 
          error: 'Invalid user ID',
          code: 'INVALID_ID'
        });
      }

      const updateData = req.body;

      // Remove password from update data if present (password updates should be separate)
      delete updateData.password;
      delete updateData.refreshTokens;
      delete updateData.id; // Don't allow ID updates

      // Find and update user
      const user = await userRepository.updateById(userId, updateData);

      if (!user) {
        return res.status(404).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Return updated user (exclude sensitive fields)
      return res.json(sanitizeUser(user));
    } catch (error: unknown) {
      
      // Handle PostgreSQL errors
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === '42P01') {
          return res.status(503).json({ 
            error: 'Database not initialized',
            code: 'DB_NOT_INITIALIZED'
          });
        }
        if (error.code === '23514') {
          return res.status(400).json({ 
            error: 'Invalid data: check business type and number of rooms',
            code: 'INVALID_DATA'
          });
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          return res.status(503).json({ 
            error: 'Database connection failed',
            code: 'DB_CONNECTION_ERROR'
          });
        }
      }
      
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

