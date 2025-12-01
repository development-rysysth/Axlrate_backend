import { Router } from 'express';
import { validateFetchRates } from '../../../validators/serpapi';
import { SerpApiController } from '../../controllers/serpapi-controller';

const router = Router();
const serpApiController = new SerpApiController();

// Fetch rates endpoints
router.get('/fetch-rates', (req, res) => serpApiController.fetchRatesGet(req, res));
router.post('/fetch-rates', validateFetchRates, (req, res) => serpApiController.fetchRates(req, res));

// Batch fetch rates
router.post('/batch-fetch-rates', (req, res) => serpApiController.batchFetchRates(req, res));

// Calendar data
router.get('/calendar-data', (req, res) => serpApiController.getCalendarData(req, res));

export default router;

