import { Router } from 'express';
import { FinancialDataController } from '../controllers/financial-data.controller';

const router = Router();
const controller = new FinancialDataController();

// GET /api/financial-data/prices
router.get('/prices', controller.getPrices);

// GET /api/financial-data/metrics
router.get('/metrics', controller.getFinancialMetrics);

export default router;