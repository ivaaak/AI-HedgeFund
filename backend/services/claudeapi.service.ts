import Claude from '@anthropic-ai/sdk';
import MessageParam from '@anthropic-ai/sdk';
import { FinancialMetrics, FundamentalAnalysis } from '../data/models';

export class ClaudeApiService {
  private claude: Claude;

  constructor(apiKey?: string) {
    // Use the provided API key, which should be handled by the calling application
    if (!apiKey) {
      console.warn('No API key provided to ClaudeApiService. API calls will likely fail.');
    }
    
    this.claude = new Claude({
      apiKey: apiKey || ''
    });
  }

  /**
   * Gets a completion from Claude
   * @param prompt The text prompt to send to Claude
   * @returns The parsed response from Claude
   */
  public async getCompletion<T>(prompt: string): Promise<T> {
    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4000,
        temperature: 0.2,
        system: `You are a financial analyst assistant providing analysis in JSON format. Always structure your response as valid JSON that can be parsed.`,
        messages: [{ role: 'user', content: prompt }]
      });

      // Extract the JSON from the response
      const content = response.content[0].type;
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/{[\s\S]*?}/);
                        
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from Claude response');
      }
      
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr) as T;
    } catch (error) {
      console.error('Claude API Error:', error);
      throw error;
    }
  }

  /**
   * Analyze fundamentals with Claude
   * @param metrics Financial metrics to analyze
   * @returns Fundamental analysis result
   */
  public async analyzeFundamentals(metrics: FinancialMetrics): Promise<FundamentalAnalysis> {
    const prompt = this.generateFundamentalAnalysisPrompt(metrics);
    
    try {
      return await this.getCompletion<FundamentalAnalysis>(prompt);
    } catch (error) {
      console.error('Claude Fundamental Analysis Error:', error);
      throw error;
    }
  }

  /**
   * Generate a prompt for fundamental analysis
   */
  private generateFundamentalAnalysisPrompt(metrics: FinancialMetrics): string {
    const formatPercentage = (value: number | null): string => {
      return value !== null ? `${(value * 100).toFixed(2)}%` : 'N/A';
    };

    const formatRatio = (value: number | null): string => {
      return value !== null ? value.toFixed(2) : 'N/A';
    };

    return `Analyze the following financial metrics for a company:
    
    Profitability:
    - Return on Equity: ${formatPercentage(metrics.return_on_equity)}
    - Net Margin: ${formatPercentage(metrics.net_margin)}
    - Operating Margin: ${formatPercentage(metrics.operating_margin)}
    
    Growth:
    - Revenue Growth: ${formatPercentage(metrics.revenue_growth)}
    - Earnings Growth: ${formatPercentage(metrics.earnings_growth)}
    - Book Value Growth: ${formatPercentage(metrics.book_value_growth)}
    
    Financial Health:
    - Current Ratio: ${formatRatio(metrics.current_ratio)}
    - Debt to Equity: ${formatRatio(metrics.debt_to_equity)}
    - Free Cash Flow Per Share: ${formatRatio(metrics.free_cash_flow_per_share)}
    - Earnings Per Share: ${formatRatio(metrics.earnings_per_share)}
    
    Valuation:
    - Price to Earnings Ratio: ${formatRatio(metrics.price_to_earnings_ratio)}
    - Price to Book Ratio: ${formatRatio(metrics.price_to_book_ratio)}
    - Price to Sales Ratio: ${formatRatio(metrics.price_to_sales_ratio)}
    
    Based on these metrics, generate a fundamental analysis with signals for:
    1. Profitability (bullish, bearish, or neutral)
    2. Growth (bullish, bearish, or neutral)
    3. Financial Health (bullish, bearish, or neutral)
    4. Price Ratios (bullish, bearish, or neutral)
    
    Then calculate an overall signal and confidence score.
    
    Return the analysis in the following JSON format:
    {
      "signal": "bullish"|"bearish"|"neutral",
      "confidence": number (0-100),
      "reasoning": {
        "profitability_signal": {
          "signal": "bullish"|"bearish"|"neutral",
          "details": "explanation"
        },
        "growth_signal": {
          "signal": "bullish"|"bearish"|"neutral", 
          "details": "explanation"
        },
        "financial_health_signal": {
          "signal": "bullish"|"bearish"|"neutral",
          "details": "explanation"
        },
        "price_ratios_signal": {
          "signal": "bullish"|"bearish"|"neutral",
          "details": "explanation"
        }
      }
    }`;
  }

  /**
   * Get portfolio allocation suggestions from Claude
   * @param currentPortfolio Current portfolio data
   * @param fundamentalAnalyses Fundamental analyses for tickers
   * @returns Suggested portfolio allocation changes
   */
  public async getPortfolioSuggestions(
    currentPortfolio: any, 
    fundamentalAnalyses: Record<string, FundamentalAnalysis>
  ): Promise<any> {
    const prompt = `
    Analyze the following portfolio and fundamental analyses to suggest portfolio allocation changes:
    
    Current Portfolio:
    ${JSON.stringify(currentPortfolio, null, 2)}
    
    Fundamental Analyses:
    ${JSON.stringify(fundamentalAnalyses, null, 2)}
    
    Based on the fundamental analyses and current portfolio, suggest allocation changes.
    Consider the following:
    - Overweight bullish signals with high confidence
    - Reduce exposure to bearish signals
    - Maintain diversification
    - Manage risk appropriately
    
    Return your suggestions as a JSON object with:
    1. Overall portfolio assessment
    2. Specific actions for each ticker (buy, hold, sell)
    3. Reasoning for each action
    `;
    
    try {
      return await this.getCompletion(prompt);
    } catch (error) {
      console.error('Claude Portfolio Suggestion Error:', error);
      throw error;
    }
  }

  /**
   * Get a chat completion from Claude
   * @param messages Array of messages to send to Claude
   * @returns Claude's response
   */
  public async getChatCompletion(messages: Array<{role: 'user' | 'assistant', content: string}>): Promise<string> {
    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4000,
        temperature: 0.2,
        system: `You are a financial analysis assistant helping with stock market analysis and portfolio management.`,
        messages: messages
      });
      
      return response.content[0].type;
    } catch (error) {
      console.error('Claude Chat API Error:', error);
      throw error;
    }
  }
}