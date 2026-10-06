import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPortfolio, Portfolio, PortfolioDecision, RiskAnalysisResult } from '../data/models';
import { calculatePerformance, executeTrades } from '../services/portfolio';
import { PortfolioManagementRequest, PortfolioManagementService } from '../services/portfolioManagement.service';
import { LlmService } from '../services/llm';
import { RiskManagerService } from '../services/riskManager.service';

const decision = (action: PortfolioDecision['action'], quantity: number): PortfolioDecision =>
  ({ action, quantity, confidence: 50, reasoning: 'test' });

const risk = (price: number, limit: number): RiskAnalysisResult => ({
  remaining_position_limit: limit,
  current_price: price,
  risk_score: 5,
  reasoning: {
    portfolio_value: 100000,
    current_position: 0,
    position_limit: 20000,
    remaining_limit: limit,
    available_cash: 100000,
    annualized_volatility: 0.3,
    max_drawdown: 0.1
  }
});

test('buying updates cash, average price and history without touching the input', () => {
  const portfolio = createPortfolio(10000);
  const first = executeTrades(portfolio, { AAPL: decision('buy', 10) }, { AAPL: 100 });
  const second = executeTrades(first.portfolio, { AAPL: decision('buy', 10) }, { AAPL: 200 });

  assert.equal(portfolio.cash, 10000);
  assert.deepEqual(portfolio.positions, {});
  assert.equal(second.portfolio.cash, 7000);
  assert.deepEqual(second.portfolio.positions.AAPL, { shares: 20, avg_price: 150, current_price: 200 });
  assert.equal(second.portfolio.history.length, 2);
});

test('trades that cannot be filled are skipped with a reason', () => {
  const portfolio = createPortfolio(500);
  const result = executeTrades(
    portfolio,
    { AAPL: decision('buy', 10), MSFT: decision('sell', 5), TSLA: decision('buy', 1) },
    { AAPL: 100, MSFT: 300 }
  );

  assert.equal(result.trades.length, 0);
  assert.deepEqual(result.skipped.map(s => s.ticker).sort(), ['AAPL', 'MSFT', 'TSLA']);
  assert.equal(result.portfolio.cash, 500);
});

test('sells run before buys and closing a position removes it', () => {
  const portfolio: Portfolio = {
    cash: 0,
    positions: { MSFT: { shares: 5, avg_price: 200, current_price: 200 } },
    history: [],
    initial_value: 1000
  };
  const result = executeTrades(
    portfolio,
    { AAPL: decision('buy', 10), MSFT: decision('sell', 5) },
    { AAPL: 100, MSFT: 300 }
  );

  assert.deepEqual(result.trades.map(t => t.action), ['sell', 'buy']);
  assert.equal(result.portfolio.positions.MSFT, undefined);
  assert.equal(result.portfolio.cash, 500);

  const performance = calculatePerformance(result.portfolio);
  assert.equal(performance.portfolioValue, 1500);
  assert.equal(performance.returnPercent, 50);
});

const request = (overrides: Partial<PortfolioManagementRequest> = {}): PortfolioManagementRequest => ({
  tickers: ['AAPL', 'MSFT'],
  analyst_signals: {
    fundamentals: {
      AAPL: { signal: 'bullish', confidence: 80 },
      MSFT: { signal: 'bearish', confidence: 90 }
    },
    technicals: {
      AAPL: { signal: 'bullish', confidence: 60 },
      MSFT: { signal: 'bearish', confidence: 70 }
    }
  },
  risk: { AAPL: risk(100, 20000), MSFT: risk(400, 20000) },
  portfolio: {
    cash: 100000,
    positions: { MSFT: { shares: 10, avg_price: 350, current_price: 400 } },
    history: [],
    initial_value: 100000
  },
  ...overrides
});

test('rule-based decisions buy bullish and sell bearish tickers within limits', async () => {
  const service = new PortfolioManagementService(null);
  const result = await service.managePortfolio(request());

  assert.equal(result.source, 'rules');
  assert.equal(result.decisions.AAPL.action, 'buy');
  assert.ok(result.decisions.AAPL.quantity > 0 && result.decisions.AAPL.quantity <= 200);
  assert.equal(result.decisions.MSFT.action, 'sell');
  assert.equal(result.decisions.MSFT.quantity, 10);
});

test('tickers without signals are held', async () => {
  const service = new PortfolioManagementService(null);
  const result = await service.managePortfolio(request({ analyst_signals: {} }));

  assert.equal(result.decisions.AAPL.action, 'hold');
  assert.equal(result.decisions.AAPL.quantity, 0);
});

test('language model decisions are clamped to the trading rules', async () => {
  const llm: LlmService = {
    provider: 'fake',
    getCompletion: async <T>() => ({
      decisions: {
        AAPL: { action: 'BUY', quantity: 100000, confidence: 250, reasoning: 'all in' },
        MSFT: { action: 'sell', quantity: 50, confidence: 70, reasoning: 'exit' }
      }
    }) as T
  };
  const result = await new PortfolioManagementService(llm).managePortfolio(request());

  assert.equal(result.source, 'llm');
  assert.deepEqual(
    { action: result.decisions.AAPL.action, quantity: result.decisions.AAPL.quantity, confidence: result.decisions.AAPL.confidence },
    { action: 'buy', quantity: 200, confidence: 100 }
  );
  assert.equal(result.decisions.MSFT.quantity, 10);
});

test('a failing language model falls back to the rules', async () => {
  const llm: LlmService = {
    provider: 'fake',
    getCompletion: async () => { throw new Error('boom'); }
  };
  const result = await new PortfolioManagementService(llm).managePortfolio(request());

  assert.equal(result.source, 'rules');
  assert.ok(result.note);
  assert.equal(result.decisions.AAPL.action, 'buy');
});

test('risk recommendations size buys by confidence and sell held bearish positions', () => {
  const service = new RiskManagerService();
  const { portfolio, risk: riskAnalysis } = request();
  const result = service.generateRecommendations(
    { AAPL: { signal: 'bullish', confidence: 100 }, MSFT: { signal: 'bearish', confidence: 100 } },
    { AAPL: { signal: 'bullish', confidence: 100 }, MSFT: { signal: 'bearish', confidence: 100 } },
    riskAnalysis,
    portfolio
  );

  assert.deepEqual(
    { action: result.recommendations.AAPL.action, shares: result.recommendations.AAPL.shares },
    { action: 'buy', shares: 200 }
  );
  assert.deepEqual(
    { action: result.recommendations.MSFT.action, shares: result.recommendations.MSFT.shares },
    { action: 'sell', shares: 10 }
  );
  assert.equal(result.portfolio_summary.total_value, 104000);
});
