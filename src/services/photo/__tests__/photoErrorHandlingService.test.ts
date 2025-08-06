/**
 * PhotoErrorHandlingService Tests
 * Tests comprehensive error handling with retry mechanisms and user feedback
 */

import { Alert, Linking } from 'react-native';
import photoErrorHandlingService from '../photoErrorHandlingService';
import photoErrorClassificationService, { PhotoErrorType } from '../photoErrorClassificationService';

// Mock dependencies
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openSettings: jest.fn(),
    openURL: jest.fn(),
    canOpenURL: jest.fn(),
  },
}));

jest.mock('../photoErrorClassificationService');

const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;
const mockLinking = Linking as jest.Mocked<typeof Linking>;
const mockPhotoErrorClassificationService = photoErrorClassificationService as jest.Mocked<typeof photoErrorClassificationService>;

describe('PhotoErrorHandlingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default mock implementations
    mockPhotoErrorClassificationService.classifyError.mockReturnValue({
      type: PhotoErrorType.UNKNOWN_ERROR,
      severity: 'MEDIUM' as any,
      title: 'Error',
      message: 'Test error',
      userMessage: 'Something went wrong',
      shouldRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      recoveryOptions: [
        { id: 'retry', label: 'Try Again', action: 'retry' },
        { id: 'dismiss', label: 'Cancel', action: 'dismiss' },
      ],
    });
    
    mockPhotoErrorClassificationService.getRetryConfig.mockReturnValue({
      maxRetries: 3,
      delay: 1000,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Error Handling', () => {
    it('handles errors with user feedback disabled', async () => {
      const error = new Error('Test error');
      const result = await photoErrorHandlingService.handleError(error, 'test_op', {
        showUserFeedback: false,
        enableRetry: false,
      });
      
      expect(result).toBe(false);
      expect(mockAlert.alert).not.toHaveBeenCalled();
    });

    it('calls error callback when provided', async () => {
      const error = new Error('Test error');
      const onError = jest.fn();
      
      await photoErrorHandlingService.handleError(error, 'test_op', {
        showUserFeedback: false,
        onError,
      });
      
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('logs errors to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');
      
      await photoErrorHandlingService.handleError(error, 'test_op', {
        showUserFeedback: false,
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('Photo operation error [test_op]:', error);
      consoleSpy.mockRestore();
    });
  });

  describe('Automatic Retry Logic', () => {
    it('performs automatic retry for network errors', async () => {
      mockPhotoErrorClassificationService.classifyError.mockReturnValue({
        type: PhotoErrorType.NETWORK_ERROR,
        severity: 'MEDIUM' as any,
        title: 'Network Error',
        message: 'Network failed',
        userMessage: 'Network connection failed',
        shouldRetry: true,
        maxRetries: 3,
        retryDelay: 1000,
        recoveryOptions: [],
      });

      const onRetry = jest.fn().mockResolvedValue(undefined);
      const error = new Error('Network connection failed');
      
      const promise = photoErrorHandlingService.handleError(error, 'network_op', {
        showUserFeedback: false,
        onRetry,
      });
      
      // Fast-forward through retry delay
      jest.advanceTimersByTime(1000);
      await promise;
      
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not auto-retry for permission errors', async () => {
      mockPhotoErrorClassificationService.classifyError.mockReturnValue({
        type: PhotoErrorType.CAMERA_PERMISSION_DENIED,
        severity: 'HIGH' as any,
        title: 'Permission Error',
        message: 'Permission denied',
        userMessage: 'Camera permission required',
        shouldRetry: false,
        maxRetries: 0,
        retryDelay: 0,
        recoveryOptions: [],
      });

      const onRetry = jest.fn();
      const error = new Error('Camera permission denied');
      
      await photoErrorHandlingService.handleError(error, 'permission_op', {
        showUserFeedback: false,
        onRetry,
      });
      
      expect(onRetry).not.toHaveBeenCalled();
    });

    it('implements exponential backoff for retries', async () => {
      const onRetry = jest.fn()
        .mockRejectedValueOnce(new Error('Retry 1 failed'))
        .mockRejectedValueOnce(new Error('Retry 2 failed'))
        .mockResolvedValueOnce(undefined);

      const error = new Error('Test error');
      
      const promise = photoErrorHandlingService.handleError(error, 'backoff_test', {
        showUserFeedback: false,
        onRetry,
        customRetryConfig: {
          maxRetries: 3,
          delay: 1000,
          backoffMultiplier: 2,
        },
      });
      
      // First retry after 1000ms
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      
      // Second retry after 2000ms (exponential backoff)
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      
      // Third retry after 4000ms
      jest.advanceTimersByTime(4000);
      await promise;
      
      expect(onRetry).toHaveBeenCalledTimes(3);
    });

    it('respects max retry attempts', async () => {
      const onRetry = jest.fn().mockRejectedValue(new Error('Always fails'));
      const error = new Error('Test error');
      
      const promise = photoErrorHandlingService.handleError(error, 'max_retry_test', {
        showUserFeedback: false,
        onRetry,
        customRetryConfig: {
          maxRetries: 2,
          delay: 100,
        },
      });
      
      // Fast-forward through all retries
      jest.advanceTimersByTime(1000);
      await promise;
      
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('clears retry attempts on success', async () => {
      const onRetry = jest.fn().mockResolvedValue(undefined);
      const error = new Error('Test error');
      
      const promise = photoErrorHandlingService.handleError(error, 'success_test', {
        showUserFeedback: false,
        onRetry,
      });
      
      jest.advanceTimersByTime(1000);
      const result = await promise;
      
      expect(result).toBe(true);
      expect(photoErrorHandlingService.getRetryAttempts('success_test')).toBe(0);
    });
  });

  describe('User Feedback Dialog', () => {
    it('shows error dialog with recovery options', async () => {
      mockAlert.alert.mockImplementation((title, message, buttons) => {
        // Simulate user dismissing dialog
        if (buttons && buttons.length > 0) {
          const dismissButton = buttons.find(b => b.style === 'cancel');
          if (dismissButton?.onPress) {
            dismissButton.onPress();
          }
        }
      });

      const error = new Error('Test error');
      await photoErrorHandlingService.handleError(error, 'dialog_test', {
        showUserFeedback: true,
        enableRetry: false,
      });
      
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Error',
        'Something went wrong',
        expect.any(Array),
        expect.objectContaining({ cancelable: true })
      );
    });

    it('filters recovery options based on availability', async () => {
      mockAlert.alert.mockImplementation((title, message, buttons) => {
        expect(buttons).toHaveLength(1); // Only dismiss button should be available
        expect(buttons?.[0].text).toBe('Cancel');
      });

      const error = new Error('Test error');
      await photoErrorHandlingService.handleError(error, 'filter_test', {
        showUserFeedback: true,
        enableRetry: false, // This should filter out retry option
      });
    });

    it('includes retry option when retry is enabled', async () => {
      mockAlert.alert.mockImplementation((title, message, buttons) => {
        const retryButton = buttons?.find(b => b.text === 'Try Again');
        expect(retryButton).toBeDefined();
      });

      const onRetry = jest.fn().mockResolvedValue(undefined);
      const error = new Error('Test error');
      
      await photoErrorHandlingService.handleError(error, 'retry_option_test', {
        showUserFeedback: true,
        enableRetry: true,
        onRetry,
      });
    });
  });

  describe('Recovery Actions', () => {
    it('handles settings action', async () => {
      mockLinking.openSettings.mockResolvedValue(undefined);
      mockAlert.alert.mockImplementation((title, message, buttons) => {
        const settingsButton = buttons?.find(b => b.text === 'Open Settings');
        if (settingsButton?.onPress) {
          settingsButton.onPress();
        }
      });

      mockPhotoErrorClassificationService.classifyError.mockReturnValue({
        type: PhotoErrorType.CAMERA_PERMISSION_DENIED,
        severity: 'HIGH' as any,
        title: 'Permission Required',
        message: 'Permission denied',
        userMessage: 'Camera permission required',
        shouldRetry: false,
        maxRetries: 0,
        retryDelay: 0,
        recoveryOptions: [
          { id: 'settings', label: 'Open Settings', action: 'settings' },
        ],
      });

      const error = new Error('Camera permission denied');
      await photoErrorHandlingService.handleError(error, 'settings_test', {
        showUserFeedback: true,
      });
      
      expect(mockLinking.openSettings).toHaveBeenCalled();
    });

    it('handles settings failure gracefully', async () => {
      mockLinking.openSettings.mockRejectedValue(new Error('Settings unavailable'));
      mockAlert.alert.mockImplementation((title, message, buttons) => {
        const settingsButton = buttons?.find(b => b.text === 'Open Settings');
        if (settingsButton?.onPress) {
          settingsButton.onPress();
        }
      });

      mockPhotoErrorClassificationService.classifyError.mockReturnValue({
        type: PhotoErrorType.CAMERA_PERMISSION_DENIED,
        severity: 'HIGH' as any,
        title: 'Permission Required',
        message: 'Permission denied',
        userMessage: 'Camera permission required',
        shouldRetry: false,
        maxRetries: 0,
        retryDelay: 0,
        recoveryOptions: [
          { id: 'settings', label: 'Open Settings', action: 'settings' },
        ],
      });

      const error = new Error('Camera permission denied');
      await photoErrorHandlingService.handleError(error, 'settings_fail_test', {
        showUserFeedback: true,
      });
      
      // Should show fallback alert
      expect(mockAlert.alert).toHaveBeenCalledTimes(2);
    });

    it('handles alternative actions', async () => {
      const onAlternativeAction = jest.fn().mockResolvedValue(undefined);
      mockAlert.alert.mockImplementation((title, message, buttons) => {
        const altButton = buttons?.find(b => b.text === 'Choose Gallery');
        if (altButton?.onPress) {
          altButton.onPress();
        }
      });

      mockPhotoErrorClassificationService.classifyError.mockReturnValue({
        type: PhotoErrorType.CAMERA_UNAVAILABLE,
        severity: 'MEDIUM' as any,
        title: 'Camera Unavailable',
        message: 'Camera unavailable',
        userMessage: 'Camera is not available',
        shouldRetry: true,
        maxRetries: 3,
        retryDelay: 1000,
        recoveryOptions: [
          { id: 'gallery', label: 'Choose Gallery', action: 'alternative' },
        ],
      });

      const error = new Error('Camera unavailable');
      await photoErrorHandlingService.handleError(error, 'alt_test', {
        showUserFeedback: true,
        onAlternativeAction,
      });
      
      expect(onAlternativeAction).toHaveBeenCalledWith('gallery');
    });

    it('handles contact support action', async () => {
      mockAlert.alert.mockImplementation((title, message, buttons) => {
        if (title === 'Error') {
          const supportButton = buttons?.find(b => b.text === 'Contact Support');
          if (supportButton?.onPress) {
            supportButton.onPress();
          }
        } else if (title === 'Contact Support') {
          const emailButton = buttons?.find(b => b.text === 'Email');
          if (emailButton?.onPress) {
            emailButton.onPress();
          }
        }
      });

      mockLinking.canOpenURL.mockResolvedValue(true);
      mockLinking.openURL.mockResolvedValue(undefined);

      mockPhotoErrorClassificationService.classifyError.mockReturnValue({
        type: PhotoErrorType.UNKNOWN_ERROR,
        severity: 'MEDIUM' as any,
        title: 'Error',
        message: 'Unknown error',
        userMessage: 'Something went wrong',
        shouldRetry: false,
        maxRetries: 0,
        retryDelay: 0,
        recoveryOptions: [
          { id: 'support', label: 'Contact Support', action: 'contact_support' },
        ],
      });

      const error = new Error('Unknown error');
      await photoErrorHandlingService.handleError(error, 'support_test', {
        showUserFeedback: true,
      });
      
      expect(mockLinking.openURL).toHaveBeenCalledWith(
        'mailto:support@biopulse.app?subject=Photo%20Issue%20Report'
      );
    });
  });

  describe('Permission Handling', () => {
    it('handles camera permission request', async () => {
      const result = await photoErrorHandlingService.handleCameraPermission();
      expect(result).toBe(true); // Placeholder implementation
    });

    it('handles storage permission request', async () => {
      const result = await photoErrorHandlingService.handleStoragePermission();
      expect(result).toBe(true); // Placeholder implementation
    });
  });

  describe('Wrapped Operations', () => {
    it('wraps operations with error handling', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const wrappedOperation = photoErrorHandlingService.withErrorHandling(
        operation,
        'wrapped_test',
        { showUserFeedback: false }
      );
      
      const result = await wrappedOperation();
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('handles errors in wrapped operations', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const wrappedOperation = photoErrorHandlingService.withErrorHandling(
        operation,
        'wrapped_error_test',
        { showUserFeedback: false }
      );
      
      const result = await wrappedOperation();
      
      expect(result).toBeNull();
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('clears retry attempts on successful wrapped operation', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const wrappedOperation = photoErrorHandlingService.withErrorHandling(
        operation,
        'wrapped_success_test'
      );
      
      await wrappedOperation();
      
      expect(photoErrorHandlingService.getRetryAttempts('wrapped_success_test')).toBe(0);
    });
  });

  describe('Retry Attempt Management', () => {
    it('tracks retry attempts correctly', () => {
      expect(photoErrorHandlingService.getRetryAttempts('new_op')).toBe(0);
    });

    it('clears retry attempts for specific operation', () => {
      // This would be set internally during retry logic
      photoErrorHandlingService.clearRetryAttempts('test_op');
      expect(photoErrorHandlingService.getRetryAttempts('test_op')).toBe(0);
    });

    it('resets all retry attempts', () => {
      photoErrorHandlingService.resetAllRetryAttempts();
      expect(photoErrorHandlingService.getRetryAttempts('any_op')).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles null error gracefully', async () => {
      const result = await photoErrorHandlingService.handleError(null, 'null_test', {
        showUserFeedback: false,
      });
      
      expect(result).toBe(false);
      expect(mockPhotoErrorClassificationService.classifyError).toHaveBeenCalledWith(null);
    });

    it('handles undefined error gracefully', async () => {
      const result = await photoErrorHandlingService.handleError(undefined, 'undefined_test', {
        showUserFeedback: false,
      });
      
      expect(result).toBe(false);
    });

    it('handles retry callback throwing error', async () => {
      const onRetry = jest.fn().mockRejectedValue(new Error('Retry failed'));
      const error = new Error('Original error');
      
      const promise = photoErrorHandlingService.handleError(error, 'retry_error_test', {
        showUserFeedback: false,
        onRetry,
      });
      
      jest.advanceTimersByTime(1000);
      const result = await promise;
      
      expect(result).toBe(false);
    });

    it('handles alternative action throwing error', async () => {
      const onAlternativeAction = jest.fn().mockRejectedValue(new Error('Alt action failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockAlert.alert.mockImplementation((title, message, buttons) => {
        const altButton = buttons?.find(b => b.text === 'Try Alternative');
        if (altButton?.onPress) {
          altButton.onPress();
        }
      });

      mockPhotoErrorClassificationService.classifyError.mockReturnValue({
        type: PhotoErrorType.UNKNOWN_ERROR,
        severity: 'MEDIUM' as any,
        title: 'Error',
        message: 'Test error',
        userMessage: 'Something went wrong',
        shouldRetry: false,
        maxRetries: 0,
        retryDelay: 0,
        recoveryOptions: [
          { id: 'alt', label: 'Try Alternative', action: 'alternative' },
        ],
      });

      const error = new Error('Test error');
      await photoErrorHandlingService.handleError(error, 'alt_error_test', {
        showUserFeedback: true,
        onAlternativeAction,
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('Error handling recovery action:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});