import { AnalysisRequest, AnalysisResponse, AnalystSignal, FinancialMetrics, Signal, SignalDirection } from '../data/models';
import { HttpError } from '../middleware/middleware';
import { analyzeEach } from './analysis.util';
import { FinancialDataService, financialDataService } from './financialData.service';

export type FundamentalAnalysis = AnalystSignal<Record<string, Signal>>;

type Check = [value: number | null, passes: (value: number) => boolean];

export class FundamentalsService {
  constructor(private financialData: FinancialDataService = financialDataService) {}

  /**
   * Analyzes fundamental data and generates trading signals for multiple tickers.
   */
  public async analyzeFundamentals(request: AnalysisRequest): Promise<AnalysisResponse<FundamentalAnalysis>> {
    return analyzeEach('fundamentals_agent', request.tickers, async ticker => {
      const financialMetrics = await this.financialData.getFinancialMetrics(ticker, request.end_date, 'ttm', 2);

      if (!financialMetrics.length) {
        throw new HttpError(404, `No financial metrics found for ${ticker}`);
      }

      // Pull the most recent financial metrics
      return this.analyzeMetrics(financialMetrics[0]);
    });
  }

  /**
   * Rule-based fundamental analysis of one set of metrics
   */
  public analyzeMetrics(metrics: FinancialMetrics): FundamentalAnalysis {
    const reasoning: Record<string, Signal> = {
      profitability_signal: this.analyzeProfitability(metrics),
      growth_signal: this.analyzeGrowth(metrics),
      financial_health_signal: this.analyzeFinancialHealth(metrics),
      price_ratios_signal: this.analyzePriceRatios(metrics)
    };

    const { signal, confidence } = this.calculateOverallSignal(Object.values(reasoning).map(r => r.signal));

    return { signal, confidence, reasoning };
  }

  /**
   * Scores a group of checks. Metrics that are not available are left out, and a
   * group without any data is neutral rather than bearish.
   */
  private scoreChecks(checks: Check[]): SignalDirection {
    const available = checks.filter((check): check is [number, (value: number) => boolean] => check[0] !== null);
    if (available.length === 0) return 'neutral';

    const passed = available.filter(([value, passes]) => passes(value)).length;
    if (passed === 0) return 'bearish';
    return passed / available.length >= 2 / 3 ? 'bullish' : 'neutral';
  }

  /**
   * Analyzes profitability metrics and returns a signal
   */
  private analyzeProfitability(metrics: FinancialMetrics): Signal {
    const returnOnEquity = metrics.return_on_equity;
    const netMargin = metrics.net_margin;
    const operatingMargin = metrics.operating_margin;

    return {
      signal: this.scoreChecks([
        [returnOnEquity, v => v > 0.15],  // Strong ROE above 15%
        [netMargin, v => v > 0.20],       // Healthy profit margins
        [operatingMargin, v => v > 0.15]  // Strong operating efficiency
      ]),
      details: `ROE: ${this.formatPercentage(returnOnEquity)}, Net Margin: ${this.formatPercentage(netMargin)}, Op Margin: ${this.formatPercentage(operatingMargin)}`
    };
  }

  /**
   * Analyzes growth metrics and returns a signal
   */
  private analyzeGrowth(metrics: FinancialMetrics): Signal {
    const revenueGrowth = metrics.revenue_growth;
    const earningsGrowth = metrics.earnings_growth;
    const bookValueGrowth = metrics.book_value_growth;

    return {
      signal: this.scoreChecks([
        [revenueGrowth, v => v > 0.10],    // 10% revenue growth
        [earningsGrowth, v => v > 0.10],   // 10% earnings growth
        [bookValueGrowth, v => v > 0.10]   // 10% book value growth
      ]),
      details: `Revenue Growth: ${this.formatPercentage(revenueGrowth)}, Earnings Growth: ${this.formatPercentage(earningsGrowth)}, Book Value Growth: ${this.formatPercentage(bookValueGrowth)}`
    };
  }

  /**
   * Analyzes financial health metrics and returns a signal
   */
  private analyzeFinancialHealth(metrics: FinancialMetrics): Signal {
    const currentRatio = metrics.current_ratio;
    const debtToEquity = metrics.debt_to_equity;
    const freeCashFlowPerShare = metrics.free_cash_flow_per_share;
    const earningsPerShare = metrics.earnings_per_share;

    // Free cash flow should cover at least 80% of earnings
    const cashConversion = freeCashFlowPerShare !== null && earningsPerShare !== null && earningsPerShare !== 0
      ? freeCashFlowPerShare / earningsPerShare
      : null;

    return {
      signal: this.scoreChecks([
        [currentRatio, v => v > 1.5],
        [debtToEquity, v => v < 0.5],
        [cashConversion, v => v > 0.8]
      ]),
      details: `Current Ratio: ${this.formatRatio(currentRatio)}, D/E: ${this.formatRatio(debtToEquity)}, FCF/EPS: ${this.formatRatio(cashConversion)}`
    };
  }

  /**
   * Analyzes price ratios and returns a signal
   */
  private analyzePriceRatios(metrics: FinancialMetrics): Signal {
    const peRatio = metrics.price_to_earnings_ratio;
    const pbRatio = metrics.price_to_book_ratio;
    const psRatio = metrics.price_to_sales_ratio;

    // Lower P/E, P/B, P/S ratios generally indicate better value
    return {
      signal: this.scoreChecks([
        [peRatio, v => v > 0 && v < 25], // Reasonable P/E ratio
        [pbRatio, v => v > 0 && v < 3],  // Reasonable P/B ratio
        [psRatio, v => v > 0 && v < 5]   // Reasonable P/S ratio
      ]),
      details: `P/E: ${this.formatRatio(peRatio)}, P/B: ${this.formatRatio(pbRatio)}, P/S: ${this.formatRatio(psRatio)}`
    };
  }

  /**
   * Calculates overall signal based on individual signals
   */
  private calculateOverallSignal(signals: SignalDirection[]): { signal: SignalDirection; confidence: number } {
    const bullishSignals = signals.filter(s => s === 'bullish').length;
    const bearishSignals = signals.filter(s => s === 'bearish').length;

    let signal: SignalDirection = 'neutral';
    if (bullishSignals > bearishSignals) {
      signal = 'bullish';
    } else if (bearishSignals > bullishSignals) {
      signal = 'bearish';
    }

    const confidence = Math.round((Math.max(bullishSignals, bearishSignals) / signals.length) * 100);

    return { signal, confidence };
  }

  /**
   * Formats a fraction as a percentage string
   */
  private formatPercentage(value: number | null): string {
    return value !== null ? `${(value * 100).toFixed(2)}%` : 'N/A';
  }

  /**
   * Formats a number as a ratio string
   */
  private formatRatio(value: number | null): string {
    return value !== null ? value.toFixed(2) : 'N/A';
  }
}
