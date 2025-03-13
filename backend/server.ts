import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

dotenv.config();

import routes from './routes';
import { errorHandler, requestLogger, apiKeyValidator } from './middleware/middleware';

const app = express();
const port = process.env.PORT || 3000;

console.log("process.env.OPENAI_API_KEY", process.env.OPENAI_API_KEY)

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'API documentation for your Express server',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Development server',
      },
    ],
  },
  apis: [
    './routes/*.ts', 
    './controllers/*.ts',
    './data/*.ts'  // Add this if you create schema definitions
  ],};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(cors()); // Enable CORS
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies with increased size limit
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(requestLogger); // Custom request logger

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Apply API routes with prefix
app.use('/api', apiKeyValidator, routes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Swagger documentation available at http://localhost:${port}/api-docs`);
});

export default app;