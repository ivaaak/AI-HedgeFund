import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Default configuration
const defaultConfig = {
  port: 3000,
  env: 'development',
  logLevel: 'info',
  apiKeyRequired: false,
  apiKey: '',
  financialApiBaseUrl: 'https://api.financialdatasets.ai',
  financialApiKey: '',
  openAiApiKey: '',
  useAI: false
};

// Environment specific configuration
const envConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  apiKeyRequired: process.env.API_KEY_REQUIRED === 'true',
  apiKey: process.env.API_KEY || '',
  financialApiBaseUrl: process.env.FINANCIAL_API_BASE_URL || 'https://api.financialdatasets.ai',
  financialApiKey: process.env.FINANCIAL_API_KEY || '',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  useAI: process.env.USE_AI === 'true',
  alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || ''
};

// Merge default and environment configurations
const config = {
  ...defaultConfig,
  ...envConfig
};

export default config;