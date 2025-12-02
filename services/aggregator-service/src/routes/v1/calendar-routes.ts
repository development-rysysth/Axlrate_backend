import { Router } from 'express';
import { CalendarController } from '../../controllers/calendar-controller';

const router = Router();
const calendarController = new CalendarController();

// Get calendar data with filters
router.post('/', (req, res) => calendarController.getCalendarData(req, res));

// Get aggregated calendar data (min/max/avg prices)
router.post('/aggregated', (req, res) => calendarController.getAggregatedCalendarData(req, res));

export default router;

