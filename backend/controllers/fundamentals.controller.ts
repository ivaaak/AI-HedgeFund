import { Request, Response } from 'express';
import { parseAnalysisRequest } from '../middleware/validation';
import { FundamentalsService } from '../services/fundamentals.service';

export class FundamentalsController {
  constructor(private fundamentalsService: FundamentalsService = new FundamentalsService()) {}

  public analyze = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.fundamentalsService.analyzeFundamentals(parseAnalysisRequest(req.body)));
  };
}
