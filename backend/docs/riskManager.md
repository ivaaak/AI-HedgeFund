RiskManagerService:

Controls position sizing based on real-world risk factors for multiple tickers
Calculates portfolio-level risk metrics including position limits and exposure
Ensures proper risk distribution by enforcing a 20% maximum allocation per position
Generates recommendations based on combined technical and fundamental signals
Uses daily prices from the shared FinancialDataService (Alpha Vantage) and reports annualized volatility, max drawdown and a 1-10 risk score


RiskManagerController:

Handles HTTP requests and input validation for risk analysis endpoints
Forwards valid requests to the RiskManagerService
Provides appropriate error handling with detailed error messages
Exposes endpoints for both risk analysis and portfolio recommendations


RiskManagerRoutes:

Sets up the Express router with two primary endpoints:

/analyze - For calculating position limits and risk metrics
/recommendations - For generating portfolio allocation recommendations


Connects each route to the corresponding controller method