import { Router } from 'express';
import financialDataRoutes from './financialData.routes';
import fundamentalsRoutes from './fundamentals.routes';
import technicalsRoutes from './technicals.routes';
import sentimentRoutes from './sentiment.routes';
import valuationRoutes from './valuation.routes';
import riskManagerRoutes from './riskManager.routes';
import portfolioRoutes from './portfolioManagement.routes';
import hedgeFundRoutes from './hedgeFund.routes';

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     ApiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: X-API-KEY
 *   schemas:
 *     AnalysisRequest:
 *       type: object
 *       required:
 *         - tickers
 *       properties:
 *         tickers:
 *           type: array
 *           items:
 *             type: string
 *           example: [AAPL, MSFT]
 *         start_date:
 *           type: string
 *           format: date
 *           description: Defaults to 90 days before end_date
 *         end_date:
 *           type: string
 *           format: date
 *           description: Defaults to today
 *     AnalystSignal:
 *       type: object
 *       properties:
 *         signal:
 *           type: string
 *           enum: [bullish, bearish, neutral]
 *         confidence:
 *           type: number
 *           description: 0 to 100
 *         reasoning:
 *           type: object
 *           description: One entry per component of the analysis, each with a signal and details
 *     AnalysisResponse:
 *       type: object
 *       properties:
 *         results:
 *           type: object
 *           description: Result per ticker
 *           additionalProperties:
 *             $ref: '#/components/schemas/AnalystSignal'
 *         errors:
 *           type: object
 *           description: Error message per ticker that could not be analysed
 *           additionalProperties:
 *             type: string
 *     Portfolio:
 *       type: object
 *       required:
 *         - cash
 *       properties:
 *         cash:
 *           type: number
 *         positions:
 *           type: object
 *           additionalProperties:
 *             type: object
 *             properties:
 *               shares:
 *                 type: number
 *               avg_price:
 *                 type: number
 *               current_price:
 *                 type: number
 *         history:
 *           type: array
 *           items:
 *             type: object
 *         initial_value:
 *           type: number
 *     RiskAnalysis:
 *       type: object
 *       properties:
 *         remaining_position_limit:
 *           type: number
 *         current_price:
 *           type: number
 *         risk_score:
 *           type: number
 *           description: 1 (calm) to 10 (very volatile)
 *         reasoning:
 *           type: object
 *     PortfolioDecision:
 *       type: object
 *       properties:
 *         action:
 *           type: string
 *           enum: [buy, sell, hold]
 *         quantity:
 *           type: number
 *         confidence:
 *           type: number
 *         reasoning:
 *           type: string
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */
const router = Router();

router.use('/financial-data', financialDataRoutes);
router.use('/fundamentals', fundamentalsRoutes);
router.use('/technical', technicalsRoutes);
router.use('/sentiment', sentimentRoutes);
router.use('/valuation', valuationRoutes);
router.use('/risk', riskManagerRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/hedge-fund', hedgeFundRoutes);

export default router;
