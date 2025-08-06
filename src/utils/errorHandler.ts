/**
 * Error Handler Utilities
 * Centralized error handling helpers
 */

import { LoggingService } from '../services/logging/loggingService';

const loggingService = LoggingService.getInstance();

/**
 * Wrap async functions with error logging
 */
export function withErrorLogging<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: { module: string; method: string }
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      await loggingService.logError(
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      throw error;
    }
  };
}

/**
 * Wrap sync functions with error logging
 */
export function withSyncErrorLogging<T extends any[], R>(
  fn: (...args: T) => R,
  context: { module: string; method: string }
): (...args: T) => R {
  return (...args: T): R => {
    try {
      return fn(...args);
    } catch (error) {
      loggingService.logError(
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      throw error;
    }
  };
}

/**
 * Handle API errors specifically
 */
export async function handleApiError(
  error: any,
  endpoint: string,
  requestData?: any
): Promise<void> {
  const statusCode = error.response?.status || 0;
  const errorMessage = error.response?.data?.message || error.message || 'Unknown API error';
  
  await loggingService.logApiError(
    endpoint,
    statusCode,
    errorMessage,
    requestData,
    error.response?.data
  );
}

/**
 * Handle validation errors
 */
export async function handleValidationError(
  fieldName: string,
  value: any,
  validationRule: string,
  errorMessage: string
): Promise<void> {
  await loggingService.logValidationError(
    fieldName,
    value,
    validationRule,
    errorMessage
  );
}

/**
 * Handle performance issues
 */
export async function handlePerformanceIssue(
  operation: string,
  duration: number,
  threshold: number = 2000,
  context?: Record<string, any>
): Promise<void> {
  if (duration > threshold) {
    await loggingService.logPerformanceIssue(
      operation,
      duration,
      threshold,
      context
    );
  }
}

/**
 * Safe async execution with error handling
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback: T,
  context?: { module: string; method: string }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (context) {
      await loggingService.logError(
        error instanceof Error ? error : new Error(String(error)),
        context
      );
    }
    return fallback;
  }
}

/**
 * Safe sync execution with error handling
 */
export function safeSync<T>(
  operation: () => T,
  fallback: T,
  context?: { module: string; method: string }
): T {
  try {
    return operation();
  } catch (error) {
    if (context) {
      loggingService.logError(
        error instanceof Error ? error : new Error(String(error)),
        context
      );
    }
    return fallback;
  }
}