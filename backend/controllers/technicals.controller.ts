import { Request, Response } from 'express';
import { HttpError } from '../middleware/middleware';
import { parseAnalysisRequest, parseDate, parseTicker } from '../middleware/validation';
import { financialDataService } from '../services/financialData.service';
import { TechnicalAnalystService } from '../services/technicals.service';

export class TechnicalAnalystController {
  constructor(private technicalAnalystService: TechnicalAnalystService = new TechnicalAnalystService()) {}

  public analyzeTickers = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.technicalAnalystService.analyzeTickers(parseAnalysisRequest(req.body)));
  };

  public getPriceData = async (req: Request, res: Response): Promise<void> => {
    const ticker = parseTicker(req.params.ticker);
    const startDate = parseDate(req.query.start_date, 'start_date');
    const endDate = parseDate(req.query.end_date, 'end_date');

    const prices = await financialDataService.getPrices(ticker, startDate, endDate);
    if (prices.length === 0) {
      throw new HttpError(404, `No price data found for ${ticker}`);
    }

    res.json(prices);
  };
}
