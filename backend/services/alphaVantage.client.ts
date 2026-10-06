import axios from 'axios';
import config from '../config';
import { CacheService } from '../data/cache';
import { HttpError } from '../middleware/middleware';

const BASE_URL = 'https://www.alphavantage.co/query';

/**
 * The requested function or parameter is only available on a paid plan
 */
export class PremiumEndpointError extends HttpError {
  constructor(message: string) {
    super(402, message);
    this.name = 'PremiumEndpointError';
  }
}

export type AlphaVantageFetcher = (params: Record<string, string>) => Promise<Record<string, unknown>>;

const httpFetcher: AlphaVantageFetcher = async (params) => {
  const response = await axios.get(BASE_URL, { params, timeout: 20000 });
  return response.data;
};

/**
 * Thin Alpha Vantage client: caches responses, shares in-flight requests,
 * spaces calls out to respect the rate limit and turns the API's in-band
 * error payloads (which arrive with HTTP 200) into real errors.
 */
export class AlphaVantageClient {
  private inFlight: Map<string, Promise<Record<string, unknown>>> = new Map();
  private queue: Promise<unknown> = Promise.resolve();
  private lastCallAt = 0;

  constructor(
    private apiKey: string = config.alphaVantageApiKey,
    private cache: CacheService = new CacheService(config.cacheDir),
    private minIntervalMs: number = config.alphaVantageMinIntervalMs,
    private fetcher: AlphaVantageFetcher = httpFetcher
  ) {
    if (!this.apiKey) {
      console.warn('No Alpha Vantage API key provided (ALPHA_VANTAGE_API_KEY). Market data requests will fail.');
    }
  }

  /**
   * Runs an Alpha Vantage query, serving it from cache when possible
   */
  public async query(params: Record<string, string>, ttlMs: number): Promise<Record<string, unknown>> {
    const key = Object.keys(params).sort().map(name => `${name}-${params[name]}`).join('_');

    const cached = this.cache.get<Record<string, unknown>>(key);
    if (cached) return cached;

    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const request = this.enqueue(() => this.fetch(params))
      .then(data => {
        this.cache.set(key, data, ttlMs);
        return data;
      })
      .finally(() => this.inFlight.delete(key));

    this.inFlight.set(key, request);
    return request;
  }

  // Calls are serialized and spaced by minIntervalMs
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const wait = this.lastCallAt + this.minIntervalMs - Date.now();
      if (wait > 0) {
        await new Promise(resolve => setTimeout(resolve, wait));
      }
      try {
        return await task();
      } finally {
        this.lastCallAt = Date.now();
      }
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async fetch(params: Record<string, string>): Promise<Record<string, unknown>> {
    if (!this.apiKey) {
      throw new HttpError(503, 'Market data is unavailable: ALPHA_VANTAGE_API_KEY is not configured');
    }

    let data: Record<string, unknown>;
    try {
      data = await this.fetcher({ ...params, apikey: this.apiKey });
    } catch (error) {
      // Never surface the request URL: it contains the API key
      throw new HttpError(502, `Alpha Vantage request failed (${params.function}): ${(error as Error).message}`);
    }

    if (!data || typeof data !== 'object') {
      throw new HttpError(502, `Unexpected response from Alpha Vantage (${params.function})`);
    }

    if (typeof data['Error Message'] === 'string') {
      throw new HttpError(404, `Alpha Vantage rejected the request for ${params.symbol || params.tickers || params.function}: unknown symbol or invalid parameters`);
    }

    const notice = (data['Note'] || data['Information']) as string | undefined;
    if (typeof notice === 'string') {
      if (/rate limit|requests per (day|minute)|per second|call frequency/i.test(notice)) {
        throw new HttpError(429, 'Alpha Vantage rate limit reached. The free tier allows 25 requests per day; cached data is still served.');
      }
      if (/premium/i.test(notice)) {
        throw new PremiumEndpointError(`Alpha Vantage: ${params.function} with these parameters requires a premium plan`);
      }
      throw new HttpError(502, `Alpha Vantage: ${notice}`);
    }

    return data;
  }
}
