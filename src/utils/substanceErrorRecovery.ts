/**
 * Substance Error Recovery Utilities
 * Provides comprehensive error recovery strategies for substance operations
 */

import { SubstanceError } from '../services/error/substanceErrorHandler';

export interface ErrorRecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  isPrimary?: boolean;
}

export interface ErrorRecoveryStrategy {
  title: string;
  message: string;
  actions: ErrorRecoveryAction[];
  showToast?: boolean;
  toastType?: 'error' | 'warning' | 'info';
}

/**
 * Get recovery strategy based on error type
 */
export const getErrorRecoveryStrategy = (
  error: SubstanceError,
  context: {
    retryAction?: () => void | Promise<void>;
    clearFormAction?: () => void;
    refreshAction?: () => void | Promise<void>;
    loginAction?: () => void;
  }
): ErrorRecoveryStrategy => {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return {
        title: 'Connection Problem',
        message: 'Unable to connect to the server. Please check your internet connection.',
        actions: [
          {
            label: 'Retry',
            action: context.retryAction || (() => {}),
            isPrimary: true,
          },
          {
            label: 'Refresh',
            action: context.refreshAction || (() => {}),
          },
        ],
        showToast: true,
        toastType: 'error',
      };

    case 'DUPLICATE_NAME':
      return {
        title: 'Name Already Taken',
        message: 'A substance with this name already exists. Please choose a different name.',
        actions: [
          {
            label: 'Clear Name',
            action: context.clearFormAction || (() => {}),
            isPrimary: true,
          },
          {
            label: 'Try Again',
            action: context.retryAction || (() => {}),
          },
        ],
        showToast: true,
        toastType: 'warning',
      };

    case 'VALIDATION_ERROR':
      return {
        title: 'Invalid Information',
        message: 'Please check the information you entered and fix any errors highlighted in red.',
        actions: [
          {
            label: 'Review Form',
            action: () => {
              // Could implement form field focusing
              console.log('Focus on first error field');
            },
            isPrimary: true,
          },
        ],
        showToast: true,
        toastType: 'warning',
      };

    case 'PERMISSION_DENIED':
      return {
        title: 'Access Denied',
        message: 'You don\'t have permission to perform this action. Please log in again.',
        actions: [
          {
            label: 'Log In',
            action: context.loginAction || (() => {}),
            isPrimary: true,
          },
          {
            label: 'Refresh',
            action: context.refreshAction || (() => {}),
          },
        ],
        showToast: true,
        toastType: 'error',
      };

    case 'RATE_LIMITED':
      return {
        title: 'Too Many Requests',
        message: 'You\'re making requests too quickly. Please wait a moment before trying again.',
        actions: [
          {
            label: 'Wait & Retry',
            action: async () => {
              // Wait 5 seconds then retry
              await new Promise(resolve => setTimeout(resolve, 5000));
              if (context.retryAction) {
                await context.retryAction();
              }
            },
            isPrimary: true,
          },
        ],
        showToast: true,
        toastType: 'warning',
      };

    case 'SERVER_ERROR':
      return {
        title: 'Server Problem',
        message: 'There\'s a temporary problem with our servers. Please try again in a few minutes.',
        actions: [
          {
            label: 'Retry Later',
            action: async () => {
              // Wait 30 seconds then retry
              await new Promise(resolve => setTimeout(resolve, 30000));
              if (context.retryAction) {
                await context.retryAction();
              }
            },
            isPrimary: true,
          },
          {
            label: 'Retry Now',
            action: context.retryAction || (() => {}),
          },
        ],
        showToast: true,
        toastType: 'error',
      };

    case 'TIMEOUT':
      return {
        title: 'Request Timed Out',
        message: 'The request took too long to complete. Please try again.',
        actions: [
          {
            label: 'Retry',
            action: context.retryAction || (() => {}),
            isPrimary: true,
          },
          {
            label: 'Check Connection',
            action: () => {
              // Could open network settings or run connectivity test
              console.log('Check network connection');
            },
          },
        ],
        showToast: true,
        toastType: 'error',
      };

    case 'UNKNOWN_ERROR':
    default:
      return {
        title: 'Unexpected Error',
        message: 'Something unexpected happened. Please try again or contact support if the problem persists.',
        actions: [
          {
            label: 'Retry',
            action: context.retryAction || (() => {}),
            isPrimary: true,
          },
          {
            label: 'Refresh',
            action: context.refreshAction || (() => {}),
          },
        ],
        showToast: true,
        toastType: 'error',
      };
  }
};

/**
 * Execute error recovery strategy with toast notifications
 */
export const executeErrorRecovery = async (
  strategy: ErrorRecoveryStrategy,
  showToast: (message: string, actionText?: string, onActionPress?: () => void) => void
) => {
  if (strategy.showToast) {
    const primaryAction = strategy.actions.find(action => action.isPrimary);
    
    if (primaryAction) {
      showToast(
        strategy.message,
        primaryAction.label,
        primaryAction.action
      );
    } else {
      showToast(strategy.message);
    }
  }
};

/**
 * Exponential backoff retry utility
 */
export const createRetryWithBackoff = (
  operation: () => Promise<any>,
  maxRetries: number = 3,
  baseDelay: number = 1000
) => {
  return async (onRetry?: (attempt: number) => void): Promise<any> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Calculate exponential backoff delay
        const delay = baseDelay * Math.pow(2, attempt - 1);
        
        if (onRetry) {
          onRetry(attempt);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  };
};

/**
 * Network connectivity checker
 */
export const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    // Simple connectivity test
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Smart retry logic that considers network connectivity
 */
export const smartRetry = async (
  operation: () => Promise<any>,
  maxRetries: number = 3,
  checkConnectivity: boolean = true
): Promise<any> => {
  const retryWithBackoff = createRetryWithBackoff(operation, maxRetries);
  
  if (checkConnectivity) {
    const isConnected = await checkNetworkConnectivity();
    if (!isConnected) {
      throw new Error('No internet connection available');
    }
  }
  
  return retryWithBackoff();
};