// portfolioManagement.routes.ts
import { Router } from 'express';
import { PortfolioManagementController } from '../controllers/portfolioManagement.controller';
import { asyncHandler } from '../middleware/middleware';

const router = Router();
const controller = new PortfolioManagementController();

/**
 * @swagger
 * /api/portfolio/manage:
 *   post:
 *     summary: Make trading decisions
 *     tags:
 *       - Portfolio Management
 *     description: >
 *       Turns analyst signals and risk limits into buy/sell/hold decisions. Uses the configured
 *       language model when available and a weighted rule-based decision otherwise.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tickers
 *               - analyst_signals
 *               - risk
 *             properties:
 *               tickers:
 *                 type: array
 *                 items:
 *                   type: string
 *               analyst_signals:
 *                 type: object
 *                 description: Signals keyed by analyst, then by ticker
 *                 additionalProperties:
 *                   type: object
 *                   additionalProperties:
 *                     $ref: '#/components/schemas/AnalystSignal'
 *               risk:
 *                 type: object
 *                 description: The results of /api/risk/analyze
 *                 additionalProperties:
 *                   $ref: '#/components/schemas/RiskAnalysis'
 *               portfolio:
 *                 $ref: '#/components/schemas/Portfolio'
 *     responses:
 *       200:
 *         description: Decision per ticker
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 decisions:
 *                   type: object
 *                   additionalProperties:
 *                     $ref: '#/components/schemas/PortfolioDecision'
 *                 source:
 *                   type: string
 *                   enum: [llm, rules]
 *       400:
 *         description: Invalid input parameters
 */
router.post('/manage', asyncHandler(controller.managePortfolio));

export default router;
