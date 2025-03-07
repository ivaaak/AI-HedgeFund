// Import AgentState from models.ts instead of state.ts
import { AgentStateService } from "../services/agentstate.service";
import { FinancialDataService } from "../services/financialdata.service";
import { FundamentalsService } from "../services/fundamentals.service";
import { PortfolioManagementService } from "../services/portfoliomanagement.service";
import { ProgressService } from "../services/progress.service";
import { 
  Portfolio, 
  Position, 
  AnalysisMessage, 
  TradeRecord,
  AgentState // Import AgentState from models.ts
} from "../data/models";

// Define interfaces for missing types
interface BaseMessage {
  content: string;
  // Add other properties that BaseMessage might have
}

// Define the structure for portfolio decisions
interface PortfolioDecision {
  action: string;
  quantity: number;
}

// Define PositionSummary for performance calculation
interface PositionSummary {
  ticker: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  currentValue: number;
  profit: number;
  profitPercent: number;
}

export class HedgefundController {
  private agentStateService: AgentStateService;
  private fundamentalsService: FundamentalsService;
  private portfolioManagementService: PortfolioManagementService;
  private financialDataService: FinancialDataService;
  private progressService: ProgressService;

  constructor() {
    this.agentStateService = new AgentStateService();
    this.fundamentalsService = new FundamentalsService();
    this.portfolioManagementService = new PortfolioManagementService();
    this.financialDataService = new FinancialDataService();
    this.progressService = new ProgressService();
  }

  /**
   * Initialize agent state with required data
   */
  private async initializeState(tickers: string[], startDate: string, endDate: string): Promise<AgentState> {
    const state = this.agentStateService.createAgentState();
    
    // Initialize portfolio data with a structure that ensures type compatibility
    const portfolioData: Portfolio = {
      cash: 1000000, // $1M starting cash
      positions: {},
      history: []
    };
    
    // Initialize with required data
    const initialData = {
      tickers,
      start_date: startDate,
      end_date: endDate,
      analyst_signals: {},
      portfolio: portfolioData
    };

    return this.agentStateService.updateAgentState(
      state,
      [],
      initialData,
      { show_reasoning: true }
    );
  }

  /**
   * Run risk management analysis
   */
  private async runRiskManagement(state: AgentState): Promise<AgentState> {
    this.progressService.updateStatus('risk_management_agent', '', 'Starting risk analysis');
    
    const riskManagementData: Record<string, any> = {};
    
    // Get portfolio
    const portfolio = state.data.portfolio;
    const portfolioCash = portfolio.cash;
    
    // For each ticker, calculate position limit and risk metrics
    for (const ticker of state.data.tickers) {
      try {
        this.progressService.updateStatus('risk_management_agent', ticker, 'Fetching price data');
        
        // Get latest price
        const prices = await this.financialDataService.getPrices(
          ticker,
          state.data.start_date,
          state.data.end_date
        );
        
        if (!prices.length) {
          this.progressService.updateStatus('risk_management_agent', ticker, 'Error: No price data');
          continue;
        }
        
        const latestPrice = Number(prices[prices.length - 1].close);
        
        // Calculate position limit (10% of portfolio per position)
        const portfolioValue = portfolioCash + 
          Object.entries(portfolio.positions).reduce((sum, [t, pos]) => {
            const typedPosition = pos as Position;
            const positionValue = typedPosition.shares * (typedPosition.current_price || 0);
            return sum + positionValue;
          }, 0);
        
        const positionLimit = portfolioValue * 0.1; // 10% max position size
        
        // Get current position
        const currentPosition = portfolio.positions[ticker] as Position | undefined;
        const currentPositionValue = currentPosition ? 
          currentPosition.shares * latestPrice : 0;
        
        // Calculate remaining position limit
        const remainingPositionLimit = Math.max(0, positionLimit - currentPositionValue);
        
        riskManagementData[ticker] = {
          current_price: latestPrice,
          portfolio_value: portfolioValue,
          position_limit: positionLimit,
          current_position_value: currentPositionValue,
          remaining_position_limit: remainingPositionLimit
        };
        
        this.progressService.updateStatus('risk_management_agent', ticker, 'Done');
      } catch (error) {
        this.progressService.updateStatus('risk_management_agent', ticker, `Error: ${(error as Error).message}`);
      }
    }
    
    // Update state with risk management data
    const updatedState = this.agentStateService.updateAgentState(
      state,
      [],
      {
        analyst_signals: {
          ...state.data.analyst_signals,
          risk_management_agent: riskManagementData
        }
      }
    );
    
    return updatedState;
  }

  /**
   * Execute a complete analysis and portfolio management cycle
   */
  public async runAnalysisAndManagement(
    tickers: string[] = ['AAPL', 'MSFT', 'GOOG', 'AMZN', 'TSLA'],
    startDate: string = '2023-01-01',
    endDate: string = '2023-12-31'
  ): Promise<AgentState> {
    console.log(`Starting analysis for ${tickers.join(', ')} from ${startDate} to ${endDate}`);
    
    // Initialize state
    let state = await this.initializeState(tickers, startDate, endDate);
    
    // Run risk management
    state = await this.runRiskManagement(state);
    
    // Run fundamental analysis
    // Ensure state conforms to the models.ts AgentState definition before passing to services
    const modelsState = this.convertToModelsAgentState(state);
    const fundamentalResults = await this.fundamentalsService.analyzeFundamentals(modelsState);
    
    // Convert messages to AnalysisMessage[] if needed
    const fundamentalMessages = (fundamentalResults.messages as BaseMessage[]).map(msg => {
      return {
        ...msg,
        name: 'fundamental_analysis', // Add the required 'name' property
      } as AnalysisMessage;
    });
    
    state = this.agentStateService.updateAgentState(
      state,
      fundamentalMessages,
      { analyst_signals: fundamentalResults.data.analyst_signals }
    );
    
    // Run portfolio management
    // Again ensure state conforms to the models.ts AgentState definition
    const updatedModelsState = this.convertToModelsAgentState(state);
    const portfolioResults = await this.portfolioManagementService.managePortfolio(updatedModelsState);
    
    // Convert portfolio messages to AnalysisMessage[] if needed
    const portfolioMessages = (portfolioResults.messages as BaseMessage[]).map(msg => {
      return {
        ...msg,
        name: 'portfolio_management', // Add the required 'name' property
      } as AnalysisMessage;
    });
    
    state = this.agentStateService.updateAgentState(
      state,
      portfolioMessages,
      portfolioResults.data
    );
    
    // Execute trades based on portfolio decisions
    state = await this.executeTrades(state);
    
    return state;
  }
  
  /**
   * Helper method to convert any AgentState to the models.ts AgentState type
   * This ensures type compatibility when calling service methods
   */
  private convertToModelsAgentState(state: any): AgentState {
    // Ensure all messages have the required 'name' property
    const messages: AnalysisMessage[] = state.messages.map((msg: any) => {
      if (!msg.name) {
        return {
          ...msg,
          name: 'unknown', // Default name if missing
        };
      }
      return msg;
    });
    
    // Return a properly typed AgentState
    return {
      messages,
      data: state.data,
      metadata: state.metadata,
    };
  }
  
  /**
   * Execute trades based on portfolio decisions
   */
  private async executeTrades(state: AgentState): Promise<AgentState> {
    this.progressService.updateStatus('trade_execution', '', 'Executing trades');
    
    const portfolioDecision = JSON.parse(
      state.messages[state.messages.length - 1].content
    ) as Record<string, PortfolioDecision>;
    
    // Get portfolio
    const portfolio = state.data.portfolio;
    const portfolioCash = portfolio.cash;
    const tradeHistory: TradeRecord[] = [...portfolio.history];
    
    for (const [ticker, decision] of Object.entries(portfolioDecision)) {
      const { action, quantity } = decision;
      
      if (action === 'hold' || quantity <= 0) {
        continue;
      }
      
      // Risk management data is stored differently than other analyst signals
      // It has a custom structure that includes current_price rather than the FundamentalAnalysis structure
      const riskData = state.data.analyst_signals.risk_management_agent?.[ticker] as any;
      const currentPrice = riskData?.current_price;
      
      if (!currentPrice) {
        this.progressService.updateStatus(
          'trade_execution',
          ticker,
          `Missing price data`
        );
        continue;
      }
      
      if (action === 'buy') {
        const cost = quantity * currentPrice;
        
        // Check if we have enough cash
        if (cost > portfolioCash) {
          this.progressService.updateStatus(
            'trade_execution',
            ticker,
            `Insufficient funds to buy ${quantity} shares`
          );
          continue;
        }
        
        // Execute buy - update cash
        portfolio.cash = portfolio.cash - cost;
        
        if (!portfolio.positions[ticker]) {
          // Create a new position
          portfolio.positions[ticker] = {
            shares: 0,
            avg_price: 0,
            current_price: currentPrice
          };
        }
        
        // Update position
        const position = portfolio.positions[ticker] as Position;
        const totalShares = position.shares + quantity;
        const totalCost = (position.shares * position.avg_price) + cost;
        position.avg_price = totalCost / totalShares;
        position.shares = totalShares;
        position.current_price = currentPrice;
        
        // Add to history
        tradeHistory.push({
          date: new Date().toISOString(),
          ticker,
          action: 'buy',
          quantity,
          price: currentPrice,
          total: cost
        });
        
        this.progressService.updateStatus(
          'trade_execution',
          ticker,
          `Bought ${quantity} shares at ${currentPrice}`
        );
      } else if (action === 'sell') {
        const position = portfolio.positions[ticker] as Position | undefined;
        
        // Check if we have enough shares
        if (!position || position.shares < quantity) {
          this.progressService.updateStatus(
            'trade_execution',
            ticker,
            `Insufficient shares to sell ${quantity}`
          );
          continue;
        }
        
        // Execute sell
        const revenue = quantity * currentPrice;
        
        // Update cash
        portfolio.cash = portfolio.cash + revenue;
        
        // Update position
        position.shares -= quantity;
        position.current_price = currentPrice;
        
        // Remove position if no shares left
        if (position.shares === 0) {
          delete portfolio.positions[ticker];
        }
        
        // Add to history
        tradeHistory.push({
          date: new Date().toISOString(),
          ticker,
          action: 'sell',
          quantity,
          price: currentPrice,
          total: revenue
        });
        
        this.progressService.updateStatus(
          'trade_execution',
          ticker,
          `Sold ${quantity} shares at ${currentPrice}`
        );
      }
    }
    
    // Update portfolio
    portfolio.history = tradeHistory;
    
    return this.agentStateService.updateAgentState(
      state,
      [],
      { portfolio }
    );
  }
  
  /**
   * Calculate portfolio performance
   */
  public calculatePerformance(state: AgentState): {
    portfolioValue: number;
    cashValue: number;
    equityValue: number;
    return: number;
    positions: PositionSummary[];
  } {
    // Access the portfolio
    const portfolio = state.data.portfolio;
    const portfolioCash = portfolio.cash;
    
    // Calculate current equity value
    const equityValue = Object.entries(portfolio.positions).reduce((sum, [ticker, pos]) => {
      const position = pos as Position;
      const currentValue = position.shares * position.current_price;
      return sum + currentValue;
    }, 0);
    
    // Calculate total portfolio value
    const portfolioValue = portfolioCash + equityValue;
    
    // Calculate return (assuming starting value was $1M)
    const startingValue = 1000000;
    const portfolioReturn = ((portfolioValue - startingValue) / startingValue) * 100;
    
    // Format positions for display
    const positions = Object.entries(portfolio.positions).map(([ticker, pos]) => {
      const position = pos as Position;
      const currentValue = position.shares * position.current_price;
      const cost = position.shares * position.avg_price;
      const profit = currentValue - cost;
      const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;
      
      return {
        ticker,
        shares: position.shares,
        avgPrice: position.avg_price,
        currentPrice: position.current_price,
        currentValue,
        profit,
        profitPercent
      };
    });
    
    return {
      portfolioValue,
      cashValue: portfolioCash,
      equityValue,
      return: portfolioReturn,
      positions
    };
  }
}