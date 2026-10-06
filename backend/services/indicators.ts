// Technical indicator calculations. Functions returning a single number give
// the latest value and return NaN when there is not enough history.

const mean = (data: number[]): number => data.reduce((a, b) => a + b, 0) / data.length;

export function ema(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [data[0]];

  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }

  return result;
}

export function sma(data: number[], period: number): number {
  if (data.length < period) return NaN;
  return mean(data.slice(-period));
}

// Population standard deviation of the last `period` values
export function std(data: number[], period: number): number {
  if (data.length < period) return NaN;
  const window = data.slice(-period);
  const avg = mean(window);
  return Math.sqrt(mean(window.map(value => Math.pow(value - avg, 2))));
}

export function rollingStd(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let end = period; end <= data.length; end++) {
    result.push(std(data.slice(0, end), period));
  }
  return result;
}

export function bollingerBands(data: number[], period: number = 20, multiplier: number = 2): { upper: number; lower: number } {
  const middle = sma(data, period);
  const deviation = std(data, period);
  return { upper: middle + multiplier * deviation, lower: middle - multiplier * deviation };
}

// Simple returns; one element shorter than the input
export function returns(data: number[]): number[] {
  const result: number[] = [];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] / data[i - 1] - 1);
  }
  return result;
}

export function sumLast(data: number[], period: number): number {
  if (data.length < period) return NaN;
  return data.slice(-period).reduce((a, b) => a + b, 0);
}

// Relative Strength Index with Wilder's smoothing
export function rsi(data: number[], period: number = 14): number {
  if (data.length < period + 1) return NaN;

  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }

  let avgGain = mean(changes.slice(0, period).map(c => Math.max(c, 0)));
  let avgLoss = mean(changes.slice(0, period).map(c => Math.max(-c, 0)));

  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + Math.max(changes[i], 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-changes[i], 0)) / period;
  }

  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function trueRanges(high: number[], low: number[], close: number[]): number[] {
  const result: number[] = [];
  for (let i = 1; i < close.length; i++) {
    result.push(Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1]),
      Math.abs(low[i] - close[i - 1])
    ));
  }
  return result;
}

// Average True Range over the latest `period` bars
export function atr(high: number[], low: number[], close: number[], period: number = 14): number {
  return sma(trueRanges(high, low, close), period);
}

// Average Directional Index (Wilder). Needs at least 2 * period + 1 bars.
export function adx(high: number[], low: number[], close: number[], period: number = 14): number {
  if (close.length < 2 * period + 1) return NaN;

  const tr = trueRanges(high, low, close);
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < close.length; i++) {
    const upMove = high[i] - high[i - 1];
    const downMove = low[i - 1] - low[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  const sum = (data: number[]) => data.reduce((a, b) => a + b, 0);
  let smoothedTR = sum(tr.slice(0, period));
  let smoothedPlus = sum(plusDM.slice(0, period));
  let smoothedMinus = sum(minusDM.slice(0, period));

  const dx: number[] = [];
  const pushDX = () => {
    const plusDI = smoothedTR === 0 ? 0 : 100 * smoothedPlus / smoothedTR;
    const minusDI = smoothedTR === 0 ? 0 : 100 * smoothedMinus / smoothedTR;
    const total = plusDI + minusDI;
    dx.push(total === 0 ? 0 : 100 * Math.abs(plusDI - minusDI) / total);
  };

  pushDX();
  for (let i = period; i < tr.length; i++) {
    smoothedTR = smoothedTR - smoothedTR / period + tr[i];
    smoothedPlus = smoothedPlus - smoothedPlus / period + plusDM[i];
    smoothedMinus = smoothedMinus - smoothedMinus / period + minusDM[i];
    pushDX();
  }

  let result = mean(dx.slice(0, period));
  for (let i = period; i < dx.length; i++) {
    result = (result * (period - 1) + dx[i]) / period;
  }
  return result;
}

export function skewness(data: number[], period: number): number {
  if (data.length < period) return NaN;
  const window = data.slice(-period);
  const avg = mean(window);
  const variance = mean(window.map(v => Math.pow(v - avg, 2)));
  if (variance === 0) return 0;
  return mean(window.map(v => Math.pow(v - avg, 3))) / Math.pow(variance, 1.5);
}

export function kurtosis(data: number[], period: number): number {
  if (data.length < period) return NaN;
  const window = data.slice(-period);
  const avg = mean(window);
  const variance = mean(window.map(v => Math.pow(v - avg, 2)));
  if (variance === 0) return 3;
  return mean(window.map(v => Math.pow(v - avg, 4))) / Math.pow(variance, 2);
}

/**
 * Hurst exponent estimated from how the dispersion of lagged price differences
 * grows with the lag. H < 0.5 mean reverting, H = 0.5 random walk, H > 0.5 trending.
 */
export function hurstExponent(data: number[], maxLag: number = 20): number {
  if (data.length < maxLag * 2) return NaN;

  const points: { x: number; y: number }[] = [];
  for (let lag = 2; lag < maxLag; lag++) {
    const diffs: number[] = [];
    for (let i = lag; i < data.length; i++) {
      diffs.push(data[i] - data[i - lag]);
    }
    const deviation = std(diffs, diffs.length);
    if (deviation > 0) {
      points.push({ x: Math.log(lag), y: Math.log(deviation) });
    }
  }

  if (points.length < 2) return NaN;

  // Least squares slope of log(dispersion) against log(lag)
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
}

// Largest peak-to-trough decline as a positive fraction
export function maxDrawdown(data: number[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const value of data) {
    peak = Math.max(peak, value);
    if (peak > 0) {
      worst = Math.max(worst, (peak - value) / peak);
    }
  }
  return worst;
}

// Annualized volatility of daily closes
export function annualizedVolatility(closes: number[]): number {
  const dailyReturns = returns(closes);
  if (dailyReturns.length < 2) return NaN;
  return std(dailyReturns, dailyReturns.length) * Math.sqrt(252);
}
