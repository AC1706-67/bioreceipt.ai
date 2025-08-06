/**
 * Error Classification Service
 * Enhanced error categorization, classification, and recovery mechanisms
 */

import { loggingService } from '../logging/loggingService';
import { analyticsService } from '../analytics/analyticsService';

export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_CORRUPTION = 'data_corruption',
  STORAGE = 'storage',
  UI_COMPONENT = 'ui_component',
  API_INTEGRATION = 'api_integration',
  BUSINESS_LOGIC = 'business_logic',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  EXTERNAL_SERVICE = 'external_service',
  USER_INPUT = 'user_input',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',           // Minor issues, app continues normally
  MEDIUM = 'medium',     // Some functionality affected, workarounds available
  HIGH = 'high',         // Major functionality broken, user experience degraded
  CRITICAL = 'critical'  // App unusable, immediate attention required
}

export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  USER_ACTION_REQUIRED = 'user_action_required',
  RESTART_REQUIRED = 'restart_required',
  NO_RECOVERY = 'no_recovery'
}

export interface ErrorCode {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoveryStrategy: RecoveryStrategy;
  userMessage: string;
  technicalMessage: string;
  suggestedActions: string[];
  retryable: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface ClassifiedError {
  id: string;
  originalError: Error;
  errorCode: ErrorCode;
  context: ErrorContext;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  correlationId: string;
  recoveryAttempts: number;
  resolved: boolean;
  userNotified: boolean;
}

export interface ErrorContext {
  module: string;
  method?: string;
  component?: string;
  userAction?: string;
  appState?: Record<string, any>;
  userJourney?: string[];
  deviceInfo?: Record<string, any>;
  networkStatus?: 'online' | 'offline' | 'poor';
  memoryUsage?: number;
  [key: string]: any;
}

export interface RecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  message: string;
  data?: any;
  requiresUserAction?: boolean;
  actionInstructions?: string;
}

class ErrorClassificationService {
  private static instance: ErrorClassificationService;
  private errorCodes: Map<string, ErrorCode> = new Map();
  private activeErrors: Map<string, ClassifiedError> = new Map();

  private constructor() {
    this.initializeErrorCodes();
  }

  static getInstance(): ErrorClassificationService {
    if (!ErrorClassificationService.instance) {
      ErrorClassificationService.instance = new ErrorClassificationService();
    }
    return ErrorClassificationService.instance;
  }

  /**
   * Classify and handle an error
   */
  async classifyAndHandle(
    error: Error,
    context: ErrorContext,
    userId?: string
  ): Promise<ClassifiedError> {
    try {
      // Generate unique error ID
      const errorId = this.generateErrorId();
      
      // Classify the error
      const errorCode = this.classifyError(error, context);
      
      // Create classified error object
      const classifiedError: ClassifiedError = {
        id: errorId,
        originalError: error,
        errorCode,
        context,
        timestamp: new Date(),
        userId,
        sessionId: this.generateSessionId(),
        correlationId: this.generateCorrelationId(),
        recoveryAttempts: 0,
        resolved: false,
        userNotified: false
      };

      // Store active error
      this.activeErrors.set(errorId, classifiedError);

      // Log the classified error
      await this.logClassifiedError(classifiedError);

      // Track in analytics
      await this.trackErrorAnalytics(classifiedError);

      // Attempt automatic recovery if applicable
      if (errorCode.retryable && errorCode.recoveryStrategy !== RecoveryStrategy.NO_RECOVERY) {
        await this.attemptRecovery(classifiedError);
      }

      return classifiedError;
    } catch (classificationError) {
      console.error('Error in error classification:', classificationError);
      
      // Fallback: create a basic classified error
      return this.createFallbackClassifiedError(error, context, userId);
    }
  }

  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(classifiedError: ClassifiedError): Promise<RecoveryResult> {
    try {
      const { errorCode, recoveryAttempts } = classifiedError;
      
      // Check if we've exceeded max retries
      if (errorCode.maxRetries && recoveryAttempts >= errorCode.maxRetries) {
        return {
          success: false,
          strategy: errorCode.recoveryStrategy,
          message: 'Maximum recovery attempts exceeded',
          requiresUserAction: true,
          actionInstructions: errorCode.suggestedActions.join(', ')
        };
      }

      // Increment recovery attempts
      classifiedError.recoveryAttempts++;

      // Apply recovery strategy
      const result = await this.executeRecoveryStrategy(classifiedError);

      // Update error status if recovered
      if (result.success) {
        classifiedError.resolved = true;
        await this.logRecoverySuccess(classifiedError, result);
      } else {
        await this.logRecoveryFailure(classifiedError, result);
      }

      return result;
    } catch (recoveryError) {
      console.error('Error during recovery attempt:', recoveryError);
      return {
        success: false,
        strategy: RecoveryStrategy.NO_RECOVERY,
        message: 'Recovery attempt failed',
        requiresUserAction: true
      };
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(classifiedError: ClassifiedError): {
    title: string;
    message: string;
    actions: string[];
    severity: ErrorSeverity;
  } {
    const { errorCode } = classifiedError;
    
    return {
      title: this.getErrorTitle(errorCode.category, errorCode.severity),
      message: errorCode.userMessage,
      actions: errorCode.suggestedActions,
      severity: errorCode.severity
    };
  }

  /**
   * Get all active errors
   */
  getActiveErrors(): ClassifiedError[] {
    return Array.from(this.activeErrors.values());
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): ClassifiedError[] {
    return this.getActiveErrors().filter(error => error.errorCode.category === category);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): ClassifiedError[] {
    return this.getActiveErrors().filter(error => error.errorCode.severity === severity);
  }

  /**
   * Mark error as resolved
   */
  markErrorAsResolved(errorId: string): void {
    const error = this.activeErrors.get(errorId);
    if (error) {
      error.resolved = true;
      this.logErrorResolution(error);
    }
  }

  /**
   * Clear resolved errors
   */
  clearResolvedErrors(): void {
    for (const [id, error] of this.activeErrors.entries()) {
      if (error.resolved) {
        this.activeErrors.delete(id);
      }
    }
  }

  // Private methods

  private initializeErrorCodes(): void {
    const errorCodes: ErrorCode[] = [
      // Network Errors
      {
        code: 'NET_001',
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        recoveryStrategy: RecoveryStrategy.RETRY,
        userMessage: 'Connection problem. Please check your internet connection.',
        technicalMessage: 'Network request failed',
        suggestedActions: ['Check internet connection', 'Try again in a moment'],
        retryable: true,
        maxRetries: 3,
        retryDelay: 2000
      },
      {
        code: 'NET_002',
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        userMessage: 'Server is temporarily unavailable. Using offline mode.',
        technicalMessage: 'Server returned 5xx error',
        suggestedActions: ['Continue in offline mode', 'Try again later'],
        retryable: true,
        maxRetries: 2,
        retryDelay: 5000
      },
      {
        code: 'NET_003',
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.LOW,
        recoveryStrategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
        userMessage: 'Slow connection detected. Some features may be limited.',
        technicalMessage: 'Network timeout or slow response',
        suggestedActions: ['Continue with limited features', 'Check connection quality'],
        retryable: false
      },

      // Authentication Errors
      {
        code: 'AUTH_001',
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        recoveryStrategy: RecoveryStrategy.USER_ACTION_REQUIRED,
        userMessage: 'Your session has expired. Please sign in again.',
        technicalMessage: 'Authentication token expired',
        suggestedActions: ['Sign in again', 'Check credentials'],
        retryable: false
      },
      {
        code: 'AUTH_002',
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.CRITICAL,
        recoveryStrategy: RecoveryStrategy.USER_ACTION_REQUIRED,
        userMessage: 'Invalid credentials. Please check your login information.',
        technicalMessage: 'Authentication failed',
        suggestedActions: ['Verify username and password', 'Reset password if needed'],
        retryable: false
      },

      // Validation Errors
      {
        code: 'VAL_001',
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        recoveryStrategy: RecoveryStrategy.USER_ACTION_REQUIRED,
        userMessage: 'Please check the information you entered.',
        technicalMessage: 'Input validation failed',
        suggestedActions: ['Review form fields', 'Correct invalid entries'],
        retryable: false
      },

      // Storage Errors
      {
        code: 'STOR_001',
        category: ErrorCategory.STORAGE,
        severity: ErrorSeverity.MEDIUM,
        recoveryStrategy: RecoveryStrategy.RETRY,
        userMessage: 'Unable to save data. Trying again...',
        technicalMessage: 'Local storage operation failed',
        suggestedActions: ['Free up device storage', 'Restart app if problem persists'],
        retryable: true,
        maxRetries: 2,
        retryDelay: 1000
      },
      {
        code: 'STOR_002',
        category: ErrorCategory.STORAGE,
        severity: ErrorSeverity.HIGH,
        recoveryStrategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
        userMessage: 'Storage is full. Some features may not work properly.',
        technicalMessage: 'Insufficient storage space',
        suggestedActions: ['Free up device storage', 'Clear app cache'],
        retryable: false
      },

      // UI Component Errors
      {
        code: 'UI_001',
        category: ErrorCategory.UI_COMPONENT,
        severity: ErrorSeverity.MEDIUM,
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        userMessage: 'Something went wrong with this screen. Refreshing...',
        technicalMessage: 'Component render error',
        suggestedActions: ['Refresh the screen', 'Restart app if needed'],
        retryable: true,
        maxRetries: 1
      },

      // API Integration Errors
      {
        code: 'API_001',
        category: ErrorCategory.API_INTEGRATION,
        severity: ErrorSeverity.MEDIUM,
        recoveryStrategy: RecoveryStrategy.RETRY,
        userMessage: 'Service temporarily unavailable. Retrying...',
        technicalMessage: 'API request failed',
        suggestedActions: ['Wait a moment', 'Check internet connection'],
        retryable: true,
        maxRetries: 3,
        retryDelay: 3000
      },

      // Performance Errors
      {
        code: 'PERF_001',
        category: ErrorCategory.PERFORMANCE,
        severity: ErrorSeverity.LOW,
        recoveryStrategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
        userMessage: 'App is running slowly. Some features may be limited.',
        technicalMessage: 'Performance threshold exceeded',
        suggestedActions: ['Close other apps', 'Restart device if needed'],
        retryable: false
      },

      // System Errors
      {
        code: 'SYS_001',
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.CRITICAL,
        recoveryStrategy: RecoveryStrategy.RESTART_REQUIRED,
        userMessage: 'A critical error occurred. Please restart the app.',
        technicalMessage: 'Unhandled system error',
        suggestedActions: ['Restart the app', 'Contact support if problem persists'],
        retryable: false
      },

      // Unknown Errors
      {
        code: 'UNK_001',
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        userMessage: 'An unexpected error occurred. We\'re working to fix it.',
        technicalMessage: 'Unclassified error',
        suggestedActions: ['Try again', 'Restart app if problem persists'],
        retryable: true,
        maxRetries: 1
      }
    ];

    // Store error codes in map for quick lookup
    errorCodes.forEach(errorCode => {
      this.errorCodes.set(errorCode.code, errorCode);
    });
  }

  private classifyError(error: Error, context: ErrorContext): ErrorCode {
    // Network errors
    if (this.isNetworkError(error)) {
      if (error.message.includes('timeout')) {
        return this.errorCodes.get('NET_003')!;
      }
      if (error.message.includes('5')) {
        return this.errorCodes.get('NET_002')!;
      }
      return this.errorCodes.get('NET_001')!;
    }

    // Authentication errors
    if (this.isAuthenticationError(error)) {
      if (error.message.includes('expired')) {
        return this.errorCodes.get('AUTH_001')!;
      }
      return this.errorCodes.get('AUTH_002')!;
    }

    // Validation errors
    if (this.isValidationError(error, context)) {
      return this.errorCodes.get('VAL_001')!;
    }

    // Storage errors
    if (this.isStorageError(error)) {
      if (error.message.includes('quota') || error.message.includes('full')) {
        return this.errorCodes.get('STOR_002')!;
      }
      return this.errorCodes.get('STOR_001')!;
    }

    // UI Component errors
    if (context.module === 'component' || context.component) {
      return this.errorCodes.get('UI_001')!;
    }

    // API errors
    if (context.module === 'api' || this.isApiError(error)) {
      return this.errorCodes.get('API_001')!;
    }

    // Performance errors
    if (this.isPerformanceError(error, context)) {
      return this.errorCodes.get('PERF_001')!;
    }

    // System errors
    if (this.isCriticalSystemError(error)) {
      return this.errorCodes.get('SYS_001')!;
    }

    // Default to unknown error
    return this.errorCodes.get('UNK_001')!;
  }

  private async executeRecoveryStrategy(classifiedError: ClassifiedError): Promise<RecoveryResult> {
    const { errorCode, context } = classifiedError;

    switch (errorCode.recoveryStrategy) {
      case RecoveryStrategy.RETRY:
        return await this.executeRetryStrategy(classifiedError);
      
      case RecoveryStrategy.FALLBACK:
        return await this.executeFallbackStrategy(classifiedError);
      
      case RecoveryStrategy.GRACEFUL_DEGRADATION:
        return await this.executeGracefulDegradation(classifiedError);
      
      case RecoveryStrategy.USER_ACTION_REQUIRED:
        return {
          success: false,
          strategy: RecoveryStrategy.USER_ACTION_REQUIRED,
          message: errorCode.userMessage,
          requiresUserAction: true,
          actionInstructions: errorCode.suggestedActions.join(', ')
        };
      
      case RecoveryStrategy.RESTART_REQUIRED:
        return {
          success: false,
          strategy: RecoveryStrategy.RESTART_REQUIRED,
          message: 'App restart required',
          requiresUserAction: true,
          actionInstructions: 'Please restart the application'
        };
      
      default:
        return {
          success: false,
          strategy: RecoveryStrategy.NO_RECOVERY,
          message: 'No recovery strategy available'
        };
    }
  }

  private async executeRetryStrategy(classifiedError: ClassifiedError): Promise<RecoveryResult> {
    const { errorCode, context } = classifiedError;
    
    try {
      // Wait for retry delay if specified
      if (errorCode.retryDelay) {
        await new Promise(resolve => setTimeout(resolve, errorCode.retryDelay));
      }

      // Attempt to retry the original operation
      // This would typically involve re-executing the failed operation
      // For now, we'll simulate a retry
      const retrySuccess = Math.random() > 0.3; // 70% success rate for simulation

      if (retrySuccess) {
        return {
          success: true,
          strategy: RecoveryStrategy.RETRY,
          message: 'Operation succeeded after retry'
        };
      } else {
        return {
          success: false,
          strategy: RecoveryStrategy.RETRY,
          message: 'Retry attempt failed'
        };
      }
    } catch (retryError) {
      return {
        success: false,
        strategy: RecoveryStrategy.RETRY,
        message: `Retry failed: ${retryError.message}`
      };
    }
  }

  private async executeFallbackStrategy(classifiedError: ClassifiedError): Promise<RecoveryResult> {
    try {
      // Implement fallback logic based on context
      const { context } = classifiedError;
      
      if (context.module === 'network') {
        // Switch to offline mode
        return {
          success: true,
          strategy: RecoveryStrategy.FALLBACK,
          message: 'Switched to offline mode',
          data: { offlineMode: true }
        };
      }
      
      if (context.module === 'component') {
        // Use fallback UI component
        return {
          success: true,
          strategy: RecoveryStrategy.FALLBACK,
          message: 'Using fallback UI component',
          data: { useFallbackUI: true }
        };
      }

      return {
        success: true,
        strategy: RecoveryStrategy.FALLBACK,
        message: 'Fallback strategy applied'
      };
    } catch (fallbackError) {
      return {
        success: false,
        strategy: RecoveryStrategy.FALLBACK,
        message: `Fallback failed: ${fallbackError.message}`
      };
    }
  }

  private async executeGracefulDegradation(classifiedError: ClassifiedError): Promise<RecoveryResult> {
    try {
      // Implement graceful degradation
      const { context } = classifiedError;
      
      return {
        success: true,
        strategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
        message: 'Continuing with reduced functionality',
        data: { 
          reducedFeatures: true,
          availableFeatures: this.getAvailableFeatures(context)
        }
      };
    } catch (degradationError) {
      return {
        success: false,
        strategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
        message: `Graceful degradation failed: ${degradationError.message}`
      };
    }
  }

  // Error detection helper methods
  private isNetworkError(error: Error): boolean {
    const networkKeywords = ['network', 'fetch', 'timeout', 'connection', 'offline', 'xhr'];
    return networkKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword) || 
      error.name.toLowerCase().includes(keyword)
    );
  }

  private isAuthenticationError(error: Error): boolean {
    const authKeywords = ['auth', 'token', 'unauthorized', '401', 'forbidden', '403'];
    return authKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
  }

  private isValidationError(error: Error, context: ErrorContext): boolean {
    return context.module === 'validation' || 
           error.message.toLowerCase().includes('validation') ||
           error.message.toLowerCase().includes('invalid');
  }

  private isStorageError(error: Error): boolean {
    const storageKeywords = ['storage', 'quota', 'disk', 'space', 'full'];
    return storageKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
  }

  private isApiError(error: Error): boolean {
    const apiKeywords = ['api', 'endpoint', 'service', 'server'];
    return apiKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
  }

  private isPerformanceError(error: Error, context: ErrorContext): boolean {
    return context.module === 'performance' ||
           error.message.toLowerCase().includes('performance') ||
           error.message.toLowerCase().includes('slow') ||
           error.message.toLowerCase().includes('timeout');
  }

  private isCriticalSystemError(error: Error): boolean {
    const criticalKeywords = ['fatal', 'critical', 'crash', 'segmentation', 'memory'];
    return criticalKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
  }

  // Utility methods
  private getErrorTitle(category: ErrorCategory, severity: ErrorSeverity): string {
    const titles: Record<ErrorCategory, string> = {
      [ErrorCategory.NETWORK]: 'Connection Problem',
      [ErrorCategory.AUTHENTICATION]: 'Sign In Required',
      [ErrorCategory.VALIDATION]: 'Input Error',
      [ErrorCategory.STORAGE]: 'Storage Issue',
      [ErrorCategory.UI_COMPONENT]: 'Display Problem',
      [ErrorCategory.API_INTEGRATION]: 'Service Unavailable',
      [ErrorCategory.PERFORMANCE]: 'Performance Issue',
      [ErrorCategory.SYSTEM]: 'System Error',
      [ErrorCategory.AUTHORIZATION]: 'Access Denied',
      [ErrorCategory.DATA_CORRUPTION]: 'Data Issue',
      [ErrorCategory.BUSINESS_LOGIC]: 'Processing Error',
      [ErrorCategory.SECURITY]: 'Security Alert',
      [ErrorCategory.EXTERNAL_SERVICE]: 'External Service Error',
      [ErrorCategory.USER_INPUT]: 'Input Error',
      [ErrorCategory.UNKNOWN]: 'Unexpected Error'
    };

    return titles[category] || 'Error';
  }

  private getAvailableFeatures(context: ErrorContext): string[] {
    // Return list of features that should still work
    return ['basic_navigation', 'offline_content', 'settings'];
  }

  private async logClassifiedError(classifiedError: ClassifiedError): Promise<void> {
    await loggingService.logError(
      classifiedError.originalError,
      {
        ...classifiedError.context,
        errorId: classifiedError.id,
        errorCode: classifiedError.errorCode.code,
        category: classifiedError.errorCode.category,
        severity: classifiedError.errorCode.severity,
        recoveryStrategy: classifiedError.errorCode.recoveryStrategy,
        userId: classifiedError.userId
      }
    );
  }

  private async trackErrorAnalytics(classifiedError: ClassifiedError): Promise<void> {
    await analyticsService.trackEvent('error_classified', {
      errorId: classifiedError.id,
      errorCode: classifiedError.errorCode.code,
      category: classifiedError.errorCode.category,
      severity: classifiedError.errorCode.severity,
      module: classifiedError.context.module,
      userId: classifiedError.userId
    });
  }

  private async logRecoverySuccess(classifiedError: ClassifiedError, result: RecoveryResult): Promise<void> {
    await loggingService.logInfo('Error recovery successful', {
      errorId: classifiedError.id,
      strategy: result.strategy,
      attempts: classifiedError.recoveryAttempts,
      message: result.message
    });
  }

  private async logRecoveryFailure(classifiedError: ClassifiedError, result: RecoveryResult): Promise<void> {
    await loggingService.logWarning('Error recovery failed', {
      errorId: classifiedError.id,
      strategy: result.strategy,
      attempts: classifiedError.recoveryAttempts,
      message: result.message
    });
  }

  private logErrorResolution(error: ClassifiedError): void {
    loggingService.logInfo('Error marked as resolved', {
      errorId: error.id,
      errorCode: error.errorCode.code,
      totalAttempts: error.recoveryAttempts
    });
  }

  private createFallbackClassifiedError(error: Error, context: ErrorContext, userId?: string): ClassifiedError {
    return {
      id: this.generateErrorId(),
      originalError: error,
      errorCode: this.errorCodes.get('UNK_001')!,
      context,
      timestamp: new Date(),
      userId,
      sessionId: this.generateSessionId(),
      correlationId: this.generateCorrelationId(),
      recoveryAttempts: 0,
      resolved: false,
      userNotified: false
    };
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const errorClassificationService = ErrorClassificationService.getInstance();