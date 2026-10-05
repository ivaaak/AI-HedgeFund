import { Router } from 'express';
import { FundamentalsController } from '../controllers/fundamentals.controller';
import { asyncHandler } from '../middleware/middleware';

const router = Router();
const controller = new FundamentalsController();

/**
 * @swagger
 * /api/fundamentals/analyze:
 *   post:
 *     summary: Analyze company fundamentals
 *     tags:
 *       - Fundamental Analysis
 *     description: Scores profitability, growth, financial health and price ratios for each ticker
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalysisRequest'
 *     responses:
 *       200:
 *         description: Fundamental signal per ticker
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalysisResponse'
 *       400:
 *         description: Invalid input parameters
 */
router.post('/analyze', asyncHandler(controller.analyze));

export default router;
