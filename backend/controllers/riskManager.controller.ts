import { Request, Response } from 'express';
import { HttpError } from '../middleware/middleware';
import { parseAnalysisRequest, parsePortfolio } from '../middleware/validation';
import { RiskManagerService } from '../services/riskManager.service';

export class RiskManagerController {
  constructor(private riskManagerService: RiskManagerService = new RiskManagerService()) {}

  public analyzeRisk = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.riskManagerService.analyzeRisk({
      ...parseAnalysisRequest(req.body),
      portfolio: parsePortfolio(req.body.portfolio)
    }));
  };

  public generateRecommendations = async (req: Request, res: Response): Promise<void> => {
    const { technical_signals, fundamental_signals, risk_analysis } = req.body || {};

    if (!risk_analysis || typeof risk_analysis !== 'object') {
      throw new HttpError(400, 'risk_analysis is required');
    }

    res.json(this.riskManagerService.generateRecommendations(
      technical_signals || {},
      fundamental_signals || {},
      risk_analysis,
      parsePortfolio(req.body.portfolio)
    ));
  };
}
