import { Request, Response } from 'express';
import config from '../config';
import { FinancialDataService } from '../services/financialData.service';
import { FinancialMetricsModel } from '../data/models';

export class FinancialDataController {
  private service: FinancialDataService;

  constructor() {
    this.service = new FinancialDataService(config.alphaVantageApiKey);
  }

  public getPrices = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ticker, startDate, endDate } = req.query as Record<string, string>;
      
      if (!ticker || !startDate || !endDate) {
        res.status(400).json({ error: 'Missing required parameters: ticker, startDate, endDate' });
        return;
      }
      
      const prices = await this.service.getPrices(ticker, startDate, endDate);
      res.json(prices);
    } catch (error) {
      console.error('Error fetching prices:', error);
      res.status(500).json({ error: 'Failed to fetch prices' });
    }
  };

  public getFinancialMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ticker, endDate, period, limit } = req.query as Record<string, string>;
      
      if (!ticker || !endDate) {
        res.status(400).json({ error: 'Missing required parameters: ticker, endDate' });
        return;
      }
      
      const metrics = await this.service.getFinancialMetrics(
        ticker,
        endDate,
        period,
        Number(limit)
      );
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching financial metrics:', error);
      res.status(500).json({ error: 'Failed to fetch financial metrics' });
    }
  };

  public searchLineItems = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ticker, endDate, period } = req.query as Record<string, string>;
      const lineItems = (req.query.lineItems as string || '').split(',').filter(Boolean);
      
      if (!ticker || !endDate || lineItems.length === 0) {
        res.status(400).json({ 
          error: 'Missing required parameters: ticker, endDate, lineItems' 
        });
        return;
      }
      
      const limit = Number(req.query.limit) || 10;
      
      const items = await this.service.searchLineItems(
        ticker,
        lineItems,
        endDate,
        period,
        limit
      );
      
      res.json(items);
    } catch (error) {
      console.error('Error searching line items:', error);
      res.status(500).json({ error: 'Failed to search line items' });
    }
  };

  public getMarketCap = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ticker, endDate } = req.query as Record<string, string>;
      
      if (!ticker || !endDate) {
        res.status(400).json({ error: 'Missing required parameters: ticker, endDate' });
        return;
      }
      
      const marketCap = await this.service.getMarketCap(ticker, endDate);
      res.json({ ticker, marketCap });
    } catch (error) {
      console.error('Error fetching market cap:', error);
      res.status(500).json({ error: 'Failed to fetch market cap' });
    }
  };

  public analyzeFundamentals = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tickers, startDate, endDate } = req.body;
      
      if (!Array.isArray(tickers) || !startDate || !endDate) {
        res.status(400).json({ 
          error: 'Missing required parameters: tickers (array), startDate, endDate' 
        });
        return;
      }
      
      // This is a simplified example that would normally involve more complex analysis
      const results: any[] = [];
      
      for (const ticker of tickers) {
        try {
          // Get financial metrics
          const metrics = await this.service.getFinancialMetrics(
            ticker,
            endDate,
            'ttm'
          );
          
          if (metrics.length > 0) {
            const latestMetrics = metrics[0];
            
            // Simple "analysis" based on financial metrics
            let signal = 'HOLD';
            let confidence = 0.5;
            const reasons: string[] = [];
            
            // Check PE ratio if available
            const peRatio = latestMetrics.price_to_earnings_ratio;
            if (peRatio !== null) {
              if (peRatio < 15) {
                signal = 'BUY';
                confidence = 0.7;
                reasons.push(`PE ratio (${peRatio.toFixed(2)}) is relatively low`);
              } else if (peRatio > 25) {
                signal = 'SELL';
                confidence = 0.6;
                reasons.push(`PE ratio (${peRatio.toFixed(2)}) is relatively high`);
              } else {
                reasons.push(`PE ratio (${peRatio.toFixed(2)}) is in a moderate range`);
              }
            }
            
            // Check profit margin if available
            const profitMargin = latestMetrics.net_margin;
            if (profitMargin !== null) {
              if (profitMargin > 20) {
                if (signal !== 'SELL') confidence += 0.1;
                reasons.push(`Profit margin (${profitMargin.toFixed(2)}%) is strong`);
              } else if (profitMargin < 5) {
                if (signal !== 'BUY') confidence += 0.1;
                reasons.push(`Profit margin (${profitMargin.toFixed(2)}%) is weak`);
              }
            }
            
            results.push({
              ticker,
              analyst: 'FUNDAMENTAL',
              signal,
              confidence: Math.min(confidence, 1.0),
              reasons
            });
          }
        } catch (error) {
          console.error(`Error analyzing ${ticker}:`, error);
          // Continue with other tickers if one fails
        }
      }
      
      res.json({ signals: results });
    } catch (error) {
      console.error('Error in fundamental analysis:', error);
      res.status(500).json({ error: 'Failed to analyze fundamentals' });
    }
  };
}