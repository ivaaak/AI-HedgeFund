// riskManager.routes.ts
import { Router } from 'express';
import { RiskManagerController } from '../controllers/riskManager.controller';
import { asyncHandler } from '../middleware/middleware';

const router = Router();
const controller = new RiskManagerController();

/**
 * @swagger
 * /api/risk/analyze:
 *   post:
 *     summary: Analyze position limits and price risk
 *     tags:
 *       - Risk Management
 *     description: Calculates the remaining position limit, volatility and drawdown for each ticker
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/AnalysisRequest'
 *               - type: object
 *                 properties:
 *                   portfolio:
 *                     $ref: '#/components/schemas/Portfolio'
 *     responses:
 *       200:
 *         description: Risk analysis per ticker
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: object
 *                   additionalProperties:
 *                     $ref: '#/components/schemas/RiskAnalysis'
 *                 errors:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *       400:
 *         description: Invalid input parameters
 */
router.post('/analyze', asyncHandler(controller.analyzeRisk));

/**
 * @swagger
 * /api/risk/recommendations:
 *   post:
 *     summary: Generate risk-based recommendations
 *     tags:
 *       - Risk Management
 *     description: Combines technical and fundamental signals into position-sized recommendations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - risk_analysis
 *             properties:
 *               technical_signals:
 *                 type: object
 *                 additionalProperties:
 *                   $ref: '#/components/schemas/AnalystSignal'
 *               fundamental_signals:
 *                 type: object
 *                 additionalProperties:
 *                   $ref: '#/components/schemas/AnalystSignal'
 *               risk_analysis:
 *                 type: object
 *                 description: The results of /api/risk/analyze
 *                 additionalProperties:
 *                   $ref: '#/components/schemas/RiskAnalysis'
 *               portfolio:
 *                 $ref: '#/components/schemas/Portfolio'
 *     responses:
 *       200:
 *         description: Recommendation per ticker and a portfolio summary
 *       400:
 *         description: Invalid input parameters
 */
router.post('/recommendations', asyncHandler(controller.generateRecommendations));

export default router;
