// sentiment.routes.ts
import { Router } from 'express';
import { SentimentController } from '../controllers/sentiment.controller';

const router = Router();
const controller = new SentimentController();

/**
 * @swagger
 * /api/sentiment/analyze:
 *   post:
 *     summary: Analyze market sentiment
 *     tags:
 *       - Sentiment Analysis
 *     description: Analyzes market sentiment for specified tickers or market segments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tickers
 *             properties:
 *               tickers:
 *                 type: array
 *                 items:
 *                   type: string
 *               timeframe:
 *                 type: string
 *                 enum: [daily, weekly, monthly]
 *                 default: daily
 *     responses:
 *       200:
 *         description: Successfully analyzed sentiment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ticker:
 *                         type: string
 *                       sentimentScore:
 *                         type: number
 *                       sentiment:
 *                         type: string
 *                         enum: [negative, neutral, positive]
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Server error
 */
router.post('/analyze', controller.analyzeSentiment);

export default router;