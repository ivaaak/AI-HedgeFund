import { Request, Response } from 'express';
import { SentimentService } from '../services/sentiment.service';
import config from '../config';

export class SentimentController {
  private sentimentService: SentimentService;

  constructor() {
    this.sentimentService = new SentimentService(config.openAiApiKey);
  }

  public analyzeSentiment = async (req: Request, res: Response): Promise<void> => {
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
      
      const sentimentResults = await this.sentimentService.analyzeSentiment({
        tickers,
        end_date
      });
      
      res.json(sentimentResults);
    } catch (error) {
      console.error('Sentiment Analysis Error:', error);
      res.status(500).json({
        error: 'Failed to process sentiment analysis request',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}