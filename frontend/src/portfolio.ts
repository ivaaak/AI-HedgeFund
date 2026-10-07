import { PerformancePoint, Portfolio } from './types';

export const DEFAULT_STARTING_CASH = 100000;

const PORTFOLIO_KEY = 'ai-hedgefund-portfolio';
const PERFORMANCE_KEY = 'ai-hedgefund-performance';

export const createPortfolio = (cash: number = DEFAULT_STARTING_CASH): Portfolio => ({
  cash,
  positions: {},
  history: [],
  initial_value: cash
});

export const equityValue = (portfolio: Portfolio): number =>
  Object.values(portfolio.positions).reduce((sum, position) => sum + position.shares * position.current_price, 0);

export const portfolioValue = (portfolio: Portfolio): number => portfolio.cash + equityValue(portfolio);

export const portfolioReturn = (portfolio: Portfolio): number =>
  portfolio.initial_value > 0
    ? ((portfolioValue(portfolio) - portfolio.initial_value) / portfolio.initial_value) * 100
    : 0;

// Share of the portfolio in each position and in cash, in percent
export const portfolioAllocation = (portfolio: Portfolio): Array<{ ticker: string; percentage: number }> => {
  const total = portfolioValue(portfolio);
  if (total <= 0) return [];

  return [
    ...Object.entries(portfolio.positions).map(([ticker, position]) => ({
      ticker,
      percentage: (position.shares * position.current_price / total) * 100
    })),
    { ticker: 'Cash', percentage: (portfolio.cash / total) * 100 }
  ];
};

// The paper portfolio lives in the browser: the backend is stateless

const load = <T,>(key: string): T | null => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : null;
  } catch {
    return null;
  }
};

const save = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable (private mode); the app still works for this session
  }
};

export const loadPortfolio = (): Portfolio => {
  const stored = load<Portfolio>(PORTFOLIO_KEY);
  return stored && typeof stored.cash === 'number' && stored.positions ? stored : createPortfolio();
};

export const loadPerformance = (): PerformancePoint[] => {
  const stored = load<PerformancePoint[]>(PERFORMANCE_KEY);
  return Array.isArray(stored) ? stored : [];
};

export const savePortfolio = (portfolio: Portfolio, performance: PerformancePoint[]): void => {
  save(PORTFOLIO_KEY, portfolio);
  save(PERFORMANCE_KEY, performance);
};
