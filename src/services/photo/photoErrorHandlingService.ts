/**
 * Photo Error Handling Service
 * Provides comprehensive error handling with retry mechanisms and user feedback
 */

import { Linking, Alert } from 'react-native';
import photoErrorClassificationService, { PhotoErrorType, PhotoRecoveryOption } from './photoErrorClassificationService';

export interface RetryConfig {
  maxRetries: number;
  delay: number;
  backoffMultiplier?: number;
  maxDelay?: number;
}

export interface ErrorHandlingOptions {
  showUserFeedback?: boolean;
  enableRetry?: boolean;
  customRetryConfig?: RetryConfig;
  onRetry?: () => Promise<void>;
  onAlternativeAction?: (actionId: string) => Promise<void>;
  onError?: (error: any) => void;
}

class PhotoErrorHandlingService {
  private retryAttempts: Map<string, number> = new Map();

  /**
   * Handle an error with comprehensive error handling and user feedback
   */
  async handleError(
    error: Error | string | any,
    operationId: string,
    options: ErrorHandlingOptions = {}
  ): Promise<boolean> {
    const {
      showUserFeedback = true,
      enableRetry = true,
      customRetryConfig,
      onRetry,
      onAlternativeAction,
      onError,
    } = options;

    // Classify the error
    const errorInfo = photoErrorClassificationService.classifyError(error);
    
    // Log the error
    console.error(`Photo operation error [${operationId}]:`, error);
    
    // Call error callback if provided
    if (onError) {
      onError(error);
    }

    // Check if we should retry
    const shouldRetry = enableRetry && errorInfo.shouldRetry && onRetry;
    const currentAttempts = this.retryAttempts.get(operationId) || 0;
    const retryConfig = customRetryConfig || photoErrorClassificationService.getRetryConfig(error);
    
    if (shouldRetry && currentAttempts < retryConfig.maxRetries) {
      // Attempt automatic retry for certain error types
      if (this.shouldAutoRetry(errorInfo.type)) {
        return this.performRetry(operationId, retryConfig, onRetry);
      }
    }

    // Show user feedback if enabled
    if (showUserFeedback) {
      return this.showErrorDialog(errorInfo, operationId, {
        enableRetry: shouldRetry && currentAttempts < retryConfig.maxRetries,
        onRetry,
        onAlternativeAction,
        retryConfig,
      });
    }

    return false;
  }

  /**
   * Perform a retry operation with exponential backoff
   */
  private async performRetry(
    operationId: string,
    retryConfig: RetryConfig,
    onRetry: () => Promise<void>
  ): Promise<boolean> {
    const currentAttempts = this.retryAttempts.get(operationId) || 0;
    this.retryAttempts.set(operationId, currentAttempts + 1);

    // Calculate delay with exponential backoff
    const baseDelay = retryConfig.delay;
    const backoffMultiplier = retryConfig.backoffMultiplier || 2;
    const maxDelay = retryConfig.maxDelay || 30000;
    const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, currentAttempts), maxDelay);

    console.log(`Retrying operation ${operationId} in ${delay}ms (attempt ${currentAttempts + 1})`);

    // Wait for the calculated delay
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await onRetry();
      // Success - clear retry attempts
      this.retryAttempts.delete(operationId);
      return true;
    } catch (retryError) {
      console.error(`Retry failed for operation ${operationId}:`, retryError);
      
      // If we've reached max retries, show error to user
      if (currentAttempts + 1 >= retryConfig.maxRetries) {
        this.retryAttempts.delete(operationId);
        const errorInfo = photoErrorClassificationService.classifyError(retryError);
        this.showErrorDialog(errorInfo, operationId, { enableRetry: false });
      }
      
      return false;
    }
  }

  /**
   * Show error dialog with recovery options
   */
  private async showErrorDialog(
    errorInfo: any,
    operationId: string,
    options: {
      enableRetry?: boolean;
      onRetry?: () => Promise<void>;
      onAlternativeAction?: (actionId: string) => Promise<void>;
      retryConfig?: RetryConfig;
    } = {}
  ): Promise<boolean> {
    const { enableRetry, onRetry, onAlternativeAction, retryConfig } = options;

    return new Promise((resolve) => {
      // Filter recovery options based on availability
      const availableOptions = errorInfo.recoveryOptions.filter((option: PhotoRecoveryOption) => {
        if (option.action === 'retry' && (!enableRetry || !onRetry)) {
          return false;
        }
        if (option.action === 'alternative' && !onAlternativeAction) {
          return false;
        }
        return true;
      });

      // Create alert buttons
      const buttons = availableOptions.map((option: PhotoRecoveryOption) => ({
        text: option.label,
        style: option.action === 'dismiss' ? 'cancel' : 'default',
        onPress: async () => {
          const success = await this.handleRecoveryAction(
            option,
            operationId,
            onRetry,
            onAlternativeAction,
            retryConfig
          );
          resolve(success);
        },
      }));

      // Show the alert
      Alert.alert(
        errorInfo.title,
        errorInfo.userMessage,
        buttons,
        {
          cancelable: true,
          onDismiss: () => resolve(false),
        }
      );
    });
  }

  /**
   * Handle recovery action selected by user
   */
  private async handleRecoveryAction(
    option: PhotoRecoveryOption,
    operationId: string,
    onRetry?: () => Promise<void>,
    onAlternativeAction?: (actionId: string) => Promise<void>,
    retryConfig?: RetryConfig
  ): Promise<boolean> {
    try {
      switch (option.action) {
        case 'retry':
          if (onRetry && retryConfig) {
            return this.performRetry(operationId, retryConfig, onRetry);
          }
          break;

        case 'settings':
          await this.openAppSettings();
          break;

        case 'alternative':
          if (onAlternativeAction) {
            await onAlternativeAction(option.id);
            return true;
          }
          break;

        case 'contact_support':
          await this.openSupportContact();
          break;

        case 'dismiss':
        default:
          return false;
      }
    } catch (error) {
      console.error('Error handling recovery action:', error);
    }

    return false;
  }

  /**
   * Open app settings for permission management
   */
  private async openAppSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Failed to open app settings:', error);
      Alert.alert(
        'Settings Unavailable',
        'Unable to open settings. Please manually go to your device settings and enable the required permissions for this app.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Open support contact options
   */
  private async openSupportContact(): Promise<void> {
    Alert.alert(
      'Contact Support',
      'How would you like to contact our support team?',
      [
        {
          text: 'Email',
          onPress: () => this.openEmailSupport(),
        },
        {
          text: 'In-App Help',
          onPress: () => this.openInAppHelp(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }

  /**
   * Open email support
   */
  private async openEmailSupport(): Promise<void> {
    const emailUrl = 'mailto:support@BioReceipt.app?subject=Photo%20Issue%20Report';
    try {
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert(
          'Email Unavailable',
          'Please contact us at support@BioReceipt.app',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to open email:', error);
    }
  }

  /**
   * Open in-app help (placeholder)
   */
  private async openInAppHelp(): Promise<void> {
    Alert.alert(
      'Help Center',
      'Visit our help center at help.BioReceipt.app for troubleshooting guides and FAQs.',
      [
        {
          text: 'Open Help Center',
          onPress: () => Linking.openURL('https://help.BioReceipt.app'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }

  /**
   * Check if error should trigger automatic retry
   */
  private shouldAutoRetry(errorType: PhotoErrorType): boolean {
    const autoRetryTypes = [
      PhotoErrorType.NETWORK_ERROR,
      PhotoErrorType.CAMERA_UNAVAILABLE,
    ];
    
    return autoRetryTypes.includes(errorType);
  }

  /**
   * Clear retry attempts for an operation
   */
  clearRetryAttempts(operationId: string): void {
    this.retryAttempts.delete(operationId);
  }

  /**
   * Get current retry attempts for an operation
   */
  getRetryAttempts(operationId: string): number {
    return this.retryAttempts.get(operationId) || 0;
  }

  /**
   * Reset all retry attempts
   */
  resetAllRetryAttempts(): void {
    this.retryAttempts.clear();
  }

  /**
   * Handle camera permission request
   */
  async handleCameraPermission(): Promise<boolean> {
    try {
      // This would integrate with your permission handling system
      // For now, we'll simulate the permission request
      console.log('Requesting camera permission...');
      
      // In a real implementation, you would use react-native-permissions
      // const result = await request(PERMISSIONS.ANDROID.CAMERA);
      // return result === RESULTS.GRANTED;
      
      return true; // Placeholder
    } catch (error) {
      await this.handleError(error, 'camera_permission_request', {
        showUserFeedback: true,
        enableRetry: false,
      });
      return false;
    }
  }

  /**
   * Handle storage permission request
   */
  async handleStoragePermission(): Promise<boolean> {
    try {
      console.log('Requesting storage permission...');
      
      // In a real implementation, you would use react-native-permissions
      // const result = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
      // return result === RESULTS.GRANTED;
      
      return true; // Placeholder
    } catch (error) {
      await this.handleError(error, 'storage_permission_request', {
        showUserFeedback: true,
        enableRetry: false,
      });
      return false;
    }
  }

  /**
   * Create a wrapped operation with error handling
   */
  withErrorHandling<T>(
    operation: () => Promise<T>,
    operationId: string,
    options: ErrorHandlingOptions = {}
  ): () => Promise<T | null> {
    return async (): Promise<T | null> => {
      try {
        const result = await operation();
        // Clear retry attempts on success
        this.clearRetryAttempts(operationId);
        return result;
      } catch (error) {
        const handled = await this.handleError(error, operationId, {
          ...options,
          onRetry: options.onRetry || (() => operation()),
        });
        
        if (!handled) {
          throw error;
        }
        
        return null;
      }
    };
  }
}

// Export singleton instance
export const photoErrorHandlingService = new PhotoErrorHandlingService();
export default photoErrorHandlingService;
