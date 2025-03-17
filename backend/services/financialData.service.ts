import axios from 'axios';
import { CacheService } from '../data/cache';
import { Price, PriceResponse, FinancialMetrics, FinancialMetricsResponse, LineItem, LineItemResponse, InsiderTrade, InsiderTradeResponse } from '../data/models';

export class FinancialDataService {
  private cache: CacheService;
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';

  constructor(apiKey?: string) {
    this.cache = CacheService.getInstance();
    
    // Accept API key as constructor parameter instead of using process.env
    this.apiKey = apiKey || 
      // For browser environments with global variable
      (typeof window !== 'undefined' && (window as any).ALPHA_VANTAGE_API_KEY) || 
      '';
      
    if (!this.apiKey) {
      console.warn('No Alpha Vantage API key provided. API calls will likely fail.');
    }
  }

  private getBaseParams() {
    return {
      apikey: this.apiKey,
    };
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
      const response = await axios.get(
        this.baseUrl,
        {
          params: {
            ...this.getBaseParams(),
            function: 'TIME_SERIES_DAILY',
            symbol: ticker,
            outputsize: 'full' // Get full data to ensure we have the date range
          }
        }
      );

      if (!response.data || !response.data["Time Series (Daily)"]) {
        throw new Error('Invalid response from Alpha Vantage API');
      }

      const timeSeries = response.data["Time Series (Daily)"];
      const prices: Price[] = Object.entries(timeSeries)
        .filter(([date]) => startDate <= date && date <= endDate)
        .map(([date, priceData]: [string, any]) => ({
          time: date,
          open: parseFloat(priceData["1. open"]),
          high: parseFloat(priceData["2. high"]),
          low: parseFloat(priceData["3. low"]),
          close: parseFloat(priceData["4. close"]),
          volume: parseFloat(priceData["5. volume"]),
        }));

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
      // Get company overview for basic metrics
      const overviewResponse = await axios.get(
        this.baseUrl,
        {
          params: {
            ...this.getBaseParams(),
            function: 'OVERVIEW',
            symbol: ticker
          }
        }
      );

      if (!overviewResponse.data || !overviewResponse.data.Symbol) {
        throw new Error('Invalid response from Alpha Vantage API (OVERVIEW)');
      }

      // Get income statement for additional metrics
      const incomeResponse = await axios.get(
        this.baseUrl,
        {
          params: {
            ...this.getBaseParams(),
            function: 'INCOME_STATEMENT',
            symbol: ticker
          }
        }
      );

      // Create financial metrics from the overview data
      const metrics: FinancialMetrics[] = [];
      const overview = overviewResponse.data;
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Create current metrics from overview data
      const currentMetrics: FinancialMetrics = {
        ticker: overview.Symbol,
        calendar_date: currentDate,
        report_period: currentDate,
        period: 'ttm',
        currency: overview.Currency || 'USD',
        market_cap: parseFloat(overview.MarketCapitalization) || null,
        enterprise_value: null, // Not directly available in free tier
        price_to_earnings_ratio: parseFloat(overview.PERatio) || null,
        price_to_book_ratio: parseFloat(overview.PriceToBookRatio) || null,
        price_to_sales_ratio: parseFloat(overview.PriceToSalesRatioTTM) || null,
        enterprise_value_to_ebitda_ratio: parseFloat(overview.EVToEBITDA) || null,
        enterprise_value_to_revenue_ratio: parseFloat(overview.EVToRevenue) || null,
        free_cash_flow_yield: null, // Not directly available
        peg_ratio: parseFloat(overview.PEGRatio) || null,
        gross_margin: null, // Would need to calculate from income statement
        operating_margin: parseFloat(overview.OperatingMarginTTM || '0') || null,
        net_margin: parseFloat(overview.ProfitMargin) || null,
        return_on_equity: parseFloat(overview.ReturnOnEquityTTM || '0') || null,
        return_on_assets: parseFloat(overview.ReturnOnAssetsTTM || '0') || null,
        return_on_invested_capital: null, // Not directly available
        asset_turnover: null, // Not directly available
        inventory_turnover: null, // Not directly available
        receivables_turnover: null, // Not directly available
        days_sales_outstanding: null, // Not directly available
        operating_cycle: null, // Not directly available
        working_capital_turnover: null, // Not directly available
        current_ratio: parseFloat(overview.CurrentRatio || '0') || null,
        quick_ratio: parseFloat(overview.QuickRatio || '0') || null,
        cash_ratio: null, // Not directly available
        operating_cash_flow_ratio: null, // Not directly available
        debt_to_equity: null, // Would need balance sheet data
        debt_to_assets: null, // Not directly available
        interest_coverage: null, // Would need to calculate
        revenue_growth: parseFloat(overview.QuarterlyRevenueGrowthYOY) || null,
        earnings_growth: parseFloat(overview.QuarterlyEarningsGrowthYOY) || null,
        book_value_growth: null, // Not directly available
        earnings_per_share_growth: null, // Not directly available
        free_cash_flow_growth: null, // Not directly available
        operating_income_growth: null, // Not directly available
        ebitda_growth: null, // Not directly available
        payout_ratio: parseFloat(overview.PayoutRatio || '0') || null,
        earnings_per_share: parseFloat(overview.EPS) || null,
        book_value_per_share: parseFloat(overview.BookValue) || null,
        free_cash_flow_per_share: null // Not directly available
      };

      metrics.push(currentMetrics);

      // If we have income statement data, we can add historical metrics
      if (incomeResponse.data && incomeResponse.data.annualReports) {
        const reports = incomeResponse.data.annualReports
          .filter((report: any) => report.fiscalDateEnding <= endDate)
          .slice(0, limit - 1); // Leave room for the current metrics
        
        reports.forEach((report: any) => {
          // Most historical metrics will be null or calculated from the report
          const revenue = parseFloat(report.totalRevenue || '0');
          const netIncome = parseFloat(report.netIncome || '0');
          
          metrics.push({
            ticker,
            calendar_date: report.fiscalDateEnding,
            report_period: report.fiscalDateEnding,
            period: 'annual',
            currency: report.reportedCurrency,
            market_cap: null, // Historical market cap not available
            enterprise_value: null,
            price_to_earnings_ratio: null,
            price_to_book_ratio: null,
            price_to_sales_ratio: null,
            enterprise_value_to_ebitda_ratio: null,
            enterprise_value_to_revenue_ratio: null,
            free_cash_flow_yield: null,
            peg_ratio: null,
            gross_margin: revenue > 0 ? (parseFloat(report.grossProfit || '0') / revenue) * 100 : null,
            operating_margin: revenue > 0 ? (parseFloat(report.operatingIncome || '0') / revenue) * 100 : null,
            net_margin: revenue > 0 ? (netIncome / revenue) * 100 : null,
            return_on_equity: null, // Would need balance sheet data
            return_on_assets: null, // Would need balance sheet data
            return_on_invested_capital: null,
            asset_turnover: null,
            inventory_turnover: null,
            receivables_turnover: null,
            days_sales_outstanding: null,
            operating_cycle: null,
            working_capital_turnover: null,
            current_ratio: null, // Would need balance sheet data
            quick_ratio: null, // Would need balance sheet data
            cash_ratio: null,
            operating_cash_flow_ratio: null,
            debt_to_equity: null, // Would need balance sheet data
            debt_to_assets: null,
            interest_coverage: parseFloat(report.interestExpense || '0') !== 0 
              ? parseFloat(report.ebitda || '0') / parseFloat(report.interestExpense) 
              : null,
            revenue_growth: null, // Would need previous year's data
            earnings_growth: null, // Would need previous year's data
            book_value_growth: null,
            earnings_per_share_growth: null,
            free_cash_flow_growth: null,
            operating_income_growth: null,
            ebitda_growth: null,
            payout_ratio: null,
            earnings_per_share: null, // Not available in report
            book_value_per_share: null, // Not available in report
            free_cash_flow_per_share: null
          });
        });
      }

      if (metrics.length > 0) {
        this.cache.setFinancialMetrics(ticker, metrics);
      }

      return metrics.slice(0, limit);
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
      // 1. Fetch income statement
      const incomeResponse = await axios.get(
        this.baseUrl,
        {
          params: {
            ...this.getBaseParams(),
            function: 'INCOME_STATEMENT',
            symbol: ticker
          }
        }
      );

      // 2. Fetch balance sheet
      const balanceResponse = await axios.get(
        this.baseUrl,
        {
          params: {
            ...this.getBaseParams(),
            function: 'BALANCE_SHEET',
            symbol: ticker
          }
        }
      );

      // 3. Fetch cash flow
      const cashFlowResponse = await axios.get(
        this.baseUrl,
        {
          params: {
            ...this.getBaseParams(),
            function: 'CASH_FLOW',
            symbol: ticker
          }
        }
      );

      // Map of line item keys to Alpha Vantage keys
      const lineItemMapping: Record<string, { source: 'income' | 'balance' | 'cash', key: string }> = {
        'revenue': { source: 'income', key: 'totalRevenue' },
        'gross_profit': { source: 'income', key: 'grossProfit' },
        'operating_income': { source: 'income', key: 'operatingIncome' },
        'net_income': { source: 'income', key: 'netIncome' },
        'total_assets': { source: 'balance', key: 'totalAssets' },
        'total_liabilities': { source: 'balance', key: 'totalLiabilities' },
        'total_shareholders_equity': { source: 'balance', key: 'totalShareholderEquity' },
        'cash_and_equivalents': { source: 'balance', key: 'cashAndCashEquivalentsAtCarryingValue' },
        'operating_cash_flow': { source: 'cash', key: 'operatingCashflow' },
        'capital_expenditures': { source: 'cash', key: 'capitalExpenditures' },
        // Add more mappings as needed
      };

      // Select the appropriate reports based on the period
      const isQuarterly = period.toLowerCase() === 'quarterly' || period.toLowerCase() === 'ttm';
      
      // Get reports from each source
      const incomeReports = isQuarterly 
        ? incomeResponse.data?.quarterlyReports || []
        : incomeResponse.data?.annualReports || [];
      
      const balanceReports = isQuarterly
        ? balanceResponse.data?.quarterlyReports || []
        : balanceResponse.data?.annualReports || [];
      
      const cashFlowReports = isQuarterly
        ? cashFlowResponse.data?.quarterlyReports || []
        : cashFlowResponse.data?.annualReports || [];

      // Filter reports by end date
      const filteredIncomeReports = incomeReports
        .filter((report: any) => report.fiscalDateEnding <= endDate)
        .slice(0, limit);
      
      const filteredBalanceReports = balanceReports
        .filter((report: any) => report.fiscalDateEnding <= endDate)
        .slice(0, limit);
      
      const filteredCashFlowReports = cashFlowReports
        .filter((report: any) => report.fiscalDateEnding <= endDate)
        .slice(0, limit);

      // Create a map of dates to reports for quick lookup
      const incomeReportMap = new Map(
        filteredIncomeReports.map((report: any) => [report.fiscalDateEnding, report])
      );
      
      const balanceReportMap = new Map(
        filteredBalanceReports.map((report: any) => [report.fiscalDateEnding, report])
      );
      
      const cashFlowReportMap = new Map(
        filteredCashFlowReports.map((report: any) => [report.fiscalDateEnding, report])
      );

      // Get unique dates across all reports
      const allDates = [...new Set([
        ...filteredIncomeReports.map((r: any) => r.fiscalDateEnding),
        ...filteredBalanceReports.map((r: any) => r.fiscalDateEnding),
        ...filteredCashFlowReports.map((r: any) => r.fiscalDateEnding)
      ])].sort().reverse().slice(0, limit);

      // Create line items
      const result: LineItem[] = allDates.map(date => {
        const lineItem: Record<string, any> = {
          ticker,
          report_period: date,
          period: isQuarterly ? 'quarterly' : 'annual',
        };

        // Fill in requested line items
        lineItems.forEach(itemKey => {
          if (lineItemMapping[itemKey]) {
            const { source, key } = lineItemMapping[itemKey];
            let report: Record<string, any> | undefined;
            
            if (source === 'income') {
              report = incomeReportMap.get(date) as Record<string, any> | undefined;
            } else if (source === 'balance') {
              report = balanceReportMap.get(date) as Record<string, any> | undefined;
            } else if (source === 'cash') {
              report = cashFlowReportMap.get(date) as Record<string, any> | undefined;
            }

            if (report && key in report) {
              lineItem[itemKey] = parseFloat(report[key] as string) || null;
            } else {
              lineItem[itemKey] = null;
            }
          } else {
            // Line item not found in our mapping
            lineItem[itemKey] = null;
          }
        });

        return lineItem as LineItem;
      });

      return result;
    } catch (error) {
      console.error('Error searching line items:', error);
      throw error;
    }
  }

  /**
   * Fetch insider trades
   * Note: Alpha Vantage free tier doesn't provide insider trades data
   */
  public async getInsiderTrades(
    ticker: string,
    endDate: string,
    startDate?: string,
    limit: number = 1000
  ): Promise<InsiderTrade[]> {
    console.warn('Insider trades data is not available in Alpha Vantage free API');
    return [];
  }

  /**
   * Get market cap
   */
  public async getMarketCap(
    ticker: string,
    endDate: string
  ): Promise<number | null> {
    try {
      const response = await axios.get(
        this.baseUrl,
        {
          params: {
            ...this.getBaseParams(),
            function: 'OVERVIEW',
            symbol: ticker
          }
        }
      );

      if (response.data && response.data.MarketCapitalization) {
        return parseFloat(response.data.MarketCapitalization);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching market cap:', error);
      throw error;
    }
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