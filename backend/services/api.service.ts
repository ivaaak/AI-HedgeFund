import axios, { AxiosInstance } from 'axios';
import { FinancialMetrics } from '../data/models';
import config from "../config";

export interface GetFinancialMetricsParams {
  ticker: string;
  endDate?: string;
  period?: 'ttm' | 'quarterly' | 'annual';
  limit?: number;
}

export class ApiService {
  private httpClient: AxiosInstance;
  
  constructor(
    baseURL: string = config.financialApiBaseUrl,
    apiKey: string = config.financialApiKey
  ) {
    // Create an axios instance with a base URL and auth headers
    this.httpClient = axios.create({
      baseURL,
      timeout: 10000, // 10 seconds timeout
      headers: {
        'X-API-KEY': apiKey,  // Changed to X-API-KEY as per documentation
        'Content-Type': 'application/json'
      }
    });
  }

  public async getFinancialMetrics({
    ticker,
    endDate,
    period,
    limit
  }: GetFinancialMetricsParams): Promise<FinancialMetrics[]> {
    try {
      // Updated endpoint path according to the documentation
      const response = await this.httpClient.get<{ snapshot: FinancialMetrics }>('/financial-metrics/snapshot', {
        params: {
          ticker, // ticker is required
          ...(endDate && { endDate }), // Only include if defined
          ...(period && { period }),   // Only include if defined
          ...(limit && { limit })      // Only include if defined
        }
      });
      
      if (!response.data || !response.data.snapshot) {
        throw new Error('No financial metrics data received');
      }
      
      // Return the snapshot as an array with one item for backwards compatibility
      return [response.data.snapshot];
    } catch (error) {
      console.error(`API Error for ${ticker}:`, error);
      
      // Enhanced error handling with clearer messages
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // The request was made and the server responded with a status code outside of 2xx
          console.error(`Status: ${error.response.status}`);
          console.error(`Data:`, error.response.data);
          
          if (error.response.status === 404) {
            throw new Error(`API endpoint not found. Please check the API documentation.`);
          } else if (error.response.status === 401 || error.response.status === 403) {
            throw new Error(`Authentication error. Please check your API key.`);
          }
        } else if (error.request) {
          // The request was made but no response was received
          throw new Error(`No response received from API for ${ticker}. Please check connectivity.`);
        }
      }
      
      throw error;
    }
  }
}