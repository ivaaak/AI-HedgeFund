import axios from 'axios';
import { Signal, AnalystType, SystemState } from './types';

// Define API response types
interface FundamentalsResponse {
  messages: Array<{ content: string; name: string }>;
  data: any;
}

interface PortfolioResponse {
  messages: Array<{ content: string; name: string }>;
  data: any;
}

interface PriceData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

class ApiService {
  private baseUrl: string;
  private apiKey: string | null;

  constructor() {
    // Set the base URL from environment variable or default to localhost
    this.baseUrl = 'http://localhost:3000/api';
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
  public async getFinancialMetrics(ticker: string, endDate: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/financial-data/metrics`, 
        {
          ...this.getAxiosConfig(),
          params: { ticker, endDate, period: 'ttm', limit: 10 }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching financial metrics:', error);
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

export default new ApiService();