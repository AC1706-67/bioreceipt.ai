/**
 * Retry Mechanism Tests
 * Unit tests for retry logic and utilities
 */

import {
  withRetry,
  createRetryableFunction,
  isNetworkError,
  isTemporaryError,
  createSubstanceRetryOptions,
} from '../retryMechanism';

describe('Retry Mechanism', () => {
  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await withRetry(mockOperation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const result = await withRetry(mockOperation, { maxAttempts: 3 });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Always fails'));

      const result = await withRetry(mockOperation, { maxAttempts: 2 });

      expect(result.success).toBe(false);
      expect(result.error).toEqual(new Error('Always fails'));
      expect(result.attempts).toBe(2);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should respect retry condition', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Non-retryable'));
      const retryCondition = jest.fn().mockReturnValue(false);

      const result = await withRetry(mockOperation, {
        maxAttempts: 3,
        retryCondition,
        baseDelay: 1, // Very short delay for testing
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(retryCondition).toHaveBeenCalledWith(new Error('Non-retryable'));
    });

    it('should call onRetry callback', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');
      const onRetry = jest.fn();

      const result = await withRetry(mockOperation, {
        maxAttempts: 2,
        onRetry,
      });

      expect(result.success).toBe(true);
      expect(onRetry).toHaveBeenCalledWith(1, new Error('First failure'));
    });

    it('should apply exponential backoff delay', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await withRetry(mockOperation, {
        maxAttempts: 2,
        baseDelay: 100,
        backoffMultiplier: 2,
      });
      const endTime = Date.now();

      // Should have waited at least 100ms for the retry
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it('should cap delay at maxDelay', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await withRetry(mockOperation, {
        maxAttempts: 2,
        baseDelay: 1000,
        maxDelay: 50, // Very low max delay
        backoffMultiplier: 10,
      });
      const endTime = Date.now();

      // Should not have waited more than maxDelay + some buffer
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  describe('createRetryableFunction', () => {
    it('should create a retryable version of a function', async () => {
      const originalFunction = jest.fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');

      const retryableFunction = createRetryableFunction(originalFunction, {
        maxAttempts: 2,
      });

      const result = await retryableFunction('arg1', 'arg2');

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(2);
      expect(originalFunction).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors by name', () => {
      const networkError = new Error('Network failed');
      networkError.name = 'NetworkError';

      expect(isNetworkError(networkError)).toBe(true);
    });

    it('should identify network errors by code', () => {
      const networkError = new Error('Network failed');
      (networkError as any).code = 'NETWORK_ERROR';

      expect(isNetworkError(networkError)).toBe(true);
    });

    it('should identify timeout errors', () => {
      const timeoutError = new Error('Timeout');
      (timeoutError as any).code = 'TIMEOUT';

      expect(isNetworkError(timeoutError)).toBe(true);
    });

    it('should identify HTTP status codes as network errors', () => {
      const httpErrors = [408, 429, 500, 502, 503, 504];

      httpErrors.forEach(status => {
        const error = new Error('HTTP Error');
        (error as any).status = status;

        expect(isNetworkError(error)).toBe(true);
      });
    });

    it('should not identify non-network errors', () => {
      const validationError = new Error('Validation failed');
      expect(isNetworkError(validationError)).toBe(false);

      const httpError = new Error('Bad Request');
      (httpError as any).status = 400;
      expect(isNetworkError(httpError)).toBe(false);

      // Test null/undefined
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });
  });

  describe('isTemporaryError', () => {
    it('should identify temporary error codes', () => {
      const temporaryErrorCodes = [
        'NETWORK_ERROR',
        'TIMEOUT',
        'RATE_LIMITED',
        'SERVER_ERROR',
      ];

      temporaryErrorCodes.forEach(code => {
        const error = new Error('Temporary error');
        (error as any).code = code;

        expect(isTemporaryError(error)).toBe(true);
      });
    });

    it('should identify network errors as temporary', () => {
      const networkError = new Error('Network failed');
      networkError.name = 'NetworkError';

      expect(isTemporaryError(networkError)).toBe(true);
    });

    it('should not identify permanent errors as temporary', () => {
      const permanentErrorCodes = [
        'DUPLICATE_NAME',
        'VALIDATION_ERROR',
        'PERMISSION_DENIED',
      ];

      permanentErrorCodes.forEach(code => {
        const error = new Error('Permanent error');
        (error as any).code = code;

        expect(isTemporaryError(error)).toBe(false);
      });

      // Test null/undefined
      expect(isTemporaryError(null)).toBe(false);
      expect(isTemporaryError(undefined)).toBe(false);
    });
  });

  describe('createSubstanceRetryOptions', () => {
    it('should create appropriate retry options for substance operations', () => {
      const onRetry = jest.fn();
      const options = createSubstanceRetryOptions(onRetry);

      expect(options.maxAttempts).toBe(3);
      expect(options.baseDelay).toBe(1000);
      expect(options.maxDelay).toBe(10000);
      expect(options.backoffMultiplier).toBe(2);
      expect(options.retryCondition).toBe(isTemporaryError);
      expect(options.onRetry).toBe(onRetry);
    });

    it('should work without onRetry callback', () => {
      const options = createSubstanceRetryOptions();

      expect(options.maxAttempts).toBe(3);
      expect(options.retryCondition).toBe(isTemporaryError);
      expect(options.onRetry).toBeUndefined();
    });

    it('should use correct retry condition for substance operations', () => {
      const options = createSubstanceRetryOptions();

      // Should retry temporary errors
      const networkError = new Error('Network failed');
      (networkError as any).code = 'NETWORK_ERROR';
      expect(options.retryCondition!(networkError)).toBe(true);

      // Should not retry permanent errors
      const validationError = new Error('Validation failed');
      (validationError as any).code = 'VALIDATION_ERROR';
      expect(options.retryCondition!(validationError)).toBe(false);

      // Should handle null/undefined
      expect(options.retryCondition!(null)).toBe(false);
      expect(options.retryCondition!(undefined)).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should handle real-world retry scenario', async () => {
      let attemptCount = 0;
      const mockOperation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error('Network timeout');
          (error as any).code = 'TIMEOUT';
          throw error;
        }
        return Promise.resolve('success');
      });

      const onRetry = jest.fn();
      const options = createSubstanceRetryOptions(onRetry);

      const result = await withRetry(mockOperation, options);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-temporary errors', async () => {
      const mockOperation = jest.fn().mockImplementation(() => {
        const error = new Error('Duplicate name');
        (error as any).code = 'DUPLICATE_NAME';
        throw error;
      });

      const onRetry = jest.fn();
      const options = createSubstanceRetryOptions(onRetry);
      options.baseDelay = 1; // Very short delay for testing

      const result = await withRetry(mockOperation, options);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(onRetry).not.toHaveBeenCalled();
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });
});