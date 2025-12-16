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
import { JwtService } from '../services/jwt-service';
import { comparePassword } from '../../../../shared/utils/password';
import { fetchHotelRates, searchHotelWithLocation } from '../../../serpapi-service/src/collectors/serpapi-collector';
import { transformSerpApiResponse } from '../../../serpapi-service/src/transformers/serpapi-transformer';
import { formatHotelQuery, formatDate } from '../../../serpapi-service/src/utils/formatters';
import { mapSerpApiToHotel } from '../../../serpapi-service/src/utils/hotel-mapper';
import { validate as validateUUID } from 'uuid';
import { findCompetitors, storeCompetitors } from '../services/competitor-service';

const userRepository = new UserRepository();
const hotelRepository = new HotelRepository();

/**
 * Recursively serialize Date objects to ISO strings for JSONB storage
 */
function serializeDates(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => serializeDates(item));
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeDates(obj[key]);
      }
    }
    return serialized;
  }
  
  return obj;
}

// Async function to process competitors for a hotel
async function processCompetitors(
  hotelId: string,
  hotelRating: number | null,
  city?: string,
  state?: string,
  countryCode?: string
): Promise<void> {
  try {
    console.log('Processing competitors for hotel:', hotelId);
    
    // Find competitors
    const competitorIds = await findCompetitors(
      hotelId,
      hotelRating,
      city,
      state,
      countryCode
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

// Async function to search hotel via SERP API and update hotel record
async function searchAndUpdateHotelDetails(hotelName: string, hotelId?: string, countryCode?: string, stateName?: string): Promise<void> {
  try {
    console.log('Now getting more details');
    
    // Use default dates (today + 7 days)
    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + 1);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + 7);

    const formattedCheckIn = formatDate(checkInDate.toISOString().split('T')[0]);
    const formattedCheckOut = formatDate(checkOutDate.toISOString().split('T')[0]);

    let ratesData: any;
    let hotelQuery: string;

    // Use searchHotelWithLocation if we have country and state, otherwise use fetchHotelRates
    if (countryCode && stateName) {
      ratesData = await searchHotelWithLocation({
        hotelName,
        countryCode,
        stateName,
        checkInDate: formattedCheckIn,
        checkOutDate: formattedCheckOut,
        hl: 'en',
        currency: 'USD',
        adults: 2,
      });
      hotelQuery = `${hotelName} ${stateName}`;
    } else {
      hotelQuery = formatHotelQuery(hotelName);
      ratesData = await fetchHotelRates({
        hotelQuery,
        checkInDate: formattedCheckIn,
        checkOutDate: formattedCheckOut,
        gl: countryCode?.toLowerCase() || 'us',
        hl: 'en',
        currency: 'USD',
        adults: 2,
      });
    }

    // Transform response
    const transformedData = transformSerpApiResponse(ratesData, {
      hotelQuery,
      checkInDate: formattedCheckIn,
      checkOutDate: formattedCheckOut,
      gl: countryCode?.toLowerCase() || 'us',
      hl: 'en',
      currency: 'USD',
      adults: 2,
    });

    // Ensure all Date objects are serialized before storing in JSONB fields
    const serializedData = serializeDates(transformedData);

    // Extract raw property data for hotel mapping (use raw property to preserve phone and address)
    const rawProperty = (ratesData as any)?.properties?.[0] || ratesData;
    
    // Update hotel record with SERP API data if available and hotelId exists
    if (serializedData.name && hotelId) {
      // Update hotel in database using hotel repository create method with existingHotelId
      // The create method uses ON CONFLICT UPDATE, so this will update the existing hotel
      // Use raw property data to ensure phone and address are preserved correctly
      await hotelRepository.create({
        name: serializedData.name || '',
        serpApiData: rawProperty, // Use raw property instead of transformed data to preserve phone/address
        existingHotelId: hotelId,
      });
      console.log('Hotel record updated with SERP API data');
    } else if (serializedData.name && !hotelId) {
      console.log('SERP API data saved, but hotel record not updated (no hotelId available)');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Background SERP API search failed: ${errorMessage}`);
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
        selectedHotel,
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

      // Handle hotel registration/mapping
      let hotelId: string | undefined = undefined;
      
      if (selectedHotel && selectedHotel.gps_coordinates) {
        console.log('Searching hotel');
        
        const { 
          name: hotelNameFromSelection, 
          gps_coordinates,
          hotel_class
        } = selectedHotel;
        const { latitude, longitude } = gps_coordinates;

        // Validate coordinates are valid numbers
        if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
            isNaN(latitude) || isNaN(longitude)) {
          return res.status(400).json({ 
            error: 'Invalid GPS coordinates: latitude and longitude must be valid numbers',
            code: 'INVALID_COORDINATES'
          });
        }

        // Generate hotel ID first (deterministic based on name + coordinates)
        const generatedHotelId = hotelRepository.generateHotelId(
          hotelNameFromSelection,
          latitude,
          longitude
        );

        // Check if hotel with this ID already exists
        try {
          const existingHotel = await hotelRepository.findByHotelId(generatedHotelId);

          if (existingHotel) {
            hotelId = existingHotel.hotelId;
            console.log('Hotel found');
          } else {
            console.log('Hotel not found');
            // Create new hotel with static values only (not using serpApiData)
            try {
              const newHotel = await hotelRepository.create({
                name: hotelNameFromSelection,
                gpsLatitude: latitude,
                gpsLongitude: longitude,
                hotelClass: hotel_class,
              });
              hotelId = newHotel.hotelId;
              console.log('Register hotel');
            } catch (hotelError: unknown) {
              // Handle unique constraint violation (race condition)
              if (hotelError && typeof hotelError === 'object' && 'code' in hotelError && hotelError.code === '23505') {
                // Hotel was created by another request, try to find it by ID
                const foundHotel = await hotelRepository.findByHotelId(generatedHotelId);
                if (foundHotel) {
                  hotelId = foundHotel.hotelId;
                } else {
                  return res.status(500).json({
                    error: 'Failed to register hotel',
                    message: 'Hotel registration failed due to a database constraint violation. Please try again.',
                    code: 'HOTEL_REGISTRATION_FAILED'
                  });
                }
              } else {
                const errorMessage = hotelError instanceof Error ? hotelError.message : 'Unknown error occurred';
                return res.status(500).json({
                  error: 'Failed to register hotel',
                  message: `Hotel registration failed: ${errorMessage}. Please check the hotel data and try again.`,
                  code: 'HOTEL_REGISTRATION_FAILED'
                });
              }
            }
          }
        } catch (hotelError: unknown) {
          const errorMessage = hotelError instanceof Error ? hotelError.message : 'Unknown error occurred';
          return res.status(500).json({
            error: 'Failed to register hotel',
            message: `Hotel registration failed: ${errorMessage}. Please check the hotel data and try again.`,
            code: 'HOTEL_REGISTRATION_FAILED'
          });
        }
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
        hotelId,
      });

      // Generate tokens
      const tokenPayload = { id: user.id, businessEmail: user.businessEmail };
      const tokens = JwtService.generateTokens(tokenPayload);

      // Store refresh token
      await userRepository.addRefreshToken(user.id, tokens.refreshToken);

      // Fetch hotel data if hotelId exists
      let hotel: Hotel | null = null;
      if (hotelId) {
        try {
          hotel = await hotelRepository.findByHotelId(hotelId);
        } catch (error) {
          console.log('Could not fetch hotel data:', error);
          // Continue without hotel data - not critical
        }
      }

      // Fire off parallel async SERP API search after user registration (don't wait for it)
      // This runs whether hotel was found or not, as long as selectedHotel exists
      if (selectedHotel) {
        const { name: hotelNameFromSelection } = selectedHotel;
        searchAndUpdateHotelDetails(hotelNameFromSelection, hotelId, country, req.body.state)
          .then(() => {
            // After SERP API search completes, process competitors
            if (hotelId) {
              // Get hotel data to extract city/state/rating
              hotelRepository.findByHotelId(hotelId)
                .then((hotelData) => {
                  if (hotelData) {
                    processCompetitors(
                      hotelId,
                      hotelData.overallRating || null,
                      hotelData.city || undefined,
                      req.body.state,
                      country
                    ).catch((error) => {
                      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                      console.log(`Competitor processing error: ${errorMessage}`);
                    });
                  }
                })
                .catch((error) => {
                  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                  console.log(`Failed to fetch hotel for competitor processing: ${errorMessage}`);
                });
            }
          })
          .catch((error) => {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.log(`Background SERP API search error: ${errorMessage}`);
          });
      }

      // Return user data (exclude sensitive fields)
      const response: any = {
        message: 'User registered successfully',
        user: sanitizeUser(user),
        tokens,
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
      const tokens = JwtService.generateTokens(tokenPayload);

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
}

