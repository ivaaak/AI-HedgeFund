// Node types
export enum NodeType {
    START = 'START',
    ANALYST = 'ANALYST',
    RISK_MANAGER = 'RISK_MANAGER',
    PORTFOLIO_MANAGER = 'PORTFOLIO_MANAGER',
    ACTION = 'ACTION'
  }
  
  // Analyst types
  export enum AnalystType {
    FUNDAMENTAL = 'fundamental',
    TECHNICAL = 'technical',
    SENTIMENT = 'sentiment',
    MACRO = 'macro'
  }
  
  // Action types
  export enum ActionType {
    BUY = 'BUY',
    SELL = 'SELL',
    HOLD = 'HOLD'
  }
  
  // Signal data
  export interface Signal {
    analyst: AnalystType;
    ticker: string;
    value: number;  // -1 to 1 (bearish to bullish)
    confidence: number;  // 0 to 100
  }
  
  // Risk assessment data
  export interface RiskAssessment {
    riskScore: number;  // 0 to 10
    factors: string[];
  }
  
  // Portfolio decision
  export interface Decision {
    action: ActionType;
    ticker: string;
    quantity: number;
    confidence: number;
  }
  
  // Performance point
  export interface PerformancePoint {
    timestamp: number;
    value: number;
  }
  
  // Position details
  export interface Position {
    ticker: string;
    shares: number;
    avgPrice: number;
    currentPrice: number;
  }
  
  // Portfolio state
  export interface Portfolio {
    cash: number;
    positions: Record<string, Position>;
    value: number;
    history: any[];
  }
  
  // System state
  export interface SystemState {
    activeNodes: NodeType[];
    signals: Record<AnalystType, Signal>;
    riskAssessment?: RiskAssessment;
    decision?: Decision;
    portfolio?: Portfolio;
    performance: PerformancePoint[];
  }
  
  // Portfolio decision from API
  export interface PortfolioDecision {
    action: 'buy' | 'sell' | 'hold';
    quantity: number;
    confidence: number;
    reasoning: string;
  }