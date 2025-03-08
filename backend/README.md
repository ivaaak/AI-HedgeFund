# Financial Analysis Server

A robust Express.js server application for financial analysis and portfolio management.

## Features

- Financial data retrieval and analysis
- Fundamental analysis for stocks
- Portfolio management with trade execution
- OpenAI integration for advanced analysis
- API security with key validation
- Error handling and request logging

## Project Structure

```
financial-analysis-server/
├── src/
│   ├── config/             # Application configuration
│   ├── controllers/        # Route controllers
│   ├── data/               # Data models and cache
│   ├── middleware/         # Express middleware
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── server.ts           # Express application
├── .env.example            # Environment variables example
├── package.json            # Project dependencies
├── tsconfig.json           # TypeScript configuration
└── README.md               # Project documentation
```

## Getting Started

### Prerequisites

- Node.js 16.x or later
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and update the values
4. Build the project:
   ```bash
   npm run build
   ```
5. Start the server:
   ```bash
   npm start
   ```

### Development

Run the development server with hot-reloading:
```bash
npm run dev
```

## API Endpoints

### Financial Data

- `GET /api/financial-data/prices` - Get price data for a ticker
- `GET /api/financial-data/metrics` - Get financial metrics for a ticker

### Fundamental Analysis

- `POST /api/fundamentals/analyze` - Analyze fundamental data for tickers

### Portfolio Management

- `POST /api/portfolio/manage` - Manage portfolio based on analysis

## Configuration

The application can be configured through environment variables:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development, production)
- `API_KEY_REQUIRED` - Whether API key validation is required
- `API_KEY` - API key for authentication
- `FINANCIAL_API_KEY` - API key for financial data services
- `OPENAI_API_KEY` - API key for OpenAI integration
- `USE_AI` - Whether to use AI for analysis

## License

This project is proprietary and confidential.