/**
 * Rate Limiting Middleware
 * Express middleware for API rate limiting
 */
import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/api';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum number of requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (in production, use Redis)
const store: RateLimitStore = {};

/**
 * Creates rate limiting middleware
 */
export const rateLimitMiddleware = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Get client identifier (IP address)
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up expired entries
    Object.keys(store).forEach(key => {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    });

    // Get or create client record
    if (!store[clientId]) {
      store[clientId] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    const clientRecord = store[clientId];

    // Reset if window has expired
    if (clientRecord.resetTime < now) {
      clientRecord.count = 0;
      clientRecord.resetTime = now + windowMs;
    }

    // Check if limit exceeded
    if (clientRecord.count >= max) {
      const timeUntilReset = Math.ceil((clientRecord.resetTime - now) / 1000);
      
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          details: {
            limit: max,
            windowMs,
            retryAfter: timeUntilReset,
          },
        },
        timestamp: new Date(),
      } as ApiResponse<null>);
      return;
    }

    // Increment counter
    clientRecord.count++;

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': Math.max(0, max - clientRecord.count).toString(),
      'X-RateLimit-Reset': new Date(clientRecord.resetTime).toISOString(),
    });

    // Handle response counting
    if (!skipSuccessfulRequests || !skipFailedRequests) {
      const originalSend = res.send;
      res.send = function(body) {
        const statusCode = res.statusCode;
        const isSuccess = statusCode >= 200 && statusCode < 400;
        const isFailed = statusCode >= 400;

        // Decrement counter if we should skip this type of request
        if ((skipSuccessfulRequests && isSuccess) || (skipFailedRequests && isFailed)) {
          clientRecord.count = Math.max(0, clientRecord.count - 1);
        }

        return originalSend.call(this, body);
      };
    }

    next();
  };
};

/**
 * Creates a more lenient rate limiter for authenticated users
 */
export const authenticatedRateLimitMiddleware = (options: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Use user ID if authenticated, otherwise fall back to IP
    const clientId = req.user?.id || req.ip || req.connection.remoteAddress || 'unknown';
    
    // Create a new request object with the user-based identifier
    const modifiedReq = { ...req, ip: clientId };
    
    return rateLimitMiddleware(options)(modifiedReq as Request, res, next);
  };
};

/**
 * Clears rate limit data for a specific client (useful for testing)
 */
export const clearRateLimit = (clientId: string): void => {
  delete store[clientId];
};

/**
 * Gets current rate limit status for a client
 */
export const getRateLimitStatus = (clientId: string): { count: number; resetTime: number } | null => {
  return store[clientId] || null;
};