TechnicalAnalystService:

Performs sophisticated technical analysis using multiple trading strategies across tickers
Implements five core strategies: Trend Following, Mean Reversion, Momentum, Volatility Analysis, and Statistical Arbitrage
Calculates technical indicators including EMAs, RSI, Bollinger Bands, and Hurst exponent
Combines signals using a weighted ensemble approach to generate overall predictions
Uses daily prices from the shared FinancialDataService (Alpha Vantage); strategies without enough price history are left out of the combined signal


TechnicalAnalystController:

Handles HTTP requests and input validation for technical analysis endpoints
Forwards valid requests to the TechnicalAnalystService
Provides comprehensive error handling with detailed error messages
Processes requests for both full technical analysis and price data retrieval


TechnicalAnalystRoutes:

Sets up the Express router with two primary endpoints:

/analyze - For complete technical analysis across multiple tickers
/prices/:ticker - For retrieving historical price data for specific tickers


Maps each route to the appropriate controller method