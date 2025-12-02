import { Router } from 'express';
import insightRoutes from './insight-routes';
import calendarRoutes from './calendar-routes';

const router = Router();

// Insights routes (filters)
router.use('/insights', insightRoutes);

// Calendar data routes
router.use('/calendar-data', calendarRoutes);

export default router;

