import { Router } from 'express';
import { validateFetchRates, validateSearchHotel } from '../../../validators/hotel';
import { HotelController } from '../../controllers/hotel-controller';

const router = Router();
const hotelController = new HotelController();

// Fetch rates endpoints
router.get('/fetch-rates', (req, res) => hotelController.fetchRatesGet(req, res));
router.post('/fetch-rates', validateFetchRates, (req, res) => hotelController.fetchRates(req, res));

// Batch fetch rates
router.post('/batch-fetch-rates', (req, res) => hotelController.batchFetchRates(req, res));

// Calendar data
router.get('/calendar-data', (req, res) => hotelController.getCalendarData(req, res));

// Countries endpoint
router.get('/countries', (req, res) => hotelController.getCountries(req, res));

// States endpoint
router.get('/states', (req, res) => hotelController.getStates(req, res));

// Cities endpoint
router.get('/cities', (req, res) => hotelController.getCities(req, res));

// Hotel search endpoint
router.post('/search-hotel', validateSearchHotel, (req, res) => hotelController.searchHotel(req, res));

export default router;

