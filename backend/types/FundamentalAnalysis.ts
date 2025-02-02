import { Signal } from "./Signal";

export interface FundamentalAnalysis {
    signal: string;
    confidence: number;
    reasoning: {
        profitability_signal: Signal;
        growth_signal: Signal;
        financial_health_signal: Signal;
        price_ratios_signal: Signal;
    };
}