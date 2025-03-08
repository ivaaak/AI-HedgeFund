import { Router } from 'express';
import { PortfolioManagementController } from '../controllers/portfolioManagement.controller';

const router = Router();
const controller = new PortfolioManagementController();

// POST /api/portfolio/manage
router.post('/manage', controller.managePortfolio);

export default router;