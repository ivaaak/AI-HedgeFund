
import { Request, Response, NextFunction } from 'express';
import { CacheService } from './cache';

export class CacheMiddleware {
  private static instance: CacheMiddleware;
  private cacheService: CacheService;

  private constructor() {
    this.cacheService = CacheService.getInstance();
  }

  public static getInstance(): CacheMiddleware {
    if (!CacheMiddleware.instance) {
      CacheMiddleware.instance = new CacheMiddleware();
    }
    return CacheMiddleware.instance;
  }

  public checkCache(type: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const ticker = req.params.ticker || req.query.ticker as string;
      
      if (!ticker) {
        return next();
      }

      let cachedData;
      switch (type) {
        case 'prices':
          cachedData = this.cacheService.getPrices(ticker);
          break;
        case 'financialMetrics':
          cachedData = this.cacheService.getFinancialMetrics(ticker);
          break;
        // Add other cases as needed
      }

      if (cachedData) {
        return res.json(cachedData);
      }

      next();
    };
  }
}