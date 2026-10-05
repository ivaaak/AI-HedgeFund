import { Request, Response } from 'express';
import { parseAnalysisRequest, parsePortfolio } from '../middleware/validation';
import { HedgeFundService } from '../services/hedgeFund.service';

export class HedgeFundController {
  constructor(private hedgeFundService: HedgeFundService = new HedgeFundService()) {}

  public run = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.hedgeFundService.run({
      ...parseAnalysisRequest(req.body),
      portfolio: parsePortfolio(req.body.portfolio),
      execute_trades: req.body.execute_trades !== false
    }));
  };
}
