// valuation.routes.ts
import { Router } from 'express';
import { ValuationController } from '../controllers/valuation.controller';

const router = Router();
const controller = new ValuationController();

/**
 * @swagger
 * /api/valuation/analyze:
 *   post:
 *     summary: Analyze stock valuation
 *     tags:
 *       - Valuation Analysis
 *     description: Performs fundamental valuation analysis on specified tickers
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
 *               metrics:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [pe, pb, ps, pcf, dividend, dcf]
 *               compareWith:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Successfully analyzed stock valuation
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
 *                       valuationMetrics:
 *                         type: object
 *                       intrinsicValue:
 *                         type: number
 *                       recommendation:
 *                         type: string
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Server error
 */
router.post('/analyze', controller.analyzeValuation);

export default router;