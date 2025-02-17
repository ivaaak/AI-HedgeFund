import { Router } from 'express';
import { FinancialDataController } from '../controllers/financial-data.controller';

const router = Router();
const controller = new FinancialDataController();

router.get('/prices', controller.getPrices);
router.get('/financial-metrics', controller.getFinancialMetrics);
// Add other routes...

export default router;
