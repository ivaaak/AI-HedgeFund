// sentiment.routes.ts
import { Router } from 'express';
import { SentimentController } from '../controllers/sentiment.controller';
import { asyncHandler } from '../middleware/middleware';

const router = Router();
const controller = new SentimentController();

/**
 * @swagger
 * /api/sentiment/analyze:
 *   post:
 *     summary: Analyze market sentiment
 *     tags:
 *       - Sentiment Analysis
 *     description: Combines news sentiment and insider transactions for each ticker
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalysisRequest'
 *     responses:
 *       200:
 *         description: Sentiment signal per ticker
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalysisResponse'
 *       400:
 *         description: Invalid input parameters
 */
router.post('/analyze', asyncHandler(controller.analyzeSentiment));

export default router;
