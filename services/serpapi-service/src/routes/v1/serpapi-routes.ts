import { Router } from 'express';
import { validateFetchRates, validateSearchHotel } from '../../../validators/serpapi';
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

// Countries endpoint
router.get('/countries', (req, res) => serpApiController.getCountries(req, res));

// States endpoint
router.get('/states', (req, res) => serpApiController.getStates(req, res));

// Hotel search endpoint
router.post('/search-hotel', validateSearchHotel, (req, res) => serpApiController.searchHotel(req, res));

export default router;

