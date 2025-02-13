// Price Models
export interface Price {
    open: number;
    close: number;
    high: number;
    low: number;
    volume: number;
    time: string;
}

export interface PriceResponse {
    ticker: string;
    prices: Price[];
}

// Financial Metrics Models
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

export interface FinancialMetricsResponse {
    financial_metrics: FinancialMetrics[];
}

// Line Item Models
export interface LineItem {
    ticker: string;
    report_period: string;
    period: string;
    currency: string;
    [key: string]: any; // Allow additional fields dynamically
}

export interface LineItemResponse {
    search_results: LineItem[];
}

// Insider Trade Models
export interface InsiderTrade {
    ticker: string;
    issuer: string | null;
    name: string | null;
    title: string | null;
    is_board_director: boolean | null;
    transaction_date: string | null;
    transaction_shares: number | null;
    transaction_price_per_share: number | null;
    transaction_value: number | null;
    shares_owned_before_transaction: number | null;
    shares_owned_after_transaction: number | null;
    security_title: string | null;
    filing_date: string;
}

export interface InsiderTradeResponse {
    insider_trades: InsiderTrade[];
}

// Company News Models
export interface CompanyNews {
    ticker: string;
    title: string;
    author: string;
    source: string;
    date: string;
    url: string;
    sentiment: string | null;
}

export interface CompanyNewsResponse {
    news: CompanyNews[];
}

// Portfolio Models
export interface Position {
    cash: number;
    shares: number;
    ticker: string;
}

export interface Portfolio {
    positions: { [ticker: string]: Position };
    total_cash: number;
}

// Analyst Models
export interface AnalystSignal {
    signal: string | null;
    confidence: number | null;
    reasoning: Record<string, any> | string | null;
    max_position_size: number | null;
}

export interface TickerAnalysis {
    ticker: string;
    analyst_signals: { [agent: string]: AnalystSignal };
}

// Agent State Models
export interface AgentStateData {
    tickers: string[];
    portfolio: Portfolio;
    start_date: string;
    end_date: string;
    ticker_analyses: { [ticker: string]: TickerAnalysis };
}

export interface AgentStateMetadata {
    show_reasoning: boolean;
    [key: string]: any; // Allow additional fields
}

// Type Guards
export const isPriceResponse = (obj: any): obj is PriceResponse => {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof obj.ticker === 'string' &&
        Array.isArray(obj.prices) &&
        obj.prices.every((price: any) =>
            typeof price === 'object' &&
            typeof price.open === 'number' &&
            typeof price.close === 'number' &&
            typeof price.high === 'number' &&
            typeof price.low === 'number' &&
            typeof price.volume === 'number' &&
            typeof price.time === 'string'
        )
    );
};

export const isFinancialMetrics = (obj: any): obj is FinancialMetrics => {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof obj.ticker === 'string' &&
        typeof obj.report_period === 'string' &&
        typeof obj.period === 'string' &&
        typeof obj.currency === 'string'
    );
};

// Optional: Model Classes with Validation
export class PriceModel {
    public ticker: string;
    public prices: Price[];

    constructor(data: PriceResponse) {
        if (!isPriceResponse(data)) {
            throw new Error('Invalid price response data');
        }
        this.ticker = data.ticker;
        this.prices = data.prices;
    }

    static fromJSON(json: string): PriceModel {
        try {
            const data = JSON.parse(json);
            return new PriceModel(data);
        } catch (error) {
            throw new Error('Failed to parse price data');
        }
    }
}

export class FinancialMetricsModel {
    constructor(private data: FinancialMetrics) {
        if (!isFinancialMetrics(data)) {
            throw new Error('Invalid financial metrics data');
        }
    }

    static fromJSON(json: string): FinancialMetricsModel {
        try {
            const data = JSON.parse(json);
            return new FinancialMetricsModel(data);
        } catch (error) {
            throw new Error('Failed to parse financial metrics data');
        }
    }

    public toJSON(): FinancialMetrics {
        return { ...this.data };
    }
}