# AI Hedge Fund Frontend

This React application provides a visual interface for the AI Hedge Fund backend system, displaying the flow of financial analysis, risk assessment, and portfolio management.

## Features

- Visual process flow showing the active components in the system
- Signal displays for various analyst types (Fundamental, Technical, Sentiment, Macro)
- Risk management visualization
- Portfolio decision display
- Performance chart for portfolio value over time
- Real-time data updates from the backend API

## Setup and Configuration

### Prerequisites

- Node.js 16.x or later
- npm or yarn
- Backend API running (see main README.md for backend setup)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory with the following content:
   ```
   REACT_APP_API_BASE_URL=http://localhost:3000/api
   REACT_APP_API_KEY=your_api_key_here
   ```
   Replace `your_api_key_here` with your actual API key if required by the backend.

3. Start the development server:
   ```bash
   npm start
   ```

## Component Structure

- `App.tsx` - Main application component with process flow visualization
- `types.ts` - TypeScript type definitions for the application
- `services/api.service.ts` - API service for communicating with the backend
- `App.module.css` - CSS module for styling

## API Integration

The frontend integrates with the following API endpoints:

- `/api/financial-data/prices` - Get price data for tickers
- `/api/financial-data/metrics` - Get financial metrics for tickers
- `/api/fundamentals/analyze` - Run fundamental analysis
- `/api/portfolio/manage` - Get portfolio management decisions
- `/health` - Check API server health

## Development

### Adding New Analyst Types

To add new analyst types:

1. Update the `AnalystType` enum in `types.ts`
2. Create a corresponding API service method in `api.service.ts`
3. Update the `App.tsx` component to display the new analyst type

### Data Flow

1. The app starts by checking API health
2. Upon connection, it fetches fundamental analysis data
3. Risk assessment is generated from signals
4. Portfolio decisions are made based on signals and risk assessment
5. Performance data is updated and displayed in the chart

## Build for Production

```bash
npm run build
```

This creates optimized production files in the `build` directory.