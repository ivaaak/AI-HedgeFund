SentimentService:

Analyzes market sentiment by examining insider trading patterns and news sentiment
Implements the same weighted approach to combine signals from different sources
Calculates bullish/bearish signals and confidence levels
Includes mock data methods for insider trades and company news that would be replaced with real API calls in production


SentimentController:

Handles HTTP requests and input validation
Forwards valid requests to the SentimentService
Provides appropriate error handling and responses


SentimentRoutes:

Sets up the Express router with the appropriate endpoint
Connects the route to the controller method