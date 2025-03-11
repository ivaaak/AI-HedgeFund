import { Request, Response } from 'express';
import { ValuationService } from '../services/valuation.service';
import config from '../config';

export class ValuationController {
  private valuationService: ValuationService;

  constructor() {
    this.valuationService = new ValuationService(config.openAiApiKey);
  }

  public analyzeValuation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tickers, end_date } = req.body;
      
      if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
        res.status(400).json({ error: 'Invalid tickers provided' });
        return;
      }
      
      if (!end_date) {
        res.status(400).json({ error: 'End date is required' });
        return;
      }
      
      const valuationResults = await this.valuationService.analyzeValuation({
        tickers,
        end_date
      });
      
      res.json(valuationResults);
    } catch (error) {
      console.error('Valuation Analysis Error:', error);
      res.status(500).json({
        error: 'Failed to process valuation analysis request',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}