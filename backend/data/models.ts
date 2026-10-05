// Shared signal vocabulary
export type SignalDirection = 'bullish' | 'bearish' | 'neutral';
export type TradeAction = 'buy' | 'sell' | 'hold';

// Price Models
export interface Price {
    open: number;
    close: number;
    high: number;
    low: number;
    volume: number;
    time: string; // YYYY-MM-DD
}

// Financial Metrics Models
// Ratios, margins and growth rates are fractions (0.15 = 15%)
export interface FinancialMetrics {
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

// Line Item Models (one row per reporting period, merged from the three statements)
export interface LineItem {
    ticker: string;
    report_period: string;
    period: string;
    currency: string;
    [key: string]: string | number | null; // Requested line items
}

// Insider Trade Models
export interface InsiderTrade {
    ticker: string;
    name: string | null;
    title: string | null;
    transaction_date: string;
    // Positive for acquisitions, negative for disposals
    transaction_shares: number;
    transaction_price_per_share: number | null;
    security_title: string | null;
}

// Company News Models
export interface CompanyNews {
    ticker: string;
    title: string;
    source: string;
    date: string; // YYYY-MM-DD
    url: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    sentiment_score: number | null;
}

/**
 * Interface for portfolio position
 */
export interface Position {
    shares: number;
    avg_price: number;
    current_price: number;
}

/**
 * Interface for transaction history
 */
export interface TradeRecord {
    date: string;
    ticker: string;
    action: 'buy' | 'sell';
    quantity: number;
    price: number;
    total: number;
}

/**
 * Unified interface for the (paper trading) portfolio
 */
export interface Portfolio {
    cash: number;
    positions: Record<string, Position>;
    history: TradeRecord[];
    // Value the portfolio started with, used to compute the total return
    initial_value: number;
}

// Reasoning entry used for each component of an analysis
export interface Signal {
    signal: SignalDirection;
    details: string;
}

// Result of one analyst for one ticker
export interface AnalystSignal<TReasoning = unknown> {
    signal: SignalDirection;
    confidence: number; // 0 to 100
    reasoning: TReasoning;
}

// Every analyst endpoint answers with this shape: tickers that could not be
// analysed are reported in `errors` instead of being silently dropped
export interface AnalysisResponse<TResult> {
    results: Record<string, TResult>;
    errors: Record<string, string>;
}

export interface AnalysisRequest {
    tickers: string[];
    start_date: string;
    end_date: string;
}

// Risk management
export interface RiskAnalysisResult {
    remaining_position_limit: number;
    current_price: number;
    risk_score: number; // 1 (calm) to 10 (very volatile)
    reasoning: {
        portfolio_value: number;
        current_position: number;
        position_limit: number;
        remaining_limit: number;
        available_cash: number;
        annualized_volatility: number | null;
        max_drawdown: number | null;
    };
}

// Portfolio management
export interface PortfolioDecision {
    action: TradeAction;
    quantity: number;
    confidence: number; // 0 to 100
    reasoning: string;
}

export const DEFAULT_STARTING_CASH = 100000;

export const createPortfolio = (cash: number = DEFAULT_STARTING_CASH): Portfolio => ({
    cash,
    positions: {},
    history: [],
    initial_value: cash
});
