import { Request, Response } from 'express';
import { parseAnalysisRequest } from '../middleware/validation';
import { SentimentService } from '../services/sentiment.service';

export class SentimentController {
  constructor(private sentimentService: SentimentService = new SentimentService()) {}

  public analyzeSentiment = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.sentimentService.analyzeSentiment(parseAnalysisRequest(req.body)));
  };
}
