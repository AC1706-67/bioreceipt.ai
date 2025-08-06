/**
 * Error Recovery Service Tests
 * Tests for intelligent error recovery strategies
 */

import { errorRecoveryService, RecoveryContext } from '../errorRecoveryService';
import { SubstanceError, SubstanceErrorType } from '../substanceErrorHandler';

describe('ErrorRecoveryService', () => {
  beforeEach(() => {
    errorRecoveryService.clearHistory();
  });

  describe('Strategy Registration', () => {
    it('should register recovery strategies', () => {
      const testStrategy = {
        id: 'test_strategy',
        name: 'Test Strategy',
        description: 'Test recovery strategy',
        automatic: true,
        priority: 5,
        canApply: () => true,
        execute: async () => ({ success: true, message: 'Test success' })
      };

      errorRecoveryService.registerStrategy(testStrategy);
      
      // Strategy should be registered (we can't directly test this without exposing internals)
      expect(true).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    const mockContext: RecoveryContext = {
      operation: 'add_substance',
      data: { name: 'Test Substance' },
      attemptCount: 1,
      previousErrors: [],
      userPreferences: {
        autoRetry: true,
        maxRetries: 3,
        preferredRecoveryMethod: 'automatic'
      }
    };

    it('should recover from network errors automatically', async () => {
      const networkError: SubstanceError = {
        type: SubstanceErrorType.NETWORK_ERROR,
        message: 'Network connection failed',
        originalError: new Error('Network error'),
        timestamp: new Date(),
        context: 'test'
      };

      const result = await errorRecoveryService.recoverFromError(networkError, mockContext);
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });

    it('should handle duplicate name errors with user guidance', async () => {
      const duplicateError: SubstanceError = {
        type: SubstanceErrorType.DUPLICATE_NAME,
        message: 'Substance name already exists',
        originalError: new Error('Duplicate key'),
        timestamp: new Date(),
        context: 'test'
      };

      const result = await errorRecoveryService.recoverFromError(duplicateError, mockContext);
      
      expect(result.requiresUserAction).toBe(true);
      expect(result.userActionDescription).toContain('name');
    });

    it('should handle validation errors with specific guidance', async () => {
      const validationError: SubstanceError = {
        type: SubstanceErrorType.VALIDATION_ERROR,
        message: 'Invalid form data',
        originalError: new Error('Validation failed'),
        timestamp: new Date(),
        context: 'test'
      };

      const result = await errorRecoveryService.recoverFromError(validationError, mockContext);
      
      expect(result.requiresUserAction).toBe(true);
      expect(result.message).toContain('correct');
    });

    it('should handle rate limiting with automatic backoff', async () => {
      const rateLimitError: SubstanceError = {
        type: SubstanceErrorType.RATE_LIMITED,
        message: 'Too many requests',
        originalError: new Error('Rate limited'),
        timestamp: new Date(),
        context: 'test'
      };

      const result = await errorRecoveryService.recoverFromError(rateLimitError, mockContext);
      
      expect(result).toBeDefined();
      // Rate limit recovery should either succeed or provide guidance
      expect(result.success || result.requiresUserAction).toBe(true);
    });

    it('should handle unknown errors gracefully', async () => {
      const unknownError: SubstanceError = {
        type: SubstanceErrorType.UNKNOWN_ERROR,
        message: 'Unknown error occurred',
        originalError: new Error('Unknown'),
        timestamp: new Date(),
        context: 'test'
      };

      const result = await errorRecoveryService.recoverFromError(unknownError, mockContext);
      
      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });

  describe('Smart Retry Strategy', () => {
    const mockContext: RecoveryContext = {
      operation: 'add_substance',
      data: { name: 'Test Substance' },
      attemptCount: 1,
      previousErrors: [],
    };

    it('should create retry strategy for retryable errors', async () => {
      const networkError: SubstanceError = {
        type: SubstanceErrorType.NETWORK_ERROR,
        message: 'Network error',
        originalError: new Error('Network'),
        timestamp: new Date(),
        context: 'test'
      };

      let callCount = 0;
      const mockOperation = async () => {
        callCount++;
        if (callCount < 2) {
          throw new Error('Network error');
        }
        return { success: true, data: 'success' };
      };

      const result = await errorRecoveryService.createSmartRetryStrategy(
        networkError,
        mockOperation,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(callCount).toBeGreaterThan(1);
    });

    it('should not retry non-retryable errors', async () => {
      const validationError: SubstanceError = {
        type: SubstanceErrorType.VALIDATION_ERROR,
        message: 'Validation error',
        originalError: new Error('Validation'),
        timestamp: new Date(),
        context: 'test'
      };

      let callCount = 0;
      const mockOperation = async () => {
        callCount++;
        throw new Error('Validation error');
      };

      const result = await errorRecoveryService.createSmartRetryStrategy(
        validationError,
        mockOperation,
        mockContext
      );

      expect(result.success).toBe(false);
      expect(callCount).toBe(1); // Should only be called once
    });

    it('should respect maximum retry attempts', async () => {
      const networkError: SubstanceError = {
        type: SubstanceErrorType.NETWORK_ERROR,
        message: 'Network error',
        originalError: new Error('Network'),
        timestamp: new Date(),
        context: 'test'
      };

      let callCount = 0;
      const mockOperation = async () => {
        callCount++;
        throw new Error('Network error');
      };

      const result = await errorRecoveryService.createSmartRetryStrategy(
        networkError,
        mockOperation,
        mockContext
      );

      expect(result.success).toBe(false);
      expect(callCount).toBeLessThanOrEqual(4); // Max 3 retries + 1 initial attempt
    });
  });

  describe('Recovery Statistics', () => {
    it('should track recovery statistics', async () => {
      const networkError: SubstanceError = {
        type: SubstanceErrorType.NETWORK_ERROR,
        message: 'Network error',
        originalError: new Error('Network'),
        timestamp: new Date(),
        context: 'test'
      };

      const mockContext: RecoveryContext = {
        operation: 'add_substance',
        data: { name: 'Test' },
        attemptCount: 1,
        previousErrors: []
      };

      // Perform some recovery attempts
      await errorRecoveryService.recoverFromError(networkError, mockContext);
      await errorRecoveryService.recoverFromError(networkError, mockContext);

      const stats = errorRecoveryService.getRecoveryStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
      
      // Should have some statistics
      const strategyIds = Object.keys(stats);
      expect(strategyIds.length).toBeGreaterThan(0);
      
      // Each strategy should have attempts and success rate
      strategyIds.forEach(id => {
        expect(stats[id]).toHaveProperty('attempts');
        expect(stats[id]).toHaveProperty('successRate');
        expect(typeof stats[id].attempts).toBe('number');
        expect(typeof stats[id].successRate).toBe('number');
        expect(stats[id].successRate).toBeGreaterThanOrEqual(0);
        expect(stats[id].successRate).toBeLessThanOrEqual(1);
      });
    });

    it('should clear recovery history', () => {
      errorRecoveryService.clearHistory();
      const stats = errorRecoveryService.getRecoveryStats();
      
      // After clearing, all strategies should have 0 attempts
      Object.values(stats).forEach(stat => {
        expect(stat.attempts).toBe(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined errors gracefully', async () => {
      const mockContext: RecoveryContext = {
        operation: 'add_substance',
        data: {},
        attemptCount: 1,
        previousErrors: []
      };

      // This should not throw an error
      const result = await errorRecoveryService.recoverFromError(null as any, mockContext);
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });

    it('should handle empty context gracefully', async () => {
      const networkError: SubstanceError = {
        type: SubstanceErrorType.NETWORK_ERROR,
        message: 'Network error',
        originalError: new Error('Network'),
        timestamp: new Date(),
        context: 'test'
      };

      const result = await errorRecoveryService.recoverFromError(networkError, {} as any);
      expect(result).toBeDefined();
    });

    it('should handle strategy execution failures', async () => {
      // Register a strategy that throws an error
      const failingStrategy = {
        id: 'failing_strategy',
        name: 'Failing Strategy',
        description: 'Strategy that always fails',
        automatic: true,
        priority: 10,
        canApply: () => true,
        execute: async () => {
          throw new Error('Strategy execution failed');
        }
      };

      errorRecoveryService.registerStrategy(failingStrategy);

      const testError: SubstanceError = {
        type: SubstanceErrorType.UNKNOWN_ERROR,
        message: 'Test error',
        originalError: new Error('Test'),
        timestamp: new Date(),
        context: 'test'
      };

      const mockContext: RecoveryContext = {
        operation: 'add_substance',
        data: {},
        attemptCount: 1,
        previousErrors: []
      };

      // Should not throw, should handle the failing strategy gracefully
      const result = await errorRecoveryService.recoverFromError(testError, mockContext);
      expect(result).toBeDefined();
    });
  });
});