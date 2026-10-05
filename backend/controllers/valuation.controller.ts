import { Request, Response } from 'express';
import { parseAnalysisRequest } from '../middleware/validation';
import { ValuationService } from '../services/valuation.service';

export class ValuationController {
  constructor(private valuationService: ValuationService = new ValuationService()) {}

  public analyzeValuation = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.valuationService.analyzeValuation(parseAnalysisRequest(req.body)));
  };
}
