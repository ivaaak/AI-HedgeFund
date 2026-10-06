import { AnalysisResponse } from '../data/models';

/**
 * Runs an analysis for every ticker. A ticker that fails is reported in
 * `errors` so that one bad symbol does not fail the whole request.
 */
export async function analyzeEach<T>(
  agent: string,
  tickers: string[],
  analyze: (ticker: string) => Promise<T>
): Promise<AnalysisResponse<T>> {
  const response: AnalysisResponse<T> = { results: {}, errors: {} };

  await Promise.all(tickers.map(async ticker => {
    try {
      response.results[ticker] = await analyze(ticker);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`${agent} - ${ticker}: ${message}`);
      response.errors[ticker] = message;
    }
  }));

  return response;
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
