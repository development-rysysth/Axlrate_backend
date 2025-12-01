import { Request, Response } from 'express';
import { 
  RegisterRequestBody, 
  LoginRequestBody, 
  RefreshTokenRequestBody,
  AuthenticatedRequest 
} from '../../../../shared';
import { UserRepository } from '../repositories/user-repository';
import { JwtService } from '../services/jwt-service';

const userRepository = new UserRepository();

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

      console.log('Register request body:', req.body);

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(businessEmail);
      if (existingUser) {
        return res.status(409).json({ error: 'User with this business email already exists' });
      }

      // Create user (password will be hashed automatically by the pre-save hook)
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
      const tokenPayload = { id: user._id.toString(), businessEmail: user.businessEmail };
      const tokens = JwtService.generateTokens(tokenPayload);

      // Store refresh token
      await userRepository.addRefreshToken(user._id.toString(), tokens.refreshToken);

      // Return user data (password is automatically excluded by toJSON method)
      return res.status(201).json({
        message: 'User registered successfully',
        user: user.toJSON(),
        tokens,
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
  }

  async login(req: Request<{}, {}, LoginRequestBody>, res: Response) {
    try {
      const { businessEmail, password } = req.body;

      // Find user and include password field
      const User = (await import('../../models/User')).default;
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
      const tokens = JwtService.generateTokens(tokenPayload);

      // Store refresh token
      await userRepository.addRefreshToken(user._id.toString(), tokens.refreshToken);

      // Return user data (password is automatically excluded by toJSON method)
      return res.json({
        message: 'Login successful',
        user: user.toJSON(),
        tokens,
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error' });
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
        return res.status(403).json({ error: 'Invalid refresh token' });
      }

      // Generate new access token
      const tokenPayload = { id: user._id.toString(), businessEmail: user.businessEmail };
      const newAccessToken = JwtService.generateAccessToken(tokenPayload);

      return res.json({
        accessToken: newAccessToken,
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Invalid refresh token';
      return res.status(403).json({ error: errorMessage });
    }
  }

  async logout(req: Request<{}, {}, RefreshTokenRequestBody>, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      // Remove refresh token
      await userRepository.removeRefreshToken(refreshToken);

      return res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      // Find user by ID
      const user = await userRepository.findById(id);
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
  }

  async updateUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove password from update data if present (password updates should be separate)
      delete updateData.password;
      delete updateData.refreshTokens;

      // Find and update user
      const user = await userRepository.updateById(id, updateData);

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
  }
}

