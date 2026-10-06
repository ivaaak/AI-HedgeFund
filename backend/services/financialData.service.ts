import config from '../config';
import { CacheService } from '../data/cache';
import { Price, FinancialMetrics, LineItem, InsiderTrade, CompanyNews } from '../data/models';
import { AlphaVantageNewsItem, AlphaVantageInsiderTransaction } from '../data/alphaVantageAPIModels';
import { HttpError } from '../middleware/middleware';
import { AlphaVantageClient, PremiumEndpointError } from './alphaVantage.client';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const PRICE_TTL = 6 * HOUR;
const FUNDAMENTALS_TTL = DAY;
const NEWS_TTL = 3 * HOUR;

// The compact daily series holds the latest 100 trading days (~145 calendar days)
const COMPACT_SERIES_DAYS = 140;
const FULL_SERIES_UNAVAILABLE_KEY = 'alphavantage_full_series_unavailable';

type RawReport = Record<string, string>;
type StatementPeriod = 'annual' | 'quarterly';

/**
 * One reporting period, merged from the income statement, balance sheet and cash flow statement
 */
export interface StatementRow {
  report_period: string;
  currency: string;
  revenue: number | null;
  gross_profit: number | null;
  operating_income: number | null;
  net_income: number | null;
  ebit: number | null;
  ebitda: number | null;
  interest_expense: number | null;
  total_assets: number | null;
  total_current_assets: number | null;
  total_liabilities: number | null;
  total_current_liabilities: number | null;
  total_shareholders_equity: number | null;
  cash_and_equivalents: number | null;
  total_debt: number | null;
  shares_outstanding: number | null;
  operating_cash_flow: number | null;
  capital_expenditure: number | null;
  depreciation_and_amortization: number | null;
  dividends_paid: number | null;
  free_cash_flow: number | null;
  working_capital: number | null;
}

// Alpha Vantage sends numbers as strings and uses "None" / "-" for missing values
const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const ratio = (a: number | null, b: number | null): number | null =>
  a !== null && b !== null && b !== 0 ? a / b : null;

const growth = (current: number | null, previous: number | null): number | null =>
  current !== null && previous !== null && previous !== 0
    ? (current - previous) / Math.abs(previous)
    : null;

const today = (): string => new Date().toISOString().split('T')[0];

const shiftDays = (date: string, days: number): string =>
  new Date(Date.parse(date) + days * DAY).toISOString().split('T')[0];

export class FinancialDataService {
  private cache: CacheService;
  private client: AlphaVantageClient;

  constructor(client?: AlphaVantageClient, cache?: CacheService) {
    this.cache = cache || new CacheService(config.cacheDir);
    this.client = client || new AlphaVantageClient(config.alphaVantageApiKey, this.cache);
  }

  /**
   * Fetch daily prices between two dates (inclusive), oldest first
   */
  public async getPrices(ticker: string, startDate: string, endDate: string): Promise<Price[]> {
    const needFull = startDate < shiftDays(today(), -COMPACT_SERIES_DAYS);
    const series = await this.getDailySeries(ticker, needFull);
    return series.filter(price => startDate <= price.time && price.time <= endDate);
  }

  private async getDailySeries(ticker: string, needFull: boolean): Promise<Price[]> {
    const base = { function: 'TIME_SERIES_DAILY', symbol: ticker };

    if (needFull && !this.cache.get<boolean>(FULL_SERIES_UNAVAILABLE_KEY)) {
      try {
        return this.parseDailySeries(ticker, await this.client.query({ ...base, outputsize: 'full' }, PRICE_TTL));
      } catch (error) {
        if (!(error instanceof PremiumEndpointError)) throw error;
        // Full history is a paid feature on some plans: remember that and use the compact series
        this.cache.set(FULL_SERIES_UNAVAILABLE_KEY, true, DAY);
      }
    }

    return this.parseDailySeries(ticker, await this.client.query({ ...base, outputsize: 'compact' }, PRICE_TTL));
  }

  private parseDailySeries(ticker: string, data: Record<string, unknown>): Price[] {
    const timeSeries = data['Time Series (Daily)'] as Record<string, Record<string, string>> | undefined;
    if (!timeSeries) {
      throw new HttpError(404, `No price data found for ${ticker}`);
    }

    return Object.entries(timeSeries)
      .map(([date, priceData]) => ({
        time: date,
        open: parseFloat(priceData['1. open']),
        high: parseFloat(priceData['2. high']),
        low: parseFloat(priceData['3. low']),
        close: parseFloat(priceData['4. close']),
        volume: parseFloat(priceData['5. volume'])
      }))
      .filter(price => Number.isFinite(price.close))
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  private async getOverview(ticker: string): Promise<Record<string, string>> {
    const overview = await this.client.query({ function: 'OVERVIEW', symbol: ticker }, FUNDAMENTALS_TTL);
    if (!overview.Symbol) {
      throw new HttpError(404, `No company fundamentals found for ${ticker}`);
    }
    return overview as Record<string, string>;
  }

  /**
   * Fetch the three financial statements and merge them per reporting period, newest first
   */
  public async getStatements(ticker: string, period: StatementPeriod = 'annual'): Promise<StatementRow[]> {
    const [income, balance, cashFlow] = await Promise.all(
      ['INCOME_STATEMENT', 'BALANCE_SHEET', 'CASH_FLOW'].map(fn =>
        this.client.query({ function: fn, symbol: ticker }, FUNDAMENTALS_TTL)
      )
    );

    const reportsKey = period === 'quarterly' ? 'quarterlyReports' : 'annualReports';
    const byDate = (data: Record<string, unknown>) =>
      new Map(((data[reportsKey] as RawReport[]) || []).map(report => [report.fiscalDateEnding, report]));

    const incomeByDate = byDate(income);
    const balanceByDate = byDate(balance);
    const cashFlowByDate = byDate(cashFlow);

    const dates = [...new Set([...incomeByDate.keys(), ...balanceByDate.keys(), ...cashFlowByDate.keys()])]
      .sort()
      .reverse();

    return dates.map(date => {
      const inc = incomeByDate.get(date) || {};
      const bal = balanceByDate.get(date) || {};
      const cf = cashFlowByDate.get(date) || {};

      const operatingCashFlow = num(cf.operatingCashflow);
      const capex = num(cf.capitalExpenditures);
      const currentAssets = num(bal.totalCurrentAssets);
      const currentLiabilities = num(bal.totalCurrentLiabilities);
      const shortTermDebt = num(bal.shortTermDebt);
      const longTermDebt = num(bal.longTermDebt);

      return {
        report_period: date,
        currency: inc.reportedCurrency || bal.reportedCurrency || cf.reportedCurrency || 'USD',
        revenue: num(inc.totalRevenue),
        gross_profit: num(inc.grossProfit),
        operating_income: num(inc.operatingIncome),
        net_income: num(inc.netIncome) ?? num(cf.netIncome),
        ebit: num(inc.ebit),
        ebitda: num(inc.ebitda),
        interest_expense: num(inc.interestExpense),
        total_assets: num(bal.totalAssets),
        total_current_assets: currentAssets,
        total_liabilities: num(bal.totalLiabilities),
        total_current_liabilities: currentLiabilities,
        total_shareholders_equity: num(bal.totalShareholderEquity),
        cash_and_equivalents: num(bal.cashAndCashEquivalentsAtCarryingValue),
        total_debt: num(bal.shortLongTermDebtTotal) ??
          (shortTermDebt !== null || longTermDebt !== null ? (shortTermDebt || 0) + (longTermDebt || 0) : null),
        shares_outstanding: num(bal.commonStockSharesOutstanding),
        operating_cash_flow: operatingCashFlow,
        capital_expenditure: capex,
        depreciation_and_amortization: num(cf.depreciationDepletionAndAmortization) ?? num(inc.depreciationAndAmortization),
        dividends_paid: num(cf.dividendPayout),
        free_cash_flow: operatingCashFlow !== null && capex !== null ? operatingCashFlow - Math.abs(capex) : null,
        working_capital: currentAssets !== null && currentLiabilities !== null ? currentAssets - currentLiabilities : null
      };
    });
  }

  // Metrics that can be derived from the statements alone
  private metricsFromStatements(
    ticker: string,
    period: string,
    row: StatementRow,
    previous?: StatementRow
  ): FinancialMetrics {
    return {
      ticker,
      calendar_date: row.report_period,
      report_period: row.report_period,
      period,
      currency: row.currency,
      market_cap: null,
      enterprise_value: null,
      price_to_earnings_ratio: null,
      price_to_book_ratio: null,
      price_to_sales_ratio: null,
      enterprise_value_to_ebitda_ratio: null,
      enterprise_value_to_revenue_ratio: null,
      free_cash_flow_yield: null,
      peg_ratio: null,
      gross_margin: ratio(row.gross_profit, row.revenue),
      operating_margin: ratio(row.operating_income, row.revenue),
      net_margin: ratio(row.net_income, row.revenue),
      return_on_equity: ratio(row.net_income, row.total_shareholders_equity),
      return_on_assets: ratio(row.net_income, row.total_assets),
      return_on_invested_capital: null,
      asset_turnover: ratio(row.revenue, row.total_assets),
      inventory_turnover: null,
      receivables_turnover: null,
      days_sales_outstanding: null,
      operating_cycle: null,
      working_capital_turnover: ratio(row.revenue, row.working_capital),
      current_ratio: ratio(row.total_current_assets, row.total_current_liabilities),
      quick_ratio: null,
      cash_ratio: ratio(row.cash_and_equivalents, row.total_current_liabilities),
      operating_cash_flow_ratio: ratio(row.operating_cash_flow, row.total_current_liabilities),
      debt_to_equity: ratio(row.total_debt, row.total_shareholders_equity),
      debt_to_assets: ratio(row.total_debt, row.total_assets),
      interest_coverage: ratio(row.ebit, row.interest_expense),
      revenue_growth: growth(row.revenue, previous?.revenue ?? null),
      earnings_growth: growth(row.net_income, previous?.net_income ?? null),
      book_value_growth: growth(row.total_shareholders_equity, previous?.total_shareholders_equity ?? null),
      earnings_per_share_growth: null,
      free_cash_flow_growth: growth(row.free_cash_flow, previous?.free_cash_flow ?? null),
      operating_income_growth: growth(row.operating_income, previous?.operating_income ?? null),
      ebitda_growth: growth(row.ebitda, previous?.ebitda ?? null),
      payout_ratio: ratio(row.dividends_paid, row.net_income),
      earnings_per_share: ratio(row.net_income, row.shares_outstanding),
      book_value_per_share: ratio(row.total_shareholders_equity, row.shares_outstanding),
      free_cash_flow_per_share: ratio(row.free_cash_flow, row.shares_outstanding)
    };
  }

  /**
   * Fetch financial metrics, newest first. With period 'ttm' the first entry is the
   * current snapshot (company overview combined with the latest annual statements),
   * followed by annual history.
   */
  public async getFinancialMetrics(
    ticker: string,
    endDate: string,
    period: string = 'ttm',
    limit: number = 10
  ): Promise<FinancialMetrics[]> {
    const normalizedPeriod = period.toLowerCase();
    const statementPeriod: StatementPeriod = normalizedPeriod === 'quarterly' ? 'quarterly' : 'annual';

    if (normalizedPeriod !== 'ttm') {
      const rows = (await this.getStatements(ticker, statementPeriod)).filter(row => row.report_period <= endDate);
      return rows.slice(0, limit).map((row, i) => this.metricsFromStatements(ticker, statementPeriod, row, rows[i + 1]));
    }

    const overview = await this.getOverview(ticker);

    // Statements enrich the snapshot but are not required for it
    let rows: StatementRow[] = [];
    try {
      rows = (await this.getStatements(ticker, 'annual')).filter(row => row.report_period <= endDate);
    } catch (error) {
      console.warn(`Financial statements unavailable for ${ticker}: ${(error as Error).message}`);
    }

    const history = rows.map((row, i) => this.metricsFromStatements(ticker, 'annual', row, rows[i + 1]));
    const latest: Partial<FinancialMetrics> = history[0] || {};
    const latestRow: StatementRow | undefined = rows[0];

    const marketCap = num(overview.MarketCapitalization);
    const sharesOutstanding = num(overview.SharesOutstanding);
    const freeCashFlow = latestRow?.free_cash_flow ?? null;
    const currentDate = today();

    const snapshot: FinancialMetrics = {
      ...this.emptyMetrics(ticker),
      ...latest,
      ticker: overview.Symbol,
      calendar_date: currentDate,
      report_period: currentDate,
      period: 'ttm',
      currency: overview.Currency || latest.currency || 'USD',
      market_cap: marketCap,
      enterprise_value: marketCap !== null && latestRow
        ? marketCap + (latestRow.total_debt || 0) - (latestRow.cash_and_equivalents || 0)
        : null,
      price_to_earnings_ratio: num(overview.PERatio),
      price_to_book_ratio: num(overview.PriceToBookRatio),
      price_to_sales_ratio: num(overview.PriceToSalesRatioTTM),
      enterprise_value_to_ebitda_ratio: num(overview.EVToEBITDA),
      enterprise_value_to_revenue_ratio: num(overview.EVToRevenue),
      free_cash_flow_yield: ratio(freeCashFlow, marketCap),
      peg_ratio: num(overview.PEGRatio),
      operating_margin: num(overview.OperatingMarginTTM) ?? latest.operating_margin ?? null,
      net_margin: num(overview.ProfitMargin) ?? latest.net_margin ?? null,
      return_on_equity: num(overview.ReturnOnEquityTTM) ?? latest.return_on_equity ?? null,
      return_on_assets: num(overview.ReturnOnAssetsTTM) ?? latest.return_on_assets ?? null,
      revenue_growth: num(overview.QuarterlyRevenueGrowthYOY) ?? latest.revenue_growth ?? null,
      earnings_growth: num(overview.QuarterlyEarningsGrowthYOY) ?? latest.earnings_growth ?? null,
      earnings_per_share: num(overview.EPS) ?? latest.earnings_per_share ?? null,
      book_value_per_share: num(overview.BookValue) ?? latest.book_value_per_share ?? null,
      free_cash_flow_per_share: ratio(freeCashFlow, sharesOutstanding) ?? latest.free_cash_flow_per_share ?? null
    };

    return [snapshot, ...history].slice(0, limit);
  }

  private emptyMetrics(ticker: string): FinancialMetrics {
    const emptyRow = Object.fromEntries(
      ['revenue', 'gross_profit', 'operating_income', 'net_income', 'ebit', 'ebitda', 'interest_expense',
        'total_assets', 'total_current_assets', 'total_liabilities', 'total_current_liabilities',
        'total_shareholders_equity', 'cash_and_equivalents', 'total_debt', 'shares_outstanding',
        'operating_cash_flow', 'capital_expenditure', 'depreciation_and_amortization', 'dividends_paid',
        'free_cash_flow', 'working_capital'].map(key => [key, null])
    ) as unknown as StatementRow;
    return this.metricsFromStatements(ticker, 'ttm', { ...emptyRow, report_period: today(), currency: 'USD' });
  }

  /**
   * Search line items in the financial statements, newest period first
   */
  public async searchLineItems(
    ticker: string,
    lineItems: string[],
    endDate: string,
    period: string = 'ttm',
    limit: number = 10
  ): Promise<LineItem[]> {
    const isQuarterly = period.toLowerCase() === 'quarterly' || period.toLowerCase() === 'ttm';
    const statementPeriod: StatementPeriod = isQuarterly ? 'quarterly' : 'annual';
    const rows = (await this.getStatements(ticker, statementPeriod))
      .filter(row => row.report_period <= endDate)
      .slice(0, limit);

    // Older name kept for existing clients
    const aliases: Record<string, keyof StatementRow> = { capital_expenditures: 'capital_expenditure' };

    return rows.map(row => {
      const lineItem: LineItem = {
        ticker,
        report_period: row.report_period,
        period: statementPeriod,
        currency: row.currency
      };

      lineItems.forEach(itemKey => {
        const key = (aliases[itemKey] || itemKey) as keyof StatementRow;
        // Unknown line items are reported as null
        lineItem[itemKey] = key in row ? row[key] : null;
      });

      return lineItem;
    });
  }

  /**
   * Fetch insider transactions between two dates, newest first
   */
  public async getInsiderTrades(
    ticker: string,
    endDate: string,
    startDate?: string,
    limit: number = 1000
  ): Promise<InsiderTrade[]> {
    const response = await this.client.query({ function: 'INSIDER_TRANSACTIONS', symbol: ticker }, FUNDAMENTALS_TTL);
    const transactions = (response.data as AlphaVantageInsiderTransaction[]) || [];

    return transactions
      .filter(t => t.transaction_date <= endDate && (!startDate || t.transaction_date >= startDate))
      .map(t => {
        const shares = num(t.shares) || 0;
        return {
          ticker,
          name: t.executive || null,
          title: t.executive_title || null,
          transaction_date: t.transaction_date,
          transaction_shares: t.acquisition_or_disposal === 'D' ? -shares : shares,
          transaction_price_per_share: num(t.share_price),
          security_title: t.security_type || null
        };
      })
      .filter(t => t.transaction_shares !== 0)
      .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
      .slice(0, limit);
  }

  /**
   * Fetch news with sentiment for a ticker from the 30 days before endDate, newest first
   */
  public async getCompanyNews(ticker: string, endDate: string, limit: number = 50): Promise<CompanyNews[]> {
    const compact = (date: string) => date.replace(/-/g, '');
    const params: Record<string, string> = {
      function: 'NEWS_SENTIMENT',
      tickers: ticker,
      time_from: `${compact(shiftDays(endDate, -30))}T0000`,
      sort: 'LATEST',
      limit: String(limit)
    };
    if (endDate < today()) {
      params.time_to = `${compact(endDate)}T2359`;
    }

    const response = await this.client.query(params, NEWS_TTL);
    const feed = (response.feed as AlphaVantageNewsItem[]) || [];

    return feed.slice(0, limit).map(item => {
      // Prefer the sentiment about this ticker over the sentiment of the whole article
      const tickerSentiment = item.ticker_sentiment?.find(s => s.ticker === ticker);
      const label = (tickerSentiment?.ticker_sentiment_label || item.overall_sentiment_label || '').toLowerCase();
      const published = item.time_published || '';

      return {
        ticker,
        title: item.title,
        source: item.source,
        date: published.length >= 8
          ? `${published.slice(0, 4)}-${published.slice(4, 6)}-${published.slice(6, 8)}`
          : endDate,
        url: item.url,
        sentiment: label.includes('bullish') ? 'positive' : label.includes('bearish') ? 'negative' : 'neutral',
        sentiment_score: num(tickerSentiment?.ticker_sentiment_score) ?? num(item.overall_sentiment_score)
      };
    });
  }

  /**
   * Get the current market capitalization
   */
  public async getMarketCap(ticker: string): Promise<number | null> {
    const overview = await this.getOverview(ticker);
    return num(overview.MarketCapitalization);
  }
}

// Shared instance so every analyst reuses the same cache and request queue
export const financialDataService = new FinancialDataService();
