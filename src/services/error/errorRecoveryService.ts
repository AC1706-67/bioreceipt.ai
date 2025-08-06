/**
 * Error Recovery Service
 * Provides intelligent error recovery strategies for substance operations
 * Implements automatic recovery, user guidance, and fallback mechanisms
 */

import { SubstanceError, SubstanceErrorType, SubstanceErrorHandler } from './substanceErrorHandler';
import { withRetry, RetryOptions } from '../../utils/retryMechanism';
import { NewSubstance } from '../../models/NewSubstance';

export interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  automatic: boolean;
  execute: () => Promise<RecoveryResult>;
  canApply: (error: SubstanceError) => boolean;
  priority: number; // Higher number = higher priority
}

export interface RecoveryResult {
  success: boolean;
  message: string;
  data?: any;
  nextStrategy?: string;
  requiresUserAction?: boolean;
  userActionDescription?: string;
}

export interface RecoveryContext {
  operation: 'add_substance' | 'validate_substance' | 'check_duplicate';
  data: any;
  attemptCount: number;
  previousErrors: SubstanceError[];
  userPreferences?: {
    autoRetry: boolean;
    maxRetries: number;
    preferredRecoveryMethod: string;
  };
}

export class ErrorRecoveryService {
  private strategies: Map<string, RecoveryStrategy> = new Map();
  private recoveryHistory: Map<string, RecoveryResult[]> = new Map();

  constructor() {
    this.initializeStrategies();
  }

  private initializeStrategies() {
    // Network Error Recovery
    this.registerStrategy({
      id: 'network_retry',
      name: 'Network Retry',
      description: 'Retry operation with exponential backoff',
      automatic: true,
      priority: 10,
      canApply: (error) => error.type === SubstanceErrorType.NETWORK_ERROR,
      execute: async () => {
        // This will be implemented by the calling code with specific retry logic
        return {
          success: false,
          message: 'Network retry strategy requires specific implementation',
          requiresUserAction: true,
          userActionDescription: 'Please retry the operation manually'
        };
      }
    });

    // Duplicate Name Recovery
    this.registerStrategy({
      id: 'duplicate_name_suggestion',
      name: 'Name Suggestion',
      description: 'Suggest alternative names for duplicate substances',
      automatic: false,
      priority: 8,
      canApply: (error) => error.type === SubstanceErrorType.DUPLICATE_NAME,
      execute: async () => {
        return {
          success: false,
          message: 'Please choose a different name for your substance',
          requiresUserAction: true,
          userActionDescription: 'Modify the substance name to make it unique'
        };
      }
    });

    // Validation Error Recovery
    this.registerStrategy({
      id: 'validation_guidance',
      name: 'Validation Guidance',
      description: 'Provide specific guidance for validation errors',
      automatic: false,
      priority: 9,
      canApply: (error) => error.type === SubstanceErrorType.VALIDATION_ERROR,
      execute: async () => {
        return {
          success: false,
          message: 'Please correct the highlighted fields',
          requiresUserAction: true,
          userActionDescription: 'Fix validation errors and try again'
        };
      }
    });

    // Rate Limit Recovery
    this.registerStrategy({
      id: 'rate_limit_backoff',
      name: 'Rate Limit Backoff',
      description: 'Wait for rate limit to reset',
      automatic: true,
      priority: 7,
      canApply: (error) => error.type === SubstanceErrorType.RATE_LIMITED,
      execute: async () => {
        // Wait for rate limit to reset (typically 60 seconds)
        await new Promise(resolve => setTimeout(resolve, 60000));
        return {
          success: true,
          message: 'Rate limit has been reset, you can try again now'
        };
      }
    });

    // Server Error Recovery
    this.registerStrategy({
      id: 'server_error_retry',
      name: 'Server Error Retry',
      description: 'Retry after server error with increasing delays',
      automatic: true,
      priority: 6,
      canApply: (error) => error.type === SubstanceErrorType.SERVER_ERROR,
      execute: async () => {
        return {
          success: false,
          message: 'Server error detected, will retry automatically',
          requiresUserAction: false
        };
      }
    });

    // Permission Recovery
    this.registerStrategy({
      id: 'permission_refresh',
      name: 'Permission Refresh',
      description: 'Refresh authentication and retry',
      automatic: true,
      priority: 5,
      canApply: (error) => error.type === SubstanceErrorType.PERMISSION_DENIED,
      execute: async () => {
        return {
          success: false,
          message: 'Authentication issue detected',
          requiresUserAction: true,
          userActionDescription: 'Please log out and log back in'
        };
      }
    });

    // Timeout Recovery
    this.registerStrategy({
      id: 'timeout_retry',
      name: 'Timeout Retry',
      description: 'Retry with longer timeout',
      automatic: true,
      priority: 4,
      canApply: (error) => error.type === SubstanceErrorType.TIMEOUT,
      execute: async () => {
        return {
          success: false,
          message: 'Operation timed out, will retry with longer timeout',
          requiresUserAction: false
        };
      }
    });
  }

  registerStrategy(strategy: RecoveryStrategy) {
    this.strategies.set(strategy.id, strategy);
  }

  async recoverFromError(
    error: SubstanceError,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    // Find applicable strategies
    const applicableStrategies = Array.from(this.strategies.values())
      .filter(strategy => strategy.canApply(error))
      .sort((a, b) => b.priority - a.priority);

    if (applicableStrategies.length === 0) {
      return {
        success: false,
        message: 'No recovery strategy available for this error',
        requiresUserAction: true,
        userActionDescription: 'Please try again or contact support'
      };
    }

    // Try automatic strategies first
    const automaticStrategies = applicableStrategies.filter(s => s.automatic);
    
    for (const strategy of automaticStrategies) {
      try {
        const result = await strategy.execute();
        this.recordRecoveryAttempt(strategy.id, result);
        
        if (result.success) {
          return result;
        }
      } catch (recoveryError) {
        console.error(`Recovery strategy ${strategy.id} failed:`, recoveryError);
      }
    }

    // If automatic strategies failed, suggest manual strategies
    const manualStrategies = applicableStrategies.filter(s => !s.automatic);
    
    if (manualStrategies.length > 0) {
      const bestManualStrategy = manualStrategies[0];
      const result = await bestManualStrategy.execute();
      this.recordRecoveryAttempt(bestManualStrategy.id, result);
      return result;
    }

    return {
      success: false,
      message: 'All recovery strategies have been exhausted',
      requiresUserAction: true,
      userActionDescription: 'Please contact support for assistance'
    };
  }

  async createSmartRetryStrategy(
    error: SubstanceError,
    operation: () => Promise<any>,
    context: RecoveryContext
  ): Promise<RecoveryResult> {
    const retryOptions: RetryOptions = {
      maxAttempts: this.getMaxRetries(error, context),
      delay: this.getInitialDelay(error),
      retryCondition: (err) => this.shouldRetry(err, context),
      onRetry: (attempt, err) => {
        console.log(`Recovery retry attempt ${attempt} for ${error.type}:`, err.message);
      }
    };

    try {
      const result = await withRetry(operation, retryOptions);
      return {
        success: true,
        message: 'Operation succeeded after retry',
        data: result
      };
    } catch (finalError) {
      return {
        success: false,
        message: `Operation failed after ${retryOptions.maxAttempts} attempts`,
        requiresUserAction: true,
        userActionDescription: this.getFailureGuidance(error)
      };
    }
  }

  private getMaxRetries(error: SubstanceError, context: RecoveryContext): number {
    const baseRetries = {
      [SubstanceErrorType.NETWORK_ERROR]: 3,
      [SubstanceErrorType.SERVER_ERROR]: 2,
      [SubstanceErrorType.TIMEOUT]: 2,
      [SubstanceErrorType.RATE_LIMITED]: 1,
      [SubstanceErrorType.DUPLICATE_NAME]: 0,
      [SubstanceErrorType.VALIDATION_ERROR]: 0,
      [SubstanceErrorType.PERMISSION_DENIED]: 1,
      [SubstanceErrorType.UNKNOWN_ERROR]: 1
    };

    const base = baseRetries[error.type] || 1;
    const userPreference = context.userPreferences?.maxRetries || base;
    
    return Math.min(base, userPreference);
  }

  private getInitialDelay(error: SubstanceError): number {
    const delays = {
      [SubstanceErrorType.NETWORK_ERROR]: 1000,
      [SubstanceErrorType.SERVER_ERROR]: 2000,
      [SubstanceErrorType.TIMEOUT]: 3000,
      [SubstanceErrorType.RATE_LIMITED]: 60000,
      [SubstanceErrorType.PERMISSION_DENIED]: 5000,
      [SubstanceErrorType.UNKNOWN_ERROR]: 2000
    };

    return delays[error.type] || 1000;
  }

  private shouldRetry(error: any, context: RecoveryContext): boolean {
    const classifiedError = SubstanceErrorHandler.classifyError(error);
    
    // Don't retry validation or duplicate errors
    if ([
      SubstanceErrorType.VALIDATION_ERROR,
      SubstanceErrorType.DUPLICATE_NAME
    ].includes(classifiedError.type)) {
      return false;
    }

    // Limit retries based on attempt count
    if (context.attemptCount >= 5) {
      return false;
    }

    return SubstanceErrorHandler.isRetryable(classifiedError);
  }

  private getFailureGuidance(error: SubstanceError): string {
    const guidance = {
      [SubstanceErrorType.NETWORK_ERROR]: 'Check your internet connection and try again',
      [SubstanceErrorType.SERVER_ERROR]: 'Our servers are experiencing issues. Please try again later',
      [SubstanceErrorType.TIMEOUT]: 'The operation is taking too long. Try with a better connection',
      [SubstanceErrorType.RATE_LIMITED]: 'You\'re making requests too quickly. Please wait and try again',
      [SubstanceErrorType.DUPLICATE_NAME]: 'Choose a different name for your substance',
      [SubstanceErrorType.VALIDATION_ERROR]: 'Please correct the form errors and try again',
      [SubstanceErrorType.PERMISSION_DENIED]: 'Please log out and log back in',
      [SubstanceErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred. Please contact support'
    };

    return guidance[error.type] || 'Please try again or contact support';
  }

  private recordRecoveryAttempt(strategyId: string, result: RecoveryResult) {
    if (!this.recoveryHistory.has(strategyId)) {
      this.recoveryHistory.set(strategyId, []);
    }
    
    const history = this.recoveryHistory.get(strategyId)!;
    history.push({
      ...result,
      timestamp: new Date().toISOString()
    } as any);
    
    // Keep only last 10 attempts
    if (history.length > 10) {
      history.shift();
    }
  }

  getRecoveryStats(): Record<string, { attempts: number; successRate: number }> {
    const stats: Record<string, { attempts: number; successRate: number }> = {};
    
    for (const [strategyId, history] of this.recoveryHistory.entries()) {
      const attempts = history.length;
      const successes = history.filter(r => r.success).length;
      const successRate = attempts > 0 ? successes / attempts : 0;
      
      stats[strategyId] = { attempts, successRate };
    }
    
    return stats;
  }

  clearHistory() {
    this.recoveryHistory.clear();
  }
}

// Singleton instance
export const errorRecoveryService = new ErrorRecoveryService();

export default errorRecoveryService;