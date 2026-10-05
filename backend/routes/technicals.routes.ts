// technicals.routes.ts
import { Router } from 'express';
import { TechnicalAnalystController } from '../controllers/technicals.controller';
import { asyncHandler } from '../middleware/middleware';

const router = Router();
const controller = new TechnicalAnalystController();

/**
 * @swagger
 * /api/technical/analyze:
 *   post:
 *     summary: Analyze technical indicators
 *     tags:
 *       - Technical Analysis
 *     description: Combines trend following, mean reversion, momentum, volatility and statistical arbitrage signals
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalysisRequest'
 *     responses:
 *       200:
 *         description: Technical signal per ticker
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalysisResponse'
 *       400:
 *         description: Invalid input parameters
 */
router.post('/analyze', asyncHandler(controller.analyzeTickers));

/**
 * @swagger
 * /api/technical/prices/{ticker}:
 *   get:
 *     summary: Get historical price data
 *     tags:
 *       - Technical Analysis
 *     description: Retrieves daily price data for a specific ticker, oldest first
 *     parameters:
 *       - in: path
 *         name: ticker
 *         required: true
 *         schema:
 *           type: string
 *         description: Stock ticker symbol
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Successfully retrieved price data
 *       400:
 *         description: Invalid ticker or parameters
 *       404:
 *         description: No price data found
 */
router.get('/prices/:ticker', asyncHandler(controller.getPriceData));

export default router;
