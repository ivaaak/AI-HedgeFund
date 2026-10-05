// hedgeFund.routes.ts
import { Router } from 'express';
import { HedgeFundController } from '../controllers/hedgeFund.controller';
import { asyncHandler } from '../middleware/middleware';

const router = Router();
const controller = new HedgeFundController();

/**
 * @swagger
 * /api/hedge-fund/run:
 *   post:
 *     summary: Run the full analysis and trading cycle
 *     tags:
 *       - Hedge Fund
 *     description: >
 *       Runs all analysts, the risk manager and the portfolio manager, then executes the decisions
 *       as paper trades. The server keeps no state: send the returned portfolio with the next request.
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
 *                   execute_trades:
 *                     type: boolean
 *                     default: true
 *     responses:
 *       200:
 *         description: Signals, risk analysis, decisions, executed trades and the updated portfolio
 *       400:
 *         description: Invalid input parameters
 */
router.post('/run', asyncHandler(controller.run));

export default router;
