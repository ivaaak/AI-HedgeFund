import { OpenAIService } from './openai.service';

// Type definitions
export interface Portfolio {
  cash: number;
  cost_basis: Record<string, number>;
}

export interface RiskAnalysisResult {
  remaining_position_limit: number;
  current_price: number;
  reasoning: {
    portfolio_value: number;
    current_position: number;
    position_limit: number;
    remaining_limit: number;
    available_cash: number;
  };
}

export interface RiskManagementRequest {
  tickers: string[];
  start_date: string;
  end_date: string;
  portfolio: Portfolio;
}

export interface PriceData {
  date: string;
  open: number;
  high: number;
  close: number;
  low: number;
  volume: number;
}

export class RiskManagerService {
  private openAIService: OpenAIService;
  
  constructor(apiKey?: string) {
    this.openAIService = new OpenAIService(apiKey);
  }
  
  /**
   * Analyze risk management for multiple tickers
   */
  public async analyzeRisk(request: RiskManagementRequest): Promise<Record<string, RiskAnalysisResult>> {
    try {
      const { tickers, start_date, end_date, portfolio } = request;
      
      if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
        throw new Error('Invalid tickers provided');
      }
      
      if (!start_date || !end_date) {
        throw new Error('Start date and end date are required');
      }
      
      if (!portfolio) {
        throw new Error('Portfolio information is required');
      }
      
      // Initialize risk analysis for each ticker
      const riskAnalysis: Record<string, RiskAnalysisResult> = {};
      const currentPrices: Record<string, number> = {}; // Store prices to avoid redundant API calls
      
      for (const ticker of tickers) {
        // Get historical price data
        const prices = await this.getPriceData(ticker, start_date, end_date);
        
        if (!prices || prices.length === 0) {
          console.warn(`No price data found for ${ticker}`);
          continue;
        }
        
        // Calculate portfolio value
        const currentPrice = prices[prices.length - 1].close;
        currentPrices[ticker] = currentPrice; // Store the current price
        
        // Calculate current position value for this ticker
        const currentPositionValue = portfolio.cost_basis[ticker] || 0;
        
        // Calculate total portfolio value using stored prices
        const totalPortfolioValue = portfolio.cash + 
          Object.entries(portfolio.cost_basis).reduce((sum, [t, value]) => sum + value, 0);
        
        // Base limit is 20% of portfolio for any single position
        const positionLimit = totalPortfolioValue * 0.20;
        
        // For existing positions, subtract current position value from limit
        const remainingPositionLimit = positionLimit - currentPositionValue;
        
        // Ensure we don't exceed available cash
        const maxPositionSize = Math.min(remainingPositionLimit, portfolio.cash);
        
        riskAnalysis[ticker] = {
          remaining_position_limit: maxPositionSize,
          current_price: currentPrice,
          reasoning: {
            portfolio_value: totalPortfolioValue,
            current_position: currentPositionValue,
            position_limit: positionLimit,
            remaining_limit: remainingPositionLimit,
            available_cash: portfolio.cash,
          },
        };
      }
      
      return riskAnalysis;
    } catch (error) {
      console.error('Error in risk analysis:', error);
      throw error;
    }
  }
  
  /**
   * Get price data for a specific ticker
   */
  public async getPriceData(ticker: string, startDate: string, endDate: string): Promise<PriceData[]> {
    try {
      // In a real implementation, this would call an external API or database
      // This could be replaced with a call to Alpha Vantage, Yahoo Finance, etc.
      
      // For demonstration, returning mock data
      const mockData: PriceData[] = [];
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      let currentDate = new Date(startDateObj);
      let basePrice = 100 + Math.random() * 50;
      
      while (currentDate <= endDateObj) {
        // Skip weekends
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          const dailyVolatility = 0.02;
          const change = (Math.random() - 0.5) * dailyVolatility * basePrice;
          
          const open = basePrice;
          const close = basePrice + change;
          const high = Math.max(open, close) + Math.random() * Math.abs(change);
          const low = Math.min(open, close) - Math.random() * Math.abs(change);
          const volume = Math.floor(100000 + Math.random() * 900000);
          
          mockData.push({
            date: currentDate.toISOString().split('T')[0],
            open,
            high,
            close,
            low,
            volume
          });
          
          basePrice = close;
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return mockData;
    } catch (error) {
      console.error(`Error fetching price data for ${ticker}:`, error);
      throw error;
    }
  }
  
  /**
   * Calculate position size based on risk parameters
   */
  public calculatePositionSize(
    signal: string, 
    confidence: number, 
    currentPrice: number, 
    remainingPositionLimit: number
  ): number {
    // Skip bearish signals for position sizing
    if (signal === 'bearish') {
      return 0;
    }
    
    // For bullish signals, scale based on confidence
    if (signal === 'bullish') {
      // Scale from 0% to 100% of remaining position limit based on confidence
      const scaledLimit = remainingPositionLimit * (confidence / 100);
      return scaledLimit / currentPrice; // Convert to number of shares
    }
    
    // For neutral signals, use a smaller position size (25% of bullish)
    return (remainingPositionLimit * 0.25) / currentPrice;
  }
  
  /**
   * Generate portfolio recommendations based on signals and risk analysis
   */
  public async generateRecommendations(
    technicalSignals: Record<string, any>,
    fundamentalSignals: Record<string, any>,
    riskAnalysis: Record<string, RiskAnalysisResult>,
    portfolio: Portfolio
  ): Promise<any> {
    try {
      // Combine signals from various sources
      const combinedSignals: Record<string, any> = {};
      
      for (const ticker of Object.keys(riskAnalysis)) {
        const technical = technicalSignals[ticker] || { signal: 'neutral', confidence: 50 };
        const fundamental = fundamentalSignals[ticker] || { signal: 'neutral', confidence: 50 };
        
        // Simple weighted combination of signals
        const signalValues = { bullish: 1, neutral: 0, bearish: -1 };
        const technicalValue = signalValues[technical.signal] * (technical.confidence / 100);
        const fundamentalValue = signalValues[fundamental.signal] * (fundamental.confidence / 100);
        
        // 60% weight to technical, 40% to fundamental
        const combinedValue = 0.6 * technicalValue + 0.4 * fundamentalValue;
        
        let combinedSignal = 'neutral';
        if (combinedValue > 0.2) {
          combinedSignal = 'bullish';
        } else if (combinedValue < -0.2) {
          combinedSignal = 'bearish';
        }
        
        const combinedConfidence = Math.round(Math.abs(combinedValue) * 100);
        
        // Calculate position size based on risk parameters
        const { current_price, remaining_position_limit } = riskAnalysis[ticker];
        const recommendedShares = this.calculatePositionSize(
          combinedSignal,
          combinedConfidence,
          current_price,
          remaining_position_limit
        );
        
        // Current position in shares
        const currentPositionValue = portfolio.cost_basis[ticker] || 0;
        const currentShares = currentPositionValue / current_price;
        
        // Generate action recommendation
        let action = 'hold';
        let actionShares = 0;
        
        if (combinedSignal === 'bullish' && recommendedShares > currentShares) {
          action = 'buy';
          actionShares = Math.floor(recommendedShares - currentShares);
        } else if (combinedSignal === 'bearish') {
          action = 'sell';
          actionShares = Math.floor(currentShares);
        }
        
        combinedSignals[ticker] = {
          technical_signal: technical.signal,
          fundamental_signal: fundamental.signal,
          combined_signal: combinedSignal,
          confidence: combinedConfidence,
          action,
          shares: actionShares,
          estimated_value: actionShares * current_price,
          current_position_shares: Math.floor(currentShares),
          current_price,
        };
      }
      
      return {
        recommendations: combinedSignals,
        portfolio_summary: {
          total_value: portfolio.cash + 
            Object.entries(portfolio.cost_basis).reduce((sum, [t, value]) => sum + value, 0),
          cash: portfolio.cash,
          invested: Object.entries(portfolio.cost_basis).reduce((sum, [t, value]) => sum + value, 0),
        }
      };
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }
}