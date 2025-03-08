import { Router } from 'express';
import { FundamentalsController } from '../controllers/fundamentals.controller';

const router = Router();
const controller = new FundamentalsController();

// POST /api/fundamentals/analyze
router.post('/analyze', controller.analyze);

export default router;