/**
 * Retry Mechanism Utility
 * Provides intelligent retry logic for failed operations
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attemptNumber: number, error: any) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryCondition: () => true,
};

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await operation();
      return {
        success: true,
        data: result,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      const shouldRetry = attempt < config.maxAttempts && 
                         (config.retryCondition ? config.retryCondition(error) : true);
      
      if (!shouldRetry) {
        break;
      }
      
      // Call retry callback if provided
      if (config.onRetry) {
        config.onRetry(attempt, error);
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return {
    success: false,
    error: lastError,
    attempts: config.maxAttempts,
  };
}

/**
 * Create a retry-enabled version of a function
 */
export function createRetryableFunction<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: Partial<RetryOptions> = {}
) {
  return async (...args: T): Promise<RetryResult<R>> => {
    return withRetry(() => fn(...args), options);
  };
}

/**
 * Retry condition for network errors
 */
export const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  
  return !!(
    error.name === 'NetworkError' ||
    error.code === 'NETWORK_ERROR' ||
    error.code === 'TIMEOUT' ||
    (error.status && [408, 429, 500, 502, 503, 504].includes(error.status))
  );
};

/**
 * Retry condition for temporary errors
 */
export const isTemporaryError = (error: any): boolean => {
  if (!error) return false;
  
  const temporaryErrorCodes = [
    'NETWORK_ERROR',
    'TIMEOUT',
    'RATE_LIMITED',
    'SERVER_ERROR',
  ];
  
  return !!(temporaryErrorCodes.includes(error.code) || isNetworkError(error));
};

/**
 * Create retry options for substance operations
 */
export const createSubstanceRetryOptions = (
  onRetry?: (attemptNumber: number, error: any) => void
): RetryOptions => ({
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: isTemporaryError,
  onRetry,
});