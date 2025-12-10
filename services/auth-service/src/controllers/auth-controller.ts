import { Request, Response } from 'express';
import { 
  RegisterRequestBody, 
  LoginRequestBody, 
  RefreshTokenRequestBody,
  AuthenticatedRequest,
  User
} from '../../../../shared';
import { UserRepository } from '../repositories/user-repository';
import { HotelRepository } from '../repositories/hotel-repository';
import { JwtService } from '../services/jwt-service';
import { comparePassword } from '../../../../shared/utils/password';
import { fetchHotelRates, searchHotelWithLocation } from '../../../serpapi-service/src/collectors/serpapi-collector';
import { transformSerpApiResponse } from '../../../serpapi-service/src/transformers/serpapi-transformer';
import { SerpDataRepository } from '../../../serpapi-service/src/repositories/serpdata-repository';
import { formatHotelQuery, formatDate } from '../../../serpapi-service/src/utils/formatters';
import { mapSerpApiToHotel } from '../../../serpapi-service/src/utils/hotel-mapper';

const userRepository = new UserRepository();
const hotelRepository = new HotelRepository();
const serpDataRepository = new SerpDataRepository();

// Helper function to create date range for database queries
function createDateRange(checkInDate: string, checkOutDate: string) {
  const checkInDateObj = new Date(checkInDate);
  const checkOutDateObj = new Date(checkOutDate);
  
  const checkInStart = new Date(checkInDateObj);
  checkInStart.setHours(0, 0, 0, 0);
  
  const checkInEnd = new Date(checkInDateObj);
  checkInEnd.setHours(23, 59, 59, 999);
  
  const checkOutStart = new Date(checkOutDateObj);
  checkOutStart.setHours(0, 0, 0, 0);
  
  const checkOutEnd = new Date(checkOutDateObj);
  checkOutEnd.setHours(23, 59, 59, 999);
  
  return { checkInStart, checkInEnd, checkOutStart, checkOutEnd };
}

// Helper function to build query for finding existing SerpData
function buildSerpDataQuery(
  transformedData: any,
  checkInStart: Date,
  checkInEnd: Date,
  checkOutStart: Date,
  checkOutEnd: Date,
  adultsCount: number
) {
  return {
    $or: [
      { property_token: transformedData.property_token },
      { name: transformedData.name },
    ],
    'search_parameters.check_in_date': {
      $gte: checkInStart,
      $lte: checkInEnd,
    },
    'search_parameters.check_out_date': {
      $gte: checkOutStart,
      $lte: checkOutEnd,
    },
    'search_parameters.adults': adultsCount,
  };
}

// Helper function to save SerpData to database
async function saveSerpDataToDatabase(
  transformedData: any,
  checkInDate: string,
  checkOutDate: string,
  adultsCount: number
): Promise<void> {
  try {
    const { checkInStart, checkInEnd, checkOutStart, checkOutEnd } = createDateRange(checkInDate, checkOutDate);
    const query = buildSerpDataQuery(transformedData, checkInStart, checkInEnd, checkOutStart, checkOutEnd, adultsCount);
    
    const existingData = await serpDataRepository.findOne(query);

    if (existingData) {
      await serpDataRepository.findAndUpdate(query, transformedData);
      console.log('SERP API data updated in database');
    } else {
      await serpDataRepository.create(transformedData);
      console.log('SERP API data saved to database');
    }
  } catch (dbError: unknown) {
    const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error';
    console.log(`Failed to save SERP API data: ${errorMessage}`);
  }
}

// Async function to search hotel via SERP API and update hotel record
async function searchAndUpdateHotelDetails(hotelName: string, hotelId: string, countryCode?: string, stateName?: string): Promise<void> {
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

    // Save to serpdata table
    await saveSerpDataToDatabase(transformedData, formattedCheckIn, formattedCheckOut, 2);

    // Update hotel record with SERP API data if available
    if (transformedData.name) {
      // Update hotel in database using hotel repository create method with existingHotelId
      // The create method uses ON CONFLICT UPDATE, so this will update the existing hotel
      await hotelRepository.create({
        name: transformedData.name || '',
        serpApiData: transformedData,
        existingHotelId: hotelId,
      });
      console.log('Hotel record updated with SERP API data');
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
        hotelName,
        phoneNumber,
        currentPMS,
        businessType,
        password,
        selectedHotel,
      } = req.body;

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(businessEmail);
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
        businessEmail,
        country,
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

      // Fire off parallel async SERP API search (don't wait for it)
      if (hotelId && selectedHotel) {
        const { name: hotelNameFromSelection } = selectedHotel;
        searchAndUpdateHotelDetails(hotelNameFromSelection, hotelId, country, req.body.state).catch((error) => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log(`Background SERP API search error: ${errorMessage}`);
        });
      }

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

