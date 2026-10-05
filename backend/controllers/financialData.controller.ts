import { Request, Response } from 'express';
import { HttpError } from '../middleware/middleware';
import { parseDate, parseTicker, today } from '../middleware/validation';
import { FinancialDataService, financialDataService } from '../services/financialData.service';

export class FinancialDataController {
  constructor(private service: FinancialDataService = financialDataService) {}

  private parseLimit(value: unknown): number {
    if (value === undefined) return 10;
    const limit = Number(value);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new HttpError(400, 'limit must be an integer between 1 and 100');
    }
    return limit;
  }

  private parseEndDate(value: unknown): string {
    return value === undefined ? today() : parseDate(value, 'endDate');
  }

  public getPrices = async (req: Request, res: Response): Promise<void> => {
    const ticker = parseTicker(req.query.ticker);
    const startDate = parseDate(req.query.startDate, 'startDate');
    const endDate = parseDate(req.query.endDate, 'endDate');

    res.json(await this.service.getPrices(ticker, startDate, endDate));
  };

  public getFinancialMetrics = async (req: Request, res: Response): Promise<void> => {
    const ticker = parseTicker(req.query.ticker);
    const period = typeof req.query.period === 'string' ? req.query.period : 'ttm';

    res.json(await this.service.getFinancialMetrics(
      ticker,
      this.parseEndDate(req.query.endDate),
      period,
      this.parseLimit(req.query.limit)
    ));
  };

  public searchLineItems = async (req: Request, res: Response): Promise<void> => {
    const ticker = parseTicker(req.query.ticker);
    const period = typeof req.query.period === 'string' ? req.query.period : 'ttm';
    const lineItems = String(req.query.lineItems || '').split(',').map(item => item.trim()).filter(Boolean);

    if (lineItems.length === 0) {
      throw new HttpError(400, 'Missing required parameter: lineItems');
    }

    res.json(await this.service.searchLineItems(
      ticker,
      lineItems,
      this.parseEndDate(req.query.endDate),
      period,
      this.parseLimit(req.query.limit)
    ));
  };

  public getMarketCap = async (req: Request, res: Response): Promise<void> => {
    const ticker = parseTicker(req.query.ticker);
    res.json({ ticker, marketCap: await this.service.getMarketCap(ticker) });
  };
}
