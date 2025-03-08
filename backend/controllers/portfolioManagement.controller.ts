import { Request, Response } from 'express';
import { PortfolioManagementService } from '../services/portfoliomanagement.service';
import { AgentState } from '../data/models';
import config from '../config';

export class PortfolioManagementController {
  private portfolioService: PortfolioManagementService;

  constructor() {
    this.portfolioService = new PortfolioManagementService(config.openAiApiKey);
  }

  public managePortfolio = async (req: Request, res: Response): Promise<void> => {
    try {
      const state: AgentState = req.body;
      const result = await this.portfolioService.managePortfolio(state);
      res.json(result);
    } catch (error) {
      console.error('Portfolio Management Error:', error);
      res.status(500).json({
        error: 'Failed to process portfolio management request',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
