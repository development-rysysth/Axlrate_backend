import { Router } from 'express';
import { InsightController } from '../../controllers/insight-controller';

const router = Router();
const insightController = new InsightController();

// Get all filter options
router.get('/filters', (req, res) => insightController.getFilterOptions(req, res));

export default router;

