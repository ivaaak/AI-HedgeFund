import { ProgressService } from './progress.service';
import { OpenAIService } from './openai.service';
import { AgentState, AnalystSignal } from '../data/models';

export interface PortfolioDecision {
  action: 'buy' | 'sell' | 'hold';
  quantity: number;
  confidence: number;
  reasoning: string;
}

export interface RiskData {
  remaining_position_limit: number;
  current_price: number;
}

export class PortfolioManagementService {
  private progressService: ProgressService;
  private openAIService: OpenAIService;

  constructor(openAIApiKey?: string) {
    this.progressService = new ProgressService();
    this.openAIService = new OpenAIService(openAIApiKey);
  }

  /**
   * Process analyst signals for a ticker
   */
  private async processAnalystSignals(
    ticker: string,
    analystSignals: AgentState['data']['analyst_signals']
  ): Promise<{
    signals: { [agent: string]: AnalystSignal };
    riskData: RiskData;
  }> {
    const signals: { [agent: string]: AnalystSignal } = {};

    // Create a default riskData object
    const defaultRiskData: RiskData = {
      remaining_position_limit: 0,
      current_price: 0
    };

    // Check if we have risk management data for this ticker
    const riskManagementAgent = analystSignals['risk_management_agent'];
    const riskManagementData = riskManagementAgent ? riskManagementAgent[ticker] : undefined;

    // Safely extract the required properties if they exist
    const remaining_position_limit = riskManagementData && 'remaining_position_limit' in riskManagementData
      ? Number(riskManagementData.remaining_position_limit)
      : 0;

    const current_price = riskManagementData && 'current_price' in riskManagementData
      ? Number(riskManagementData.current_price)
      : 0;

    // Create a RiskData object with the extracted values
    const riskData: RiskData = {
      remaining_position_limit,
      current_price
    };

    for (const [agent, agentSignals] of Object.entries(analystSignals)) {
      if (agent !== 'risk_management_agent' && ticker in agentSignals) {
        signals[agent] = {
          signal: agentSignals[ticker].signal,
          confidence: agentSignals[ticker].confidence,
          reasoning: null,
          max_position_size: null
        };
      }
    }

    return { signals, riskData };
  }

  /**
   * Calculate maximum shares that can be purchased based on position limit
   */
  private calculateMaxShares(positionLimit: number, currentPrice: number): number {
    return currentPrice > 0 ? Math.floor(positionLimit / currentPrice) : 0;
  }

  /**
   * Generate prompt for OpenAI to make portfolio decisions
   */
  private generatePromptTemplate(data: {
    signalsByTicker: { [ticker: string]: { [agent: string]: AnalystSignal } };
    currentPrices: { [ticker: string]: number };
    maxShares: { [ticker: string]: number };
    portfolioCash: number;
    portfolioPositions: AgentState['data']['portfolio']['positions'];
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
    Cash: ${data.portfolioCash.toFixed(2)}
    Current Positions: ${JSON.stringify(data.portfolioPositions, null, 2)}
    
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
   * Make a decision using OpenAI
   */
  private async makeDecision(
    prompt: string,
    tickers: string[],
    maxRetries: number = 3
  ): Promise<{ [ticker: string]: PortfolioDecision }> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.openAIService.getCompletion<{ decisions: { [ticker: string]: PortfolioDecision } }>(prompt);
        return result.decisions;
      } catch (error) {
        this.progressService.updateStatus(
          'portfolio_management_agent',
          null,
          `Error - retry ${attempt + 1}/${maxRetries}`
        );

        if (attempt === maxRetries - 1) {
          // Return safe default on final attempt
          return tickers.reduce((acc, ticker) => {
            acc[ticker] = {
              action: 'hold',
              quantity: 0,
              confidence: 0,
              reasoning: 'Error in portfolio management, defaulting to hold'
            };
            return acc;
          }, {} as { [ticker: string]: PortfolioDecision });
        }
      }
    }
    throw new Error('Failed to make portfolio decision');
  }

  /**
   * Manage portfolio based on analysis signals
   */
  public async managePortfolio(state: AgentState): Promise<{
    messages: any[];
    data: AgentState['data'];
  }> {
    const { portfolio, analyst_signals, tickers } = state.data;

    this.progressService.updateStatus('portfolio_management_agent', null, 'Analyzing signals');

    const signalsByTicker: { [ticker: string]: { [agent: string]: AnalystSignal } } = {};
    const currentPrices: { [ticker: string]: number } = {};
    const maxShares: { [ticker: string]: number } = {};

    // Process signals for each ticker
    for (const ticker of tickers) {
      this.progressService.updateStatus(
        'portfolio_management_agent',
        ticker,
        'Processing analyst signals'
      );

      const { signals, riskData } = await this.processAnalystSignals(ticker, analyst_signals);

      signalsByTicker[ticker] = signals;
      currentPrices[ticker] = riskData.current_price;
      maxShares[ticker] = this.calculateMaxShares(
        riskData.remaining_position_limit,
        riskData.current_price
      );
    }

    this.progressService.updateStatus(
      'portfolio_management_agent',
      null,
      'Preparing trading strategy'
    );

    const prompt = this.generatePromptTemplate({
      signalsByTicker,
      currentPrices,
      maxShares,
      portfolioCash: portfolio.cash,
      portfolioPositions: portfolio.positions
    });

    this.progressService.updateStatus(
      'portfolio_management_agent',
      null,
      'Making trading decisions with OpenAI'
    );

    const decisions = await this.makeDecision(prompt, tickers);

    const message = {
      content: JSON.stringify(decisions),
      name: 'portfolio_management_agent'
    };

    if (state.metadata.show_reasoning) {
      console.log('Portfolio Management Agent Reasoning:', decisions);
    }

    this.progressService.updateStatus('portfolio_management_agent', null, 'Done');

    return {
      messages: [...state.messages, message],
      data: state.data
    };
  }
}