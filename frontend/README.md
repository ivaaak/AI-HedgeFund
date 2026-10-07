# AI Hedge Fund Frontend

This React application provides a visual interface for the AI Hedge Fund backend system, displaying the flow of financial analysis, risk assessment, and portfolio management.

## Features

- Visual process flow showing the active components in the system
- Signals per ticker for each analyst (Fundamental, Technical, Sentiment, Valuation), with the reasoning behind them
- Risk management visualization (risk score, volatility, position limits)
- Portfolio decisions per ticker and the resulting BUY / SELL / HOLD actions
- Paper portfolio kept in the browser (localStorage) with a chart of its value over the runs
- Price chart and key metrics per ticker

All numbers come from the backend API; nothing is generated in the browser.

## Setup and Configuration

### Prerequisites

- Node.js 20 or later
- Backend API running (see the backend README)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

The dev server proxies `/api` and `/health` to the backend, using the `PORT` from `../backend/.env`
(default 3000), so no configuration is needed. See `.env.example` for the optional `VITE_*` settings.

## Component Structure

- `App.tsx` - Controls, run logic, paper portfolio and performance chart
- `ProcessFlow.tsx` - Lays out the nodes and the connections between them
- `DataCollectionNode.tsx`, `AnalystNode.tsx`, `RiskManagerNode.tsx`, `PortfolioManagerNode.tsx`, `ActionNode.tsx` - The nodes
- `api.service.ts` - API service for communicating with the backend
- `portfolio.ts` - Portfolio calculations and persistence
- `types.ts` - TypeScript type definitions (mirroring the backend responses)

## API Integration

- `/api/hedge-fund/run` - "All Services": analysts, risk, decisions and paper trades in one call
- `/api/fundamentals/analyze`, `/api/technical/analyze`, `/api/sentiment/analyze`, `/api/valuation/analyze` - A single analyst
- `/api/risk/analyze` - Risk management only
- `/api/portfolio/manage` - Decisions from the signals and risk limits already on screen (no trades)
- `/api/financial-data/prices`, `/api/financial-data/metrics` - Data Collection node
- `/health` - Check API server health

### Adding New Analyst Types

1. Add the analyst to the backend and to `analyst_signals` in `hedgeFund.service.ts`
2. Add it to the `AnalystType` enum in `types.ts` (the value is the backend key)
3. Add its endpoint in `api.service.ts` and its label in `AnalystNode.tsx`

## Build for Production

```bash
npm run build
```

This creates optimized production files in the `dist` directory. Set `VITE_API_BASE_URL` when the API
is served from a different origin.
