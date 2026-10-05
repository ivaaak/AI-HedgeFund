# Financial Analysis Server

An Express.js server for financial analysis and (paper) portfolio management.

## Features

- Market data from Alpha Vantage: prices, financial metrics, statements, news sentiment, insider transactions
- Four analysts: fundamentals, technicals, sentiment and valuation
- Risk management: position limits, volatility and drawdown
- Portfolio decisions by an LLM (OpenAI or Claude), with a rule-based fallback
- Paper trade execution and performance calculation
- Response caching on disk, request throttling, API key validation, Swagger docs

## Project Structure

```
backend/
├── controllers/        # Route controllers
├── data/               # Data models and cache
├── docs/               # Notes per module
├── middleware/         # Error handling, API key check, request validation
├── routes/             # API routes with OpenAPI annotations
├── services/           # Business logic
├── tests/              # Unit tests (node:test)
├── config.ts           # Configuration from environment variables
├── server.ts           # Express application
└── .env.example        # Environment variables example
```

## Getting Started

Requires Node.js 20 or later.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set at least `ALPHA_VANTAGE_API_KEY`
3. Start the server: `npm start` (runs `ts-node server.ts`)

Other scripts:

- `npm test` - type-check and run the unit tests
- `npm run build` / `npm run start:prod` - compile to `dist/` and run the compiled server

Swagger UI is served at `/api-docs`.

## API Endpoints

Analysis endpoints take `{ "tickers": ["AAPL"], "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD" }`
(dates are optional) and answer with `{ "results": { ticker: ... }, "errors": { ticker: message } }`,
so one ticker failing does not fail the request.

| Endpoint | Description |
|---|---|
| `GET /health` | Health check |
| `GET /api/financial-data/prices` | Daily prices (`ticker`, `startDate`, `endDate`) |
| `GET /api/financial-data/metrics` | Financial metrics (`ticker`, `endDate`, `period`, `limit`) |
| `GET /api/financial-data/line-items` | Statement line items (`ticker`, `lineItems`, ...) |
| `GET /api/financial-data/market-cap` | Market capitalization (`ticker`) |
| `POST /api/fundamentals/analyze` | Fundamental analysis |
| `POST /api/technical/analyze` | Technical analysis |
| `GET /api/technical/prices/:ticker` | Daily prices (`start_date`, `end_date`) |
| `POST /api/sentiment/analyze` | News and insider sentiment |
| `POST /api/valuation/analyze` | DCF and owner earnings valuation |
| `POST /api/risk/analyze` | Position limits and price risk (takes a `portfolio`) |
| `POST /api/risk/recommendations` | Position-sized recommendations from signals |
| `POST /api/portfolio/manage` | Trading decisions from signals and risk limits |
| `POST /api/hedge-fund/run` | Full cycle: analysts, risk, decisions, paper trades |

The server is stateless. `POST /api/hedge-fund/run` returns the updated portfolio; send it back with
the next request. A portfolio looks like:

```json
{
  "cash": 100000,
  "positions": { "AAPL": { "shares": 10, "avg_price": 200, "current_price": 210 } },
  "history": [],
  "initial_value": 100000
}
```

Ratios, margins and growth rates in the metrics are fractions (`0.15` = 15%).

## Configuration

See `.env.example` for all variables. The most important ones:

- `PORT` - Server port (default: 3000)
- `ALPHA_VANTAGE_API_KEY` - Market data key. The free tier allows 25 requests per day and one
  full analysis needs 7 requests per ticker, so responses are cached in `CACHE_DIR` (default `.cache`)
- `LLM_PROVIDER`, `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`, `USE_AI` - Who makes the portfolio decisions.
  Without a working provider the weighted rule-based decision is used
- `API_KEY_REQUIRED`, `API_KEY` - Require an `X-API-KEY` header on `/api`

## Limitations

- On the free Alpha Vantage tier only the latest 100 trading days of prices are available, so the
  6 month momentum is left out of the technical analysis and analyses are always as of "now"
- Fundamentals come from the current company overview and annual statements; `end_date` only limits
  which statements, news and insider transactions are used
