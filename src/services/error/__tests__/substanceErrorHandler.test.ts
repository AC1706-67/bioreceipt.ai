/**
 * SubstanceErrorHandler Tests
 * Unit tests for comprehensive error handling system
 */

import {
  SubstanceErrorHandler,
  SubstanceError,
  SUBSTANCE_ERROR_MESSAGES,
} from '../substanceErrorHandler';

describe('SubstanceErrorHandler', () => {
  describe('classifyError', () => {
    it('should classify network errors correctly', () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';

      const result = SubstanceErrorHandler.classifyError(networkError);

      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toContain('connection');
    });

    it('should classify timeout errors correctly', () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';

      const result = SubstanceErrorHandler.classifyError(timeoutError);

      expect(result.code).toBe('TIMEOUT');
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toContain('took too long');
    });

    it('should classify duplicate name errors correctly', () => {
      const duplicateError = new Error('Unique constraint violation');
      (duplicateError as any).code = '23505';

      const result = SubstanceErrorHandler.classifyError(duplicateError);

      expect(result.code).toBe('DUPLICATE_NAME');
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toContain('already exists');
    });

    it('should classify permission errors correctly', () => {
      const permissionError = new Error('Insufficient privilege');
      (permissionError as any).code = '42501';

      const result = SubstanceErrorHandler.classifyError(permissionError);

      expect(result.code).toBe('PERMISSION_DENIED');
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toContain('permission');
    });

    it('should classify validation errors correctly', () => {
      const validationError = new Error('Check constraint violation');
      (validationError as any).code = '23514';

      const result = SubstanceErrorHandler.classifyError(validationError);

      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toContain('information');
    });

    it('should classify HTTP status codes correctly', () => {
      const httpError = new Error('Bad Request');
      (httpError as any).status = 400;

      const result = SubstanceErrorHandler.classifyError(httpError);

      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.retryable).toBe(false);
    });

    it('should classify 401/403 as permission denied', () => {
      const authError = new Error('Unauthorized');
      (authError as any).status = 401;

      const result = SubstanceErrorHandler.classifyError(authError);

      expect(result.code).toBe('PERMISSION_DENIED');
      expect(result.retryable).toBe(false);
    });

    it('should classify 409 as duplicate name', () => {
      const conflictError = new Error('Conflict');
      (conflictError as any).status = 409;

      const result = SubstanceErrorHandler.classifyError(conflictError);

      expect(result.code).toBe('DUPLICATE_NAME');
      expect(result.retryable).toBe(false);
    });

    it('should classify 429 as rate limited', () => {
      const rateLimitError = new Error('Too Many Requests');
      (rateLimitError as any).status = 429;

      const result = SubstanceErrorHandler.classifyError(rateLimitError);

      expect(result.code).toBe('RATE_LIMITED');
      expect(result.retryable).toBe(true);
    });

    it('should classify 5xx as server error', () => {
      const serverError = new Error('Internal Server Error');
      (serverError as any).status = 500;

      const result = SubstanceErrorHandler.classifyError(serverError);

      expect(result.code).toBe('SERVER_ERROR');
      expect(result.retryable).toBe(true);
    });

    it('should classify validation errors with validation data', () => {
      const validationErrors = { name: 'Name is required' };
      const error = { validationErrors };

      const result = SubstanceErrorHandler.classifyError(error);

      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.validationErrors).toEqual(validationErrors);
      expect(result.retryable).toBe(false);
    });

    it('should classify errors based on message content', () => {
      const duplicateError = new Error('duplicate key value violates unique constraint');
      const result = SubstanceErrorHandler.classifyError(duplicateError);

      expect(result.code).toBe('DUPLICATE_NAME');
      expect(result.retryable).toBe(false);
    });

    it('should classify network errors based on message content', () => {
      const networkError = new Error('network connection failed');
      const result = SubstanceErrorHandler.classifyError(networkError);

      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.retryable).toBe(true);
    });

    it('should default to unknown error for unrecognized errors', () => {
      const unknownError = new Error('Something weird happened');
      const result = SubstanceErrorHandler.classifyError(unknownError);

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.retryable).toBe(true);
    });
  });

  describe('getUserMessage', () => {
    it('should return proper user message for network error', () => {
      const error: SubstanceError = {
        code: 'NETWORK_ERROR',
        message: 'Network failed',
        userMessage: SUBSTANCE_ERROR_MESSAGES.NETWORK_ERROR.message,
        retryable: true,
      };

      const result = SubstanceErrorHandler.getUserMessage(error);

      expect(result.title).toBe('Connection Problem');
      expect(result.message).toContain('connection');
      expect(result.actionText).toBe('Retry');
    });

    it('should return proper user message for duplicate name error', () => {
      const error: SubstanceError = {
        code: 'DUPLICATE_NAME',
        message: 'Duplicate key',
        userMessage: SUBSTANCE_ERROR_MESSAGES.DUPLICATE_NAME.message,
        retryable: false,
      };

      const result = SubstanceErrorHandler.getUserMessage(error);

      expect(result.title).toBe('Substance Already Exists');
      expect(result.message).toContain('already exists');
      expect(result.actionText).toBeUndefined();
    });

    it('should return proper user message for validation error', () => {
      const error: SubstanceError = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        userMessage: SUBSTANCE_ERROR_MESSAGES.VALIDATION_ERROR.message,
        retryable: false,
      };

      const result = SubstanceErrorHandler.getUserMessage(error);

      expect(result.title).toBe('Invalid Information');
      expect(result.message).toContain('information');
      expect(result.actionText).toBeUndefined();
    });
  });

  describe('isRetryable', () => {
    it('should return true for retryable errors', () => {
      const retryableError: SubstanceError = {
        code: 'NETWORK_ERROR',
        message: 'Network failed',
        userMessage: 'Network error',
        retryable: true,
      };

      expect(SubstanceErrorHandler.isRetryable(retryableError)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const nonRetryableError: SubstanceError = {
        code: 'DUPLICATE_NAME',
        message: 'Duplicate key',
        userMessage: 'Duplicate name',
        retryable: false,
      };

      expect(SubstanceErrorHandler.isRetryable(nonRetryableError)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should return appropriate delay for network errors', () => {
      const networkError: SubstanceError = {
        code: 'NETWORK_ERROR',
        message: 'Network failed',
        userMessage: 'Network error',
        retryable: true,
      };

      const delay1 = SubstanceErrorHandler.getRetryDelay(networkError, 1);
      const delay2 = SubstanceErrorHandler.getRetryDelay(networkError, 2);

      expect(delay1).toBe(2000); // 2 seconds (base * 2^(attempt-1))
      expect(delay2).toBe(4000); // 4 seconds (exponential backoff)
      expect(delay1).toBeLessThan(delay2);
    });

    it('should return longer delay for rate limited errors', () => {
      const rateLimitError: SubstanceError = {
        code: 'RATE_LIMITED',
        message: 'Rate limited',
        userMessage: 'Too many requests',
        retryable: true,
      };

      const delay1 = SubstanceErrorHandler.getRetryDelay(rateLimitError, 1);
      const networkDelay1 = SubstanceErrorHandler.getRetryDelay({
        code: 'NETWORK_ERROR',
        message: 'Network failed',
        userMessage: 'Network error',
        retryable: true,
      }, 1);

      expect(delay1).toBeGreaterThan(networkDelay1);
    });

    it('should cap delay at maximum value', () => {
      const error: SubstanceError = {
        code: 'NETWORK_ERROR',
        message: 'Network failed',
        userMessage: 'Network error',
        retryable: true,
      };

      const delay = SubstanceErrorHandler.getRetryDelay(error, 10);
      expect(delay).toBeLessThanOrEqual(30000); // Max 30 seconds
    });
  });

  describe('logError', () => {
    it('should log error with proper context', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const error: SubstanceError = {
        code: 'NETWORK_ERROR',
        message: 'Network failed',
        userMessage: 'Network error',
        retryable: true,
      };

      SubstanceErrorHandler.logError(error, 'test context');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SubstanceError] test context:',
        expect.objectContaining({
          code: 'NETWORK_ERROR',
          message: 'Network failed',
          userMessage: 'Network error',
          retryable: true,
          timestamp: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Message Coverage', () => {
    it('should have messages for all error codes', () => {
      const errorCodes = [
        'NETWORK_ERROR',
        'DUPLICATE_NAME',
        'VALIDATION_ERROR',
        'PERMISSION_DENIED',
        'RATE_LIMITED',
        'SERVER_ERROR',
        'TIMEOUT',
        'UNKNOWN_ERROR',
      ];

      errorCodes.forEach(code => {
        expect(SUBSTANCE_ERROR_MESSAGES[code as keyof typeof SUBSTANCE_ERROR_MESSAGES]).toBeDefined();
        expect(SUBSTANCE_ERROR_MESSAGES[code as keyof typeof SUBSTANCE_ERROR_MESSAGES].title).toBeTruthy();
        expect(SUBSTANCE_ERROR_MESSAGES[code as keyof typeof SUBSTANCE_ERROR_MESSAGES].message).toBeTruthy();
        expect(typeof SUBSTANCE_ERROR_MESSAGES[code as keyof typeof SUBSTANCE_ERROR_MESSAGES].retryable).toBe('boolean');
      });
    });

    it('should have appropriate retry flags for each error type', () => {
      // Retryable errors
      expect(SUBSTANCE_ERROR_MESSAGES.NETWORK_ERROR.retryable).toBe(true);
      expect(SUBSTANCE_ERROR_MESSAGES.TIMEOUT.retryable).toBe(true);
      expect(SUBSTANCE_ERROR_MESSAGES.RATE_LIMITED.retryable).toBe(true);
      expect(SUBSTANCE_ERROR_MESSAGES.SERVER_ERROR.retryable).toBe(true);
      expect(SUBSTANCE_ERROR_MESSAGES.UNKNOWN_ERROR.retryable).toBe(true);

      // Non-retryable errors
      expect(SUBSTANCE_ERROR_MESSAGES.DUPLICATE_NAME.retryable).toBe(false);
      expect(SUBSTANCE_ERROR_MESSAGES.VALIDATION_ERROR.retryable).toBe(false);
      expect(SUBSTANCE_ERROR_MESSAGES.PERMISSION_DENIED.retryable).toBe(false);
    });
  });
});