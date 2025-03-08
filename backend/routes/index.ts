import { Router } from 'express';
import financialDataRoutes from './financialData.routes';
import fundamentalsRoutes from './fundamentals.routes';
import portfolioRoutes from './portfolioManagement.routes';

const router = Router();

router.use('/financial-data', financialDataRoutes);
router.use('/fundamentals', fundamentalsRoutes);
router.use('/portfolio', portfolioRoutes);

export default router;