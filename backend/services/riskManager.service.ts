import config from '../config';
import { AnalysisRequest, AnalysisResponse, AnalystSignal, Portfolio, RiskAnalysisResult, SignalDirection, TradeAction } from '../data/models';
import { HttpError } from '../middleware/middleware';
import { daysBefore } from '../middleware/validation';
import { analyzeEach, clamp } from './analysis.util';
import { FinancialDataService, financialDataService } from './financialData.service';
import { annualizedVolatility, maxDrawdown } from './indicators';
import { markToMarket, portfolioValue, equityValue } from './portfolio';

export interface RiskManagementRequest extends AnalysisRequest {
  portfolio: Portfolio;
}

export interface Recommendation {
  technical_signal: SignalDirection;
  fundamental_signal: SignalDirection;
  combined_signal: SignalDirection;
  confidence: number;
  action: TradeAction;
  shares: number;
  estimated_value: number;
  current_position_shares: number;
  current_price: number;
}

export interface RecommendationsResult {
  recommendations: Record<string, Recommendation>;
  portfolio_summary: {
    total_value: number;
    cash: number;
    invested: number;
  };
}

type SignalInput = Pick<AnalystSignal, 'signal' | 'confidence'>;

// Volatility is measured over at least this many days
const MIN_LOOKBACK_DAYS = 90;
// Annualized volatility that maps to the maximum risk score of 10
const MAX_SCORE_VOLATILITY = 0.6;

export class RiskManagerService {
  constructor(private financialData: FinancialDataService = financialDataService) {}

  /**
   * Analyze risk management for multiple tickers: position limits and price risk
   */
  public async analyzeRisk(request: RiskManagementRequest): Promise<AnalysisResponse<RiskAnalysisResult>> {
    const { tickers, start_date, end_date, portfolio } = request;

    const lookbackStart = daysBefore(end_date, MIN_LOOKBACK_DAYS);
    const startDate = start_date < lookbackStart ? start_date : lookbackStart;

    // Fetch prices first: the portfolio has to be valued before limits can be set
    const priceData = await analyzeEach('risk_management_agent', tickers, async ticker => {
      const prices = await this.financialData.getPrices(ticker, startDate, end_date);
      if (prices.length === 0) {
        throw new HttpError(404, `No price data found for ${ticker}`);
      }
      return prices.map(p => p.close);
    });

    const currentPrices: Record<string, number> = {};
    for (const [ticker, closes] of Object.entries(priceData.results)) {
      currentPrices[ticker] = closes[closes.length - 1];
    }

    const marked = markToMarket(portfolio, currentPrices);
    const totalPortfolioValue = portfolioValue(marked);

    // Limit for any single position
    const positionLimit = totalPortfolioValue * config.maxPositionPct;

    const response: AnalysisResponse<RiskAnalysisResult> = { results: {}, errors: priceData.errors };

    for (const [ticker, closes] of Object.entries(priceData.results)) {
      const currentPrice = currentPrices[ticker];
      const currentPositionValue = (marked.positions[ticker]?.shares || 0) * currentPrice;

      // For existing positions, subtract current position value from limit
      const remainingPositionLimit = Math.max(0, positionLimit - currentPositionValue);

      const volatility = annualizedVolatility(closes);

      response.results[ticker] = {
        // Ensure we don't exceed available cash
        remaining_position_limit: Math.min(remainingPositionLimit, marked.cash),
        current_price: currentPrice,
        risk_score: isNaN(volatility) ? 5 : Number(clamp(volatility / MAX_SCORE_VOLATILITY * 10, 1, 10).toFixed(1)),
        reasoning: {
          portfolio_value: totalPortfolioValue,
          current_position: currentPositionValue,
          position_limit: positionLimit,
          remaining_limit: remainingPositionLimit,
          available_cash: marked.cash,
          annualized_volatility: isNaN(volatility) ? null : volatility,
          max_drawdown: closes.length > 1 ? maxDrawdown(closes) : null
        }
      };
    }

    return response;
  }

  /**
   * Calculate position size (in shares) based on risk parameters
   */
  public calculatePositionSize(
    signal: SignalDirection,
    confidence: number,
    currentPrice: number,
    remainingPositionLimit: number
  ): number {
    // Skip bearish signals for position sizing
    if (signal === 'bearish' || currentPrice <= 0) {
      return 0;
    }

    // For bullish signals, scale from 0% to 100% of remaining position limit based on confidence
    if (signal === 'bullish') {
      return (remainingPositionLimit * (confidence / 100)) / currentPrice;
    }

    // For neutral signals, use a smaller position size (25% of bullish)
    return (remainingPositionLimit * 0.25) / currentPrice;
  }

  /**
   * Generate portfolio recommendations based on signals and risk analysis
   */
  public generateRecommendations(
    technicalSignals: Record<string, SignalInput>,
    fundamentalSignals: Record<string, SignalInput>,
    riskAnalysis: Record<string, RiskAnalysisResult>,
    portfolio: Portfolio
  ): RecommendationsResult {
    const signalValues: Record<SignalDirection, number> = { bullish: 1, neutral: 0, bearish: -1 };
    const neutral: SignalInput = { signal: 'neutral', confidence: 50 };
    const recommendations: Record<string, Recommendation> = {};

    for (const ticker of Object.keys(riskAnalysis)) {
      const technical = technicalSignals[ticker] || neutral;
      const fundamental = fundamentalSignals[ticker] || neutral;

      // Simple weighted combination of signals: 60% technical, 40% fundamental
      const technicalValue = (signalValues[technical.signal] ?? 0) * (technical.confidence / 100);
      const fundamentalValue = (signalValues[fundamental.signal] ?? 0) * (fundamental.confidence / 100);
      const combinedValue = 0.6 * technicalValue + 0.4 * fundamentalValue;

      let combinedSignal: SignalDirection = 'neutral';
      if (combinedValue > 0.2) {
        combinedSignal = 'bullish';
      } else if (combinedValue < -0.2) {
        combinedSignal = 'bearish';
      }

      const combinedConfidence = Math.round(Math.abs(combinedValue) * 100);

      // Calculate position size based on risk parameters
      const { current_price, remaining_position_limit } = riskAnalysis[ticker];
      const additionalShares = Math.floor(this.calculatePositionSize(
        combinedSignal,
        combinedConfidence,
        current_price,
        remaining_position_limit
      ));

      const currentShares = portfolio.positions[ticker]?.shares || 0;

      // Generate action recommendation
      let action: TradeAction = 'hold';
      let actionShares = 0;

      if (combinedSignal === 'bullish' && additionalShares > 0) {
        action = 'buy';
        actionShares = additionalShares;
      } else if (combinedSignal === 'bearish' && currentShares > 0) {
        action = 'sell';
        actionShares = currentShares;
      }

      recommendations[ticker] = {
        technical_signal: technical.signal,
        fundamental_signal: fundamental.signal,
        combined_signal: combinedSignal,
        confidence: combinedConfidence,
        action,
        shares: actionShares,
        estimated_value: actionShares * current_price,
        current_position_shares: currentShares,
        current_price
      };
    }

    const invested = equityValue(portfolio);

    return {
      recommendations,
      portfolio_summary: {
        total_value: portfolio.cash + invested,
        cash: portfolio.cash,
        invested
      }
    };
  }
}
