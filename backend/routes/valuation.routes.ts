import { Router } from 'express';
import { ValuationController } from '../controllers/valuation.controller';

const router = Router();
const controller = new ValuationController();

// POST /api/valuation/analyze
router.post('/analyze', controller.analyzeValuation);

export default router;