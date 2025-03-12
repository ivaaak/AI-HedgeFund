import { Request, Response } from 'express';
import { TechnicalAnalystService } from '../services/technicals.service';
import config from '../config';

export class TechnicalAnalystController {
  private technicalAnalystService: TechnicalAnalystService;

  constructor() {
    this.technicalAnalystService = new TechnicalAnalystService(config.openAiApiKey);
  }

  public analyzeTickers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tickers, start_date, end_date } = req.body;
      
      if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
        res.status(400).json({ error: 'Invalid tickers provided' });
        return;
      }
      
      if (!start_date || !end_date) {
        res.status(400).json({ error: 'Start date and end date are required' });
        return;
      }
      
      const analysisResults = await this.technicalAnalystService.analyzeTickers({
        tickers,
        start_date,
        end_date
      });
      
      res.json(analysisResults);
    } catch (error) {
      console.error('Technical Analysis Error:', error);
      res.status(500).json({
        error: 'Failed to process technical analysis request',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public getPriceData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ticker } = req.params;
      const { start_date, end_date } = req.query;
      
      if (!ticker) {
        res.status(400).json({ error: 'Ticker is required' });
        return;
      }
      
      if (!start_date || !end_date) {
        res.status(400).json({ error: 'Start date and end date are required' });
        return;
      }
      
      const priceData = await this.technicalAnalystService.getPriceData(
        ticker,
        start_date as string,
        end_date as string
      );
      
      if (!priceData || priceData.length === 0) {
        res.status(404).json({ error: `No price data found for ${ticker}` });
        return;
      }
      
      res.json(priceData);
    } catch (error) {
      console.error('Price Data Error:', error);
      res.status(500).json({
        error: 'Failed to fetch price data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}