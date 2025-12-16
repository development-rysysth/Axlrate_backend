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

// User routes
router.get('/users/:id', authenticateToken, (req, res) => authController.getUser(req, res));
router.put('/users/:id', authenticateToken, (req, res) => authController.updateUser(req, res));

// Hotel routes
router.get('/hotels/:hotelId/suggested-competitors', authenticateToken, (req, res) => authController.getSuggestedCompetitors(req, res));

export default router;

