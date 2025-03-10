import { OpenAIService } from './openai.service';

// Type definitions
export interface InsiderTrade {
  transaction_shares: number;
  transaction_type: string;
  transaction_date: string;
  insider_name: string;
  insider_title: string;
}

export interface CompanyNews {
  headline: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  url: string;
  published_date: string;
}

export interface SentimentAnalysisResult {
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  reasoning: string;
}

export interface SentimentRequest {
  tickers: string[];
  end_date: string;
}

export class SentimentService {
  private openAIService: OpenAIService;
  
  constructor(apiKey?: string) {
    this.openAIService = new OpenAIService(apiKey);
  }
  
  /**
   * Analyzes market sentiment for multiple tickers
   */
  public async analyzeSentiment(request: SentimentRequest): Promise<Record<string, SentimentAnalysisResult>> {
    try {
      const { tickers, end_date } = request;
      
      if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
        throw new Error('Invalid tickers provided');
      }
      
      if (!end_date) {
        throw new Error('End date is required');
      }
      
      // Initialize sentiment analysis for each ticker
      const sentimentAnalysis: Record<string, SentimentAnalysisResult> = {};
      
      for (const ticker of tickers) {
        // Get the insider trades
        const insiderTrades = await this.getInsiderTrades(ticker, end_date, 1000);
        
        // Get the signals from the insider trades
        const insiderSignals = insiderTrades
          .filter(trade => trade.transaction_shares !== null)
          .map(trade => trade.transaction_shares < 0 ? 'bearish' : 'bullish');
        
        // Get the company news
        const companyNews = await this.getCompanyNews(ticker, end_date, 100);
        
        // Get the sentiment from the company news
        const newsSignals = companyNews
          .filter(news => news.sentiment !== null)
          .map(news => news.sentiment === 'negative' ? 'bearish' : 
                       news.sentiment === 'positive' ? 'bullish' : 'neutral');
        
        // Combine signals from both sources with weights
        const insiderWeight = 0.3;
        const newsWeight = 0.7;
        
        // Calculate weighted signal counts
        const bullishSignals = (
          this.countOccurrences(insiderSignals, 'bullish') * insiderWeight +
          this.countOccurrences(newsSignals, 'bullish') * newsWeight
        );
        
        const bearishSignals = (
          this.countOccurrences(insiderSignals, 'bearish') * insiderWeight +
          this.countOccurrences(newsSignals, 'bearish') * newsWeight
        );
        
        let overallSignal: 'bullish' | 'bearish' | 'neutral';
        
        if (bullishSignals > bearishSignals) {
          overallSignal = 'bullish';
        } else if (bearishSignals > bullishSignals) {
          overallSignal = 'bearish';
        } else {
          overallSignal = 'neutral';
        }
        
        // Calculate confidence level based on the weighted proportion
        const totalWeightedSignals = insiderSignals.length * insiderWeight + newsSignals.length * newsWeight;
        let confidence = 0;  // Default confidence when there are no signals
        
        if (totalWeightedSignals > 0) {
          confidence = Math.round(Math.max(bullishSignals, bearishSignals) / totalWeightedSignals * 100);
        }
        
        const reasoning = `Weighted Bullish signals: ${bullishSignals.toFixed(1)}, Weighted Bearish signals: ${bearishSignals.toFixed(1)}`;
        
        sentimentAnalysis[ticker] = {
          signal: overallSignal,
          confidence: confidence,
          reasoning: reasoning,
        };
      }
      
      return sentimentAnalysis;
    } catch (error) {
      console.error('Error in sentiment analysis:', error);
      throw error;
    }
  }
  
  /**
   * Count occurrences of a value in an array
   */
  private countOccurrences(arr: any[], value: any): number {
    return arr.reduce((count, current) => current === value ? count + 1 : count, 0);
  }
  
  /**
   * Get insider trades for a ticker
   */
  private async getInsiderTrades(ticker: string, endDate: string, limit: number): Promise<InsiderTrade[]> {
    try {
      // In a real implementation, this would call an external API or database
      // Mock implementation for demonstration
      const mockInsiderTrades: InsiderTrade[] = [];
      
      // Generate mock data with varying transaction shares
      for (let i = 0; i < 20; i++) {
        const isBuy = Math.random() > 0.4;  // 60% buys, 40% sells
        mockInsiderTrades.push({
          transaction_shares: isBuy ? Math.floor(Math.random() * 10000) : -Math.floor(Math.random() * 10000),
          transaction_type: isBuy ? 'BUY' : 'SELL',
          transaction_date: this.getRandomPastDate(endDate, 90),
          insider_name: `Executive ${i % 5 + 1}`,
          insider_title: i % 5 === 0 ? 'CEO' : i % 5 === 1 ? 'CFO' : i % 5 === 2 ? 'CTO' : 'Director'
        });
      }
      
      return mockInsiderTrades;
    } catch (error) {
      console.error(`Error fetching insider trades for ${ticker}:`, error);
      return [];
    }
  }
  
  /**
   * Get company news for a ticker
   */
  private async getCompanyNews(ticker: string, endDate: string, limit: number): Promise<CompanyNews[]> {
    try {
      // In a real implementation, this would call an external API or database
      // Mock implementation for demonstration
      const mockNews: CompanyNews[] = [];
      const sentiments: Array<'positive' | 'negative' | 'neutral'> = ['positive', 'negative', 'neutral'];
      
      // Generate mock news with varying sentiment
      for (let i = 0; i < 30; i++) {
        const randomSentimentIndex = Math.floor(Math.random() * 3);
        // Slightly bias towards positive news (45% positive, 30% negative, 25% neutral)
        const sentiment = randomSentimentIndex === 0 ? 'positive' : 
                         randomSentimentIndex === 1 ? 'negative' : 'neutral';
        
        mockNews.push({
          headline: `${ticker} News Headline ${i + 1}`,
          summary: `This is a mock summary for ${ticker} news item ${i + 1}`,
          sentiment: sentiment,
          url: `https://example.com/news/${ticker}/${i + 1}`,
          published_date: this.getRandomPastDate(endDate, 30)
        });
      }
      
      return mockNews;
    } catch (error) {
      console.error(`Error fetching company news for ${ticker}:`, error);
      return [];
    }
  }
  
  /**
   * Generate a random date in the past relative to the end date
   */
  private getRandomPastDate(endDate: string, maxDaysBack: number): string {
    const endDateTime = new Date(endDate).getTime();
    const randomDaysBack = Math.floor(Math.random() * maxDaysBack);
    const randomDateTime = endDateTime - (randomDaysBack * 24 * 60 * 60 * 1000);
    return new Date(randomDateTime).toISOString().split('T')[0];
  }
}