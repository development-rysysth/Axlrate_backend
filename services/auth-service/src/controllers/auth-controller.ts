import { Request, Response } from 'express';
import { 
  RegisterRequestBody, 
  LoginRequestBody, 
  RefreshTokenRequestBody,
  AuthenticatedRequest,
  User,
  Hotel
} from '../../../../shared';
import { UserRepository } from '../repositories/user-repository';
import { HotelRepository } from '../repositories/hotel-repository';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../../../shared/utils/jwt';
import { comparePassword } from '../../../../shared/utils/password';
import { validate as validateUUID } from 'uuid';
import { findCompetitors, storeCompetitors } from '../services/competitor-service';

const userRepository = new UserRepository();
const hotelRepository = new HotelRepository();

// Async function to process competitors for a hotel (database-only)
async function processCompetitors(
  hotelId: string,
  hotelClass: number | null,
  city?: string
): Promise<void> {
  try {
    console.log('Processing competitors for hotel:', hotelId);
    
    // Find competitors (database-only)
    const competitorIds = await findCompetitors(
      hotelId,
      hotelClass,
      city
    );

    if (competitorIds.length > 0) {
      // Store competitors
      await storeCompetitors(hotelId, competitorIds);
      console.log(`Stored ${competitorIds.length} competitors for hotel ${hotelId}`);
    } else {
      console.log(`No competitors found for hotel ${hotelId}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Competitor processing error: ${errorMessage}`);
    // Don't throw - this is a background process
  }
}

// Helper function to exclude sensitive fields from user object
const sanitizeUser = (user: User) => {
  const { password, refreshTokens, ...publicUser } = user;
  return publicUser;
};

export class AuthController {
  async register(req: Request<{}, {}, RegisterRequestBody>, res: Response) {
    try {
      console.log('Received frontend user registration request');

      const {
        name,
        businessEmail,
        country,
        state,
        hotelName,
        phoneNumber,
        currentPMS,
        businessType,
        password,
        hotelId,
      } = req.body;

      // Normalize email to lowercase and trim whitespace
      const normalizedEmail = businessEmail?.trim().toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({ 
          error: 'Business email is required',
          code: 'MISSING_EMAIL'
        });
      }

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(409).json({ 
          error: 'User with this business email already exists',
          code: 'USER_EXISTS' 
        });
      }

      // Validate hotelId if provided
      let validatedHotelId: string | undefined = undefined;
      if (hotelId) {
        const hotel = await hotelRepository.findByHotelId(hotelId);
        if (!hotel) {
          return res.status(404).json({ 
            error: 'Hotel not found',
            code: 'HOTEL_NOT_FOUND',
            message: 'The provided hotel ID does not exist in the database'
          });
        }
        validatedHotelId = hotelId;
      }

      // Create user (password will be hashed in repository)
      const user = await userRepository.create({
        name,
        businessEmail: normalizedEmail,
        country,
        state,
        hotelName,
        phoneNumber,
        currentPMS,
        businessType,
        password,
        hotelId: validatedHotelId,
      });

      // Generate tokens
      const tokenPayload = { id: user.id, businessEmail: user.businessEmail };
      const tokens = {
        accessToken: generateAccessToken(tokenPayload),
        refreshToken: generateRefreshToken(tokenPayload),
      };

      // Store refresh token
      await userRepository.addRefreshToken(user.id, tokens.refreshToken);

      // Fetch hotel data if hotelId exists
      let hotel: Hotel | null = null;
      if (validatedHotelId) {
        try {
          hotel = await hotelRepository.findByHotelId(validatedHotelId);
        } catch (error) {
          console.log('Could not fetch hotel data:', error);
          // Continue without hotel data - not critical
        }
      }

      // Process competitors in background (database-only, non-blocking)
      if (validatedHotelId && hotel) {
        processCompetitors(
          validatedHotelId,
          hotel.hotelClass || null,
          hotel.city || undefined
        ).catch((error) => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log(`Competitor processing error: ${errorMessage}`);
        });
      }

      // Return user data with only required fields
      const response: any = {
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.businessEmail,
          name: user.name,
          hotelName: user.hotelName,
          hotelId: user.hotelId || null,
          phoneNumber: user.phoneNumber,
          country: user.country,
          currentPMS: user.currentPMS,
          businessType: user.businessType,
          numberOfRooms: user.numberOfRooms,
          state: user.state || null,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      };

      // Include hotel data if available
      if (hotel) {
        response.hotel = hotel;
      }

      return res.status(201).json(response);
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
      
      // Include error details in development mode
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        ...(isDevelopment && { details: errorMessage })
      });
    }
  }

  async login(req: Request<{}, {}, LoginRequestBody>, res: Response) {
    try {
      const { businessEmail, password } = req.body;

      // Trim email to handle any whitespace issues
      const trimmedEmail = businessEmail?.trim();
      if (!trimmedEmail || !password) {
        return res.status(400).json({ 
          error: 'Email and password are required',
          code: 'MISSING_CREDENTIALS'
        });
      }

      // Find user (password is included in query results)
      const user = await userRepository.findByEmail(trimmedEmail);
      if (!user) {
        console.log(`Login attempt failed: User not found for email: ${trimmedEmail}`);
        return res.status(401).json({ 
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Verify password using shared utility
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        console.log(`Login attempt failed: Invalid password for email: ${trimmedEmail}`);
        return res.status(401).json({ 
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Generate tokens
      const tokenPayload = { id: user.id, businessEmail: user.businessEmail };
      const tokens = {
        accessToken: generateAccessToken(tokenPayload),
        refreshToken: generateRefreshToken(tokenPayload),
      };

      // Store refresh token
      await userRepository.addRefreshToken(user.id, tokens.refreshToken);

      // Return user data (exclude sensitive fields)
      const sanitizedUser = sanitizeUser(user);
      // Ensure hotelId and state are always included in response (even if null/undefined)
      return res.json({
        message: 'Login successful',
        user: {
          ...sanitizedUser,
          hotelId: sanitizedUser.hotelId || null,
          state: sanitizedUser.state || null,
        },
        tokens,
      });
    } catch (error: unknown) {
      // Log the full error for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('Login error:', errorMessage);
      if (errorStack) {
        console.error('Stack trace:', errorStack);
      }
      
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

        // Column does not exist (likely state column missing)
        if (error.code === '42703') {
          console.error('Database column missing. Please run migration 010_add_state_column.sql');
          return res.status(503).json({ 
            error: 'Database schema outdated. Please run database migrations.',
            code: 'DB_SCHEMA_OUTDATED',
            details: 'The state column is missing. Run migration: pnpm run migration:010'
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
      
      const isDevelopment = process.env.NODE_ENV !== 'production';
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        ...(isDevelopment && { details: errorMessage, stack: errorStack })
      });
    }
  }

  async refreshToken(req: Request<{}, {}, RefreshTokenRequestBody>, res: Response) {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

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
      const newAccessToken = generateAccessToken(tokenPayload);

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

  async searchHotels(req: Request, res: Response) {
    try {
      const searchTerm = req.query.q as string;
      const page = parseInt(req.query.page as string, 10) || 1;
      const pageSize = parseInt(req.query.pageSize as string, 10) || 20;
      const city = req.query.city as string | undefined;
      const country = req.query.country as string | undefined;
      const state = req.query.state as string | undefined;

      if (!searchTerm || searchTerm.trim().length === 0) {
        return res.status(400).json({ 
          error: 'Search query parameter (q) is required',
          code: 'MISSING_SEARCH_QUERY'
        });
      }

      // Validate pagination
      if (page < 1) {
        return res.status(400).json({ 
          error: 'Page must be greater than 0',
          code: 'INVALID_PAGE'
        });
      }

      if (pageSize < 1 || pageSize > 100) {
        return res.status(400).json({ 
          error: 'Page size must be between 1 and 100',
          code: 'INVALID_PAGE_SIZE'
        });
      }

      const { hotels, total } = await hotelRepository.searchHotels(
        searchTerm.trim(),
        page,
        pageSize,
        city,
        country,
        state
      );
      const totalPages = Math.ceil(total / pageSize);

      return res.json({
        success: true,
        data: hotels,
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        },
        searchTerm: searchTerm.trim(),
        filters: {
          ...(city && { city }),
          ...(country && { country }),
          ...(state && { state })
        }
      });
    } catch (error: unknown) {
      // Log the error for debugging
      console.error('searchHotels error:', error);
      
      // Handle PostgreSQL errors
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === '42P01') {
          console.error('Table does not exist - hotels table may not be created');
          return res.status(503).json({ 
            error: 'Database not initialized',
            code: 'DB_NOT_INITIALIZED',
            message: 'Hotels table does not exist. Please run database migrations.'
          });
        }
        if (error.code === '42703') {
          console.error('Column does not exist - schema mismatch');
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return res.status(503).json({ 
            error: 'Database schema mismatch',
            code: 'DB_SCHEMA_MISMATCH',
            message: `Column not found: ${errorMessage}. Please update database schema.`
          });
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          console.error('Database connection failed');
          return res.status(503).json({ 
            error: 'Database connection failed',
            code: 'DB_CONNECTION_ERROR',
            message: 'Unable to connect to database. Please check database configuration.'
          });
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('Unexpected error:', errorMessage, errorStack);
      
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: errorMessage,
        ...(process.env.NODE_ENV !== 'production' && { stack: errorStack })
      });
    }
  }

  async getHotelsByCity(req: Request, res: Response) {
    try {
      const city = req.query.city as string;
      const page = parseInt(req.query.page as string, 10) || 1;
      const pageSize = parseInt(req.query.pageSize as string, 10) || 20;

      if (!city) {
        return res.status(400).json({ 
          error: 'City parameter is required',
          code: 'MISSING_CITY'
        });
      }

      // Validate pagination
      if (page < 1) {
        return res.status(400).json({ 
          error: 'Page must be greater than 0',
          code: 'INVALID_PAGE'
        });
      }

      if (pageSize < 1 || pageSize > 100) {
        return res.status(400).json({ 
          error: 'Page size must be between 1 and 100',
          code: 'INVALID_PAGE_SIZE'
        });
      }

      const { hotels, total } = await hotelRepository.findByCity(city, page, pageSize);
      const totalPages = Math.ceil(total / pageSize);

      return res.json({
        success: true,
        data: hotels,
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        }
      });
    } catch (error: unknown) {
      // Log the error for debugging
      console.error('getHotelsByCity error:', error);
      
      // Handle PostgreSQL errors
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === '42P01') {
          console.error('Table does not exist - hotels table may not be created');
          return res.status(503).json({ 
            error: 'Database not initialized',
            code: 'DB_NOT_INITIALIZED',
            message: 'Hotels table does not exist. Please run database migrations.'
          });
        }
        if (error.code === '42703') {
          console.error('Column does not exist - schema mismatch');
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return res.status(503).json({ 
            error: 'Database schema mismatch',
            code: 'DB_SCHEMA_MISMATCH',
            message: `Column not found: ${errorMessage}. Please update database schema.`
          });
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          console.error('Database connection failed');
          return res.status(503).json({ 
            error: 'Database connection failed',
            code: 'DB_CONNECTION_ERROR',
            message: 'Unable to connect to database. Please check database configuration.'
          });
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('Unexpected error:', errorMessage, errorStack);
      
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: errorMessage,
        ...(process.env.NODE_ENV !== 'production' && { stack: errorStack })
      });
    }
  }

  async getUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      // Validate UUID format
      if (!validateUUID(id)) {
        return res.status(400).json({ 
          error: 'Invalid user ID format',
          code: 'INVALID_ID'
        });
      }

      // Find user by ID
      const user = await userRepository.findById(id);
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

      // Validate UUID format
      if (!validateUUID(id)) {
        return res.status(400).json({ 
          error: 'Invalid user ID format',
          code: 'INVALID_ID'
        });
      }

      const updateData = req.body;

      // Remove password from update data if present (password updates should be separate)
      delete updateData.password;
      delete updateData.refreshTokens;
      delete updateData.id; // Don't allow ID updates

      // Find and update user
      const user = await userRepository.updateById(id, updateData);

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

  async getSuggestedCompetitors(req: AuthenticatedRequest, res: Response) {
    try {
      const { hotelId } = req.params;

      if (!hotelId) {
        return res.status(400).json({ 
          error: 'Hotel ID is required',
          code: 'MISSING_HOTEL_ID'
        });
      }

      // Get authenticated user
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      // Fetch user to get their hotelId
      const user = await userRepository.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Validate that the user has access to this hotel
      if (!user.hotelId || user.hotelId !== hotelId) {
        return res.status(403).json({ 
          error: 'Access denied: You can only view suggested competitors for your own hotel',
          code: 'ACCESS_DENIED'
        });
      }

      // Fetch hotel with suggested_competitors
      const hotel = await hotelRepository.findByHotelId(hotelId);
      if (!hotel) {
        return res.status(404).json({ 
          error: 'Hotel not found',
          code: 'HOTEL_NOT_FOUND'
        });
      }

      // Get suggested competitor IDs
      const suggestedCompetitorIds = hotel.suggestedCompetitors || [];

      if (suggestedCompetitorIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          count: 0
        });
      }

      // Fetch full hotel details for each competitor
      const competitors: Hotel[] = [];
      for (const competitorId of suggestedCompetitorIds) {
        try {
          const competitor = await hotelRepository.findByHotelId(competitorId);
          if (competitor) {
            competitors.push(competitor);
          }
        } catch (error) {
          // Log error but continue with other competitors
          console.log(`Failed to fetch competitor ${competitorId}:`, error);
        }
      }

      return res.json({
        success: true,
        data: competitors,
        count: competitors.length
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
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: errorMessage
      });
    }
  }

  async getCompetitors(req: AuthenticatedRequest, res: Response) {
    try {
      const { hotelId } = req.params;
      const { type } = req.query;

      if (!hotelId) {
        return res.status(400).json({ 
          error: 'Hotel ID is required',
          code: 'MISSING_HOTEL_ID'
        });
      }

      // Get authenticated user
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      // Fetch user to get their hotelId
      const user = await userRepository.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Validate that the user has access to this hotel
      if (!user.hotelId || user.hotelId !== hotelId) {
        return res.status(403).json({ 
          error: 'Access denied: You can only view competitors for your own hotel',
          code: 'ACCESS_DENIED'
        });
      }

      // Fetch hotel
      const hotel = await hotelRepository.findByHotelId(hotelId);
      if (!hotel) {
        return res.status(404).json({ 
          error: 'Hotel not found',
          code: 'HOTEL_NOT_FOUND'
        });
      }

      // Get competitors
      let competitors = hotel.competitors || [];

      // Filter by type if specified
      if (type === 'primary' || type === 'secondary') {
        competitors = competitors.filter(c => c.type === type);
      }

      // Fetch full hotel details for each competitor
      const competitorDetails: Hotel[] = [];
      for (const competitor of competitors) {
        try {
          const competitorHotel = await hotelRepository.findByHotelId(competitor.hotelId);
          if (competitorHotel) {
            competitorDetails.push(competitorHotel);
          }
        } catch (error) {
          console.log(`Failed to fetch competitor ${competitor.hotelId}:`, error);
        }
      }

      // Return grouped by type if no filter
      if (!type) {
        const primary = competitors.filter(c => c.type === 'primary').map(c => c.hotelId);
        const secondary = competitors.filter(c => c.type === 'secondary').map(c => c.hotelId);
        
        return res.json({
          success: true,
          data: {
            primary: competitorDetails.filter(h => primary.includes(h.hotelId)),
            secondary: competitorDetails.filter(h => secondary.includes(h.hotelId))
          },
          count: competitorDetails.length
        });
      }

      return res.json({
        success: true,
        data: competitorDetails,
        count: competitorDetails.length
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: errorMessage
      });
    }
  }

  async addCompetitor(req: AuthenticatedRequest, res: Response) {
    try {
      const { hotelId } = req.params;
      const { 
        // New format (recommended)
        name,
        latitude,
        longitude,
        address,
        phone,
        hotelClass,
        serpApiData,
        type,
        // Backward compatibility (old format)
        competitorId
      } = req.body;

      if (!hotelId) {
        return res.status(400).json({ 
          error: 'Hotel ID is required',
          code: 'MISSING_HOTEL_ID'
        });
      }

      if (!type || (type !== 'primary' && type !== 'secondary')) {
        return res.status(400).json({ 
          error: 'Type must be "primary" or "secondary"',
          code: 'INVALID_TYPE'
        });
      }

      // Get authenticated user
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      // Fetch user to get their hotelId
      const user = await userRepository.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Validate that the user has access to this hotel
      if (!user.hotelId || user.hotelId !== hotelId) {
        return res.status(403).json({ 
          error: 'Access denied: You can only manage competitors for your own hotel',
          code: 'ACCESS_DENIED'
        });
      }

      // Verify hotel exists
      const hotel = await hotelRepository.findByHotelId(hotelId);
      if (!hotel) {
        return res.status(404).json({ 
          error: 'Hotel not found',
          code: 'HOTEL_NOT_FOUND'
        });
      }

      // Determine which format is being used and get competitor hotel ID
      let finalCompetitorId: string;

      // Check if using new format (name + coordinates)
      if (name && latitude !== undefined && longitude !== undefined) {
        // Validate GPS coordinates
        if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
            isNaN(latitude) || isNaN(longitude)) {
          return res.status(400).json({ 
            error: 'Invalid GPS coordinates: latitude and longitude must be valid numbers',
            code: 'INVALID_COORDINATES'
          });
        }

        // Generate hotel ID from name and coordinates
        const generatedHotelId = hotelRepository.generateHotelId(name, latitude, longitude);

        // Check if competitor hotel already exists
        let competitorHotel = await hotelRepository.findByHotelId(generatedHotelId);

        if (!competitorHotel) {
          // Create new hotel for competitor (following same flow as onboarding)
          try {
            competitorHotel = await hotelRepository.create({
              name,
              gpsLatitude: latitude,
              gpsLongitude: longitude,
              address,
              phone,
              hotelClass,
              serpApiData,
              existingHotelId: generatedHotelId,
            });
            console.log('Created new competitor hotel:', generatedHotelId);
          } catch (hotelError: unknown) {
            // Handle unique constraint violation (race condition)
            if (hotelError && typeof hotelError === 'object' && 'code' in hotelError && hotelError.code === '23505') {
              // Hotel was created by another request, try to find it by ID
              const foundHotel = await hotelRepository.findByHotelId(generatedHotelId);
              if (foundHotel) {
                competitorHotel = foundHotel;
              } else {
                return res.status(500).json({
                  error: 'Failed to create competitor hotel',
                  message: 'Hotel creation failed due to a database constraint violation. Please try again.',
                  code: 'HOTEL_CREATION_FAILED'
                });
              }
            } else {
              const errorMessage = hotelError instanceof Error ? hotelError.message : 'Unknown error occurred';
              return res.status(500).json({
                error: 'Failed to create competitor hotel',
                message: `Hotel creation failed: ${errorMessage}. Please check the hotel data and try again.`,
                code: 'HOTEL_CREATION_FAILED'
              });
            }
          }
        }

        finalCompetitorId = competitorHotel.hotelId;
      } 
      // Backward compatibility: use old format (competitorId)
      else if (competitorId) {
        // Verify competitor hotel exists
        let competitorHotel = await hotelRepository.findByHotelId(competitorId);
        
        if (!competitorHotel) {
          // Hotel not found - try to register it if we have the required information
          if (name && latitude !== undefined && longitude !== undefined) {
            // Validate GPS coordinates
            if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
                isNaN(latitude) || isNaN(longitude)) {
              return res.status(400).json({ 
                error: 'Invalid GPS coordinates: latitude and longitude must be valid numbers',
                code: 'INVALID_COORDINATES'
              });
            }

            // Generate hotel ID from name and coordinates
            const generatedHotelId = hotelRepository.generateHotelId(name, latitude, longitude);

            // Verify the generated ID matches the provided competitorId
            if (generatedHotelId !== competitorId) {
              return res.status(400).json({ 
                error: 'Competitor ID does not match provided hotel information. Please verify name, latitude, and longitude.',
                code: 'ID_MISMATCH'
              });
            }

            // Create new hotel for competitor (following same flow as onboarding)
            try {
              competitorHotel = await hotelRepository.create({
                name,
                gpsLatitude: latitude,
                gpsLongitude: longitude,
                address,
                phone,
                hotelClass,
                serpApiData,
                existingHotelId: competitorId,
              });
              console.log('Created new competitor hotel:', competitorId);
            } catch (hotelError: unknown) {
              // Handle unique constraint violation (race condition)
              if (hotelError && typeof hotelError === 'object' && 'code' in hotelError && hotelError.code === '23505') {
                // Hotel was created by another request, try to find it by ID
                const foundHotel = await hotelRepository.findByHotelId(competitorId);
                if (foundHotel) {
                  competitorHotel = foundHotel;
                } else {
                  return res.status(500).json({
                    error: 'Failed to create competitor hotel',
                    message: 'Hotel creation failed due to a database constraint violation. Please try again.',
                    code: 'HOTEL_CREATION_FAILED'
                  });
                }
              } else {
                const errorMessage = hotelError instanceof Error ? hotelError.message : 'Unknown error occurred';
                return res.status(500).json({
                  error: 'Failed to create competitor hotel',
                  message: `Hotel creation failed: ${errorMessage}. Please check the hotel data and try again.`,
                  code: 'HOTEL_CREATION_FAILED'
                });
              }
            }
          } else {
            // Hotel not found and missing required information to register
            return res.status(404).json({ 
              error: 'Competitor hotel not found. Please provide name, latitude, and longitude to register the hotel.',
              code: 'COMPETITOR_NOT_FOUND',
              requiredFields: ['name', 'latitude', 'longitude']
            });
          }
        }
        
        finalCompetitorId = competitorHotel.hotelId;
      } 
      // Neither format provided
      else {
        return res.status(400).json({ 
          error: 'Either competitor information (name, latitude, longitude) or competitorId is required',
          code: 'MISSING_COMPETITOR_DATA'
        });
      }

      // Add competitor relationship
      await hotelRepository.addCompetitor(hotelId, finalCompetitorId, type);

      // Fetch updated competitors
      const updatedCompetitors = await hotelRepository.getCompetitors(hotelId);

      return res.json({
        success: true,
        message: 'Competitor added successfully',
        data: updatedCompetitors
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          return res.status(409).json({ 
            error: error.message,
            code: 'COMPETITOR_EXISTS'
          });
        }
        if (error.message.includes('Maximum')) {
          return res.status(400).json({ 
            error: error.message,
            code: 'LIMIT_EXCEEDED'
          });
        }
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: errorMessage
      });
    }
  }

  async removeCompetitor(req: AuthenticatedRequest, res: Response) {
    try {
      const { hotelId, competitorId } = req.params;

      if (!hotelId) {
        return res.status(400).json({ 
          error: 'Hotel ID is required',
          code: 'MISSING_HOTEL_ID'
        });
      }

      if (!competitorId) {
        return res.status(400).json({ 
          error: 'Competitor ID is required',
          code: 'MISSING_COMPETITOR_ID'
        });
      }

      // Get authenticated user
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      // Fetch user to get their hotelId
      const user = await userRepository.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Validate that the user has access to this hotel
      if (!user.hotelId || user.hotelId !== hotelId) {
        return res.status(403).json({ 
          error: 'Access denied: You can only manage competitors for your own hotel',
          code: 'ACCESS_DENIED'
        });
      }

      // Remove competitor
      await hotelRepository.removeCompetitor(hotelId, competitorId);

      return res.json({
        success: true,
        message: 'Competitor removed successfully'
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ 
          error: error.message,
          code: 'COMPETITOR_NOT_FOUND'
        });
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: errorMessage
      });
    }
  }

  async updateCompetitorType(req: AuthenticatedRequest, res: Response) {
    try {
      const { hotelId, competitorId } = req.params;
      const { type } = req.body;

      if (!hotelId) {
        return res.status(400).json({ 
          error: 'Hotel ID is required',
          code: 'MISSING_HOTEL_ID'
        });
      }

      if (!competitorId) {
        return res.status(400).json({ 
          error: 'Competitor ID is required',
          code: 'MISSING_COMPETITOR_ID'
        });
      }

      if (!type || (type !== 'primary' && type !== 'secondary')) {
        return res.status(400).json({ 
          error: 'Type must be "primary" or "secondary"',
          code: 'INVALID_TYPE'
        });
      }

      // Get authenticated user
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      // Fetch user to get their hotelId
      const user = await userRepository.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Validate that the user has access to this hotel
      if (!user.hotelId || user.hotelId !== hotelId) {
        return res.status(403).json({ 
          error: 'Access denied: You can only manage competitors for your own hotel',
          code: 'ACCESS_DENIED'
        });
      }

      // Update competitor type
      await hotelRepository.updateCompetitorType(hotelId, competitorId, type);

      // Fetch updated competitors
      const updatedCompetitors = await hotelRepository.getCompetitors(hotelId);

      return res.json({
        success: true,
        message: 'Competitor type updated successfully',
        data: updatedCompetitors
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ 
            error: error.message,
            code: 'COMPETITOR_NOT_FOUND'
          });
        }
        if (error.message.includes('Maximum')) {
          return res.status(400).json({ 
            error: error.message,
            code: 'LIMIT_EXCEEDED'
          });
        }
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: errorMessage
      });
    }
  }
}

