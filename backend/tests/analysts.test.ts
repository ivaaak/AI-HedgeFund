import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CacheService } from '../data/cache';
import { createPortfolio, Price } from '../data/models';
import { AlphaVantageClient, AlphaVantageFetcher, PremiumEndpointError } from '../services/alphaVantage.client';
import { FinancialDataService } from '../services/financialData.service';
import { FundamentalsService } from '../services/fundamentals.service';
import { extractJson } from '../services/llm';
import { RiskManagerService } from '../services/riskManager.service';
import { SentimentService } from '../services/sentiment.service';
import { TechnicalAnalystService } from '../services/technicals.service';
import { ValuationService } from '../services/valuation.service';

const today = new Date().toISOString().split('T')[0];
const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

// Canned Alpha Vantage responses, keyed by function
const responses = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  TIME_SERIES_DAILY: {
    'Time Series (Daily)': Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => {
        const price = 100 + i; // steadily rising, newest last
        return [daysAgo(99 - i), {
          '1. open': String(price - 0.5),
          '2. high': String(price + 1),
          '3. low': String(price - 1),
          '4. close': String(price),
          '5. volume': String(1000 + i * 10)
        }];
      })
    )
  },
  OVERVIEW: {
    Symbol: 'TEST',
    Currency: 'USD',
    MarketCapitalization: '1000000',
    PERatio: '20',
    PriceToBookRatio: '2.5',
    PriceToSalesRatioTTM: '4',
    ProfitMargin: '0.25',
    OperatingMarginTTM: '0.30',
    ReturnOnEquityTTM: '0.40',
    QuarterlyRevenueGrowthYOY: '0.12',
    QuarterlyEarningsGrowthYOY: '0.15',
    EPS: '5',
    BookValue: 'None',
    SharesOutstanding: '10000'
  },
  INCOME_STATEMENT: {
    annualReports: [
      { fiscalDateEnding: '2024-12-31', reportedCurrency: 'USD', totalRevenue: '400000', grossProfit: '200000', operatingIncome: '120000', netIncome: '100000', ebit: '120000', interestExpense: '10000' },
      { fiscalDateEnding: '2023-12-31', reportedCurrency: 'USD', totalRevenue: '350000', grossProfit: '170000', operatingIncome: '100000', netIncome: '80000', ebit: '100000', interestExpense: '10000' }
    ]
  },
  BALANCE_SHEET: {
    annualReports: [
      { fiscalDateEnding: '2024-12-31', totalAssets: '900000', totalCurrentAssets: '300000', totalCurrentLiabilities: '150000', totalShareholderEquity: '500000', shortLongTermDebtTotal: '100000', cashAndCashEquivalentsAtCarryingValue: '50000' },
      { fiscalDateEnding: '2023-12-31', totalAssets: '800000', totalCurrentAssets: '250000', totalCurrentLiabilities: '140000', totalShareholderEquity: '400000', shortLongTermDebtTotal: '120000', cashAndCashEquivalentsAtCarryingValue: '40000' }
    ]
  },
  CASH_FLOW: {
    annualReports: [
      { fiscalDateEnding: '2024-12-31', operatingCashflow: '130000', capitalExpenditures: '30000', depreciationDepletionAndAmortization: '20000' },
      { fiscalDateEnding: '2023-12-31', operatingCashflow: '110000', capitalExpenditures: '25000', depreciationDepletionAndAmortization: '18000' }
    ]
  },
  NEWS_SENTIMENT: {
    feed: [
      { title: 'Good', url: 'u1', source: 's', time_published: '20250102T101500', overall_sentiment_label: 'Neutral', ticker_sentiment: [{ ticker: 'TEST', ticker_sentiment_label: 'Bullish', ticker_sentiment_score: '0.5' }] },
      { title: 'Better', url: 'u2', source: 's', time_published: '20250103T101500', overall_sentiment_label: 'Somewhat-Bullish' },
      { title: 'Bad', url: 'u3', source: 's', time_published: '20250104T101500', overall_sentiment_label: 'Bearish' }
    ]
  },
  INSIDER_TRANSACTIONS: {
    data: [
      { transaction_date: daysAgo(10), executive: 'A', executive_title: 'CEO', security_type: 'Common', acquisition_or_disposal: 'D', shares: '100', share_price: '10' },
      { transaction_date: daysAgo(400), executive: 'B', executive_title: 'CFO', security_type: 'Common', acquisition_or_disposal: 'A', shares: '100', share_price: '10' }
    ]
  },
  ...overrides
});

const createService = (overrides: Record<string, unknown> = {}) => {
  const canned = responses(overrides);
  const calls: Record<string, string>[] = [];
  const fetcher: AlphaVantageFetcher = async params => {
    calls.push(params);
    const response = canned[params.function];
    if (response instanceof Error) throw response;
    return response as Record<string, unknown>;
  };
  const cache = new CacheService();
  const client = new AlphaVantageClient('test-key', cache, 0, fetcher);
  return { service: new FinancialDataService(client, cache), calls };
};

const request = { tickers: ['TEST'], start_date: daysAgo(30), end_date: today };

test('prices are returned oldest first, filtered by date and served from cache', async () => {
  const { service, calls } = createService();
  const prices = await service.getPrices('TEST', daysAgo(9), today);
  await service.getPrices('TEST', daysAgo(5), today);

  assert.equal(prices.length, 10);
  assert.ok(prices[0].time < prices[9].time);
  assert.equal(prices[9].close, 199);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].outputsize, 'compact');
});

test('a long history falls back to the compact series when full output is a premium feature', async () => {
  const canned = responses();
  let fullRequests = 0;
  const cache = new CacheService();
  const client = new AlphaVantageClient('test-key', cache, 0, async params => {
    if (params.outputsize === 'full') {
      fullRequests++;
      return { Information: 'This is a premium endpoint.' };
    }
    return canned[params.function] as Record<string, unknown>;
  });
  const premiumService = new FinancialDataService(client, cache);

  assert.equal((await premiumService.getPrices('TEST', daysAgo(400), today)).length, 100);
  await premiumService.getPrices('TEST', daysAgo(400), today);
  assert.equal(fullRequests, 1);
});

test('in-band API errors become HTTP errors', async () => {
  const query = (payload: Record<string, unknown>) =>
    new AlphaVantageClient('test-key', new CacheService(), 0, async () => payload).query({ function: 'OVERVIEW', symbol: 'X' }, 1000);

  await assert.rejects(query({ Information: 'Our standard API rate limit is 25 requests per day.' }), { status: 429 });
  await assert.rejects(query({ Note: 'Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute' }), { status: 429 });
  await assert.rejects(query({ Information: 'This is a premium endpoint' }), PremiumEndpointError);
  await assert.rejects(query({ 'Error Message': 'Invalid API call' }), { status: 404 });
  await assert.rejects(new AlphaVantageClient('', new CacheService(), 0, async () => ({})).query({ function: 'OVERVIEW' }, 1000), { status: 503 });
});

test('concurrent identical queries share one request', async () => {
  let requests = 0;
  const client = new AlphaVantageClient('test-key', new CacheService(), 0, async () => {
    requests++;
    return { ok: true };
  });
  await Promise.all([client.query({ function: 'OVERVIEW', symbol: 'X' }, 1000), client.query({ function: 'OVERVIEW', symbol: 'X' }, 1000)]);
  assert.equal(requests, 1);
});

test('metrics combine the overview with statement derived ratios as fractions', async () => {
  const { service } = createService();
  const [snapshot, annual] = await service.getFinancialMetrics('TEST', today, 'ttm', 10);

  assert.equal(snapshot.period, 'ttm');
  assert.equal(snapshot.net_margin, 0.25);
  assert.equal(snapshot.gross_margin, 0.5);
  assert.equal(snapshot.current_ratio, 2);
  assert.equal(snapshot.debt_to_equity, 0.2);
  assert.equal(snapshot.book_value_growth, 0.25);
  assert.equal(snapshot.book_value_per_share, null);
  assert.equal(snapshot.free_cash_flow_per_share, 10);
  assert.equal(snapshot.enterprise_value, 1050000);
  assert.equal(annual.period, 'annual');
  assert.equal(annual.net_margin, 0.25);
});

test('line items include derived values and null for unknown items', async () => {
  const { service } = createService();
  const [latest] = await service.searchLineItems('TEST', ['free_cash_flow', 'working_capital', 'capital_expenditures', 'nonsense'], today, 'annual', 1);

  assert.equal(latest.free_cash_flow, 100000);
  assert.equal(latest.working_capital, 150000);
  assert.equal(latest.capital_expenditures, 30000);
  assert.equal(latest.nonsense, null);
});

test('fundamentals: strong company is bullish with per-component reasoning', async () => {
  const { service } = createService();
  const { results, errors } = await new FundamentalsService(service).analyzeFundamentals(request);

  assert.deepEqual(errors, {});
  assert.equal(results.TEST.signal, 'bullish');
  assert.equal(results.TEST.confidence, 100);
  assert.deepEqual(Object.keys(results.TEST.reasoning), ['profitability_signal', 'growth_signal', 'financial_health_signal', 'price_ratios_signal']);
});

test('a failing ticker is reported in errors without failing the request', async () => {
  const { service } = createService({ OVERVIEW: {} });
  const { results, errors } = await new FundamentalsService(service).analyzeFundamentals(request);

  assert.deepEqual(results, {});
  assert.match(errors.TEST, /No company fundamentals/);
});

test('technicals: a steady uptrend is bullish and short histories are rejected', async () => {
  const { service } = createService();
  const technicals = new TechnicalAnalystService(service);
  const { results } = await technicals.analyzeTickers(request);

  assert.equal(results.TEST.signal, 'bullish');
  assert.equal(results.TEST.reasoning.trend_following.signal, 'bullish');
  assert.ok(results.TEST.confidence > 0 && results.TEST.confidence <= 100);
  for (const strategy of Object.values(results.TEST.reasoning)) {
    assert.ok(Object.values(strategy.metrics).every(value => value === null || Number.isFinite(value)));
  }

  const fewPrices: Price[] = Array.from({ length: 5 }, (_, i) => ({ time: `2025-01-0${i + 1}`, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
  assert.throws(() => technicals.analyzePrices('TEST', fewPrices), /Not enough price history/);
});

test('sentiment weighs news and recent insider trades', async () => {
  const { service } = createService();
  const { results } = await new SentimentService(service).analyzeSentiment(request);

  // 2 bullish articles (1.4) against 1 bearish article and 1 insider sale (1.0)
  assert.equal(results.TEST.signal, 'bullish');
  assert.equal(results.TEST.confidence, Math.round(1.4 / 2.4 * 100));
  assert.match(results.TEST.reasoning.insider_trading.details, /^1 transactions/);
});

test('sentiment survives one source failing but not both', async () => {
  const partial = createService({ INSIDER_TRANSACTIONS: new Error('down') });
  const partialResult = await new SentimentService(partial.service).analyzeSentiment(request);
  assert.equal(partialResult.results.TEST.signal, 'bullish');
  assert.match(partialResult.results.TEST.reasoning.insider_trading.details, /Unavailable/);

  const none = createService({ INSIDER_TRANSACTIONS: new Error('down'), NEWS_SENTIMENT: new Error('down') });
  const noneResult = await new SentimentService(none.service).analyzeSentiment(request);
  assert.ok(noneResult.errors.TEST);
});

test('valuation compares intrinsic value with the market cap', async () => {
  const { service } = createService();
  const valuation = new ValuationService(service);
  const { results } = await valuation.analyzeValuation(request);

  assert.equal(results.TEST.signal, 'bullish');
  assert.ok(results.TEST.confidence <= 100);

  // No growth: five years of 100 discounted at 10% plus the terminal value
  const expected = [1, 2, 3, 4, 5].reduce((sum, year) => sum + 100 / Math.pow(1.1, year), 0) + (100 / 0.1) / Math.pow(1.1, 5);
  assert.ok(Math.abs(valuation.calculateIntrinsicValue(100, 0, 0.10, 0, 5) - expected) < 1e-9);
  assert.equal(valuation.calculateIntrinsicValue(-5), 0);
  assert.equal(valuation.calculateOwnerEarningsValue(10, 0, 20, 0), 0);
});

test('risk analysis uses the latest price and caps positions at 20% of the portfolio', async () => {
  const { service } = createService();
  const portfolio = { ...createPortfolio(10000), positions: { TEST: { shares: 5, avg_price: 100, current_price: 100 } } };
  const { results } = await new RiskManagerService(service).analyzeRisk({ ...request, portfolio });
  const analysis = results.TEST;

  assert.equal(analysis.current_price, 199);
  assert.equal(analysis.reasoning.portfolio_value, 10995);
  assert.equal(analysis.reasoning.current_position, 995);
  assert.ok(Math.abs(analysis.remaining_position_limit - (10995 * 0.2 - 995)) < 1e-9);
  assert.equal(analysis.reasoning.max_drawdown, 0);
  assert.ok(analysis.risk_score >= 1 && analysis.risk_score <= 10);
});

test('extractJson handles nested objects, code fences and surrounding text', () => {
  assert.deepEqual(extractJson('Here you go:\n```json\n{"a": {"b": 1}}\n```'), { a: { b: 1 } });
  assert.deepEqual(extractJson('{"decisions": {"AAPL": {"action": "buy"}}} thanks'), { decisions: { AAPL: { action: 'buy' } } });
  assert.throws(() => extractJson('no json here'));
});
