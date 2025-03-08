import { Request, Response, NextFunction } from 'express';

// Error handling middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('Server Error:', err);
  
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
};

// Request logger middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
};

// API key validation middleware
export const apiKeyValidator = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  
  // Skip validation if API_KEY_REQUIRED is not set to true
  if (process.env.API_KEY_REQUIRED !== 'true') {
    return next();
  }
  
  // Validate the API key
  if (!apiKey || apiKey !== process.env.API_KEY) {
    res.status(401).json({ message: 'Invalid or missing API key' });
    return;
  }
  
  next();
};