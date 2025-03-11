import { OpenAIService } from './openai.service';

// Type definitions
export interface FinancialMetrics {
  earnings_growth: number;
  // Other metrics that might be needed
  revenue_growth?: number;
  book_value_growth?: number;
  net_margin?: number;
  operating_margin?: number;
  return_on_equity?: number;
}

export interface FinancialLineItem {
  free_cash_flow: number;
  net_income: number;
  depreciation_and_amortization: number;
  capital_expenditure: number;
  working_capital: number;
}

export interface ValuationAnalysisResult {
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  reasoning: {
    dcf_analysis: {
      signal: 'bullish' | 'bearish' | 'neutral';
      details: string;
    };
    owner_earnings_analysis: {
      signal: 'bullish' | 'bearish' | 'neutral';
      details: string;
    };
  };
}

export interface ValuationRequest {
  tickers: string[];
  end_date: string;
}

export class ValuationService {
  private openAIService: OpenAIService;
  
  constructor(apiKey?: string) {
    this.openAIService = new OpenAIService(apiKey);
  }
  
  /**
   * Performs valuation analysis for multiple tickers
   */
  public async analyzeValuation(request: ValuationRequest): Promise<Record<string, ValuationAnalysisResult>> {
    try {
      const { tickers, end_date } = request;
      
      if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
        throw new Error('Invalid tickers provided');
      }
      
      if (!end_date) {
        throw new Error('End date is required');
      }
      
      // Initialize valuation analysis for each ticker
      const valuationAnalysis: Record<string, ValuationAnalysisResult> = {};
      
      for (const ticker of tickers) {
        // Fetch the financial metrics
        const financialMetrics = await this.getFinancialMetrics(ticker, end_date, 'ttm');
        
        if (!financialMetrics) {
          console.warn(`No financial metrics found for ${ticker}`);
          continue;
        }
        
        const metrics = financialMetrics;
        
        // Fetch the specific line items that we need for valuation purposes
        const financialLineItems = await this.getFinancialLineItems(ticker, end_date);
        
        if (financialLineItems.length < 2) {
          console.warn(`Insufficient financial line items for ${ticker}`);
          continue;
        }
        
        // Pull the current and previous financial line items
        const currentFinancialLineItem = financialLineItems[0];
        const previousFinancialLineItem = financialLineItems[1];
        
        // Calculate working capital change
        const workingCapitalChange = currentFinancialLineItem.working_capital - previousFinancialLineItem.working_capital;
        
        // Owner Earnings Valuation (Buffett Method)
        const ownerEarningsValue = this.calculateOwnerEarningsValue(
          currentFinancialLineItem.net_income,
          currentFinancialLineItem.depreciation_and_amortization,
          currentFinancialLineItem.capital_expenditure,
          workingCapitalChange,
          metrics.earnings_growth,
          0.15, // required return
          0.25  // margin of safety
        );
        
        // DCF Valuation
        const dcfValue = this.calculateIntrinsicValue(
          currentFinancialLineItem.free_cash_flow,
          metrics.earnings_growth,
          0.10, // discount rate
          0.03, // terminal growth rate
          5     // num years
        );
        
        // Get the market cap
        const marketCap = await this.getMarketCap(ticker, end_date);
        
        // Calculate combined valuation gap (average of both methods)
        const dcfGap = (dcfValue - marketCap) / marketCap;
        const ownerEarningsGap = (ownerEarningsValue - marketCap) / marketCap;
        const valuationGap = (dcfGap + ownerEarningsGap) / 2;
        
        let signal: 'bullish' | 'bearish' | 'neutral';
        
        if (valuationGap > 0.15) {  // More than 15% undervalued
          signal = 'bullish';
        } else if (valuationGap < -0.15) {  // More than 15% overvalued
          signal = 'bearish';
        } else {
          signal = 'neutral';
        }
        
        // Create the reasoning
        const dcfAnalysisSignal: 'bullish' | 'bearish' | 'neutral' = 
          dcfGap > 0.15 ? 'bullish' : dcfGap < -0.15 ? 'bearish' : 'neutral';
        
        const ownerEarningsAnalysisSignal: 'bullish' | 'bearish' | 'neutral' = 
          ownerEarningsGap > 0.15 ? 'bullish' : ownerEarningsGap < -0.15 ? 'bearish' : 'neutral';
        
        const confidence = Math.round(Math.abs(valuationGap) * 100);
        
        valuationAnalysis[ticker] = {
          signal,
          confidence,
          reasoning: {
            dcf_analysis: {
              signal: dcfAnalysisSignal,
              details: `Intrinsic Value: $${dcfValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Market Cap: $${marketCap.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Gap: ${(dcfGap * 100).toFixed(1)}%`,
            },
            owner_earnings_analysis: {
              signal: ownerEarningsAnalysisSignal,
              details: `Owner Earnings Value: $${ownerEarningsValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Market Cap: $${marketCap.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Gap: ${(ownerEarningsGap * 100).toFixed(1)}%`,
            },
          },
        };
      }
      
      return valuationAnalysis;
    } catch (error) {
      console.error('Error in valuation analysis:', error);
      throw error;
    }
  }
  
  /**
   * Get financial metrics for a ticker
   */
  private async getFinancialMetrics(ticker: string, endDate: string, period: string): Promise<FinancialMetrics | null> {
    try {
      // In a real implementation, this would call an external API or database
      // Mock implementation for demonstration
      return {
        earnings_growth: 0.12, // 12% growth
        revenue_growth: 0.15,
        book_value_growth: 0.08,
        net_margin: 0.18,
        operating_margin: 0.21,
        return_on_equity: 0.22
      };
    } catch (error) {
      console.error(`Error fetching financial metrics for ${ticker}:`, error);
      return null;
    }
  }
  
  /**
   * Get financial line items for a ticker
   */
  private async getFinancialLineItems(ticker: string, endDate: string): Promise<FinancialLineItem[]> {
    try {
      // In a real implementation, this would call an external API or database
      // Mock implementation for demonstration
      return [
        {
          free_cash_flow: 1200000000,
          net_income: 800000000,
          depreciation_and_amortization: 150000000,
          capital_expenditure: 200000000,
          working_capital: 350000000
        },
        {
          free_cash_flow: 1100000000,
          net_income: 750000000,
          depreciation_and_amortization: 140000000,
          capital_expenditure: 180000000,
          working_capital: 320000000
        }
      ];
    } catch (error) {
      console.error(`Error fetching financial line items for ${ticker}:`, error);
      return [];
    }
  }
  
  /**
   * Get market cap for a ticker
   */
  private async getMarketCap(ticker: string, endDate: string): Promise<number> {
    try {
      // In a real implementation, this would call an external API or database
      // Mock implementation for demonstration
      return 10000000000; // $10B market cap
    } catch (error) {
      console.error(`Error fetching market cap for ${ticker}:`, error);
      return 0;
    }
  }
  
  /**
   * Calculate owner earnings value using Buffett's method
   */
  private calculateOwnerEarningsValue(
    netIncome: number,
    depreciation: number,
    capex: number,
    workingCapitalChange: number,
    growthRate: number = 0.05,
    requiredReturn: number = 0.15,
    marginOfSafety: number = 0.25,
    numYears: number = 5
  ): number {
    if (
      typeof netIncome !== 'number' ||
      typeof depreciation !== 'number' ||
      typeof capex !== 'number' ||
      typeof workingCapitalChange !== 'number'
    ) {
      return 0;
    }
    
    // Calculate initial owner earnings
    const ownerEarnings = netIncome + depreciation - capex - workingCapitalChange;
    
    if (ownerEarnings <= 0) {
      return 0;
    }
    
    // Project future owner earnings
    const futureValues: number[] = [];
    for (let year = 1; year <= numYears; year++) {
      const futureValue = ownerEarnings * Math.pow(1 + growthRate, year);
      const discountedValue = futureValue / Math.pow(1 + requiredReturn, year);
      futureValues.push(discountedValue);
    }
    
    // Calculate terminal value (using perpetuity growth formula)
    const terminalGrowth = Math.min(growthRate, 0.03); // Cap terminal growth at 3%
    const terminalValue = (futureValues[futureValues.length - 1] * (1 + terminalGrowth)) / (requiredReturn - terminalGrowth);
    const terminalValueDiscounted = terminalValue / Math.pow(1 + requiredReturn, numYears);
    
    // Sum all values and apply margin of safety
    const intrinsicValue = futureValues.reduce((sum, value) => sum + value, 0) + terminalValueDiscounted;
    const valueWithSafetyMargin = intrinsicValue * (1 - marginOfSafety);
    
    return valueWithSafetyMargin;
  }
  
  /**
   * Calculate intrinsic value using DCF method
   */
  private calculateIntrinsicValue(
    freeCashFlow: number,
    growthRate: number = 0.05,
    discountRate: number = 0.10,
    terminalGrowthRate: number = 0.02,
    numYears: number = 5
  ): number {
    // Estimate the future cash flows based on the growth rate
    const cashFlows: number[] = [];
    for (let i = 0; i < numYears; i++) {
      cashFlows.push(freeCashFlow * Math.pow(1 + growthRate, i));
    }
    
    // Calculate the present value of projected cash flows
    const presentValues: number[] = [];
    for (let i = 0; i < numYears; i++) {
      const presentValue = cashFlows[i] / Math.pow(1 + discountRate, i + 1);
      presentValues.push(presentValue);
    }
    
    // Calculate the terminal value
    const terminalValue = cashFlows[cashFlows.length - 1] * (1 + terminalGrowthRate) / (discountRate - terminalGrowthRate);
    const terminalPresentValue = terminalValue / Math.pow(1 + discountRate, numYears);
    
    // Sum up the present values and terminal value
    const dcfValue = presentValues.reduce((sum, value) => sum + value, 0) + terminalPresentValue;
    
    return dcfValue;
  }
}