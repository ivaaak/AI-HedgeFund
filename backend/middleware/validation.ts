import config from '../config';
import { AnalysisRequest, Portfolio, createPortfolio } from '../data/models';
import { HttpError } from './middleware';

const TICKER_PATTERN = /^[A-Z][A-Z0-9.-]{0,9}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const parseTicker = (value: unknown): string => {
  const ticker = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!TICKER_PATTERN.test(ticker)) {
    throw new HttpError(400, `Invalid ticker: ${JSON.stringify(value)}`);
  }
  return ticker;
};

export const parseTickers = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, 'tickers must be a non-empty array');
  }
  const tickers = [...new Set(value.map(parseTicker))];
  if (tickers.length > config.maxTickersPerRequest) {
    throw new HttpError(400, `At most ${config.maxTickersPerRequest} tickers per request`);
  }
  return tickers;
};

export const parseDate = (value: unknown, name: string): string => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value) || isNaN(Date.parse(value))) {
    throw new HttpError(400, `${name} must be a date in YYYY-MM-DD format`);
  }
  return value;
};

export const today = (): string => new Date().toISOString().split('T')[0];

export const daysBefore = (date: string, days: number): string =>
  new Date(Date.parse(date) - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

/**
 * Parses the common analysis request body. end_date defaults to today and
 * start_date to 90 days before it.
 */
export const parseAnalysisRequest = (body: Record<string, unknown> = {}): AnalysisRequest => {
  const tickers = parseTickers(body.tickers);
  const end_date = body.end_date === undefined ? today() : parseDate(body.end_date, 'end_date');
  const start_date = body.start_date === undefined
    ? daysBefore(end_date, 90)
    : parseDate(body.start_date, 'start_date');

  if (start_date > end_date) {
    throw new HttpError(400, 'start_date must not be after end_date');
  }

  return { tickers, start_date, end_date };
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Validates a portfolio sent by the client. A missing portfolio means a fresh one.
 */
export const parsePortfolio = (value: unknown): Portfolio => {
  if (value === undefined || value === null) {
    return createPortfolio();
  }
  if (typeof value !== 'object') {
    throw new HttpError(400, 'portfolio must be an object');
  }

  const raw = value as Record<string, unknown>;
  if (!isFiniteNumber(raw.cash) || raw.cash < 0) {
    throw new HttpError(400, 'portfolio.cash must be a non-negative number');
  }

  const positions: Portfolio['positions'] = {};
  for (const [key, pos] of Object.entries((raw.positions as Record<string, unknown>) || {})) {
    const position = pos as Record<string, unknown>;
    if (!position || !isFiniteNumber(position.shares) || position.shares < 0) {
      throw new HttpError(400, `portfolio.positions.${key}.shares must be a non-negative number`);
    }
    if (position.shares === 0) continue;
    const avgPrice = isFiniteNumber(position.avg_price) ? position.avg_price : 0;
    positions[parseTicker(key)] = {
      shares: position.shares,
      avg_price: avgPrice,
      current_price: isFiniteNumber(position.current_price) ? position.current_price : avgPrice
    };
  }

  const costBasis = Object.values(positions).reduce((sum, p) => sum + p.shares * p.avg_price, 0);

  return {
    cash: raw.cash,
    positions,
    history: Array.isArray(raw.history) ? (raw.history as Portfolio['history']) : [],
    initial_value: isFiniteNumber(raw.initial_value) && raw.initial_value > 0
      ? raw.initial_value
      : raw.cash + costBasis
  };
};
