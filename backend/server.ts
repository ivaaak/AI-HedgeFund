import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import routes from './routes';

// Import middleware
import { errorHandler, requestLogger, apiKeyValidator } from './middleware/middleware';

// Create Express server
const app = express();
const port = process.env.PORT || 3000;

console.log("process.env.OPENAI_API_KEY", process.env.OPENAI_API_KEY)

// Apply middleware
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies with increased size limit
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(requestLogger); // Custom request logger

// Apply API routes with prefix
app.use('/api', apiKeyValidator, routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply error handling middleware (should be last)
app.use(errorHandler);

// Handle 404s
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;