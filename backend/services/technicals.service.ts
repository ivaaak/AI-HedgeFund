import { OpenAIService } from './openai.service';

// Type definitions
export interface PriceData {
  date: string;
  open: number;
  high: number;
  close: number;
  low: number;
  volume: number;
}

export interface TechnicalAnalysisResult {
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  strategy_signals: {
    trend_following: StrategySignal;
    mean_reversion: StrategySignal;
    momentum: StrategySignal;
    volatility: StrategySignal;
    statistical_arbitrage: StrategySignal;
  };
}

export interface StrategySignal {
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  metrics: Record<string, number>;
}

export interface TechnicalAnalysisRequest {
  tickers: string[];
  start_date: string;
  end_date: string;
}

export class TechnicalAnalystService {
  private openAIService: OpenAIService;
  
  constructor(apiKey?: string) {
    this.openAIService = new OpenAIService(apiKey);
  }
  
  /**
   * Analyze multiple tickers and return technical signals
   */
  public async analyzeTickers(request: TechnicalAnalysisRequest): Promise<Record<string, TechnicalAnalysisResult>> {
    try {
      const { tickers, start_date, end_date } = request;
      
      if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
        throw new Error('Invalid tickers provided');
      }
      
      if (!start_date || !end_date) {
        throw new Error('Start date and end date are required');
      }
      
      // Initialize analysis for each ticker
      const technicalAnalysis: Record<string, TechnicalAnalysisResult> = {};
      
      for (const ticker of tickers) {
        // Get historical price data
        const prices = await this.getPriceData(ticker, start_date, end_date);
        
        if (!prices || prices.length === 0) {
          console.warn(`No price data found for ${ticker}`);
          continue;
        }
        
        // Convert to DataFrame-like structure
        const pricesDF = this.convertToPricesDF(prices);
        
        // Calculate various signals
        const trendSignals = this.calculateTrendSignals(pricesDF);
        const meanReversionSignals = this.calculateMeanReversionSignals(pricesDF);
        const momentumSignals = this.calculateMomentumSignals(pricesDF);
        const volatilitySignals = this.calculateVolatilitySignals(pricesDF);
        const statArbSignals = this.calculateStatArbSignals(pricesDF);
        
        // Combine signals using weighted ensemble approach
        const strategyWeights = {
          trend: 0.25,
          mean_reversion: 0.20,
          momentum: 0.25,
          volatility: 0.15,
          stat_arb: 0.15,
        };
        
        const combinedSignal = this.weightedSignalCombination(
          {
            trend: trendSignals,
            mean_reversion: meanReversionSignals,
            momentum: momentumSignals,
            volatility: volatilitySignals,
            stat_arb: statArbSignals,
          },
          strategyWeights
        );
        
        // Generate detailed analysis for this ticker
        technicalAnalysis[ticker] = {
          signal: combinedSignal.signal,
          confidence: Math.round(combinedSignal.confidence * 100),
          strategy_signals: {
            trend_following: {
              signal: trendSignals.signal,
              confidence: Math.round(trendSignals.confidence * 100),
              metrics: trendSignals.metrics,
            },
            mean_reversion: {
              signal: meanReversionSignals.signal,
              confidence: Math.round(meanReversionSignals.confidence * 100),
              metrics: meanReversionSignals.metrics,
            },
            momentum: {
              signal: momentumSignals.signal,
              confidence: Math.round(momentumSignals.confidence * 100),
              metrics: momentumSignals.metrics,
            },
            volatility: {
              signal: volatilitySignals.signal,
              confidence: Math.round(volatilitySignals.confidence * 100),
              metrics: volatilitySignals.metrics,
            },
            statistical_arbitrage: {
              signal: statArbSignals.signal,
              confidence: Math.round(statArbSignals.confidence * 100),
              metrics: statArbSignals.metrics,
            },
          },
        };
      }
      
      return technicalAnalysis;
    } catch (error) {
      console.error('Error in technical analysis:', error);
      throw error;
    }
  }
  
  /**
   * Get price data for a specific ticker
   */
  public async getPriceData(ticker: string, startDate: string, endDate: string): Promise<PriceData[]> {
    try {
      // In a real implementation, this would call an external API or database
      // This could be replaced with a call to Alpha Vantage, Yahoo Finance, etc.
      
      // For demonstration, returning mock data
      const mockData: PriceData[] = [];
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      let currentDate = new Date(startDateObj);
      let basePrice = 100 + Math.random() * 50;
      
      while (currentDate <= endDateObj) {
        // Skip weekends
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          const dailyVolatility = 0.02;
          const change = (Math.random() - 0.5) * dailyVolatility * basePrice;
          
          const open = basePrice;
          const close = basePrice + change;
          const high = Math.max(open, close) + Math.random() * Math.abs(change);
          const low = Math.min(open, close) - Math.random() * Math.abs(change);
          const volume = Math.floor(100000 + Math.random() * 900000);
          
          mockData.push({
            date: currentDate.toISOString().split('T')[0],
            open,
            high,
            close,
            low,
            volume
          });
          
          basePrice = close;
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return mockData;
    } catch (error) {
      console.error(`Error fetching price data for ${ticker}:`, error);
      throw error;
    }
  }
  
  /**
   * Convert price data to a DataFrame-like structure for analysis
   */
  private convertToPricesDF(prices: PriceData[]): {
    close: number[];
    open: number[];
    high: number[];
    low: number[];
    volume: number[];
    date: string[];
  } {
    return {
      close: prices.map(p => p.close),
      open: prices.map(p => p.open),
      high: prices.map(p => p.high),
      low: prices.map(p => p.low),
      volume: prices.map(p => p.volume),
      date: prices.map(p => p.date)
    };
  }
  
  /**
   * Calculate trend following signals
   */
  private calculateTrendSignals(pricesDF: { close: number[] }): StrategySignal {
    // Calculate EMAs for multiple timeframes
    const ema8 = this.calculateEMA(pricesDF.close, 8);
    const ema21 = this.calculateEMA(pricesDF.close, 21);
    const ema55 = this.calculateEMA(pricesDF.close, 55);
    
    // Calculate ADX for trend strength (simplified version)
    const adx = Math.random() * 100; // In real implementation, calculate actual ADX
    
    // Determine trend direction and strength
    const shortTrend = ema8[ema8.length - 1] > ema21[ema21.length - 1];
    const mediumTrend = ema21[ema21.length - 1] > ema55[ema55.length - 1];
    
    // Combine signals with confidence weighting
    const trendStrength = adx / 100.0;
    
    let signal: 'bullish' | 'bearish' | 'neutral';
    let confidence: number;
    
    if (shortTrend && mediumTrend) {
      signal = 'bullish';
      confidence = trendStrength;
    } else if (!shortTrend && !mediumTrend) {
      signal = 'bearish';
      confidence = trendStrength;
    } else {
      signal = 'neutral';
      confidence = 0.5;
    }
    
    return {
      signal,
      confidence,
      metrics: {
        adx,
        trend_strength: trendStrength,
      },
    };
  }
  
  /**
   * Calculate mean reversion signals
   */
  private calculateMeanReversionSignals(pricesDF: { close: number[] }): StrategySignal {
    // Calculate z-score of price relative to moving average
    const ma50 = this.calculateSMA(pricesDF.close, 50);
    const std50 = this.calculateStd(pricesDF.close, 50);
    const zScore = (pricesDF.close[pricesDF.close.length - 1] - ma50[ma50.length - 1]) / std50[std50.length - 1];
    
    // Calculate Bollinger Bands
    const [bbUpper, bbLower] = this.calculateBollingerBands(pricesDF.close);
    
    // Calculate RSI
    const rsi14 = this.calculateRSI(pricesDF.close, 14);
    const rsi28 = this.calculateRSI(pricesDF.close, 28);
    
    // Mean reversion signals
    const currentPrice = pricesDF.close[pricesDF.close.length - 1];
    const priceVsBB = (currentPrice - bbLower[bbLower.length - 1]) / 
                      (bbUpper[bbUpper.length - 1] - bbLower[bbLower.length - 1]);
    
    let signal: 'bullish' | 'bearish' | 'neutral';
    let confidence: number;
    
    if (zScore < -2 && priceVsBB < 0.2) {
      signal = 'bullish';
      confidence = Math.min(Math.abs(zScore) / 4, 1.0);
    } else if (zScore > 2 && priceVsBB > 0.8) {
      signal = 'bearish';
      confidence = Math.min(Math.abs(zScore) / 4, 1.0);
    } else {
      signal = 'neutral';
      confidence = 0.5;
    }
    
    return {
      signal,
      confidence,
      metrics: {
        z_score: zScore,
        price_vs_bb: priceVsBB,
        rsi_14: rsi14[rsi14.length - 1],
        rsi_28: rsi28[rsi28.length - 1],
      },
    };
  }
  
  /**
   * Calculate momentum signals
   */
  private calculateMomentumSignals(pricesDF: { close: number[], volume: number[] }): StrategySignal {
    // Calculate returns
    const returns = this.calculateReturns(pricesDF.close);
    
    // Calculate momentum for different periods
    const mom1m = this.calculateRollingSum(returns, 21);
    const mom3m = this.calculateRollingSum(returns, 63);
    const mom6m = this.calculateRollingSum(returns, 126);
    
    // Volume momentum
    const volumeMA = this.calculateSMA(pricesDF.volume, 21);
    const volumeMomentum = pricesDF.volume[pricesDF.volume.length - 1] / volumeMA[volumeMA.length - 1];
    
    // Calculate momentum score
    const momentumScore = 0.4 * mom1m[mom1m.length - 1] + 
                          0.3 * mom3m[mom3m.length - 1] + 
                          0.3 * mom6m[mom6m.length - 1];
    
    // Volume confirmation
    const volumeConfirmation = volumeMomentum > 1.0;
    
    let signal: 'bullish' | 'bearish' | 'neutral';
    let confidence: number;
    
    if (momentumScore > 0.05 && volumeConfirmation) {
      signal = 'bullish';
      confidence = Math.min(Math.abs(momentumScore) * 5, 1.0);
    } else if (momentumScore < -0.05 && volumeConfirmation) {
      signal = 'bearish';
      confidence = Math.min(Math.abs(momentumScore) * 5, 1.0);
    } else {
      signal = 'neutral';
      confidence = 0.5;
    }
    
    return {
      signal,
      confidence,
      metrics: {
        momentum_1m: mom1m[mom1m.length - 1],
        momentum_3m: mom3m[mom3m.length - 1],
        momentum_6m: mom6m[mom6m.length - 1],
        volume_momentum: volumeMomentum,
      },
    };
  }
  
  /**
   * Calculate volatility signals
   */
  private calculateVolatilitySignals(pricesDF: { close: number[], high: number[], low: number[] }): StrategySignal {
    // Calculate returns
    const returns = this.calculateReturns(pricesDF.close);
    
    // Historical volatility (annualized)
    const histVol = this.calculateRollingStd(returns, 21).map(std => std * Math.sqrt(252));
    
    // Volatility regime detection
    const volMA = this.calculateSMA(histVol, 63);
    const volRegime = histVol[histVol.length - 1] / volMA[volMA.length - 1];
    
    // Volatility z-score
    const volStd = this.calculateRollingStd(histVol, 63);
    const volZScore = (histVol[histVol.length - 1] - volMA[volMA.length - 1]) / volStd[volStd.length - 1];
    
    // ATR ratio
    const atr = this.calculateATR(pricesDF);
    const atrRatio = atr / pricesDF.close[pricesDF.close.length - 1];
    
    let signal: 'bullish' | 'bearish' | 'neutral';
    let confidence: number;
    
    if (volRegime < 0.8 && volZScore < -1) {
      signal = 'bullish'; // Low vol regime, potential for expansion
      confidence = Math.min(Math.abs(volZScore) / 3, 1.0);
    } else if (volRegime > 1.2 && volZScore > 1) {
      signal = 'bearish'; // High vol regime, potential for contraction
      confidence = Math.min(Math.abs(volZScore) / 3, 1.0);
    } else {
      signal = 'neutral';
      confidence = 0.5;
    }
    
    return {
      signal,
      confidence,
      metrics: {
        historical_volatility: histVol[histVol.length - 1],
        volatility_regime: volRegime,
        volatility_z_score: volZScore,
        atr_ratio: atrRatio,
      },
    };
  }
  
  /**
   * Calculate statistical arbitrage signals
   */
  private calculateStatArbSignals(pricesDF: { close: number[] }): StrategySignal {
    // Calculate returns
    const returns = this.calculateReturns(pricesDF.close);
    
    // Skewness and kurtosis
    const skew = this.calculateSkewness(returns, 63);
    const kurt = this.calculateKurtosis(returns, 63);
    
    // Test for mean reversion using Hurst exponent
    const hurst = this.calculateHurstExponent(pricesDF.close);
    
    let signal: 'bullish' | 'bearish' | 'neutral';
    let confidence: number;
    
    if (hurst < 0.4 && skew > 1) {
      signal = 'bullish';
      confidence = (0.5 - hurst) * 2;
    } else if (hurst < 0.4 && skew < -1) {
      signal = 'bearish';
      confidence = (0.5 - hurst) * 2;
    } else {
      signal = 'neutral';
      confidence = 0.5;
    }
    
    return {
      signal,
      confidence,
      metrics: {
        hurst_exponent: hurst,
        skewness: skew,
        kurtosis: kurt,
      },
    };
  }
  
  /**
   * Combines multiple trading signals using a weighted approach
   */
  private weightedSignalCombination(
    signals: Record<string, { signal: 'bullish' | 'bearish' | 'neutral'; confidence: number }>,
    weights: Record<string, number>
  ): { signal: 'bullish' | 'bearish' | 'neutral'; confidence: number } {
    // Convert signals to numeric values
    const signalValues = { bullish: 1, neutral: 0, bearish: -1 };
    
    let weightedSum = 0;
    let totalConfidence = 0;
    
    for (const [strategy, signal] of Object.entries(signals)) {
      const numericSignal = signalValues[signal.signal];
      const weight = weights[strategy];
      const confidence = signal.confidence;
      
      weightedSum += numericSignal * weight * confidence;
      totalConfidence += weight * confidence;
    }
    
    // Normalize the weighted sum
    const finalScore = totalConfidence > 0 ? weightedSum / totalConfidence : 0;
    
    // Convert back to signal
    let signal: 'bullish' | 'bearish' | 'neutral';
    
    if (finalScore > 0.2) {
      signal = 'bullish';
    } else if (finalScore < -0.2) {
      signal = 'bearish';
    } else {
      signal = 'neutral';
    }
    
    return { signal, confidence: Math.abs(finalScore) };
  }
  
  // Technical indicator calculation methods
  
  private calculateEMA(data: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const ema: number[] = [data[0]];
    
    for (let i = 1; i < data.length; i++) {
      ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }
    
    return ema;
  }
  
  private calculateSMA(data: number[], period: number): number[] {
    const sma: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(NaN);
        continue;
      }
      
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      
      sma.push(sum / period);
    }
    
    return sma;
  }
  
  private calculateStd(data: number[], period: number): number[] {
    const sma = this.calculateSMA(data, period);
    const std: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        std.push(NaN);
        continue;
      }
      
      let sumSquaredDiff = 0;
      for (let j = 0; j < period; j++) {
        sumSquaredDiff += Math.pow(data[i - j] - sma[i], 2);
      }
      
      std.push(Math.sqrt(sumSquaredDiff / period));
    }
    
    return std;
  }
  
  private calculateBollingerBands(data: number[], period: number = 20, multiplier: number = 2): [number[], number[]] {
    const sma = this.calculateSMA(data, period);
    const std = this.calculateStd(data, period);
    
    const upper: number[] = [];
    const lower: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (isNaN(sma[i]) || isNaN(std[i])) {
        upper.push(NaN);
        lower.push(NaN);
      } else {
        upper.push(sma[i] + multiplier * std[i]);
        lower.push(sma[i] - multiplier * std[i]);
      }
    }
    
    return [upper, lower];
  }
  
  private calculateRSI(data: number[], period: number = 14): number[] {
    const returns: number[] = [];
    const rsi: number[] = [];
    
    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
      returns.push(data[i] - data[i - 1]);
    }
    
    // Prepare gains and losses arrays
    const gains: number[] = returns.map(x => x > 0 ? x : 0);
    const losses: number[] = returns.map(x => x < 0 ? Math.abs(x) : 0);
    
    // Initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    // First RSI value
    rsi.push(100 - (100 / (1 + avgGain / (avgLoss || 1e-10))));
    
    // Rest of RSI values
    for (let i = period; i < returns.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
      
      rsi.push(100 - (100 / (1 + avgGain / (avgLoss || 1e-10))));
    }
    
    // Pad with NaN values to match original data length
    return [NaN, ...rsi];
  }
  
  private calculateReturns(data: number[]): number[] {
    const returns: number[] = [0]; // First element has no return
    
    for (let i = 1; i < data.length; i++) {
      returns.push((data[i] / data[i - 1]) - 1);
    }
    
    return returns;
  }
  
  private calculateRollingSum(data: number[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
        continue;
      }
      
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      
      result.push(sum);
    }
    
    return result;
  }
  
  private calculateRollingStd(data: number[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
        continue;
      }
      
      const subset = data.slice(i - period + 1, i + 1);
      const mean = subset.reduce((a, b) => a + b, 0) / period;
      
      let sumSquaredDiff = 0;
      for (const val of subset) {
        sumSquaredDiff += Math.pow(val - mean, 2);
      }
      
      result.push(Math.sqrt(sumSquaredDiff / period));
    }
    
    return result;
  }
  
  private calculateATR(pricesDF: { high: number[], low: number[], close: number[] }, period: number = 14): number {
    const trueRanges: number[] = [];
    
    // Calculate true range
    for (let i = 1; i < pricesDF.close.length; i++) {
      const highLow = pricesDF.high[i] - pricesDF.low[i];
      const highClosePrev = Math.abs(pricesDF.high[i] - pricesDF.close[i - 1]);
      const lowClosePrev = Math.abs(pricesDF.low[i] - pricesDF.close[i - 1]);
      
      trueRanges.push(Math.max(highLow, highClosePrev, lowClosePrev));
    }
    
    // Calculate ATR as simple moving average of true ranges
    let sum = 0;
    for (let i = 0; i < Math.min(period, trueRanges.length); i++) {
      sum += trueRanges[i];
    }
    
    return sum / Math.min(period, trueRanges.length);
  }
  
  private calculateSkewness(data: number[], period: number): number {
    if (data.length < period) {
      return 0;
    }
    
    const subset = data.slice(data.length - period);
    const mean = subset.reduce((a, b) => a + b, 0) / period;
    
    let sumCubedDiff = 0;
    let sumSquaredDiff = 0;
    
    for (const val of subset) {
      const diff = val - mean;
      sumCubedDiff += Math.pow(diff, 3);
      sumSquaredDiff += Math.pow(diff, 2);
    }
    
    const variance = sumSquaredDiff / period;
    return sumCubedDiff / (period * Math.pow(variance, 1.5) || 1e-10);
  }
  
  private calculateKurtosis(data: number[], period: number): number {
    if (data.length < period) {
      return 3; // Normal distribution
    }
    
    const subset = data.slice(data.length - period);
    const mean = subset.reduce((a, b) => a + b, 0) / period;
    
    let sumFourthPowerDiff = 0;
    let sumSquaredDiff = 0;
    
    for (const val of subset) {
      const diff = val - mean;
      sumFourthPowerDiff += Math.pow(diff, 4);
      sumSquaredDiff += Math.pow(diff, 2);
    }
    
    const variance = sumSquaredDiff / period;
    return sumFourthPowerDiff / (period * Math.pow(variance, 2) || 1e-10);
  }
  
  private calculateHurstExponent(data: number[], maxLag: number = 20): number {
    try {
      const logs: { x: number, y: number }[] = [];
      
      for (let lag = 2; lag <= maxLag; lag++) {
        const ranges: number[] = [];
        
        for (let i = 0; i < data.length - lag; i++) {
          const subset = data.slice(i, i + lag);
          const mean = subset.reduce((a, b) => a + b, 0) / lag;
          
          // Calculate cumulative deviation
          let cumDeviation = 0;
          const deviations: number[] = [];
          
          for (const val of subset) {
            cumDeviation += val - mean;
            deviations.push(cumDeviation);
          }
          
          // Calculate range
          const range = Math.max(...deviations) - Math.min(...deviations);
          ranges.push(range);
        }
        
        // Calculate average range
        const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
        
        // Add to logs for regression
        logs.push({
          x: Math.log(lag),
          y: Math.log(avgRange || 1e-10) // Avoid log(0)
        });
      }
      
      // Simple linear regression to find Hurst exponent
      const n = logs.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      
      for (const point of logs) {
        sumX += point.x;
        sumY += point.y;
        sumXY += point.x * point.y;
        sumX2 += point.x * point.x;
      }
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      return slope; // Hurst exponent is the slope
      
    } catch (error) {
      console.error('Error calculating Hurst exponent:', error);
      return 0.5; // Return random walk value as fallback
    }
  }
}