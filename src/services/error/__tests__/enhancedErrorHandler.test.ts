/**
 * Enhanced Error Handler Tests
 * Comprehensive tests for the enhanced error handling system
 */

import { enhancedErrorHandler } from '../enhancedErrorHandler';
import {
  ErrorCategory,
  ErrorSeverity,
  ErrorRecoveryStrategy,
  EnhancedError
} from '../../../types/errors';
import { loggingService } from '../../logging/loggingService';
import { analyticsService } from '../../analytics/analyticsService';

// Mock dependencies
jest.mock('../../logging/loggingService');
jest.mock('../../analytics/analyticsService');
jest.mock('../../../utils/storage');

describe('EnhancedErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleError', () => {
    it('should create enhanced error with proper classification', async () => {
      const originalError = new Error('Network request failed');
      
      const enhancedError = await enhancedErrorHandler.handleError(originalError);
      
      expect(enhancedError.errorId).toBeDefined();
      expect(enhancedError.category).toBe(ErrorCategory.NETWORK);
      expect(enhancedError.severity).toBeDefined();
      expect(enhancedError.userMessage).toBeDefined();
      expect(enhancedError.timestamp).toBeInstanceOf(Date);
    });

    it('should enrich context with additional information', async () => {
      const originalError = new Error('Test error');
      const context = {
        currentScreen: 'HomeScreen',
        feature: 'tips'
      };
      
      const enhancedError = await enhancedErrorHandler.handleError(originalError, context);
      
      expect(enhancedError.context.currentScreen).toBe('HomeScreen');
      expect(enhancedError.context.feature).toBe('tips');
      expect(enhancedError.context.appVersion).toBeDefined();
      expect(enhancedError.context.correlationId).toBeDefined();
    });

    it('should log error with proper details', async () => {
      const originalError = new Error('Test error');
      
      await enhancedErrorHandler.handleError(originalError);
      
      expect(loggingService.error).toHaveBeenCalledWith(
        'Enhanced error occurred',
        expect.objectContaining({
          errorId: expect.any(String),
          category: expect.any(String),
          severity: expect.any(String),
          message: 'Test error'
        })
      );
    });

    it('should track error analytics', async () => {
      const originalError = new Error('Test error');
      
      await enhancedErrorHandler.handleError(originalError);
      
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        'error_occurred',
        expect.objectContaining({
          errorId: expect.any(String),
          category: expect.any(String),
          severity: expect.any(String)
        })
      );
    });

    it('should skip logging when requested', async () => {
      const originalError = new Error('Test error');
      
      await enhancedErrorHandler.handleError(originalError, {}, { skipLogging: true });
      
      expect(loggingService.error).not.toHaveBeenCalled();
    });

    it('should skip analytics when requested', async () => {
      const originalError = new Error('Test error');
      
      await enhancedErrorHandler.handleError(originalError, {}, { skipAnalytics: true });
      
      expect(analyticsService.trackEvent).not.toHaveBeenCalled();
    });

    it('should use custom error code when provided', async () => {
      const originalError = new Error('Test error');
      const customErrorCode = 'CUSTOM_001';
      
      const enhancedError = await enhancedErrorHandler.handleError(
        originalError, 
        {}, 
        { customErrorCode }
      );
      
      expect(enhancedError.errorCode).toBe(customErrorCode);
    });

    it('should handle error handler failures gracefully', async () => {
      // Mock a failure in the error handling process
      (loggingService.error as jest.Mock).mockRejectedValue(new Error('Logging failed'));
      
      const originalError = new Error('Test error');
      
      const enhancedError = await enhancedErrorHandler.handleError(originalError);
      
      // Should still return an enhanced error even if logging fails
      expect(enhancedError).toBeDefined();
      expect(enhancedError.errorId).toBeDefined();
    });
  });

  describe('error classification', () => {
    it('should classify network errors correctly', async () => {
      const networkError = new Error('fetch failed: connection timeout');
      
      const enhancedError = await enhancedErrorHandler.handleError(networkError);
      
      expect(enhancedError.category).toBe(ErrorCategory.NETWORK);
      expect(enhancedError.errorCode).toBe('NET_001');
    });

    it('should classify API errors correctly', async () => {
      const apiError = new Error('HTTP 500 server error');
      
      const enhancedError = await enhancedErrorHandler.handleError(apiError);
      
      expect(enhancedError.category).toBe(ErrorCategory.API);
      expect(enhancedError.errorCode).toBe('API_001');
    });

    it('should classify authentication errors correctly', async () => {
      const authError = new Error('token expired');
      
      const enhancedError = await enhancedErrorHandler.handleError(authError);
      
      expect(enhancedError.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(enhancedError.errorCode).toBe('AUTH_001');
    });

    it('should classify UI component errors correctly', async () => {
      const uiError = new Error('component render failed');
      
      const enhancedError = await enhancedErrorHandler.handleError(uiError);
      
      expect(enhancedError.category).toBe(ErrorCategory.UI_COMPONENT);
      expect(enhancedError.errorCode).toBe('UI_001');
    });

    it('should classify unknown errors correctly', async () => {
      const unknownError = new Error('some random error');
      
      const enhancedError = await enhancedErrorHandler.handleError(unknownError);
      
      expect(enhancedError.category).toBe(ErrorCategory.UNKNOWN);
      expect(enhancedError.errorCode).toBe('UNKNOWN_001');
    });
  });

  describe('severity determination', () => {
    it('should assign critical severity for auth errors on login screen', async () => {
      const authError = new Error('authentication failed');
      const context = { currentScreen: 'login' };
      
      const enhancedError = await enhancedErrorHandler.handleError(authError, context);
      
      expect(enhancedError.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should assign high severity for network errors', async () => {
      const networkError = new Error('network connection failed');
      
      const enhancedError = await enhancedErrorHandler.handleError(networkError);
      
      expect(enhancedError.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should assign medium severity for UI errors', async () => {
      const uiError = new Error('component render error');
      
      const enhancedError = await enhancedErrorHandler.handleError(uiError);
      
      expect(enhancedError.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should assign low severity for validation errors', async () => {
      const validationError = new Error('invalid input format');
      
      const enhancedError = await enhancedErrorHandler.handleError(validationError);
      
      expect(enhancedError.severity).toBe(ErrorSeverity.LOW);
    });
  });

  describe('recovery actions', () => {
    it('should generate retry action for retryable errors', async () => {
      const networkError = new Error('network timeout');
      
      const enhancedError = await enhancedErrorHandler.handleError(networkError);
      
      expect(enhancedError.recoveryActions).toBeDefined();
      const retryAction = enhancedError.recoveryActions?.find(action => action.id === 'retry');
      expect(retryAction).toBeDefined();
      expect(retryAction?.primary).toBe(true);
    });

    it('should generate sign in action for auth errors', async () => {
      const authError = new Error('unauthorized access');
      
      const enhancedError = await enhancedErrorHandler.handleError(authError);
      
      expect(enhancedError.recoveryActions).toBeDefined();
      const signInAction = enhancedError.recoveryActions?.find(action => action.id === 'signin');
      expect(signInAction).toBeDefined();
    });

    it('should always include dismiss action', async () => {
      const error = new Error('any error');
      
      const enhancedError = await enhancedErrorHandler.handleError(error);
      
      expect(enhancedError.recoveryActions).toBeDefined();
      const dismissAction = enhancedError.recoveryActions?.find(action => action.id === 'dismiss');
      expect(dismissAction).toBeDefined();
    });
  });

  describe('error listeners', () => {
    it('should notify listeners when error occurs', async () => {
      const listener = jest.fn();
      enhancedErrorHandler.addErrorListener(listener);
      
      const error = new Error('test error');
      await enhancedErrorHandler.handleError(error);
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        message: 'test error'
      }));
      
      enhancedErrorHandler.removeErrorListener(listener);
    });

    it('should handle listener errors gracefully', async () => {
      const faultyListener = jest.fn().mockImplementation(() => {
        throw new Error('listener error');
      });
      enhancedErrorHandler.addErrorListener(faultyListener);
      
      const error = new Error('test error');
      
      // Should not throw even if listener fails
      await expect(enhancedErrorHandler.handleError(error)).resolves.toBeDefined();
      
      enhancedErrorHandler.removeErrorListener(faultyListener);
    });
  });

  describe('error statistics', () => {
    it('should provide error statistics', async () => {
      // Generate some errors
      await enhancedErrorHandler.handleError(new Error('network error'));
      await enhancedErrorHandler.handleError(new Error('api error'));
      await enhancedErrorHandler.handleError(new Error('ui error'));
      
      const stats = enhancedErrorHandler.getErrorStatistics();
      
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.errorsByCategory).toBeDefined();
      expect(stats.errorsBySeverity).toBeDefined();
      expect(typeof stats.resolvedErrors).toBe('number');
      expect(typeof stats.pendingRetries).toBe('number');
    });

    it('should track errors by category', async () => {
      await enhancedErrorHandler.handleError(new Error('network timeout'));
      await enhancedErrorHandler.handleError(new Error('api server error'));
      
      const stats = enhancedErrorHandler.getErrorStatistics();
      
      expect(stats.errorsByCategory[ErrorCategory.NETWORK]).toBeGreaterThan(0);
      expect(stats.errorsByCategory[ErrorCategory.API]).toBeGreaterThan(0);
    });

    it('should track errors by severity', async () => {
      await enhancedErrorHandler.handleError(new Error('critical system failure'));
      await enhancedErrorHandler.handleError(new Error('validation error'));
      
      const stats = enhancedErrorHandler.getErrorStatistics();
      
      expect(Object.values(stats.errorsBySeverity).some(count => count > 0)).toBe(true);
    });
  });

  describe('recent errors', () => {
    it('should return recent errors', async () => {
      await enhancedErrorHandler.handleError(new Error('error 1'));
      await enhancedErrorHandler.handleError(new Error('error 2'));
      
      const recentErrors = enhancedErrorHandler.getRecentErrors(10);
      
      expect(recentErrors.length).toBeGreaterThan(0);
      expect(recentErrors[0].timestamp).toBeInstanceOf(Date);
    });

    it('should limit number of returned errors', async () => {
      // Generate multiple errors
      for (let i = 0; i < 10; i++) {
        await enhancedErrorHandler.handleError(new Error(`error ${i}`));
      }
      
      const recentErrors = enhancedErrorHandler.getRecentErrors(5);
      
      expect(recentErrors.length).toBeLessThanOrEqual(5);
    });

    it('should return errors in chronological order (newest first)', async () => {
      await enhancedErrorHandler.handleError(new Error('older error'));
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await enhancedErrorHandler.handleError(new Error('newer error'));
      
      const recentErrors = enhancedErrorHandler.getRecentErrors(10);
      
      expect(recentErrors.length).toBeGreaterThanOrEqual(2);
      expect(recentErrors[0].timestamp.getTime()).toBeGreaterThan(recentErrors[1].timestamp.getTime());
    });
  });

  describe('error context enrichment', () => {
    it('should add device information to context', async () => {
      const error = new Error('test error');
      
      const enhancedError = await enhancedErrorHandler.handleError(error);
      
      expect(enhancedError.context.deviceInfo).toBeDefined();
      expect(enhancedError.context.deviceInfo.platform).toBeDefined();
      expect(enhancedError.context.deviceInfo.version).toBeDefined();
    });

    it('should add app information to context', async () => {
      const error = new Error('test error');
      
      const enhancedError = await enhancedErrorHandler.handleError(error);
      
      expect(enhancedError.context.appVersion).toBeDefined();
      expect(enhancedError.context.buildNumber).toBeDefined();
      expect(enhancedError.context.environment).toBeDefined();
    });

    it('should generate correlation ID', async () => {
      const error = new Error('test error');
      
      const enhancedError = await enhancedErrorHandler.handleError(error);
      
      expect(enhancedError.context.correlationId).toBeDefined();
      expect(typeof enhancedError.context.correlationId).toBe('string');
    });

    it('should preserve provided context', async () => {
      const error = new Error('test error');
      const context = {
        currentScreen: 'TestScreen',
        feature: 'testing',
        action: 'test_action'
      };
      
      const enhancedError = await enhancedErrorHandler.handleError(error, context);
      
      expect(enhancedError.context.currentScreen).toBe('TestScreen');
      expect(enhancedError.context.feature).toBe('testing');
      expect(enhancedError.context.action).toBe('test_action');
    });
  });

  describe('actionable messages', () => {
    it('should generate actionable message for network errors', async () => {
      const networkError = new Error('connection timeout');
      
      const enhancedError = await enhancedErrorHandler.handleError(networkError);
      
      expect(enhancedError.actionableMessage).toBeDefined();
      expect(enhancedError.actionableMessage).toContain('signal area');
    });

    it('should generate actionable message for auth errors', async () => {
      const authError = new Error('token expired');
      
      const enhancedError = await enhancedErrorHandler.handleError(authError);
      
      expect(enhancedError.actionableMessage).toBeDefined();
      expect(enhancedError.actionableMessage).toContain('Sign In');
    });

    it('should not generate actionable message for non-actionable errors', async () => {
      const error = new Error('internal system error');
      
      const enhancedError = await enhancedErrorHandler.handleError(error, {}, {
        customErrorCode: 'SYSTEM_001' // Assuming this is not actionable
      });
      
      // Should either be undefined or not contain specific user actions
      if (enhancedError.actionableMessage) {
        expect(enhancedError.actionableMessage).toBe(enhancedError.userMessage);
      }
    });
  });
});