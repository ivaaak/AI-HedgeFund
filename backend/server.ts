import path from 'path';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import config from './config';
import routes from './routes';
import { errorHandler, requestLogger, apiKeyValidator } from './middleware/middleware';

const app = express();

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Hedge Fund API',
      version: '1.0.0',
      description: 'Financial data, analyst signals, risk management and portfolio decisions',
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],
    ...(config.apiKeyRequired ? { security: [{ ApiKeyAuth: [] }] } : {}),
  },
  // Resolved from this file so the docs also work from the compiled build
  apis: [path.join(__dirname, 'routes', '*.{ts,js}').split(path.sep).join('/')],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(cors(config.corsOrigin ? { origin: config.corsOrigin.split(',').map(origin => origin.trim()) } : undefined));
app.use(express.json({ limit: '1mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(requestLogger); // Custom request logger

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    marketData: Boolean(config.alphaVantageApiKey),
    llmProvider: config.useAI ? config.llmProvider : 'none'
  });
});

// Apply API routes with prefix
app.use('/api', apiKeyValidator, routes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use(errorHandler);

// Only listen when started directly, so the app can be imported in tests
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Environment: ${config.env}`);
    console.log(`Market data: ${config.alphaVantageApiKey ? 'Alpha Vantage' : 'not configured (set ALPHA_VANTAGE_API_KEY)'}`);
    console.log(`Portfolio decisions: ${config.useAI && config.llmProvider !== 'none' ? config.llmProvider : 'rule-based'}`);
    console.log(`Swagger documentation available at http://localhost:${config.port}/api-docs`);
  });
}

export default app;
