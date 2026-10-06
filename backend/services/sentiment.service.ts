import { AnalysisRequest, AnalysisResponse, AnalystSignal, Signal, SignalDirection } from '../data/models';
import { daysBefore } from '../middleware/validation';
import { analyzeEach } from './analysis.util';
import { FinancialDataService, financialDataService } from './financialData.service';

export type SentimentAnalysisResult = AnalystSignal<Record<string, Signal>>;

const INSIDER_WEIGHT = 0.3;
const NEWS_WEIGHT = 0.7;
const INSIDER_LOOKBACK_DAYS = 180;

export class SentimentService {
  constructor(private financialData: FinancialDataService = financialDataService) {}

  /**
   * Analyzes market sentiment (news and insider trading) for multiple tickers
   */
  public async analyzeSentiment(request: Pick<AnalysisRequest, 'tickers' | 'end_date'>): Promise<AnalysisResponse<SentimentAnalysisResult>> {
    const { tickers, end_date } = request;

    return analyzeEach('sentiment_agent', tickers, async ticker => {
      // The two sources are independent: one of them failing still leaves a usable signal
      const [newsResult, insiderResult] = await Promise.allSettled([
        this.financialData.getCompanyNews(ticker, end_date, 50),
        this.financialData.getInsiderTrades(ticker, end_date, daysBefore(end_date, INSIDER_LOOKBACK_DAYS))
      ]);

      if (newsResult.status === 'rejected' && insiderResult.status === 'rejected') {
        throw newsResult.reason;
      }

      const newsSignals: SignalDirection[] = newsResult.status === 'fulfilled'
        ? newsResult.value.map(news =>
          news.sentiment === 'negative' ? 'bearish' : news.sentiment === 'positive' ? 'bullish' : 'neutral')
        : [];

      const insiderSignals: SignalDirection[] = insiderResult.status === 'fulfilled'
        ? insiderResult.value.map(trade => trade.transaction_shares < 0 ? 'bearish' : 'bullish')
        : [];

      // Combine signals from both sources with weights
      const bullishSignals =
        this.countOccurrences(insiderSignals, 'bullish') * INSIDER_WEIGHT +
        this.countOccurrences(newsSignals, 'bullish') * NEWS_WEIGHT;

      const bearishSignals =
        this.countOccurrences(insiderSignals, 'bearish') * INSIDER_WEIGHT +
        this.countOccurrences(newsSignals, 'bearish') * NEWS_WEIGHT;

      let signal: SignalDirection = 'neutral';
      if (bullishSignals > bearishSignals) {
        signal = 'bullish';
      } else if (bearishSignals > bullishSignals) {
        signal = 'bearish';
      }

      // Confidence is the weighted share of signals agreeing with the outcome
      const totalWeightedSignals = insiderSignals.length * INSIDER_WEIGHT + newsSignals.length * NEWS_WEIGHT;
      const confidence = totalWeightedSignals > 0
        ? Math.round(Math.max(bullishSignals, bearishSignals) / totalWeightedSignals * 100)
        : 0;

      return {
        signal,
        confidence,
        reasoning: {
          news_sentiment: this.summarize(
            newsSignals,
            'articles',
            newsResult.status === 'rejected' ? (newsResult.reason as Error).message : null
          ),
          insider_trading: this.summarize(
            insiderSignals,
            'transactions',
            insiderResult.status === 'rejected' ? (insiderResult.reason as Error).message : null
          )
        }
      };
    });
  }

  private summarize(signals: SignalDirection[], unit: string, error: string | null): Signal {
    if (error) {
      return { signal: 'neutral', details: `Unavailable: ${error}` };
    }

    const bullish = this.countOccurrences(signals, 'bullish');
    const bearish = this.countOccurrences(signals, 'bearish');

    return {
      signal: bullish > bearish ? 'bullish' : bearish > bullish ? 'bearish' : 'neutral',
      details: `${signals.length} ${unit}: ${bullish} bullish, ${bearish} bearish, ${signals.length - bullish - bearish} neutral`
    };
  }

  /**
   * Count occurrences of a value in an array
   */
  private countOccurrences<T>(arr: T[], value: T): number {
    return arr.reduce((count, current) => current === value ? count + 1 : count, 0);
  }
}
