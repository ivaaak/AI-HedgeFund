import { ProgressService } from './progress.service';
import { ApiService } from './api.service';
import { OpenAIService } from './openai.service';
import { AgentState, AnalysisMessage, FundamentalAnalysis, FinancialMetrics, Signal } from '../data/models';

export class HybridFundamentalsService {
  private progressService: ProgressService;
  private apiService: ApiService;
  private openAIService: OpenAIService;
  private useAI: boolean;

  constructor(useAI: boolean = false, openAIApiKey?: string) {
    this.progressService = new ProgressService();
    this.apiService = new ApiService();
    this.openAIService = new OpenAIService(openAIApiKey);
    this.useAI = useAI;
  }

  /**
   * Analyzes fundamental data and generates trading signals for multiple tickers.
   */
  public async analyzeFundamentals(state: AgentState): Promise<{
    messages: AnalysisMessage[];
    data: AgentState['data'];
  }> {
    const { data } = state;
    const endDate = data.end_date;
    const tickers = data.tickers;

    // Initialize fundamental analysis for each ticker
    const fundamentalAnalysis: { [key: string]: FundamentalAnalysis } = {};

    for (const ticker of tickers) {
      this.progressService.updateStatus('fundamentals_agent', ticker, 'Fetching financial metrics');

      try {
        // Get the financial metrics
        const financialMetrics = await this.apiService.getFinancialMetrics({
          ticker: ticker,
          endDate: endDate,
          period: 'ttm',
          limit: 10
        });

        if (!financialMetrics || !financialMetrics.length) {
          this.progressService.updateStatus('fundamentals_agent', ticker, 'Failed: No financial metrics found');
          continue;
        }

        // Pull the most recent financial metrics
        const metrics = financialMetrics[0];

        // Choose analysis method based on configuration
        let analysis: FundamentalAnalysis;
        
        if (this.useAI) {
          // Use OpenAI for analysis
          this.progressService.updateStatus('fundamentals_agent', ticker, 'Analyzing with OpenAI');
          analysis = await this.openAIService.analyzeFundamentals(metrics);
        } else {
          // Use rule-based analysis
          this.progressService.updateStatus('fundamentals_agent', ticker, 'Analyzing with rules-based approach');
          analysis = await this.performRuleBasedAnalysis(metrics);
        }

        fundamentalAnalysis[ticker] = analysis;
        this.progressService.updateStatus('fundamentals_agent', ticker, 'Done');
      } catch (error) {
        this.progressService.updateStatus('fundamentals_agent', ticker, `Error: ${(error as Error).message}`);
        console.error(`Error analyzing ${ticker}:`, error);
      }
    }

    // Create the fundamental analysis message
    const message: AnalysisMessage = {
      content: JSON.stringify(fundamentalAnalysis),
      name: 'fundamentals_agent'
    };

    // Add the signal to the analyst_signals list
    data.analyst_signals = data.analyst_signals || {};
    data.analyst_signals.fundamentals_agent = fundamentalAnalysis;

    return {
      messages: [message],
      data
    };
  }

  /**
   * Performs rule-based fundamental analysis
   */
  private async performRuleBasedAnalysis(metrics: FinancialMetrics): Promise<FundamentalAnalysis> {
    // Initialize signals list for different fundamental aspects
    const signals: string[] = [];
    const reasoning: Record<string, Signal> = {};

    // 1. Profitability Analysis
    const profitabilitySignal = this.analyzeProfitability(metrics);
    signals.push(profitabilitySignal.signal);
    reasoning['profitability_signal'] = profitabilitySignal;

    // 2. Growth Analysis
    const growthSignal = this.analyzeGrowth(metrics);
    signals.push(growthSignal.signal);
    reasoning['growth_signal'] = growthSignal;

    // 3. Financial Health
    const healthSignal = this.analyzeFinancialHealth(metrics);
    signals.push(healthSignal.signal);
    reasoning['financial_health_signal'] = healthSignal;

    // 4. Price to X ratios
    const priceRatiosSignal = this.analyzePriceRatios(metrics);
    signals.push(priceRatiosSignal.signal);
    reasoning['price_ratios_signal'] = priceRatiosSignal;

    // Determine overall signal
    const { signal, confidence } = this.calculateOverallSignal(signals);

    return {
      signal,
      confidence,
      reasoning
    };
  }

  /**
   * Analyzes profitability metrics and returns a signal
   */
  private analyzeProfitability(metrics: FinancialMetrics): Signal {
    const returnOnEquity = metrics.return_on_equity;
    const netMargin = metrics.net_margin;
    const operatingMargin = metrics.operating_margin;

    const thresholds: [number | null, number][] = [
      [returnOnEquity, 0.15],  // Strong ROE above 15%
      [netMargin, 0.20],       // Healthy profit margins
      [operatingMargin, 0.15], // Strong operating efficiency
    ];

    const profitabilityScore = thresholds.reduce((score, [metric, threshold]) => 
      score + (metric !== null && metric > threshold ? 1 : 0), 0);

    return {
      signal: profitabilityScore >= 2 ? 'bullish' : profitabilityScore === 0 ? 'bearish' : 'neutral',
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

    const thresholds: [number | null, number][] = [
      [revenueGrowth, 0.10],    // 10% revenue growth
      [earningsGrowth, 0.10],   // 10% earnings growth
      [bookValueGrowth, 0.10],  // 10% book value growth
    ];

    const growthScore = thresholds.reduce((score, [metric, threshold]) => 
      score + (metric !== null && metric > threshold ? 1 : 0), 0);

    return {
      signal: growthScore >= 2 ? 'bullish' : growthScore === 0 ? 'bearish' : 'neutral',
      details: `Revenue Growth: ${this.formatPercentage(revenueGrowth)}, Earnings Growth: ${this.formatPercentage(earningsGrowth)}`
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

    let healthScore = 0;
    
    if (currentRatio !== null && currentRatio > 1.5) {
      healthScore += 1;
    }
    
    if (debtToEquity !== null && debtToEquity < 0.5) {
      healthScore += 1;
    }
    
    if (freeCashFlowPerShare !== null && earningsPerShare !== null && 
        freeCashFlowPerShare > earningsPerShare * 0.8) {
      healthScore += 1;
    }

    return {
      signal: healthScore >= 2 ? 'bullish' : healthScore === 0 ? 'bearish' : 'neutral',
      details: `Current Ratio: ${this.formatRatio(currentRatio)}, D/E: ${this.formatRatio(debtToEquity)}`
    };
  }

  /**
   * Analyzes price ratios and returns a signal
   */
  private analyzePriceRatios(metrics: FinancialMetrics): Signal {
    const peRatio = metrics.price_to_earnings_ratio;
    const pbRatio = metrics.price_to_book_ratio;
    const psRatio = metrics.price_to_sales_ratio;

    const thresholds: [number | null, number][] = [
      [peRatio, 25], // Reasonable P/E ratio
      [pbRatio, 3],  // Reasonable P/B ratio
      [psRatio, 5],  // Reasonable P/S ratio
    ];

    // Notice we're checking if the ratio is LESS THAN the threshold for valuation metrics
    // Lower P/E, P/B, P/S ratios generally indicate better value
    const priceRatioScore = thresholds.reduce((score, [metric, threshold]) => 
      score + (metric !== null && metric < threshold ? 1 : 0), 0);

    return {
      signal: priceRatioScore >= 2 ? 'bullish' : priceRatioScore === 0 ? 'bearish' : 'neutral',
      details: `P/E: ${this.formatRatio(peRatio)}, P/B: ${this.formatRatio(pbRatio)}, P/S: ${this.formatRatio(psRatio)}`
    };
  }

  /**
   * Calculates overall signal based on individual signals
   */
  private calculateOverallSignal(signals: string[]): { signal: string; confidence: number } {
    const bullishSignals = signals.filter(s => s === 'bullish').length;
    const bearishSignals = signals.filter(s => s === 'bearish').length;
    
    let signal = 'neutral';
    if (bullishSignals > bearishSignals) {
      signal = 'bullish';
    } else if (bearishSignals > bullishSignals) {
      signal = 'bearish';
    }
    
    const totalSignals = signals.length;
    const confidence = Math.round((Math.max(bullishSignals, bearishSignals) / totalSignals) * 100);
    
    return { signal, confidence };
  }

  /**
   * Formats a number as a percentage string
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