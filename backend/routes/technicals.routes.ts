// technicals.routes.ts
import { Router } from 'express';
import { TechnicalAnalystController } from '../controllers/technicals.controller';

const router = Router();
const controller = new TechnicalAnalystController();

/**
 * @swagger
 * /api/technical/analyze:
 *   post:
 *     summary: Analyze technical indicators
 *     tags:
 *       - Technical Analysis
 *     description: Performs technical analysis on the specified tickers
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
 *               indicators:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [macd, rsi, bollinger, sma, ema]
 *               timeframe:
 *                 type: string
 *                 enum: [daily, weekly, monthly]
 *                 default: daily
 *     responses:
 *       200:
 *         description: Successfully analyzed technical indicators
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Server error
 */
router.post('/analyze', controller.analyzeTickers);

/**
 * @swagger
 * /api/technical/prices/{ticker}:
 *   get:
 *     summary: Get historical price data
 *     tags:
 *       - Technical Analysis
 *     description: Retrieves historical price data for a specific ticker
 *     parameters:
 *       - in: path
 *         name: ticker
 *         required: true
 *         schema:
 *           type: string
 *         description: Stock ticker symbol
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max]
 *           default: 1mo
 *         description: Time period for historical data
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [1m, 5m, 15m, 30m, 60m, 1d, 1wk, 1mo]
 *           default: 1d
 *         description: Data interval
 *     responses:
 *       200:
 *         description: Successfully retrieved price data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ticker:
 *                   type: string
 *                 prices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       open:
 *                         type: number
 *                       high:
 *                         type: number
 *                       low:
 *                         type: number
 *                       close:
 *                         type: number
 *                       volume:
 *                         type: number
 *       400:
 *         description: Invalid ticker or parameters
 *       404:
 *         description: Ticker not found
 *       500:
 *         description: Server error
 */
router.get('/prices/:ticker', controller.getPriceData);

export default router;