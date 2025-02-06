import { Router } from 'express';
import { PortfolioManagementController } from '../controllers/portfolio-management.controller';

const router = Router();
const portfolioController = new PortfolioManagementController();

router.post('/manage', portfolioController.managePortfolio);

export default router;