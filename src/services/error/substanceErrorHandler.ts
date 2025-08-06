/**
 * Substance Error Handler
 * Specialized error handling for substance-related operations
 */

import { ValidationErrors } from '../../models/NewSubstance';

export interface SubstanceError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  validationErrors?: ValidationErrors;
}

export type SubstanceErrorCode = 
  | 'NETWORK_ERROR'
  | 'DUPLICATE_NAME'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';

/**
 * User-friendly error messages for common substance operation failures
 */
export const SUBSTANCE_ERROR_MESSAGES: Record<SubstanceErrorCode, {
  title: string;
  message: string;
  retryable: boolean;
  actionText?: string;
}> = {
  NETWORK_ERROR: {
    title: 'Connection Problem',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    retryable: true,
    actionText: 'Retry',
  },
  DUPLICATE_NAME: {
    title: 'Substance Already Exists',
    message: 'A substance with this name already exists in your collection. Please choose a different name.',
    retryable: false,
  },
  VALIDATION_ERROR: {
    title: 'Invalid Information',
    message: 'Please check the information you entered and fix any errors highlighted in red.',
    retryable: false,
  },
  PERMISSION_DENIED: {
    title: 'Access Denied',
    message: 'You don\'t have permission to add substances. Please sign in and try again.',
    retryable: false,
  },
  RATE_LIMITED: {
    title: 'Too Many Requests',
    message: 'You\'re adding substances too quickly. Please wait a moment and try again.',
    retryable: true,
    actionText: 'Try Again',
  },
  SERVER_ERROR: {
    title: 'Server Problem',
    message: 'Something went wrong on our end. Our team has been notified. Please try again in a few minutes.',
    retryable: true,
    actionText: 'Retry',
  },
  TIMEOUT: {
    title: 'Request Timed Out',
    message: 'The request took too long to complete. Please check your connection and try again.',
    retryable: true,
    actionText: 'Retry',
  },
  UNKNOWN_ERROR: {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    retryable: true,
    actionText: 'Retry',
  },
};

/**
 * Enhanced error classification for substance operations
 */
export class SubstanceErrorHandler {
  /**
   * Classify and enhance error information
   */
  static classifyError(error: any): SubstanceError {
    // Network errors
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return this.createError('NETWORK_ERROR', error);
    }

    // Timeout errors
    if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
      return this.createError('TIMEOUT', error);
    }

    // Supabase/PostgreSQL specific errors
    if (error.code) {
      switch (error.code) {
        case '23505': // Unique constraint violation
          return this.createError('DUPLICATE_NAME', error);
        case '42501': // Insufficient privilege
          return this.createError('PERMISSION_DENIED', error);
        case '23514': // Check constraint violation
          return this.createError('VALIDATION_ERROR', error);
        default:
          break;
      }
    }

    // HTTP status codes
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      switch (status) {
        case 400:
          return this.createError('VALIDATION_ERROR', error);
        case 401:
        case 403:
          return this.createError('PERMISSION_DENIED', error);
        case 409:
          return this.createError('DUPLICATE_NAME', error);
        case 429:
          return this.createError('RATE_LIMITED', error);
        case 500:
        case 502:
        case 503:
        case 504:
          return this.createError('SERVER_ERROR', error);
        default:
          break;
      }
    }

    // Validation errors from service
    if (error.validationErrors) {
      return this.createError('VALIDATION_ERROR', error, error.validationErrors);
    }

    // Check error message for common patterns
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('duplicate') || message.includes('already exists')) {
      return this.createError('DUPLICATE_NAME', error);
    }
    
    if (message.includes('network') || message.includes('connection')) {
      return this.createError('NETWORK_ERROR', error);
    }
    
    if (message.includes('timeout')) {
      return this.createError('TIMEOUT', error);
    }
    
    if (message.includes('permission') || message.includes('unauthorized')) {
      return this.createError('PERMISSION_DENIED', error);
    }

    // Default to unknown error
    return this.createError('UNKNOWN_ERROR', error);
  }

  /**
   * Create standardized error object
   */
  private static createError(
    code: SubstanceErrorCode, 
    originalError: any, 
    validationErrors?: ValidationErrors
  ): SubstanceError {
    const errorInfo = SUBSTANCE_ERROR_MESSAGES[code];
    
    return {
      code,
      message: originalError.message || 'Unknown error',
      userMessage: errorInfo.message,
      retryable: errorInfo.retryable,
      validationErrors,
    };
  }

  /**
   * Get user-friendly error message with title
   */
  static getUserMessage(error: SubstanceError): { title: string; message: string; actionText?: string } {
    const errorInfo = SUBSTANCE_ERROR_MESSAGES[error.code as SubstanceErrorCode];
    return {
      title: errorInfo.title,
      message: error.userMessage,
      actionText: errorInfo.actionText,
    };
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: SubstanceError): boolean {
    return error.retryable;
  }

  /**
   * Get retry delay based on error type
   */
  static getRetryDelay(error: SubstanceError, attemptNumber: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds

    switch (error.code) {
      case 'RATE_LIMITED':
        return Math.min(baseDelay * Math.pow(2, attemptNumber) * 2, maxDelay);
      case 'NETWORK_ERROR':
      case 'TIMEOUT':
        return Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
      case 'SERVER_ERROR':
        return Math.min(baseDelay * Math.pow(2, attemptNumber) * 1.5, maxDelay);
      default:
        return Math.min(baseDelay * attemptNumber, maxDelay);
    }
  }

  /**
   * Log error for debugging and monitoring
   */
  static logError(error: SubstanceError, context: string): void {
    console.error(`[SubstanceError] ${context}:`, {
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      retryable: error.retryable,
      validationErrors: error.validationErrors,
      timestamp: new Date().toISOString(),
    });
  }
}