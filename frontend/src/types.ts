// Node types
export enum NodeType {
  START = 'START',
  ANALYST = 'ANALYST',
  RISK_MANAGER = 'RISK_MANAGER',
  PORTFOLIO_MANAGER = 'PORTFOLIO_MANAGER',
  ACTION = 'ACTION',
  DECISION = "DECISION"
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

export interface AccountInfo {
  username: string;
  accountBalance: number;
  portfolioValue: number;
  lastLogin: string;
  subscriptionTier: 'Free' | 'Premium' | 'Pro';
}

// Signal data
export interface Signal {
  analyst: AnalystType;
  ticker: string;
  value: number;  // -1 to 1 (bearish to bullish)
  confidence: number;  // 0 to 100
}

// Risk assessment data
export interface RiskAnalysisReasoning {
  portfolio_value: number;
  current_position: number;
  position_limit: number;
  remaining_limit: number;
  available_cash: number;
}

export interface RiskAnalysisResult {
  remaining_position_limit: number;
  current_price: number;
  reasoning: RiskAnalysisReasoning;
}

export interface Recommendation {
  technical_signal: string;
  fundamental_signal: string;
  combined_signal: string;
  confidence: number;
  action: 'buy' | 'sell' | 'hold';
  shares: number;
  estimated_value: number;
  current_position_shares: number;
  current_price: number;
}

export interface RiskAssessment {
  riskScore: number;
  factors: string[];
  analysis: Record<string, RiskAnalysisResult>;
  recommendations?: Record<string, Recommendation>;
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

export interface ProcessFlowConfig {
  showAnalyst: boolean;
  showRiskManager: boolean;
  showPortfolioManager: boolean;
  showDecision: boolean;
  animationsEnabled: boolean;
}