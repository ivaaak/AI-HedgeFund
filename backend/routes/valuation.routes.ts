// valuation.routes.ts
import { Router } from 'express';
import { ValuationController } from '../controllers/valuation.controller';
import { asyncHandler } from '../middleware/middleware';

const router = Router();
const controller = new ValuationController();

/**
 * @swagger
 * /api/valuation/analyze:
 *   post:
 *     summary: Analyze stock valuation
 *     tags:
 *       - Valuation Analysis
 *     description: Compares a DCF and an owner earnings valuation with the market capitalization
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalysisRequest'
 *     responses:
 *       200:
 *         description: Valuation signal per ticker
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalysisResponse'
 *       400:
 *         description: Invalid input parameters
 */
router.post('/analyze', asyncHandler(controller.analyzeValuation));

export default router;
