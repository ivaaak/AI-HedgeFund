import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources';
import { FinancialMetrics, FundamentalAnalysis } from '../data/models';

export class OpenAIService {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    if (!apiKey) {
      console.warn('No API key provided to OpenAIService. API calls will likely fail.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || '',
      dangerouslyAllowBrowser: true // Set to true when using in browser environments
    });
  }

  /**
   * Gets a completion from OpenAI
   * @param prompt The text prompt to send to OpenAI
   * @returns The parsed response from OpenAI
   */
  public async getCompletion<T>(prompt: string): Promise<T> {
    try {
      console.log("Request Prompt:", prompt); // Log the prompt

      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are a financial analyst assistant providing analysis in JSON format. Always return a **valid** JSON response. Do not include extra commas. Ensure proper syntax without trailing commas. Do not include any text outside JSON. If you are unsure, return an empty JSON object {}.`
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        temperature: 0.2,
        messages: messages
      });

      // Log the raw response
      console.log("OpenAI Response Body:", JSON.stringify(response, null, 2));

      // Extract the JSON from the response
      const content = response.choices[0].message.content || '';
      console.log("Raw content from OpenAI:", content); // Log raw content before parsing

      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*?}/);

      if (!jsonMatch) {
        console.warn("No JSON detected in response.");
        throw new Error('Failed to extract JSON from OpenAI response');
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      console.log("Extracted JSON String:", jsonStr); // Log the extracted JSON

      return JSON.parse(jsonStr) as T;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }


  /**
   * Analyze fundamentals with OpenAI
   * @param metrics Financial metrics to analyze
   * @returns Fundamental analysis result
   */
  public async analyzeFundamentals(metrics: FinancialMetrics): Promise<FundamentalAnalysis> {
    const prompt = this.generateFundamentalAnalysisPrompt(metrics);

    try {
      return await this.getCompletion<FundamentalAnalysis>(prompt);
    } catch (error) {
      console.error('OpenAI Fundamental Analysis Error:', error);
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

    return `Analyze the following financial metrics for a company and return a structured JSON analysis:
    
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
    
    Ensure to structure the analysis in the following JSON format, no additional text outside the JSON:

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
   * Get portfolio allocation suggestions from OpenAI
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
      console.error('OpenAI Portfolio Suggestion Error:', error);
      throw error;
    }
  }

  /**
   * Get a chat completion from OpenAI
   * @param messages Array of messages to send to OpenAI
   * @returns OpenAI's response
   */
  public async getChatCompletion(messages: Array<{ role: string, content: string }>): Promise<string> {
    try {
      const hasSystemMessage = messages.some(msg => msg.role === 'system');

      const formattedMessages: ChatCompletionMessageParam[] = hasSystemMessage
        ? messages as ChatCompletionMessageParam[]
        : [
          {
            role: 'system',
            content: 'You are a financial analysis assistant helping with stock market analysis and portfolio management.'
          },
          ...messages
        ] as ChatCompletionMessageParam[];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        temperature: 0.2,
        messages: formattedMessages
      });

      console.log("OpenAI Request Body:", JSON.stringify(response, null, 2));

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('OpenAI Chat API Error:', error);
      throw error;
    }
  }
}
