// Node types
export enum NodeType {
  START = 'START',
  ANALYST = 'ANALYST',
  RISK_MANAGER = 'RISK_MANAGER',
  PORTFOLIO_MANAGER = 'PORTFOLIO_MANAGER',
  ACTION = 'ACTION',
  DECISION = "DECISION",
  DATA_COLLECTION = "DATA_COLLECTION"
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



// Define API response types
export interface FundamentalsResponse {
  messages: Array<{ content: string; name: string }>;
  data: any;
}

export interface PortfolioResponse {
  messages: Array<{ content: string; name: string }>;
  data: any;
}

export interface PriceData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FinancialMetric {
  ticker: string;
  calendar_date: string;
  report_period: string;
  period: string;
  currency: string;
  market_cap: number | null;
  enterprise_value: number | null;
  price_to_earnings_ratio: number | null;
  price_to_book_ratio: number | null;
  price_to_sales_ratio: number | null;
  enterprise_value_to_ebitda_ratio: number | null;
  enterprise_value_to_revenue_ratio: number | null;
  free_cash_flow_yield: number | null;
  peg_ratio: number | null;
  gross_margin: number | null;
  operating_margin: number | null;
  net_margin: number | null;
  return_on_equity: number | null;
  return_on_assets: number | null;
  return_on_invested_capital: number | null;
  asset_turnover: number | null;
  inventory_turnover: number | null;
  receivables_turnover: number | null;
  days_sales_outstanding: number | null;
  operating_cycle: number | null;
  working_capital_turnover: number | null;
  current_ratio: number | null;
  quick_ratio: number | null;
  cash_ratio: number | null;
  operating_cash_flow_ratio: number | null;
  debt_to_equity: number | null;
  debt_to_assets: number | null;
  interest_coverage: number | null;
  revenue_growth: number | null;
  earnings_growth: number | null;
  book_value_growth: number | null;
  earnings_per_share_growth: number | null;
  free_cash_flow_growth: number | null;
  operating_income_growth: number | null;
  ebitda_growth: number | null;
  payout_ratio: number | null;
  earnings_per_share: number | null;
  book_value_per_share: number | null;
  free_cash_flow_per_share: number | null;
}

export interface LineItem {
  ticker: string;
  report_period: string;
  period: string;
  [key: string]: any; // Dynamic line items
}
