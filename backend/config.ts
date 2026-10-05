import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

type LlmProvider = 'openai' | 'anthropic' | 'none';

const openAiApiKey = process.env.OPENAI_API_KEY || '';
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';

// Pick the LLM provider: explicit LLM_PROVIDER wins, otherwise whichever key is present
const resolveLlmProvider = (): LlmProvider => {
  const explicit = (process.env.LLM_PROVIDER || '').toLowerCase();
  if (explicit === 'openai' || explicit === 'anthropic' || explicit === 'none') {
    return explicit;
  }
  if (openAiApiKey) return 'openai';
  if (anthropicApiKey) return 'anthropic';
  return 'none';
};

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // API security
  apiKeyRequired: process.env.API_KEY_REQUIRED === 'true',
  apiKey: process.env.API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || '',

  // Alpha Vantage (market data)
  alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || '',
  // Minimum spacing between Alpha Vantage calls (free tier allows ~1 request per second)
  alphaVantageMinIntervalMs: parseInt(process.env.ALPHA_VANTAGE_MIN_INTERVAL_MS || '1200', 10),
  // Responses are cached on disk so the 25 requests/day free tier survives restarts
  cacheDir: path.resolve(process.env.CACHE_DIR || '.cache'),

  // LLM used for the portfolio manager's decisions (falls back to rules when unavailable)
  useAI: process.env.USE_AI !== 'false',
  llmProvider: resolveLlmProvider(),
  openAiApiKey,
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  anthropicApiKey,
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-opus-5-5',

  // Risk management
  maxPositionPct: parseFloat(process.env.MAX_POSITION_PCT || '0.2'),
  maxTickersPerRequest: parseInt(process.env.MAX_TICKERS_PER_REQUEST || '10', 10)
};

export default config;
