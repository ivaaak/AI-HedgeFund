import axios from 'axios';
import { FinancialMetrics } from '../types/FinancialMetrics';

export interface GetFinancialMetricsParams {
  ticker: string;
  endDate: string;
  period: 'ttm' | 'quarterly' | 'annual';  // restricted to valid periods
  limit: number;
}

export class ApiService {
  public async getFinancialMetrics({
    ticker,
    endDate,
    period,
    limit
  }: GetFinancialMetricsParams): Promise<FinancialMetrics[]> {
    try {
      const response = await axios.get<FinancialMetrics[]>('/api/financial-metrics', {
        params: {
          ticker,
          endDate,
          period,
          limit
        }
      });
      
      if (!response.data) {
        throw new Error('No financial metrics data received');
      }
      
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
}