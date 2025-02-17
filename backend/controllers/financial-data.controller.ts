// src/controllers/financial-data.controller.ts
import { Request, Response } from 'express';
import { FinancialDataService } from '../services/openai.service';

export class FinancialDataController {
  private service: FinancialDataService;

  constructor() {
    this.service = new FinancialDataService();
  }

  public getPrices = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ticker, startDate, endDate } = req.query as Record<string, string>;
      const prices = await this.service.getPrices(ticker, startDate, endDate);
      res.json(prices);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch prices' });
    }
  };

  public getFinancialMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ticker, endDate, period, limit } = req.query as Record<string, string>;
      const metrics = await this.service.getFinancialMetrics(
        ticker,
        endDate,
        period,
        Number(limit)
      );
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch financial metrics' });
    }
  };
}