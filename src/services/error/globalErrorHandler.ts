/**
 * Global Error Handler
 * Centralized error handling for the entire application
 */

import { errorClassificationService, ErrorContext } from './errorClassificationService';
import { loggingService } from '../logging/loggingService';
import { analyticsService } from '../analytics/analyticsService';

export interface GlobalErrorHandlerConfig {
  enableAutoRecovery: boolean;
  enableUserNotification: boolean;
  enableAnalyticsTracking: boolean;
  maxConcurrentErrors: number;
  errorThrottleMs: number;
}

class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private config: GlobalErrorHandlerConfig;
  private errorThrottleMap: Map<string, number> = new Map();
  private activeErrorCount: number = 0;

  private constructor() {
    this.config = {
      enableAutoRecovery: true,
      enableUserNotification: true,
      enableAnalyticsTracking: true,
      maxConcurrentErrors: 10,
      errorThrottleMs: 5000 // 5 seconds
    };

    this.setupGlobalErrorHandlers();
  }

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  /**
   * Handle any error with context
   */
  async handleError(
    error: Error,
    context: ErrorContext,
    userId?: string
  ): Promise<void> {
    try {
      // Check if we should throttle this error
      if (this.shouldThrottleError(error)) {
        return;
      }

      // Check if we've exceeded max concurrent errors
      if (this.activeErrorCount >= this.config.maxConcurrentErrors) {
        console.warn('Max concurrent errors reached, dropping error:', error.message);
        return;
      }

      this.activeErrorCount++;

      // Classify and handle the error
      const classifiedError = await errorClassificationService.classifyAndHandle(
        error,
        context,
        userId
      );

      // Log additional context
      await this.logErrorContext(classifiedError, context);

      // Track in analytics if enabled
      if (this.config.enableAnalyticsTracking) {
        await this.trackErrorAnalytics(classifiedError);
      }

      // Update throttle map
      this.updateErrorThrottle(error);

    } catch (handlingError) {
      console.error('Error in global error handler:', handlingError);
      
      // Fallback logging
      await loggingService.logError(error, {
        ...context,
        globalHandlerError: handlingError.message
      });
    } finally {
      this.activeErrorCount--;
    }
  }

  /**
   * Handle API errors specifically
   */
  async handleApiError(
    error: Error,
    endpoint: string,
    method: string,
    statusCode?: number,
    requestData?: any,
    responseData?: any,
    userId?: string
  ): Promise<void> {
    const context: ErrorContext = {
      module: 'api',
      method: `${method} ${endpoint}`,
      statusCode,
      requestData: this.sanitizeData(requestData),
      responseData: this.sanitizeData(responseData),
      endpoint,
      httpMethod: method
    };

    await this.handleError(error, context, userId);
  }

  /**
   * Handle component errors
   */
  async handleComponentError(
    error: Error,
    componentName: string,
    props?: Record<string, any>,
    state?: Record<string, any>,
    userId?: string
  ): Promise<void> {
    const context: ErrorContext = {
      module: 'component',
      component: componentName,
      props: this.sanitizeData(props),
      state: this.sanitizeData(state)
    };

    await this.handleError(error, context, userId);
  }

  /**
   * Handle async operation errors
   */
  async handleAsyncError(
    error: Error,
    operation: string,
    operationData?: any,
    userId?: string
  ): Promise<void> {
    const context: ErrorContext = {
      module: 'async',
      method: operation,
      operationData: this.sanitizeData(operationData)
    };

    await this.handleError(error, context, userId);
  }

  /**
   * Handle validation errors
   */
  async handleValidationError(
    error: Error,
    fieldName: string,
    fieldValue: any,
    validationRule: string,
    userId?: string
  ): Promise<void> {
    const context: ErrorContext = {
      module: 'validation',
      fieldName,
      fieldValue: this.sanitizeData(fieldValue),
      validationRule
    };

    await this.handleError(error, context, userId);
  }

  /**
   * Handle network errors
   */
  async handleNetworkError(
    error: Error,
    url?: string,
    method?: string,
    networkInfo?: any,
    userId?: string
  ): Promise<void> {
    const context: ErrorContext = {
      module: 'network',
      url,
      method,
      networkInfo: this.sanitizeData(networkInfo)
    };

    await this.handleError(error, context, userId);
  }

  /**
   * Handle storage errors
   */
  async handleStorageError(
    error: Error,
    operation: string,
    key?: string,
    data?: any,
    userId?: string
  ): Promise<void> {
    const context: ErrorContext = {
      module: 'storage',
      method: operation,
      storageKey: key,
      data: this.sanitizeData(data)
    };

    await this.handleError(error, context, userId);
  }

  /**
   * Handle performance errors
   */
  async handlePerformanceError(
    error: Error,
    operation: string,
    duration: number,
    threshold: number,
    userId?: string
  ): Promise<void> {
    const context: ErrorContext = {
      module: 'performance',
      method: operation,
      duration,
      threshold,
      performanceImpact: duration > threshold * 2 ? 'high' : 'medium'
    };

    await this.handleError(error, context, userId);
  }

  /**
   * Create error boundary wrapper
   */
  createErrorBoundary(componentName: string, userId?: string) {
    return {
      onError: (error: Error, errorInfo: React.ErrorInfo) => {
        this.handleComponentError(
          error,
          componentName,
          undefined,
          undefined,
          userId
        );
      }
    };
  }

  /**
   * Create async error wrapper
   */
  wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    operationName: string,
    userId?: string
  ): T {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        await this.handleAsyncError(
          error as Error,
          operationName,
          { args: this.sanitizeData(args) },
          userId
        );
        throw error; // Re-throw to maintain original behavior
      }
    }) as T;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<GlobalErrorHandlerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): GlobalErrorHandlerConfig {
    return { ...this.config };
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    activeErrors: number;
    throttledErrors: number;
    totalHandled: number;
  } {
    return {
      activeErrors: this.activeErrorCount,
      throttledErrors: this.errorThrottleMap.size,
      totalHandled: 0 // Would track this in a real implementation
    };
  }

  /**
   * Clear error throttle cache
   */
  clearThrottleCache(): void {
    this.errorThrottleMap.clear();
  }

  // Private methods

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error 
          ? event.reason 
          : new Error(String(event.reason));
        
        this.handleError(error, {
          module: 'unhandled_promise',
          method: 'unhandledrejection',
          promise: event.promise
        });
      });

      // Handle global JavaScript errors
      window.addEventListener('error', (event) => {
        const error = event.error || new Error(event.message);
        
        this.handleError(error, {
          module: 'global_js',
          method: 'window.onerror',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });
    }

    // React Native specific error handlers
    if (typeof global !== 'undefined' && global.ErrorUtils) {
      const originalHandler = global.ErrorUtils.getGlobalHandler();
      
      global.ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
        this.handleError(error, {
          module: 'react_native',
          method: 'ErrorUtils',
          isFatal
        });

        // Call original handler
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }
  }

  private shouldThrottleError(error: Error): boolean {
    const errorKey = this.getErrorKey(error);
    const lastOccurrence = this.errorThrottleMap.get(errorKey);
    const now = Date.now();

    if (lastOccurrence && (now - lastOccurrence) < this.config.errorThrottleMs) {
      return true;
    }

    return false;
  }

  private updateErrorThrottle(error: Error): void {
    const errorKey = this.getErrorKey(error);
    this.errorThrottleMap.set(errorKey, Date.now());

    // Clean up old entries
    const cutoff = Date.now() - this.config.errorThrottleMs * 2;
    for (const [key, timestamp] of this.errorThrottleMap.entries()) {
      if (timestamp < cutoff) {
        this.errorThrottleMap.delete(key);
      }
    }
  }

  private getErrorKey(error: Error): string {
    // Create a unique key for the error based on message and stack
    const message = error.message || 'unknown';
    const stack = error.stack || '';
    const stackLines = stack.split('\n').slice(0, 3).join('|');
    return `${message}:${stackLines}`;
  }

  private async logErrorContext(classifiedError: any, context: ErrorContext): Promise<void> {
    await loggingService.logInfo('Error context captured', {
      errorId: classifiedError.id,
      errorCode: classifiedError.errorCode.code,
      context: this.sanitizeData(context),
      timestamp: new Date().toISOString()
    });
  }

  private async trackErrorAnalytics(classifiedError: any): Promise<void> {
    await analyticsService.trackEvent('error_handled_globally', {
      errorId: classifiedError.id,
      errorCode: classifiedError.errorCode.code,
      category: classifiedError.errorCode.category,
      severity: classifiedError.errorCode.severity,
      module: classifiedError.context.module,
      recoveryStrategy: classifiedError.errorCode.recoveryStrategy,
      userId: classifiedError.userId
    });
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    try {
      // Remove sensitive information
      const sensitiveKeys = [
        'password', 'token', 'secret', 'key', 'auth', 'credential',
        'ssn', 'social', 'credit', 'card', 'cvv', 'pin'
      ];

      const sanitize = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) {
          return obj;
        }

        if (Array.isArray(obj)) {
          return obj.map(sanitize);
        }

        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          const isSensitive = sensitiveKeys.some(sensitive => 
            lowerKey.includes(sensitive)
          );

          if (isSensitive) {
            sanitized[key] = '[REDACTED]';
          } else if (typeof value === 'object') {
            sanitized[key] = sanitize(value);
          } else {
            sanitized[key] = value;
          }
        }
        return sanitized;
      };

      return sanitize(data);
    } catch (sanitizeError) {
      return '[SANITIZATION_ERROR]';
    }
  }
}

export const globalErrorHandler = GlobalErrorHandler.getInstance();