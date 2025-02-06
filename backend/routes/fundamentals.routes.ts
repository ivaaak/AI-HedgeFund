import { Router } from 'express';
import { FundamentalsController } from '../controllers/fundamentals.controller';

const router = Router();
const fundamentalsController = new FundamentalsController();

router.post('/analyze', fundamentalsController.analyze);

export default router;