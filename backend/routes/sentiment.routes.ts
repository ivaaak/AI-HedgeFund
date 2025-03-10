import { Router } from 'express';
import { SentimentController } from '../controllers/sentiment.controller';

const router = Router();
const controller = new SentimentController();

// POST /api/sentiment/analyze
router.post('/analyze', controller.analyzeSentiment);

export default router;