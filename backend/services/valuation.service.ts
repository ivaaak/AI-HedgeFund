import { AnalysisRequest, AnalysisResponse, AnalystSignal, Signal, SignalDirection } from '../data/models';
import { HttpError } from '../middleware/middleware';
import { analyzeEach, clamp } from './analysis.util';
import { FinancialDataService, financialDataService } from './financialData.service';

export type ValuationAnalysisResult = AnalystSignal<Record<string, Signal>>;

// Quarterly year-over-year growth can be extreme; keep the projections sane
const MIN_GROWTH = -0.10;
const MAX_GROWTH = 0.25;

const formatMoney = (value: number): string =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const gapSignal = (gap: number): SignalDirection =>
  gap > 0.15 ? 'bullish' : gap < -0.15 ? 'bearish' : 'neutral';

export class ValuationService {
  constructor(private financialData: FinancialDataService = financialDataService) {}

  /**
   * Performs valuation analysis (DCF and owner earnings) for multiple tickers
   */
  public async analyzeValuation(request: Pick<AnalysisRequest, 'tickers' | 'end_date'>): Promise<AnalysisResponse<ValuationAnalysisResult>> {
    const { tickers, end_date } = request;

    return analyzeEach('valuation_agent', tickers, async ticker => {
      const [metrics] = await this.financialData.getFinancialMetrics(ticker, end_date, 'ttm', 1);
      const marketCap = metrics?.market_cap;

      if (!marketCap || marketCap <= 0) {
        throw new HttpError(404, `No market capitalization available for ${ticker}`);
      }

      // The current and previous annual statements
      const [current, previous] = (await this.financialData.getStatements(ticker, 'annual'))
        .filter(row => row.report_period <= end_date);

      if (!current || !previous) {
        throw new HttpError(422, `Insufficient financial statements for ${ticker}`);
      }

      const { net_income, depreciation_and_amortization, capital_expenditure, free_cash_flow } = current;
      if (net_income === null || depreciation_and_amortization === null ||
          capital_expenditure === null || free_cash_flow === null) {
        throw new HttpError(422, `Incomplete financial statements for ${ticker}`);
      }

      const workingCapitalChange = (current.working_capital ?? 0) - (previous.working_capital ?? 0);
      const growthRate = clamp(metrics.earnings_growth ?? 0.05, MIN_GROWTH, MAX_GROWTH);

      // Owner Earnings Valuation (Buffett Method)
      const ownerEarningsValue = this.calculateOwnerEarningsValue(
        net_income,
        depreciation_and_amortization,
        Math.abs(capital_expenditure),
        workingCapitalChange,
        growthRate,
        0.15, // required return
        0.25  // margin of safety
      );

      // DCF Valuation
      const dcfValue = this.calculateIntrinsicValue(
        free_cash_flow,
        growthRate,
        0.10, // discount rate
        0.03, // terminal growth rate
        5     // num years
      );

      // Combined valuation gap (average of both methods)
      const dcfGap = (dcfValue - marketCap) / marketCap;
      const ownerEarningsGap = (ownerEarningsValue - marketCap) / marketCap;
      const valuationGap = (dcfGap + ownerEarningsGap) / 2;

      return {
        // More than 15% under- or overvalued
        signal: gapSignal(valuationGap),
        confidence: Math.min(100, Math.round(Math.abs(valuationGap) * 100)),
        reasoning: {
          dcf_analysis: {
            signal: gapSignal(dcfGap),
            details: `Intrinsic Value: ${formatMoney(dcfValue)}, Market Cap: ${formatMoney(marketCap)}, Gap: ${(dcfGap * 100).toFixed(1)}%, Growth: ${(growthRate * 100).toFixed(1)}%`
          },
          owner_earnings_analysis: {
            signal: gapSignal(ownerEarningsGap),
            details: `Owner Earnings Value: ${formatMoney(ownerEarningsValue)}, Market Cap: ${formatMoney(marketCap)}, Gap: ${(ownerEarningsGap * 100).toFixed(1)}%`
          }
        }
      };
    });
  }

  /**
   * Calculate owner earnings value using Buffett's method
   */
  public calculateOwnerEarningsValue(
    netIncome: number,
    depreciation: number,
    capex: number,
    workingCapitalChange: number,
    growthRate: number = 0.05,
    requiredReturn: number = 0.15,
    marginOfSafety: number = 0.25,
    numYears: number = 5
  ): number {
    // Calculate initial owner earnings
    const ownerEarnings = netIncome + depreciation - capex - workingCapitalChange;

    if (ownerEarnings <= 0) {
      return 0;
    }

    // Project future owner earnings and discount them
    let presentValue = 0;
    for (let year = 1; year <= numYears; year++) {
      presentValue += ownerEarnings * Math.pow(1 + growthRate, year) / Math.pow(1 + requiredReturn, year);
    }

    // Terminal value (perpetuity growth) on the final year's earnings, discounted once
    const terminalGrowth = Math.min(growthRate, 0.03); // Cap terminal growth at 3%
    const finalYearEarnings = ownerEarnings * Math.pow(1 + growthRate, numYears);
    const terminalValue = (finalYearEarnings * (1 + terminalGrowth)) / (requiredReturn - terminalGrowth);
    const terminalValueDiscounted = terminalValue / Math.pow(1 + requiredReturn, numYears);

    // Sum all values and apply margin of safety
    return (presentValue + terminalValueDiscounted) * (1 - marginOfSafety);
  }

  /**
   * Calculate intrinsic value using DCF method
   */
  public calculateIntrinsicValue(
    freeCashFlow: number,
    growthRate: number = 0.05,
    discountRate: number = 0.10,
    terminalGrowthRate: number = 0.02,
    numYears: number = 5
  ): number {
    if (freeCashFlow <= 0) {
      return 0;
    }

    // Present value of the projected cash flows for years 1..numYears
    let presentValue = 0;
    for (let year = 1; year <= numYears; year++) {
      presentValue += freeCashFlow * Math.pow(1 + growthRate, year) / Math.pow(1 + discountRate, year);
    }

    // Terminal value
    const finalYearCashFlow = freeCashFlow * Math.pow(1 + growthRate, numYears);
    const terminalValue = finalYearCashFlow * (1 + terminalGrowthRate) / (discountRate - terminalGrowthRate);
    const terminalPresentValue = terminalValue / Math.pow(1 + discountRate, numYears);

    return presentValue + terminalPresentValue;
  }
}
