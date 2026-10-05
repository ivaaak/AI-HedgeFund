import { Request, Response } from 'express';
import { HttpError } from '../middleware/middleware';
import { parsePortfolio, parseTickers } from '../middleware/validation';
import { PortfolioManagementService } from '../services/portfolioManagement.service';

export class PortfolioManagementController {
  constructor(private portfolioService: PortfolioManagementService = new PortfolioManagementService()) {}

  public managePortfolio = async (req: Request, res: Response): Promise<void> => {
    const { analyst_signals, risk } = req.body || {};

    if (!analyst_signals || typeof analyst_signals !== 'object') {
      throw new HttpError(400, 'analyst_signals is required');
    }
    if (!risk || typeof risk !== 'object') {
      throw new HttpError(400, 'risk is required');
    }

    res.json(await this.portfolioService.managePortfolio({
      tickers: parseTickers(req.body.tickers),
      analyst_signals,
      risk,
      portfolio: parsePortfolio(req.body.portfolio)
    }));
  };
}
