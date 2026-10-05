import { Router } from 'express';
import { FinancialDataController } from '../controllers/financialData.controller';
import { asyncHandler } from '../middleware/middleware';

const router = Router();
const controller = new FinancialDataController();

/**
 * @swagger
 * /api/financial-data/prices:
 *   get:
 *     summary: Get daily prices for a ticker, oldest first
 *     tags:
 *       - Financial Data
 *     parameters:
 *       - in: query
 *         name: ticker
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Daily open, high, low, close and volume
 *       400:
 *         description: Invalid input parameters
 */
router.get('/prices', asyncHandler(controller.getPrices));

/**
 * @swagger
 * /api/financial-data/metrics:
 *   get:
 *     summary: Get financial metrics for a ticker, newest first
 *     tags:
 *       - Financial Data
 *     description: Ratios, margins and growth rates are fractions (0.15 = 15%)
 *     parameters:
 *       - in: query
 *         name: ticker
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [ttm, annual, quarterly]
 *           default: ttm
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Financial metrics
 *       400:
 *         description: Invalid input parameters
 */
router.get('/metrics', asyncHandler(controller.getFinancialMetrics));

/**
 * @swagger
 * /api/financial-data/line-items:
 *   get:
 *     summary: Get line items from the financial statements
 *     tags:
 *       - Financial Data
 *     parameters:
 *       - in: query
 *         name: ticker
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: lineItems
 *         required: true
 *         description: Comma separated, e.g. revenue,net_income,free_cash_flow
 *         schema:
 *           type: string
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [ttm, annual, quarterly]
 *           default: ttm
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: One row per reporting period
 *       400:
 *         description: Invalid input parameters
 */
router.get('/line-items', asyncHandler(controller.searchLineItems));

/**
 * @swagger
 * /api/financial-data/market-cap:
 *   get:
 *     summary: Get the current market capitalization of a ticker
 *     tags:
 *       - Financial Data
 *     parameters:
 *       - in: query
 *         name: ticker
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Market capitalization
 *       400:
 *         description: Invalid input parameters
 */
router.get('/market-cap', asyncHandler(controller.getMarketCap));

export default router;
