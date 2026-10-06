import { AnalysisRequest, AnalysisResponse, AnalystSignal, Price, SignalDirection } from '../data/models';
import { HttpError } from '../middleware/middleware';
import { daysBefore } from '../middleware/validation';
import { analyzeEach } from './analysis.util';
import { FinancialDataService, financialDataService } from './financialData.service';
import * as indicators from './indicators';

export interface StrategySignal {
  signal: SignalDirection;
  confidence: number; // 0 to 100
  metrics: Record<string, number | null>;
  details: string;
}

export type TechnicalAnalysisResult = AnalystSignal<Record<string, StrategySignal>>;

// Result of one strategy before it is formatted: confidence is 0 to 1,
// and null means there was not enough price history to evaluate it
interface RawStrategySignal {
  signal: SignalDirection;
  confidence: number;
  metrics: Record<string, number>;
}

interface PriceSeries {
  close: number[];
  high: number[];
  low: number[];
  volume: number[];
}

// Indicators need more history than the user's date range usually covers
const LOOKBACK_DAYS = 400;
const MIN_BARS = 30;

const STRATEGY_WEIGHTS: Record<string, number> = {
  trend_following: 0.25,
  mean_reversion: 0.20,
  momentum: 0.25,
  volatility: 0.15,
  statistical_arbitrage: 0.15
};

const last = (data: number[]): number => data[data.length - 1];

export class TechnicalAnalystService {
  constructor(private financialData: FinancialDataService = financialDataService) {}

  /**
   * Analyze multiple tickers and return technical signals
   */
  public async analyzeTickers(request: AnalysisRequest): Promise<AnalysisResponse<TechnicalAnalysisResult>> {
    const lookbackStart = daysBefore(request.end_date, LOOKBACK_DAYS);
    const startDate = request.start_date < lookbackStart ? request.start_date : lookbackStart;

    return analyzeEach('technical_analyst_agent', request.tickers, async ticker => {
      const prices = await this.financialData.getPrices(ticker, startDate, request.end_date);
      return this.analyzePrices(ticker, prices);
    });
  }

  /**
   * Run every strategy on a price series (oldest first) and combine the results
   */
  public analyzePrices(ticker: string, prices: Price[]): TechnicalAnalysisResult {
    if (prices.length < MIN_BARS) {
      throw new HttpError(422, `Not enough price history for ${ticker} (${prices.length} days, need ${MIN_BARS})`);
    }

    const series: PriceSeries = {
      close: prices.map(p => p.close),
      high: prices.map(p => p.high),
      low: prices.map(p => p.low),
      volume: prices.map(p => p.volume)
    };

    const strategies: Record<string, RawStrategySignal | null> = {
      trend_following: this.calculateTrendSignals(series),
      mean_reversion: this.calculateMeanReversionSignals(series),
      momentum: this.calculateMomentumSignals(series),
      volatility: this.calculateVolatilitySignals(series),
      statistical_arbitrage: this.calculateStatArbSignals(series)
    };

    const combined = this.weightedSignalCombination(strategies, STRATEGY_WEIGHTS);

    const reasoning: Record<string, StrategySignal> = {};
    for (const [name, result] of Object.entries(strategies)) {
      reasoning[name] = result
        ? {
          signal: result.signal,
          confidence: Math.round(result.confidence * 100),
          metrics: result.metrics,
          details: Object.entries(result.metrics)
            .map(([metric, value]) => `${metric}: ${value.toFixed(2)}`)
            .join(', ')
        }
        : { signal: 'neutral', confidence: 0, metrics: {}, details: 'Not enough price history' };
    }

    return {
      signal: combined.signal,
      confidence: Math.round(combined.confidence * 100),
      reasoning
    };
  }

  /**
   * Trend following: EMA alignment, weighted by trend strength (ADX)
   */
  private calculateTrendSignals({ close, high, low }: PriceSeries): RawStrategySignal | null {
    const adx = indicators.adx(high, low, close, 14);
    if (close.length < 56 || isNaN(adx)) return null;

    const ema8 = last(indicators.ema(close, 8));
    const ema21 = last(indicators.ema(close, 21));
    const ema55 = last(indicators.ema(close, 55));

    // Determine trend direction and strength
    const shortTrend = ema8 > ema21;
    const mediumTrend = ema21 > ema55;
    const trendStrength = adx / 100;

    let signal: SignalDirection = 'neutral';
    let confidence = 0.5;

    if (shortTrend && mediumTrend) {
      signal = 'bullish';
      confidence = trendStrength;
    } else if (!shortTrend && !mediumTrend) {
      signal = 'bearish';
      confidence = trendStrength;
    }

    return { signal, confidence, metrics: { adx, trend_strength: trendStrength } };
  }

  /**
   * Mean reversion: z-score against the 50 day average and position in the Bollinger Bands
   */
  private calculateMeanReversionSignals({ close }: PriceSeries): RawStrategySignal | null {
    if (close.length < 50) return null;

    const currentPrice = last(close);
    const deviation = indicators.std(close, 50);
    const zScore = deviation === 0 ? 0 : (currentPrice - indicators.sma(close, 50)) / deviation;

    const bands = indicators.bollingerBands(close);
    const bandWidth = bands.upper - bands.lower;
    const priceVsBB = bandWidth === 0 ? 0.5 : (currentPrice - bands.lower) / bandWidth;

    let signal: SignalDirection = 'neutral';
    let confidence = 0.5;

    if (zScore < -2 && priceVsBB < 0.2) {
      signal = 'bullish';
      confidence = Math.min(Math.abs(zScore) / 4, 1.0);
    } else if (zScore > 2 && priceVsBB > 0.8) {
      signal = 'bearish';
      confidence = Math.min(Math.abs(zScore) / 4, 1.0);
    }

    return {
      signal,
      confidence,
      metrics: {
        z_score: zScore,
        price_vs_bb: priceVsBB,
        rsi_14: indicators.rsi(close, 14),
        rsi_28: indicators.rsi(close, 28)
      }
    };
  }

  /**
   * Momentum: 1, 3 and 6 month price momentum confirmed by volume
   */
  private calculateMomentumSignals({ close, volume }: PriceSeries): RawStrategySignal | null {
    const dailyReturns = indicators.returns(close);

    // Use the horizons the history covers and re-weight them
    const horizons: [string, number, number][] = [
      ['momentum_1m', 21, 0.4],
      ['momentum_3m', 63, 0.3],
      ['momentum_6m', 126, 0.3]
    ];
    const available = horizons
      .map(([name, period, weight]) => ({ name, weight, value: indicators.sumLast(dailyReturns, period) }))
      .filter(h => !isNaN(h.value));

    if (available.length === 0) return null;

    const totalWeight = available.reduce((sum, h) => sum + h.weight, 0);
    const momentumScore = available.reduce((sum, h) => sum + h.value * h.weight, 0) / totalWeight;

    // Volume confirmation
    const averageVolume = indicators.sma(volume, 21);
    const volumeMomentum = averageVolume > 0 ? last(volume) / averageVolume : 1;
    const volumeConfirmation = volumeMomentum > 1.0;

    let signal: SignalDirection = 'neutral';
    let confidence = 0.5;

    if (momentumScore > 0.05 && volumeConfirmation) {
      signal = 'bullish';
      confidence = Math.min(Math.abs(momentumScore) * 5, 1.0);
    } else if (momentumScore < -0.05 && volumeConfirmation) {
      signal = 'bearish';
      confidence = Math.min(Math.abs(momentumScore) * 5, 1.0);
    }

    const metrics: Record<string, number> = { volume_momentum: volumeMomentum };
    available.forEach(h => { metrics[h.name] = h.value; });

    return { signal, confidence, metrics };
  }

  /**
   * Volatility: current volatility regime relative to its own history
   */
  private calculateVolatilitySignals({ close, high, low }: PriceSeries): RawStrategySignal | null {
    // Historical volatility (annualized)
    const histVol = indicators.rollingStd(indicators.returns(close), 21).map(v => v * Math.sqrt(252));
    if (histVol.length < 63) return null;

    const currentVol = last(histVol);
    const volMA = indicators.sma(histVol, 63);
    const volStd = indicators.std(histVol, 63);

    // Volatility regime detection
    const volRegime = volMA === 0 ? 1 : currentVol / volMA;
    const volZScore = volStd === 0 ? 0 : (currentVol - volMA) / volStd;
    const atrRatio = indicators.atr(high, low, close, 14) / last(close);

    let signal: SignalDirection = 'neutral';
    let confidence = 0.5;

    if (volRegime < 0.8 && volZScore < -1) {
      signal = 'bullish'; // Low vol regime, potential for expansion
      confidence = Math.min(Math.abs(volZScore) / 3, 1.0);
    } else if (volRegime > 1.2 && volZScore > 1) {
      signal = 'bearish'; // High vol regime, potential for contraction
      confidence = Math.min(Math.abs(volZScore) / 3, 1.0);
    }

    return {
      signal,
      confidence,
      metrics: {
        historical_volatility: currentVol,
        volatility_regime: volRegime,
        volatility_z_score: volZScore,
        atr_ratio: atrRatio
      }
    };
  }

  /**
   * Statistical arbitrage: mean reversion (Hurst exponent) with skewed returns
   */
  private calculateStatArbSignals({ close }: PriceSeries): RawStrategySignal | null {
    const dailyReturns = indicators.returns(close);
    const skew = indicators.skewness(dailyReturns, 63);
    const kurt = indicators.kurtosis(dailyReturns, 63);
    const hurst = indicators.hurstExponent(close);

    if (isNaN(skew) || isNaN(hurst)) return null;

    let signal: SignalDirection = 'neutral';
    let confidence = 0.5;

    if (hurst < 0.4 && skew > 1) {
      signal = 'bullish';
      confidence = Math.min((0.5 - hurst) * 2, 1.0);
    } else if (hurst < 0.4 && skew < -1) {
      signal = 'bearish';
      confidence = Math.min((0.5 - hurst) * 2, 1.0);
    }

    return { signal, confidence, metrics: { hurst_exponent: hurst, skewness: skew, kurtosis: kurt } };
  }

  /**
   * Combines the strategies that could be evaluated using a weighted approach
   */
  private weightedSignalCombination(
    signals: Record<string, RawStrategySignal | null>,
    weights: Record<string, number>
  ): { signal: SignalDirection; confidence: number } {
    const signalValues = { bullish: 1, neutral: 0, bearish: -1 };

    let weightedSum = 0;
    let totalConfidence = 0;

    for (const [strategy, result] of Object.entries(signals)) {
      if (!result) continue;
      weightedSum += signalValues[result.signal] * weights[strategy] * result.confidence;
      totalConfidence += weights[strategy] * result.confidence;
    }

    // Normalize the weighted sum
    const finalScore = totalConfidence > 0 ? weightedSum / totalConfidence : 0;

    let signal: SignalDirection = 'neutral';
    if (finalScore > 0.2) {
      signal = 'bullish';
    } else if (finalScore < -0.2) {
      signal = 'bearish';
    }

    return { signal, confidence: Math.abs(finalScore) };
  }
}
