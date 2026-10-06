import { AnalysisRequest, AnalysisResponse, AnalystSignal, Portfolio, PortfolioDecision, RiskAnalysisResult, TradeRecord } from '../data/models';
import { FundamentalsService } from './fundamentals.service';
import { markToMarket, executeTrades, calculatePerformance, PortfolioPerformance, SkippedTrade } from './portfolio';
import { AnalystSignals, PortfolioManagementService } from './portfolioManagement.service';
import { RiskManagerService } from './riskManager.service';
import { SentimentService } from './sentiment.service';
import { TechnicalAnalystService } from './technicals.service';
import { ValuationService } from './valuation.service';

export interface HedgeFundRunRequest extends AnalysisRequest {
  portfolio: Portfolio;
  // When false the decisions are returned without touching the portfolio
  execute_trades: boolean;
}

export interface HedgeFundRunResult extends AnalysisRequest {
  analyst_signals: Record<string, AnalysisResponse<AnalystSignal>>;
  risk: AnalysisResponse<RiskAnalysisResult>;
  decisions: Record<string, PortfolioDecision>;
  decision_source: 'llm' | 'rules';
  decision_note?: string;
  trades: TradeRecord[];
  skipped_trades: SkippedTrade[];
  portfolio: Portfolio;
  performance: PortfolioPerformance;
}

/**
 * Runs the whole pipeline: analysts -> risk manager -> portfolio manager -> paper trades
 */
export class HedgeFundService {
  constructor(
    private fundamentals = new FundamentalsService(),
    private technicals = new TechnicalAnalystService(),
    private sentiment = new SentimentService(),
    private valuation = new ValuationService(),
    private riskManager = new RiskManagerService(),
    private portfolioManager = new PortfolioManagementService()
  ) {}

  public async run(request: HedgeFundRunRequest): Promise<HedgeFundRunResult> {
    const { tickers, start_date, end_date, portfolio } = request;
    const analysisRequest: AnalysisRequest = { tickers, start_date, end_date };

    console.log(`Starting analysis for ${tickers.join(', ')} from ${start_date} to ${end_date}`);

    // The analysts are independent of each other
    const [fundamentals, technicals, sentiment, valuation, risk] = await Promise.all([
      this.fundamentals.analyzeFundamentals(analysisRequest),
      this.technicals.analyzeTickers(analysisRequest),
      this.sentiment.analyzeSentiment(analysisRequest),
      this.valuation.analyzeValuation(analysisRequest),
      this.riskManager.analyzeRisk({ ...analysisRequest, portfolio })
    ]);

    const analyst_signals: Record<string, AnalysisResponse<AnalystSignal>> = {
      fundamentals, technicals, sentiment, valuation
    };

    const signalsByAnalyst: AnalystSignals = {};
    for (const [analyst, response] of Object.entries(analyst_signals)) {
      signalsByAnalyst[analyst] = response.results;
    }

    const currentPrices: Record<string, number> = {};
    for (const [ticker, analysis] of Object.entries(risk.results)) {
      currentPrices[ticker] = analysis.current_price;
    }

    const management = await this.portfolioManager.managePortfolio({
      tickers,
      analyst_signals: signalsByAnalyst,
      risk: risk.results,
      portfolio
    });

    const execution = request.execute_trades
      ? executeTrades(portfolio, management.decisions, currentPrices)
      : { portfolio: markToMarket(portfolio, currentPrices), trades: [], skipped: [] };

    return {
      ...analysisRequest,
      analyst_signals,
      risk,
      decisions: management.decisions,
      decision_source: management.source,
      ...(management.note ? { decision_note: management.note } : {}),
      trades: execution.trades,
      skipped_trades: execution.skipped,
      portfolio: execution.portfolio,
      performance: calculatePerformance(execution.portfolio)
    };
  }
}
