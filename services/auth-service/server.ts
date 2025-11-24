import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from './config/database';
import User from './models/User';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  validateRegister,
  validateLogin,
  validateRefreshToken,
  authenticateToken,
  RegisterRequestBody,
  LoginRequestBody,
  RefreshTokenRequestBody,
  AuthenticatedRequest
} from '../../shared';

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Register endpoint
 * POST /auth/register
 */
app.post('/auth/register', validateRegister, async (req: Request<{}, {}, RegisterRequestBody>, res: Response) => {
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

    console.log('Register request body:', req.body);

    // Check if user already exists
    const existingUser = await User.findOne({ businessEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this business email already exists' });
    }

    // Create user (password will be hashed automatically by the pre-save hook)
    const user = await User.create({
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
    const tokenPayload = { id: user._id.toString(), businessEmail: user.businessEmail };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token in user document
    user.refreshTokens.push(refreshToken);
    await user.save();

    // Return user data (password is automatically excluded by toJSON method)
    return res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error: unknown) {
    console.error('Register error:', error);
    
    // Handle MongoDB duplicate key error
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return res.status(409).json({ error: 'User with this business email already exists' });
    }
    
    // Handle validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError' && 'errors' in error) {
      const validationError = error as { errors: Record<string, { message: string }> };
      const errors = Object.values(validationError.errors).map(err => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Login endpoint
 * POST /auth/login
 */
app.post('/auth/login', validateLogin, async (req: Request<{}, {}, LoginRequestBody>, res: Response) => {
  try {
    const { businessEmail, password } = req.body;

    // Find user and include password field
    const user = await User.findOne({ businessEmail }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password using the model method
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const tokenPayload = { id: user._id.toString(), businessEmail: user.businessEmail };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token in user document
    user.refreshTokens.push(refreshToken);
    await user.save();

    // Return user data (password is automatically excluded by toJSON method)
    return res.json({
      message: 'Login successful',
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Refresh token endpoint
 * POST /auth/refresh
 */
app.post('/auth/refresh', validateRefreshToken, async (req: Request<{}, {}, RefreshTokenRequestBody>, res: Response) => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user and check if refresh token exists in their tokens array
    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    // Generate new access token
    const tokenPayload = { id: user._id.toString(), businessEmail: user.businessEmail };
    const newAccessToken = generateAccessToken(tokenPayload);

    return res.json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Invalid refresh token';
    return res.status(403).json({ error: errorMessage });
  }
});

/**
 * Logout endpoint
 * POST /auth/logout
 */
app.post('/auth/logout', async (req: Request<{}, {}, RefreshTokenRequestBody>, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Find user with this refresh token and remove it
    const user = await User.findOne({ refreshTokens: refreshToken });
    if (user) {
      user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
      await user.save();
    }

    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user profile
 * GET /users/:id
 */
app.get('/users/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Find user by ID
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user (password is automatically excluded by toJSON method)
    return res.json(user.toJSON());
  } catch (error: unknown) {
    console.error('Get user error:', error);
    
    // Handle invalid MongoDB ObjectId
    if (error && typeof error === 'object' && 'name' in error && error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update user profile
 * PUT /users/:id
 */
app.put('/users/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove password from update data if present (password updates should be separate)
    delete updateData.password;
    delete updateData.refreshTokens;

    // Find and update user
    const user = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return updated user (password is automatically excluded by toJSON method)
    return res.json(user.toJSON());
  } catch (error: unknown) {
    console.error('Update user error:', error);
    
    // Handle invalid MongoDB ObjectId
    if (error && typeof error === 'object' && 'name' in error && error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Handle validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError' && 'errors' in error) {
      const validationError = error as { errors: Record<string, { message: string }> };
      const errors = Object.values(validationError.errors).map(err => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  return res.json({ status: 'ok', service: 'auth-service' });
});

app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});

export default app;

