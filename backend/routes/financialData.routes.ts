import { Router } from 'express';
import { FinancialDataController } from '../controllers/financialData.controller';

const router = Router();
const controller = new FinancialDataController();

// GET /api/financial-data/prices
router.get('/prices', controller.getPrices);

// GET /api/financial-data/metrics
router.get('/metrics', controller.getFinancialMetrics);

// GET /api/financial-data/line-items
router.get('/line-items', controller.searchLineItems);

// GET /api/financial-data/market-cap
router.get('/market-cap', controller.getMarketCap);

// POST /api/financial-data/analyze/fundamentals
router.post('/analyze/fundamentals', controller.analyzeFundamentals);

export default router;