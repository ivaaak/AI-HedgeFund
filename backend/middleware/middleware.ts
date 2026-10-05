import { Request, Response, NextFunction, RequestHandler } from 'express';
import config from '../config';

/**
 * Error carrying the HTTP status the client should receive
 */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

// Wraps async route handlers so rejections reach the error handler
export const asyncHandler = (
  handler: (req: Request, res: Response) => Promise<void>
): RequestHandler => (req, res, next) => {
  handler(req, res).catch(next);
};

// Error handling middleware
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  const status = err instanceof HttpError ? err.status : 500;

  if (status >= 500) {
    console.error('Server Error:', err);
  }

  res.status(status).json({
    error: err.message,
    ...(status >= 500 && config.env !== 'production' ? { stack: err.stack } : {})
  });
};

// Request logger middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
};

// API key validation middleware
export const apiKeyValidator = (req: Request, res: Response, next: NextFunction): void => {
  // Skip validation if API_KEY_REQUIRED is not set to true
  if (!config.apiKeyRequired) {
    return next();
  }

  const apiKey = req.headers['x-api-key'];

  // Validate the API key
  if (!config.apiKey || apiKey !== config.apiKey) {
    res.status(401).json({ error: 'Invalid or missing API key' });
    return;
  }

  next();
};
