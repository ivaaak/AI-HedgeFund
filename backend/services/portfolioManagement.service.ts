import { AnalystSignal, Portfolio, PortfolioDecision, RiskAnalysisResult, SignalDirection, TradeAction } from '../data/models';
import { clamp } from './analysis.util';
import { createLlmService, LlmService } from './llm';

type SignalSummary = Pick<AnalystSignal, 'signal' | 'confidence'>;

// analyst -> ticker -> signal
export type AnalystSignals = Record<string, Record<string, SignalSummary>>;

export interface PortfolioManagementRequest {
  tickers: string[];
  analyst_signals: AnalystSignals;
  risk: Record<string, RiskAnalysisResult>;
  portfolio: Portfolio;
}

export interface PortfolioManagementResult {
  decisions: Record<string, PortfolioDecision>;
  // Whether the decisions came from the language model or the built-in rules
  source: 'llm' | 'rules';
  note?: string;
}

// Weights used by the rule-based decision; analysts without a weight get the default
const ANALYST_WEIGHTS: Record<string, number> = {
  fundamentals: 0.30,
  technicals: 0.25,
  valuation: 0.25,
  sentiment: 0.20
};
const DEFAULT_ANALYST_WEIGHT = 0.20;

// Combined score needed before trading, and the score at which the full size is used
const TRADE_THRESHOLD = 0.15;
const FULL_SIZE_SCORE = 0.5;

const SIGNAL_VALUES: Record<SignalDirection, number> = { bullish: 1, neutral: 0, bearish: -1 };

export class PortfolioManagementService {
  private llm: LlmService | null;

  constructor(llm: LlmService | null = createLlmService()) {
    this.llm = llm;
  }

  /**
   * Maximum shares that can be purchased within the position limit
   */
  private calculateMaxShares(risk: RiskAnalysisResult | undefined): number {
    if (!risk || risk.current_price <= 0) return 0;
    return Math.max(0, Math.floor(risk.remaining_position_limit / risk.current_price));
  }

  private signalsForTicker(ticker: string, analystSignals: AnalystSignals): Record<string, SignalSummary> {
    const signals: Record<string, SignalSummary> = {};
    for (const [agent, agentSignals] of Object.entries(analystSignals)) {
      const signal = agentSignals?.[ticker];
      if (signal) {
        signals[agent] = { signal: signal.signal, confidence: signal.confidence };
      }
    }
    return signals;
  }

  /**
   * Generate prompt for the language model to make portfolio decisions
   */
  private generatePrompt(data: {
    signalsByTicker: Record<string, Record<string, SignalSummary>>;
    currentPrices: Record<string, number>;
    maxShares: Record<string, number>;
    portfolio: Portfolio;
  }): string {
    return `You are a portfolio manager making final trading decisions.
    Your job is to make trading decisions based on the team's analysis for multiple tickers.

    Trading Rules:
    - Only buy if you have available cash
    - Only sell if you have shares to sell, otherwise hold
    - For sells: quantity must be ≤ current position shares
    - For buys: quantity must be ≤ max_shares provided for each ticker
    - The max_shares values are pre-calculated to respect position limits

    Based on the team's analysis below, make your trading decisions.

    For each ticker, here are the signals:
    ${JSON.stringify(data.signalsByTicker, null, 2)}

    Current Prices:
    ${JSON.stringify(data.currentPrices, null, 2)}

    Maximum Shares Allowed For Any Purchase:
    ${JSON.stringify(data.maxShares, null, 2)}

    Here is the current portfolio:
    Cash: ${data.portfolio.cash.toFixed(2)}
    Current Positions: ${JSON.stringify(data.portfolio.positions, null, 2)}

    Output your final decisions in a JSON object with the ticker as the key and an object containing:
    - action: "buy", "sell", or "hold"
    - quantity: number of shares to buy or sell (0 for hold)
    - confidence: your confidence level from 0-100
    - reasoning: a brief explanation of your decision

    Format your response as valid JSON only, with no other text:
    {
      "decisions": {
        "TICKER1": {
          "action": "buy|sell|hold",
          "quantity": number,
          "confidence": number,
          "reasoning": "string"
        },
        ...more tickers
      }
    }`;
  }

  /**
   * Deterministic decision from the weighted analyst signals
   */
  public decideByRules(request: PortfolioManagementRequest): Record<string, PortfolioDecision> {
    const decisions: Record<string, PortfolioDecision> = {};

    for (const ticker of request.tickers) {
      const signals = this.signalsForTicker(ticker, request.analyst_signals);
      const agents = Object.keys(signals);

      if (agents.length === 0) {
        decisions[ticker] = { action: 'hold', quantity: 0, confidence: 0, reasoning: 'No analyst signals available' };
        continue;
      }

      let weightedScore = 0;
      let totalWeight = 0;
      for (const agent of agents) {
        const weight = ANALYST_WEIGHTS[agent] ?? DEFAULT_ANALYST_WEIGHT;
        weightedScore += weight * (SIGNAL_VALUES[signals[agent].signal] ?? 0) * (signals[agent].confidence / 100);
        totalWeight += weight;
      }
      const score = weightedScore / totalWeight;
      const sizeFactor = Math.min(1, Math.abs(score) / FULL_SIZE_SCORE);
      const summary = agents.map(agent => `${agent}: ${signals[agent].signal} (${signals[agent].confidence}%)`).join(', ');

      let action: TradeAction = 'hold';
      let quantity = 0;

      if (score > TRADE_THRESHOLD) {
        action = 'buy';
        quantity = Math.floor(this.calculateMaxShares(request.risk[ticker]) * sizeFactor);
      } else if (score < -TRADE_THRESHOLD) {
        action = 'sell';
        quantity = Math.ceil((request.portfolio.positions[ticker]?.shares || 0) * sizeFactor);
      }

      decisions[ticker] = {
        action,
        quantity,
        confidence: Math.round(Math.abs(score) * 100),
        reasoning: `Combined score ${score.toFixed(2)} from ${summary}`
      };
    }

    return decisions;
  }

  /**
   * Makes every decision respect the trading rules: buys are limited by the
   * position limit and the remaining cash, sells by the shares held
   */
  public enforceConstraints(
    decisions: Record<string, Partial<PortfolioDecision> | undefined>,
    request: PortfolioManagementRequest
  ): Record<string, PortfolioDecision> {
    const result: Record<string, PortfolioDecision> = {};
    let availableCash = request.portfolio.cash;

    for (const ticker of request.tickers) {
      const decision = decisions[ticker];
      const requestedAction = String(decision?.action || 'hold').toLowerCase();
      let action: TradeAction = requestedAction === 'buy' || requestedAction === 'sell' ? requestedAction : 'hold';
      let quantity = Math.max(0, Math.floor(Number(decision?.quantity) || 0));
      let reasoning = decision?.reasoning ? String(decision.reasoning) : 'No reasoning provided';

      const price = request.risk[ticker]?.current_price || 0;

      if (action === 'buy') {
        const affordable = price > 0 ? Math.floor(availableCash / price) : 0;
        const allowed = Math.min(this.calculateMaxShares(request.risk[ticker]), affordable);
        if (quantity > allowed) {
          reasoning += ` (reduced from ${quantity} to ${allowed} shares by position and cash limits)`;
          quantity = allowed;
        }
        availableCash -= quantity * price;
      } else if (action === 'sell') {
        const held = request.portfolio.positions[ticker]?.shares || 0;
        if (quantity > held) {
          reasoning += ` (reduced from ${quantity} to ${held} shares held)`;
          quantity = held;
        }
      }

      if (action === 'hold' || quantity === 0) {
        action = 'hold';
        quantity = 0;
      }

      result[ticker] = {
        action,
        quantity,
        confidence: clamp(Math.round(Number(decision?.confidence) || 0), 0, 100),
        reasoning
      };
    }

    return result;
  }

  /**
   * Manage portfolio based on analysis signals
   */
  public async managePortfolio(request: PortfolioManagementRequest): Promise<PortfolioManagementResult> {
    let note: string | undefined;

    if (this.llm) {
      const signalsByTicker: Record<string, Record<string, SignalSummary>> = {};
      const currentPrices: Record<string, number> = {};
      const maxShares: Record<string, number> = {};

      for (const ticker of request.tickers) {
        signalsByTicker[ticker] = this.signalsForTicker(ticker, request.analyst_signals);
        currentPrices[ticker] = request.risk[ticker]?.current_price || 0;
        maxShares[ticker] = this.calculateMaxShares(request.risk[ticker]);
      }

      try {
        const prompt = this.generatePrompt({ signalsByTicker, currentPrices, maxShares, portfolio: request.portfolio });
        const response = await this.llm.getCompletion<{ decisions?: Record<string, Partial<PortfolioDecision>> }>(prompt);

        if (!response.decisions || typeof response.decisions !== 'object') {
          throw new Error('The model response did not contain decisions');
        }

        return { decisions: this.enforceConstraints(response.decisions, request), source: 'llm' };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`portfolio_management_agent: ${this.llm.provider} request failed, using rule-based decisions: ${message}`);
        note = 'AI decision unavailable; rule-based decision used instead';
      }
    }

    return {
      decisions: this.enforceConstraints(this.decideByRules(request), request),
      source: 'rules',
      ...(note ? { note } : {})
    };
  }
}
