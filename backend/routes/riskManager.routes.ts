import { Router } from 'express';
import { RiskManagerController } from '../controllers/riskManager.controller';

const router = Router();
const controller = new RiskManagerController();

// POST /api/risk/analyze
router.post('/analyze', controller.analyzeRisk);

// POST /api/risk/recommendations
router.post('/recommendations', controller.generateRecommendations);

export default router;