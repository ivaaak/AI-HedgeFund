// riskManager.routes.ts
import { Router } from 'express';
import { RiskManagerController } from '../controllers/riskManager.controller';

const router = Router();
const controller = new RiskManagerController();

/**
 * @swagger
 * /api/risk/analyze:
 *   post:
 *     summary: Analyze portfolio risk
 *     tags:
 *       - Risk Management
 *     description: Analyzes the risk metrics of a given portfolio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - portfolio
 *             properties:
 *               portfolio:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     ticker:
 *                       type: string
 *                     allocation:
 *                       type: number
 *     responses:
 *       200:
 *         description: Successfully analyzed portfolio risk
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 riskScore:
 *                   type: number
 *                 volatility:
 *                   type: number
 *                 sharpeRatio:
 *                   type: number
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Server error
 */
router.post('/analyze', controller.analyzeRisk);

/**
 * @swagger
 * /api/risk/recommendations:
 *   post:
 *     summary: Generate risk-based recommendations
 *     tags:
 *       - Risk Management
 *     description: Provides recommendations to optimize portfolio based on risk parameters
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - portfolio
 *               - riskProfile
 *             properties:
 *               portfolio:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     ticker:
 *                       type: string
 *                     allocation:
 *                       type: number
 *               riskProfile:
 *                 type: string
 *                 enum: [conservative, moderate, aggressive]
 *     responses:
 *       200:
 *         description: Successfully generated risk recommendations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Server error
 */
router.post('/recommendations', controller.generateRecommendations);

export default router;