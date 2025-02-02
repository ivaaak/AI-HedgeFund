export interface GetFinancialMetricsParams {
    ticker: string;
    endDate: string;
    period: 'ttm' | 'quarterly' | 'annual';  // restricted to valid periods
    limit: number;
}