import axios, { AxiosInstance } from 'axios';
import {
  AnalysisResponse,
  AnalystSignal,
  AnalystSignals,
  AnalystType,
  DecisionResult,
  FinancialMetric,
  HedgeFundRunResponse,
  LineItem,
  Portfolio,
  PriceData,
  RiskAnalysisResult,
  RiskAssessment
} from './types';

// Endpoint of each analyst
const ANALYST_ENDPOINTS: Record<AnalystType, string> = {
  [AnalystType.FUNDAMENTAL]: '/fundamentals/analyze',
  [AnalystType.TECHNICAL]: '/technical/analyze',
  [AnalystType.SENTIMENT]: '/sentiment/analyze',
  [AnalystType.VALUATION]: '/valuation/analyze'
};

class ApiService {
  private baseUrl: string;
  private http: AxiosInstance;

  constructor() {
    // Relative by default: the Vite dev server proxies /api and /health to the backend
    this.baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
    const apiKey = import.meta.env.VITE_API_KEY;

    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-KEY': apiKey } : {})
      }
    });
  }

  // Turns an API failure into the message the backend sent, when there is one
  public errorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const serverMessage = (error.response?.data as { error?: string } | undefined)?.error;
      if (serverMessage) return serverMessage;
      if (!error.response) return 'Cannot reach the API server';
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }

  // Get price data for a ticker, oldest first
  public async getPrices(ticker: string, startDate: string, endDate: string): Promise<PriceData[]> {
    const response = await this.http.get<PriceData[]>('/financial-data/prices', {
      params: { ticker, startDate, endDate }
    });
    return response.data;
  }

  // Get financial metrics for a ticker, newest first
  public async getFinancialMetrics(ticker: string, endDate: string, period: string = 'ttm', limit: number = 10): Promise<FinancialMetric[]> {
    const response = await this.http.get<FinancialMetric[]>('/financial-data/metrics', {
      params: { ticker, endDate, period, limit }
    });
    return response.data;
  }

  // Get specific line items for a ticker
  public async getLineItems(ticker: string, lineItems: string[], endDate: string, period: string = 'ttm', limit: number = 10): Promise<LineItem[]> {
    const response = await this.http.get<LineItem[]>('/financial-data/line-items', {
      params: { ticker, lineItems: lineItems.join(','), endDate, period, limit }
    });
    return response.data;
  }

  // Run one analyst for the given tickers
  public async analyze(
    analyst: AnalystType,
    tickers: string[],
    startDate: string,
    endDate: string
  ): Promise<AnalysisResponse<AnalystSignal>> {
    const response = await this.http.post<AnalysisResponse<AnalystSignal>>(
      ANALYST_ENDPOINTS[analyst],
      { tickers, start_date: startDate, end_date: endDate }
    );
    return response.data;
  }

  // Calculate position limits and price risk
  public async analyzeRisk(
    tickers: string[],
    startDate: string,
    endDate: string,
    portfolio: Portfolio
  ): Promise<RiskAssessment> {
    const response = await this.http.post<RiskAssessment>(
      '/risk/analyze',
      { tickers, start_date: startDate, end_date: endDate, portfolio }
    );
    return response.data;
  }

  // Ask the portfolio manager for decisions based on existing signals and risk limits
  public async managePortfolio(
    tickers: string[],
    signals: AnalystSignals,
    risk: Record<string, RiskAnalysisResult>,
    portfolio: Portfolio
  ): Promise<DecisionResult> {
    const analystSignals: Record<string, Record<string, AnalystSignal>> = {};
    Object.entries(signals).forEach(([analyst, response]) => {
      if (response) {
        analystSignals[analyst] = response.results;
      }
    });

    const response = await this.http.post<DecisionResult>(
      '/portfolio/manage',
      { tickers, analyst_signals: analystSignals, risk, portfolio }
    );
    return response.data;
  }

  // Run the whole pipeline and execute the decisions as paper trades
  public async runHedgeFund(
    tickers: string[],
    startDate: string,
    endDate: string,
    portfolio: Portfolio
  ): Promise<HedgeFundRunResponse> {
    const response = await this.http.post<HedgeFundRunResponse>(
      '/hedge-fund/run',
      { tickers, start_date: startDate, end_date: endDate, portfolio }
    );
    return response.data;
  }

  // Health check endpoint
  public async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl.replace(/\/api$/, '')}/health`);
      return response.data.status === 'ok';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export default new ApiService();
