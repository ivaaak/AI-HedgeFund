import { AgentState } from '../types/AgentState';
import { AnalysisMessage } from '../types/AnalysisMessage';
import { FinancialMetrics } from '../types/FinancialMetrics';
import { FundamentalAnalysis } from '../types/FundamentalAnalysis';
import { Signal } from '../types/Signal';
import { ProgressService } from './progress.service';
import { ApiService } from './api.service';

export class FundamentalsService {
  private progressService: ProgressService;
  private apiService: ApiService;

  constructor() {
    this.progressService = new ProgressService();
    this.apiService = new ApiService();
  }

  private formatPercentage(value: number | null): string {
    return value !== null ? `${(value * 100).toFixed(2)}%` : 'N/A';
  }

  private formatRatio(value: number | null): string {
    return value !== null ? value.toFixed(2) : 'N/A';
  }

  private analyzeProfitability(metrics: FinancialMetrics): Signal {
    const { return_on_equity, net_margin, operating_margin } = metrics;
    
    const thresholds: [number | null, number][] = [
      [return_on_equity, 0.15],
      [net_margin, 0.20],
      [operating_margin, 0.15]
    ];

    const profitability_score = thresholds.reduce((score, [metric, threshold]) => 
      score + (metric !== null && metric > threshold ? 1 : 0), 0);

    return {
      signal: profitability_score >= 2 ? 'bullish' : profitability_score === 0 ? 'bearish' : 'neutral',
      details: `ROE: ${this.formatPercentage(return_on_equity)}, Net Margin: ${this.formatPercentage(net_margin)}, Op Margin: ${this.formatPercentage(operating_margin)}`
    };
  }

  private analyzeGrowth(metrics: FinancialMetrics): Signal {
    const { revenue_growth, earnings_growth, book_value_growth } = metrics;
    
    const thresholds: [number | null, number][] = [
      [revenue_growth, 0.10],
      [earnings_growth, 0.10],
      [book_value_growth, 0.10]
    ];

    const growth_score = thresholds.reduce((score, [metric, threshold]) => 
      score + (metric !== null && metric > threshold ? 1 : 0), 0);

    return {
      signal: growth_score >= 2 ? 'bullish' : growth_score === 0 ? 'bearish' : 'neutral',
      details: `Revenue Growth: ${this.formatPercentage(revenue_growth)}, Earnings Growth: ${this.formatPercentage(earnings_growth)}`
    };
  }

  private analyzeFinancialHealth(metrics: FinancialMetrics): Signal {
    const { current_ratio, debt_to_equity, free_cash_flow_per_share, earnings_per_share } = metrics;
    
    let health_score = 0;

    if (current_ratio !== null && current_ratio > 1.5) health_score += 1;
    if (debt_to_equity !== null && debt_to_equity < 0.5) health_score += 1;
    if (free_cash_flow_per_share !== null && earnings_per_share !== null && 
        free_cash_flow_per_share > earnings_per_share * 0.8) health_score += 1;

    return {
      signal: health_score >= 2 ? 'bullish' : health_score === 0 ? 'bearish' : 'neutral',
      details: `Current Ratio: ${this.formatRatio(current_ratio)}, D/E: ${this.formatRatio(debt_to_equity)}`
    };
  }

  private analyzePriceRatios(metrics: FinancialMetrics): Signal {
    const { price_to_earnings_ratio, price_to_book_ratio, price_to_sales_ratio } = metrics;
    
    const thresholds: [number | null, number][] = [
      [price_to_earnings_ratio, 25],
      [price_to_book_ratio, 3],
      [price_to_sales_ratio, 5]
    ];

    const price_ratio_score = thresholds.reduce((score, [metric, threshold]) => 
      score + (metric !== null && metric < threshold ? 1 : 0), 0);

    return {
      signal: price_ratio_score >= 2 ? 'bullish' : price_ratio_score === 0 ? 'bearish' : 'neutral',
      details: `P/E: ${this.formatRatio(price_to_earnings_ratio)}, P/B: ${this.formatRatio(price_to_book_ratio)}, P/S: ${this.formatRatio(price_to_sales_ratio)}`
    };
  }

  private calculateOverallSignal(signals: string[]): { signal: string; confidence: number } {
    const bullish_signals = signals.filter(s => s === 'bullish').length;
    const bearish_signals = signals.filter(s => s === 'bearish').length;
    
    let signal = 'neutral';
    if (bullish_signals > bearish_signals) signal = 'bullish';
    else if (bearish_signals > bullish_signals) signal = 'bearish';
    
    const total_signals = signals.length;
    const confidence = Math.round((Math.max(bullish_signals, bearish_signals) / total_signals) * 100);
    
    return { signal, confidence };
  }

  public async analyzeFundamentals(state: AgentState): Promise<{
    messages: AnalysisMessage[];
    data: AgentState['data'];
  }> {
    const { data } = state;
    const fundamental_analysis: { [key: string]: FundamentalAnalysis } = {};

    for (const ticker of data.tickers) {
      try {
        this.progressService.updateStatus('fundamentals_agent', ticker, 'Fetching financial metrics');
        
        const financial_metrics = await this.apiService.getFinancialMetrics({
          ticker,
          endDate: data.end_date,
          period: 'ttm',
          limit: 10
        });

        if (!financial_metrics || !financial_metrics.length) {
          this.progressService.updateStatus('fundamentals_agent', ticker, 'Failed: No financial metrics found');
          continue;
        }

        const metrics = financial_metrics[0];
        const signals: string[] = [];
        const reasoning: any = {};

        // Profitability Analysis
        this.progressService.updateStatus('fundamentals_agent', ticker, 'Analyzing profitability');
        const profitability = this.analyzeProfitability(metrics);
        signals.push(profitability.signal);
        reasoning.profitability_signal = profitability;

        // Growth Analysis
        this.progressService.updateStatus('fundamentals_agent', ticker, 'Analyzing growth');
        const growth = this.analyzeGrowth(metrics);
        signals.push(growth.signal);
        reasoning.growth_signal = growth;

        // Financial Health Analysis
        this.progressService.updateStatus('fundamentals_agent', ticker, 'Analyzing financial health');
        const health = this.analyzeFinancialHealth(metrics);
        signals.push(health.signal);
        reasoning.financial_health_signal = health;

        // Price Ratios Analysis
        this.progressService.updateStatus('fundamentals_agent', ticker, 'Analyzing valuation ratios');
        const ratios = this.analyzePriceRatios(metrics);
        signals.push(ratios.signal);
        reasoning.price_ratios_signal = ratios;

        // Calculate Final Signal
        this.progressService.updateStatus('fundamentals_agent', ticker, 'Calculating final signal');
        const { signal, confidence } = this.calculateOverallSignal(signals);

        fundamental_analysis[ticker] = {
          signal,
          confidence,
          reasoning
        };

        this.progressService.updateStatus('fundamentals_agent', ticker, 'Done');
      } catch (error) {
        this.progressService.updateStatus('fundamentals_agent', ticker, `Error: ${error.message}`);
        console.error(`Error analyzing ${ticker}:`, error);
      }
    }

    // Update state
    data.analyst_signals.fundamentals_agent = fundamental_analysis;

    return {
      messages: [{
        content: JSON.stringify(fundamental_analysis),
        name: 'fundamentals_agent'
      }],
      data
    };
  }
}