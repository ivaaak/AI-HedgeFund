import axios from 'axios';
import { Signal, AnalystType, SystemState, FinancialMetric, FundamentalsResponse, LineItem, PortfolioResponse, PriceData } from './types';

class ApiService {
  private baseUrl: string;
  private apiKey: string | null;

  constructor() {
    // Set the base URL from environment variable or default to localhost
    this.baseUrl = 'http://localhost:1914/api';
    this.apiKey = null;
  }

  // Configure axios instance with headers
  private getAxiosConfig() {
    const config: any = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (this.apiKey) {
      config.headers['X-API-KEY'] = this.apiKey;
    }

    return config;
  }

  // Get price data for a ticker
  public async getPrices(ticker: string, startDate: string, endDate: string): Promise<PriceData[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/financial-data/prices`,
        {
          ...this.getAxiosConfig(),
          params: { ticker, startDate, endDate }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching prices:', error);
      throw error;
    }
  }

  // Get financial metrics for a ticker
  public async getFinancialMetrics(ticker: string, endDate: string, period: string = 'ttm', limit: number = 10): Promise<FinancialMetric[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/financial-data/metrics`,
        {
          ...this.getAxiosConfig(),
          params: { ticker, endDate, period, limit }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching financial metrics:', error);
      throw error;
    }
  }

  // Get specific line items for a ticker
  public async getLineItems(ticker: string, lineItems: string[], endDate: string, period: string = 'ttm', limit: number = 10): Promise<LineItem[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/financial-data/line-items`,
        {
          ...this.getAxiosConfig(),
          params: {
            ticker,
            lineItems: lineItems.join(','),
            endDate,
            period,
            limit
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching line items:', error);
      throw error;
    }
  }

  // Get market cap for a ticker
  public async getMarketCap(ticker: string, endDate: string): Promise<number | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/financial-data/market-cap`,
        {
          ...this.getAxiosConfig(),
          params: { ticker, endDate }
        }
      );
      return response.data.marketCap;
    } catch (error) {
      console.error('Error fetching market cap:', error);
      return null;
    }
  }

  // Get historical price chart data for visualization
  public async getPriceChartData(ticker: string, startDate: string, endDate: string): Promise<any[]> {
    try {
      const prices = await this.getPrices(ticker, startDate, endDate);

      // Format the data for chart display
      return prices.map(price => ({
        date: price.time,
        value: price.close,
        open: price.open,
        high: price.high,
        low: price.low,
        volume: price.volume
      }));
    } catch (error) {
      console.error('Error creating price chart data:', error);
      throw error;
    }
  }

  // Get financial data overview for a ticker
  public async getFinancialOverview(ticker: string): Promise<any> {
    try {
      // Get current date
      const currentDate = new Date().toISOString().split('T')[0];

      // Calculate date one year ago
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const startDate = oneYearAgo.toISOString().split('T')[0];

      // Fetch metrics and latest price data
      const [metrics, prices, marketCap] = await Promise.all([
        this.getFinancialMetrics(ticker, currentDate),
        this.getPrices(ticker, startDate, currentDate),
        this.getMarketCap(ticker, currentDate)
      ]);

      // Get the most recent price
      const latestPrice = prices.length > 0 ? prices[prices.length - 1] : null;

      // Combine the data into an overview object
      return {
        ticker,
        latestPrice: latestPrice ? latestPrice.close : null,
        marketCap,
        metrics: metrics.length > 0 ? metrics[0] : null,
        priceChange: calculatePriceChange(prices),
        dataDate: currentDate
      };
    } catch (error) {
      console.error('Error fetching financial overview:', error);
      throw error;
    }
  }

  // Compare multiple tickers on key metrics
  public async compareStocks(tickers: string[], endDate: string): Promise<any> {
    try {
      const comparisons: any = {};

      // Define key metrics to compare with proper typing
      const keyMetrics = [
        'price_to_earnings_ratio',
        'price_to_book_ratio',
        'price_to_sales_ratio',
        'return_on_equity',
        'net_margin',
        'debt_to_equity'
      ] as const; // Make this a readonly tuple

      // Fetch metrics for each ticker
      for (const ticker of tickers) {
        const metrics = await this.getFinancialMetrics(ticker, endDate);

        if (metrics.length > 0) {
          const latestMetrics = metrics[0];

          // Extract just the metrics we want to compare with proper typing
          const comparisonData: any = { ticker };
          keyMetrics.forEach(metric => {
            // Use proper typing for accessing the metric
            comparisonData[metric] = latestMetrics[metric as keyof FinancialMetric];
          });

          comparisons[ticker] = comparisonData;
        }
      }

      return comparisons;
    } catch (error) {
      console.error('Error comparing stocks:', error);
      throw error;
    }
  }

  // Run fundamental analysis and get signals
  public async analyzeFundamentals(
    tickers: string[],
    startDate: string,
    endDate: string
  ): Promise<Signal[]> {
    try {
      // First try using the new direct endpoint
      try {
        const response = await axios.post(
          `${this.baseUrl}/financial-data/analyze/fundamentals`,
          { tickers, startDate, endDate },
          this.getAxiosConfig()
        );

        if (response.data && response.data.signals) {
          return response.data.signals;
        }
      } catch (directApiError) {
        console.log('Direct fundamental analysis endpoint unavailable, falling back to agent-based analysis');
        // Continue to the fallback method if the direct endpoint fails
      }

      // Fallback to the agent-based endpoint
      // Create agent state to send to the API
      const agentState = {
        messages: [],
        data: {
          tickers,
          start_date: startDate,
          end_date: endDate,
          portfolio: {
            cash: 1000000,
            positions: {},
            history: []
          },
          analyst_signals: {}
        },
        metadata: {}
      };

      const response = await axios.post<FundamentalsResponse>(
        `${this.baseUrl}/fundamentals/analyze`,
        agentState,
        this.getAxiosConfig()
      );

      // Extract and transform signals from the response
      const fundamentalAnalysis = response.data.data.analyst_signals.fundamentals_agent || {};

      // Transform to the format expected by the UI
      const signals: Signal[] = [];

      for (const [ticker, analysis] of Object.entries(fundamentalAnalysis)) {
        const { signal, confidence } = analysis as any;

        // Map the "bullish"/"bearish"/"neutral" to numeric values
        let signalValue = 0;
        if (signal === 'bullish') signalValue = 1;
        if (signal === 'bearish') signalValue = -1;

        signals.push({
          analyst: AnalystType.FUNDAMENTAL,
          ticker,
          value: signalValue,
          confidence: confidence || 0
        });
      }

      return signals;
    } catch (error) {
      console.error('Error running fundamental analysis:', error);
      throw error;
    }
  }

  // Manage portfolio based on signals
  public async managePortfolio(
    systemState: SystemState
  ): Promise<{ decision: any; portfolio: any }> {
    try {
      // Format the existing signals into the format expected by the API
      const analystSignals: Record<string, Record<string, any>> = {};

      if (systemState.signals) {
        // Group signals by analyst type
        Object.values(systemState.signals).forEach(signal => {
          const analystType = signal.analyst.toLowerCase();
          if (!analystSignals[analystType]) {
            analystSignals[analystType] = {};
          }

          analystSignals[analystType][signal.ticker] = {
            signal: signal.value > 0 ? 'bullish' : signal.value < 0 ? 'bearish' : 'neutral',
            confidence: signal.confidence,
            reasoning: null
          };
        });
      }

      // Create portfolio state for the API
      const portfolio = {
        cash: 1000000, // Default starting cash
        positions: {}, // Will be populated from systemState if available
        history: []    // Will be populated from systemState if available
      };

      // Create agent state to send to the API
      const agentState = {
        messages: [],
        data: {
          tickers: Object.keys(analystSignals[Object.keys(analystSignals)[0]] || {}),
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          portfolio,
          analyst_signals: analystSignals
        },
        metadata: {}
      };

      const response = await axios.post<PortfolioResponse>(
        `${this.baseUrl}/portfolio/manage`,
        agentState,
        this.getAxiosConfig()
      );

      // Extract the portfolio decision from the response
      const lastMessage = response.data.messages[response.data.messages.length - 1];
      const decisions = lastMessage ? JSON.parse(lastMessage.content) : {};

      return {
        decision: decisions,
        portfolio: response.data.data.portfolio
      };
    } catch (error) {
      console.error('Error managing portfolio:', error);
      throw error;
    }
  }

  // Health check endpoint
  public async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl.replace('/api', '')}/health`);
      return response.data.status === 'ok';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Helper function to calculate price change
function calculatePriceChange(prices: PriceData[]): { absolute: number; percentage: number } | null {
  if (!prices || prices.length < 2) {
    return null;
  }

  const oldestPrice = prices[0].close;
  const latestPrice = prices[prices.length - 1].close;

  const absoluteChange = latestPrice - oldestPrice;
  const percentageChange = (absoluteChange / oldestPrice) * 100;

  return {
    absolute: parseFloat(absoluteChange.toFixed(2)),
    percentage: parseFloat(percentageChange.toFixed(2))
  };
}

export default new ApiService();