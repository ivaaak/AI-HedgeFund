// portfolioManagement.routes.ts
import { Router } from 'express';
import { PortfolioManagementController } from '../controllers/portfolioManagement.controller';

const router = Router();
const controller = new PortfolioManagementController();

/**
 * @swagger
 * /api/portfolio/manage:
 *   post:
 *     summary: Manage portfolio
 *     tags:
 *       - Portfolio Management
 *     description: Provides portfolio management recommendations based on input data
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
 *                     shares:
 *                       type: number
 *               riskProfile:
 *                 type: string
 *                 enum: [conservative, moderate, aggressive]
 *     responses:
 *       200:
 *         description: Successfully processed portfolio management request
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
router.post('/manage', controller.managePortfolio);

export default router;