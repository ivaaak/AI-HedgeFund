// Node types
export enum NodeType {
  DATA_COLLECTION = 'DATA_COLLECTION',
  ANALYST = 'ANALYST',
  RISK_MANAGER = 'RISK_MANAGER',
  PORTFOLIO_MANAGER = 'PORTFOLIO_MANAGER',
  ACTION = 'ACTION'
}

// Analyst types. The values are the keys the backend uses for analyst signals.
export enum AnalystType {
  FUNDAMENTAL = 'fundamentals',
  TECHNICAL = 'technicals',
  SENTIMENT = 'sentiment',
  VALUATION = 'valuation'
}

// Action types
export enum ActionType {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD'
}

export type SignalDirection = 'bullish' | 'bearish' | 'neutral';

// One component of an analysis (e.g. profitability, momentum)
export interface ReasoningEntry {
  signal: SignalDirection;
  details: string;
  confidence?: number;
}

// Result of one analyst for one ticker
export interface AnalystSignal {
  signal: SignalDirection;
  confidence: number;  // 0 to 100
  reasoning: Record<string, ReasoningEntry>;
}

// Every analysis endpoint answers with results and errors keyed by ticker
export interface AnalysisResponse<T> {
  results: Record<string, T>;
  errors: Record<string, string>;
}

export type AnalystSignals = Partial<Record<AnalystType, AnalysisResponse<AnalystSignal>>>;

// Risk assessment data
export interface RiskAnalysisReasoning {
  portfolio_value: number;
  current_position: number;
  position_limit: number;
  remaining_limit: number;
  available_cash: number;
  annualized_volatility: number | null;
  max_drawdown: number | null;
}

export interface RiskAnalysisResult {
  remaining_position_limit: number;
  current_price: number;
  risk_score: number;  // 1 (calm) to 10 (very volatile)
  reasoning: RiskAnalysisReasoning;
}

export type RiskAssessment = AnalysisResponse<RiskAnalysisResult>;

// Portfolio decision from API
export interface PortfolioDecision {
  action: 'buy' | 'sell' | 'hold';
  quantity: number;
  confidence: number;  // 0 to 100
  reasoning: string;
}

export interface DecisionResult {
  decisions: Record<string, PortfolioDecision>;
  source: 'llm' | 'rules';
  note?: string;
}

// Performance point
export interface PerformancePoint {
  timestamp: number;
  value: number;
}

// Position details
export interface Position {
  shares: number;
  avg_price: number;
  current_price: number;
}

export interface TradeRecord {
  date: string;
  ticker: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
}

// Paper trading portfolio state
export interface Portfolio {
  cash: number;
  positions: Record<string, Position>;
  history: TradeRecord[];
  initial_value: number;
}

// System state
export interface SystemState {
  activeNodes: NodeType[];
  signals: AnalystSignals;
  riskAssessment?: RiskAssessment;
  decision?: DecisionResult;
  portfolio: Portfolio;
  performance: PerformancePoint[];
  lastRun?: number;
}

export interface ProcessFlowConfig {
  showAnalyst: boolean;
  showRiskManager: boolean;
  showPortfolioManager: boolean;
  showDecision: boolean;
  animationsEnabled: boolean;
}

// Response of the full pipeline (POST /api/hedge-fund/run)
export interface HedgeFundRunResponse {
  tickers: string[];
  start_date: string;
  end_date: string;
  analyst_signals: Record<AnalystType, AnalysisResponse<AnalystSignal>>;
  risk: RiskAssessment;
  decisions: Record<string, PortfolioDecision>;
  decision_source: 'llm' | 'rules';
  decision_note?: string;
  trades: TradeRecord[];
  skipped_trades: Array<{ ticker: string; reason: string }>;
  portfolio: Portfolio;
}

export interface PriceData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Ratios, margins and growth rates are fractions (0.15 = 15%)
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
  currency: string;
  [key: string]: string | number | null; // Requested line items
}
