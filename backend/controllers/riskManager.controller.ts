import { Request, Response } from 'express';
import { RiskManagerService } from '../services/riskManager.service';
import config from '../config';

export class RiskManagerController {
  private riskManagerService: RiskManagerService;

  constructor() {
    this.riskManagerService = new RiskManagerService(config.openAiApiKey);
  }

  public analyzeRisk = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tickers, start_date, end_date, portfolio } = req.body;
      
      if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
        res.status(400).json({ error: 'Invalid tickers provided' });
        return;
      }
      
      if (!start_date || !end_date) {
        res.status(400).json({ error: 'Start date and end date are required' });
        return;
      }
      
      if (!portfolio) {
        res.status(400).json({ error: 'Portfolio information is required' });
        return;
      }
      
      const riskAnalysis = await this.riskManagerService.analyzeRisk({
        tickers,
        start_date,
        end_date,
        portfolio
      });
      
      res.json(riskAnalysis);
    } catch (error) {
      console.error('Risk Analysis Error:', error);
      res.status(500).json({
        error: 'Failed to process risk analysis request',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  public generateRecommendations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { technical_signals, fundamental_signals, risk_analysis, portfolio } = req.body;
      
      if (!technical_signals || !fundamental_signals || !risk_analysis || !portfolio) {
        res.status(400).json({ error: 'Missing required signal data' });
        return;
      }
      
      const recommendations = await this.riskManagerService.generateRecommendations(
        technical_signals,
        fundamental_signals,
        risk_analysis,
        portfolio
      );
      
      res.json(recommendations);
    } catch (error) {
      console.error('Recommendation Generation Error:', error);
      res.status(500).json({
        error: 'Failed to generate portfolio recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}