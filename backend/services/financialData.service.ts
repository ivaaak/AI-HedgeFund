import axios from 'axios';
import { CacheService } from '../data/cache';
import { Price, PriceResponse, FinancialMetrics, FinancialMetricsResponse, LineItem, LineItemResponse, InsiderTrade, InsiderTradeResponse } from '../data/models';

export class FinancialDataService {
  private cache: CacheService;
  private apiKey: string;
  private baseUrl = 'https://api.financialdatasets.ai';

  constructor(apiKey?: string) {
    this.cache = CacheService.getInstance();
    
    // Accept API key as constructor parameter instead of using process.env
    this.apiKey = apiKey || 
      // For browser environments with global variable
      (typeof window !== 'undefined' && (window as any).FINANCIAL_DATASETS_API_KEY) || 
      '';
  }

  private getHeaders() {
    return this.apiKey ? { 'X-API-KEY': this.apiKey } : {};
  }

  /**
   * Fetch price data
   */
  public async getPrices(
    ticker: string,
    startDate: string,
    endDate: string
  ): Promise<Price[]> {
    // Check cache first
    const cachedData = this.cache.getPrices(ticker);
    if (cachedData) {
      const filteredData = cachedData.filter(
        price => price?.time && startDate <= price.time && price.time <= endDate
      );
      if (filteredData.length > 0) {
        return filteredData as Price[];
      }
    }

    try {
      const response = await axios.get<PriceResponse>(
        `${this.baseUrl}/prices/`,
        {
          headers: this.getHeaders(),
          params: {
            ticker,
            interval: 'day',
            interval_multiplier: 1,
            start_date: startDate,
            end_date: endDate
          }
        }
      );

      const prices = response.data.prices;
      if (prices.length > 0) {
        this.cache.setPrices(ticker, prices);
      }
      return prices;
    } catch (error) {
      console.error('Error fetching prices:', error);
      throw error;
    }
  }

  /**
   * Fetch financial metrics
   */
  public async getFinancialMetrics(
    ticker: string,
    endDate: string,
    period: string = 'ttm',
    limit: number = 10
  ): Promise<FinancialMetrics[]> {
    const cachedData = this.cache.getFinancialMetrics(ticker);
    if (cachedData) {
      const filteredData = cachedData
        .filter(metric => metric?.report_period && metric.report_period <= endDate)
        .sort((a, b) => {
          const reportA = b.report_period || '';
          const reportB = a.report_period || '';
          return reportA.localeCompare(reportB);
        })
        .slice(0, limit);
      
      if (filteredData.length > 0) {
        return filteredData as FinancialMetrics[];
      }
    }

    try {
      const response = await axios.get<FinancialMetricsResponse>(
        `${this.baseUrl}/financial-metrics/`,
        {
          headers: this.getHeaders(),
          params: {
            ticker,
            report_period_lte: endDate,
            limit,
            period
          }
        }
      );

      const metrics = response.data.financial_metrics;
      if (metrics.length > 0) {
        this.cache.setFinancialMetrics(ticker, metrics);
      }
      return metrics;
    } catch (error) {
      console.error('Error fetching financial metrics:', error);
      throw error;
    }
  }

  /**
   * Search line items
   */
  public async searchLineItems(
    ticker: string,
    lineItems: string[],
    endDate: string,
    period: string = 'ttm',
    limit: number = 10
  ): Promise<LineItem[]> {
    try {
      const response = await axios.post<LineItemResponse>(
        `${this.baseUrl}/financials/search/line-items`,
        {
          tickers: [ticker],
          line_items: lineItems,
          end_date: endDate,
          period,
          limit
        },
        { headers: this.getHeaders() }
      );

      return response.data.search_results.slice(0, limit);
    } catch (error) {
      console.error('Error searching line items:', error);
      throw error;
    }
  }

  /**
   * Fetch insider trades
   */
  public async getInsiderTrades(
    ticker: string,
    endDate: string,
    startDate?: string,
    limit: number = 1000
  ): Promise<InsiderTrade[]> {
    const cachedData = this.cache.getInsiderTrades(ticker);
    if (cachedData) {
      const filteredData = cachedData
        .filter(trade => {
          const tradeDate = trade.transaction_date || trade.filing_date;
          return (!startDate || tradeDate >= startDate) && tradeDate <= endDate;
        })
        .sort((a, b) => {
          const dateA = a.transaction_date || a.filing_date;
          const dateB = b.transaction_date || b.filing_date;
          return dateB.localeCompare(dateA);
        });

      if (filteredData.length > 0) {
        return filteredData as InsiderTrade[];
      }
    }

    try {
      const allTrades: InsiderTrade[] = [];
      let currentEndDate = endDate;

      while (true) {
        const response = await axios.get<InsiderTradeResponse>(
          `${this.baseUrl}/insider-trades/`,
          {
            headers: this.getHeaders(),
            params: {
              ticker,
              filing_date_lte: currentEndDate,
              ...(startDate && { filing_date_gte: startDate }),
              limit
            }
          }
        );

        const trades = response.data.insider_trades;
        if (!trades.length) break;

        allTrades.push(...trades);

        if (!startDate || trades.length < limit) break;

        currentEndDate = new Date(Math.min(
          ...trades.map(t => new Date(t.filing_date).getTime())
        )).toISOString().split('T')[0];

        if (currentEndDate <= startDate) break;
      }

      if (allTrades.length > 0) {
        this.cache.setInsiderTrades(ticker, allTrades);
      }
      return allTrades;
    } catch (error) {
      console.error('Error fetching insider trades:', error);
      throw error;
    }
  }

  /**
   * Get market cap
   */
  public async getMarketCap(
    ticker: string,
    endDate: string
  ): Promise<number | null> {
    const metrics = await this.getFinancialMetrics(ticker, endDate);
    return metrics[0]?.market_cap || null;
  }

  /**
   * Convert prices to dataframe-like structure
   */
  public pricesToTimeSeries(prices: Price[]): Record<string, any> {
    return prices
      .sort((a, b) => a.time.localeCompare(b.time))
      .reduce((acc, price) => {
        const date = new Date(price.time).toISOString().split('T')[0];
        acc[date] = {
          open: Number(price.open),
          close: Number(price.close),
          high: Number(price.high),
          low: Number(price.low),
          volume: Number(price.volume)
        };
        return acc;
      }, {} as Record<string, any>);
  }
}