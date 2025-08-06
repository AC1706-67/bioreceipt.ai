/**
 * Error Handler Hook
 * React hook for consistent error handling across components
 */

import { useCallback, useContext, useEffect, useState } from 'react';
import { globalErrorHandler } from '../services/error/globalErrorHandler';
import { errorClassificationService, ClassifiedError } from '../services/error/errorClassificationService';

interface UseErrorHandlerOptions {
  userId?: string;
  componentName?: string;
  enableAutoRecovery?: boolean;
  onError?: (error: ClassifiedError) => void;
  onRecovery?: (error: ClassifiedError) => void;
}

interface ErrorHandlerState {
  hasError: boolean;
  currentError: ClassifiedError | null;
  isRecovering: boolean;
  recoveryAttempts: number;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const {
    userId,
    componentName,
    enableAutoRecovery = true,
    onError,
    onRecovery
  } = options;

  const [errorState, setErrorState] = useState<ErrorHandlerState>({
    hasError: false,
    currentError: null,
    isRecovering: false,
    recoveryAttempts: 0
  });

  // Handle component errors
  const handleError = useCallback(async (
    error: Error,
    context: Record<string, any> = {}
  ) => {
    try {
      const errorContext = {
        module: 'component',
        component: componentName,
        ...context
      };

      // Use global error handler
      await globalErrorHandler.handleError(error, errorContext, userId);

      // Get the classified error for local state
      const classifiedError = await errorClassificationService.classifyAndHandle(
        error,
        errorContext,
        userId
      );

      setErrorState({
        hasError: true,
        currentError: classifiedError,
        isRecovering: false,
        recoveryAttempts: 0
      });

      // Call custom error handler
      if (onError) {
        onError(classifiedError);
      }

      // Attempt auto-recovery if enabled
      if (enableAutoRecovery && classifiedError.errorCode.retryable) {
        await attemptRecovery(classifiedError);
      }

    } catch (handlingError) {
      console.error('Error in useErrorHandler:', handlingError);
    }
  }, [userId, componentName, onError, enableAutoRecovery]);

  // Handle API errors
  const handleApiError = useCallback(async (
    error: Error,
    endpoint: string,
    method: string,
    statusCode?: number,
    requestData?: any,
    responseData?: any
  ) => {
    await globalErrorHandler.handleApiError(
      error,
      endpoint,
      method,
      statusCode,
      requestData,
      responseData,
      userId
    );

    // Update local state
    const errorContext = {
      module: 'api',
      method: `${method} ${endpoint}`,
      statusCode,
      endpoint
    };

    const classifiedError = await errorClassificationService.classifyAndHandle(
      error,
      errorContext,
      userId
    );

    setErrorState({
      hasError: true,
      currentError: classifiedError,
      isRecovering: false,
      recoveryAttempts: 0
    });
  }, [userId]);

  // Handle async operation errors
  const handleAsyncError = useCallback(async (
    error: Error,
    operation: string,
    operationData?: any
  ) => {
    await globalErrorHandler.handleAsyncError(error, operation, operationData, userId);
    
    const errorContext = {
      module: 'async',
      method: operation,
      component: componentName
    };

    const classifiedError = await errorClassificationService.classifyAndHandle(
      error,
      errorContext,
      userId
    );

    setErrorState({
      hasError: true,
      currentError: classifiedError,
      isRecovering: false,
      recoveryAttempts: 0
    });
  }, [userId, componentName]);

  // Handle validation errors
  const handleValidationError = useCallback(async (
    error: Error,
    fieldName: string,
    fieldValue: any,
    validationRule: string
  ) => {
    await globalErrorHandler.handleValidationError(
      error,
      fieldName,
      fieldValue,
      validationRule,
      userId
    );

    const errorContext = {
      module: 'validation',
      fieldName,
      validationRule,
      component: componentName
    };

    const classifiedError = await errorClassificationService.classifyAndHandle(
      error,
      errorContext,
      userId
    );

    setErrorState({
      hasError: true,
      currentError: classifiedError,
      isRecovering: false,
      recoveryAttempts: 0
    });
  }, [userId, componentName]);

  // Attempt error recovery
  const attemptRecovery = useCallback(async (classifiedError?: ClassifiedError) => {
    const errorToRecover = classifiedError || errorState.currentError;
    if (!errorToRecover) return false;

    setErrorState(prev => ({
      ...prev,
      isRecovering: true,
      recoveryAttempts: prev.recoveryAttempts + 1
    }));

    try {
      const result = await errorClassificationService.attemptRecovery(errorToRecover);
      
      if (result.success) {
        // Recovery successful
        setErrorState({
          hasError: false,
          currentError: null,
          isRecovering: false,
          recoveryAttempts: 0
        });

        if (onRecovery) {
          onRecovery(errorToRecover);
        }

        return true;
      } else {
        // Recovery failed
        setErrorState(prev => ({
          ...prev,
          isRecovering: false
        }));

        return false;
      }
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
      
      setErrorState(prev => ({
        ...prev,
        isRecovering: false
      }));

      return false;
    }
  }, [errorState.currentError, onRecovery]);

  // Clear error state
  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      currentError: null,
      isRecovering: false,
      recoveryAttempts: 0
    });
  }, []);

  // Retry the last operation
  const retry = useCallback(async () => {
    if (errorState.currentError) {
      return await attemptRecovery(errorState.currentError);
    }
    return false;
  }, [errorState.currentError, attemptRecovery]);

  // Wrap async functions with error handling
  const wrapAsync = useCallback(<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    operationName?: string
  ): T => {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        await handleAsyncError(
          error as Error,
          operationName || fn.name || 'anonymous',
          { args }
        );
        throw error; // Re-throw to maintain original behavior
      }
    }) as T;
  }, [handleAsyncError]);

  // Wrap sync functions with error handling
  const wrapSync = useCallback(<T extends (...args: any[]) => any>(
    fn: T,
    operationName?: string
  ): T => {
    return ((...args: any[]) => {
      try {
        return fn(...args);
      } catch (error) {
        handleError(
          error as Error,
          {
            method: operationName || fn.name || 'anonymous',
            args
          }
        );
        throw error; // Re-throw to maintain original behavior
      }
    }) as T;
  }, [handleError]);

  // Get user-friendly error message
  const getErrorMessage = useCallback(() => {
    if (!errorState.currentError) return null;
    
    return errorClassificationService.getUserFriendlyMessage(errorState.currentError);
  }, [errorState.currentError]);

  // Check if error is recoverable
  const isRecoverable = useCallback(() => {
    return errorState.currentError?.errorCode.retryable || false;
  }, [errorState.currentError]);

  // Get error severity
  const getErrorSeverity = useCallback(() => {
    return errorState.currentError?.errorCode.severity;
  }, [errorState.currentError]);

  // Create error boundary props
  const errorBoundaryProps = useCallback(() => {
    return globalErrorHandler.createErrorBoundary(componentName || 'Unknown', userId);
  }, [componentName, userId]);

  return {
    // State
    hasError: errorState.hasError,
    currentError: errorState.currentError,
    isRecovering: errorState.isRecovering,
    recoveryAttempts: errorState.recoveryAttempts,

    // Error handlers
    handleError,
    handleApiError,
    handleAsyncError,
    handleValidationError,

    // Recovery and management
    attemptRecovery,
    clearError,
    retry,

    // Utilities
    wrapAsync,
    wrapSync,
    getErrorMessage,
    isRecoverable,
    getErrorSeverity,
    errorBoundaryProps
  };
};

export default useErrorHandler;

// Hook for UI component errors
export const useUIErrorHandler = (componentName?: string) => {
  return useErrorHandler({
    context: {
      feature: 'ui',
      component: componentName
    },
    showUserErrors: false, // UI errors are usually handled by error boundaries
    autoRetry: false
  });
};

// Hook for data operations
export const useDataErrorHandler = (operation?: string) => {
  return useErrorHandler({
    context: {
      feature: 'data',
      action: operation
    },
    showUserErrors: true,
    autoRetry: false
  });
};

// Hook for background operations
export const useBackgroundErrorHandler = () => {
  return useErrorHandler({
    context: {
      feature: 'background'
    },
    showUserErrors: false, // Background errors shouldn't interrupt user
    autoRetry: true,
    maxRetries: 5
  });
};

// Utility function to wrap async operations with error handling
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  errorHandler: (error: Error) => Promise<EnhancedError>,
  context?: Partial<ErrorContext>
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    await errorHandler(error as Error, context);
    return null;
  }
};

// Utility function to create error context from navigation state
export const createNavigationContext = (
  currentScreen?: string,
  previousScreen?: string,
  navigationStack?: string[]
): Partial<ErrorContext> => {
  return {
    currentScreen,
    previousScreen,
    navigationStack,
    feature: 'navigation'
  };
};

// Utility function to create error context from user action
export const createUserActionContext = (
  action: string,
  component?: string,
  metadata?: Record<string, any>
): Partial<ErrorContext> => {
  return {
    action,
    component,
    feature: 'user_action',
    metadata
  };
};