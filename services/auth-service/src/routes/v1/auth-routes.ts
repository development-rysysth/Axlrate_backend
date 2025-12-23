import { Router } from 'express';
import { 
  validateRegister, 
  validateLogin, 
  validateRefreshToken,
  authenticateToken 
} from '../../../../../shared';
import { AuthController } from '../../controllers/auth-controller';

const router = Router();
const authController = new AuthController();

// Auth routes
router.post('/register', validateRegister, (req, res) => authController.register(req, res));
router.post('/login', validateLogin, (req, res) => authController.login(req, res));
router.post('/refresh', validateRefreshToken, (req, res) => authController.refreshToken(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));

// Public hotel routes (for registration flow)
router.get('/hotels', (req, res) => authController.getHotelsByCity(req, res));
router.get('/hotels/search', (req, res) => authController.searchHotels(req, res));

// User routes
router.get('/users/:id', authenticateToken, (req, res) => authController.getUser(req, res));
router.put('/users/:id', authenticateToken, (req, res) => authController.updateUser(req, res));

// Hotel routes
router.get('/hotels/:hotelId/suggested-competitors', authenticateToken, (req, res) => authController.getSuggestedCompetitors(req, res));

// Competitor management routes
router.get('/hotels/:hotelId/competitors', authenticateToken, (req, res) => authController.getCompetitors(req, res));
router.post('/hotels/:hotelId/competitors', authenticateToken, (req, res) => authController.addCompetitor(req, res));
router.delete('/hotels/:hotelId/competitors/:competitorId', authenticateToken, (req, res) => authController.removeCompetitor(req, res));
router.patch('/hotels/:hotelId/competitors/:competitorId', authenticateToken, (req, res) => authController.updateCompetitorType(req, res));

export default router;

