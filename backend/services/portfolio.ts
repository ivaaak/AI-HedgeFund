import { Portfolio, PortfolioDecision, TradeRecord } from '../data/models';

export interface PositionSummary {
  ticker: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  currentValue: number;
  profit: number;
  profitPercent: number;
}

export interface PortfolioPerformance {
  portfolioValue: number;
  cashValue: number;
  equityValue: number;
  initialValue: number;
  returnPercent: number;
  positions: PositionSummary[];
}

export interface SkippedTrade {
  ticker: string;
  reason: string;
}

/**
 * Returns a copy of the portfolio with positions marked to the given prices
 */
export function markToMarket(portfolio: Portfolio, prices: Record<string, number>): Portfolio {
  const positions: Portfolio['positions'] = {};
  for (const [ticker, position] of Object.entries(portfolio.positions)) {
    positions[ticker] = { ...position, current_price: prices[ticker] ?? position.current_price };
  }
  return { ...portfolio, positions, history: [...portfolio.history] };
}

export function equityValue(portfolio: Portfolio): number {
  return Object.values(portfolio.positions).reduce((sum, p) => sum + p.shares * p.current_price, 0);
}

export function portfolioValue(portfolio: Portfolio): number {
  return portfolio.cash + equityValue(portfolio);
}

/**
 * Execute (paper) trades based on portfolio decisions. The input portfolio is not modified.
 */
export function executeTrades(
  portfolio: Portfolio,
  decisions: Record<string, PortfolioDecision>,
  prices: Record<string, number>,
  date: string = new Date().toISOString()
): { portfolio: Portfolio; trades: TradeRecord[]; skipped: SkippedTrade[] } {
  const updated = markToMarket(portfolio, prices);
  const trades: TradeRecord[] = [];
  const skipped: SkippedTrade[] = [];

  // Sells first so their proceeds are available to the buys
  const ordered = Object.entries(decisions).sort(([, a], [, b]) =>
    Number(b.action === 'sell') - Number(a.action === 'sell'));

  for (const [ticker, decision] of ordered) {
    const quantity = Math.floor(decision.quantity);
    if (decision.action === 'hold' || !(quantity > 0)) {
      continue;
    }

    const price = prices[ticker];
    if (!price || price <= 0) {
      skipped.push({ ticker, reason: 'Missing price data' });
      continue;
    }

    if (decision.action === 'buy') {
      const cost = quantity * price;

      // Check if we have enough cash
      if (cost > updated.cash) {
        skipped.push({ ticker, reason: `Insufficient funds to buy ${quantity} shares` });
        continue;
      }

      const position = updated.positions[ticker] || { shares: 0, avg_price: 0, current_price: price };
      const totalShares = position.shares + quantity;
      updated.positions[ticker] = {
        shares: totalShares,
        avg_price: (position.shares * position.avg_price + cost) / totalShares,
        current_price: price
      };
      updated.cash -= cost;
      trades.push({ date, ticker, action: 'buy', quantity, price, total: cost });
    } else if (decision.action === 'sell') {
      const position = updated.positions[ticker];

      // Check if we have enough shares
      if (!position || position.shares < quantity) {
        skipped.push({ ticker, reason: `Insufficient shares to sell ${quantity}` });
        continue;
      }

      const revenue = quantity * price;
      updated.cash += revenue;

      // Remove position if no shares left
      if (position.shares === quantity) {
        delete updated.positions[ticker];
      } else {
        updated.positions[ticker] = { ...position, shares: position.shares - quantity, current_price: price };
      }
      trades.push({ date, ticker, action: 'sell', quantity, price, total: revenue });
    }
  }

  updated.history.push(...trades);

  return { portfolio: updated, trades, skipped };
}

/**
 * Calculate portfolio performance
 */
export function calculatePerformance(portfolio: Portfolio): PortfolioPerformance {
  const equity = equityValue(portfolio);
  const value = portfolio.cash + equity;

  const positions = Object.entries(portfolio.positions).map(([ticker, position]) => {
    const currentValue = position.shares * position.current_price;
    const cost = position.shares * position.avg_price;
    const profit = currentValue - cost;

    return {
      ticker,
      shares: position.shares,
      avgPrice: position.avg_price,
      currentPrice: position.current_price,
      currentValue,
      profit,
      profitPercent: cost > 0 ? (profit / cost) * 100 : 0
    };
  });

  return {
    portfolioValue: value,
    cashValue: portfolio.cash,
    equityValue: equity,
    initialValue: portfolio.initial_value,
    returnPercent: portfolio.initial_value > 0
      ? ((value - portfolio.initial_value) / portfolio.initial_value) * 100
      : 0,
    positions
  };
}
