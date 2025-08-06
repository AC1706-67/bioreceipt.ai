/**
 * Substance Addition Flow - Integration Tests
 * Service-level integration testing without UI components
 */

import { substanceDatabase } from '../../services/substance/substanceDatabase';
import { SubstanceErrorHandler } from '../../services/error/substanceErrorHandler';
import { withRetry } from '../../utils/retryMechanism';
import { validateNewSubstance } from '../../utils/substanceValidation';
import { NewSubstance } from '../../models/NewSubstance';
import { SubstanceCategory } from '../../models/Substance';

// Mock Supabase
const mockSupabaseHelpers = {
  addCustomSubstance: jest.fn(),
  getSubstances: jest.fn(),
  getCategories: jest.fn(),
};

jest.mock('../../config/supabase', () => ({
  supabaseHelpers: mockSupabaseHelpers,
  Database: {},
}));

describe('Substance Addition Flow - Integration Tests', () => {
  const validSubstance: NewSubstance = {
    name: 'Integration Test Substance',
    category: SubstanceCategory.SUPPLEMENTS,
    defaultUnit: 'mg',
    description: 'A substance for integration testing'
  };

  const mockCategories = [
    { id: 'supplements-id', name: 'supplements' },
    { id: 'food-id', name: 'food' },
    { id: 'alcohol-id', name: 'alcohol' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock category mapping
    (substanceDatabase as any).getCategoryId = jest.fn().mockResolvedValue('supplements-id');
    (substanceDatabase as any).getExistingSubstanceNames = jest.fn().mockResolvedValue([]);
    (substanceDatabase as any).refreshSubstanceCache = jest.fn().mockResolvedValue(undefined);
  });

  describe('Successful Flow Integration', () => {
    it('should complete full substance addition flow successfully', async () => {
      // Mock successful database insertion
      const mockInsertedSubstance = {
        id: 'integration-test-1',
        name: 'Integration Test Substance',
        category_id: 'supplements-id',
        default_unit: 'mg',
        description: 'A substance for integration testing',
        created_at: '2024-01-01T00:00:00Z',
        substance_categories: {
          id: 'supplements-id',
          name: 'supplements'
        }
      };

      mockSupabaseHelpers.addCustomSubstance.mockResolvedValue(mockInsertedSubstance);

      // Execute the complete flow
      const result = await substanceDatabase.addCustomSubstance(validSubstance);

      // Verify success
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInsertedSubstance);
      expect(result.error).toBeUndefined();

      // Verify all steps were executed
      expect(mockSupabaseHelpers.addCustomSubstance).toHaveBeenCalledWith({
        name: 'Integration Test Substance',
        category_id: 'supplements-id',
        default_unit: 'mg',
        description: 'A substance for integration testing'
      });
    });

    it('should integrate validation, error handling, and retry mechanisms', async () => {
      let attemptCount = 0;
      const retryCallback = jest.fn();

      // Mock network error followed by success
      mockSupabaseHelpers.addCustomSubstance.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          const error = new Error('Network timeout');
          (error as any).code = 'NETWORK_ERROR';
          throw error;
        }
        return Promise.resolve({
          id: 'retry-success-1',
          name: 'Integration Test Substance',
          category_id: 'supplements-id',
          default_unit: 'mg',
          description: 'A substance for integration testing',
          created_at: '2024-01-01T00:00:00Z',
          substance_categories: {
            id: 'supplements-id',
            name: 'supplements'
          }
        });
      });

      // Execute with retry callback
      const result = await substanceDatabase.addCustomSubstance(validSubstance, retryCallback);

      // Verify success after retry
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('retry-success-1');
      expect(retryCallback).toHaveBeenCalledWith(1, expect.any(Object));
      expect(mockSupabaseHelpers.addCustomSubstance).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Scenario Integration', () => {
    it('should handle validation errors through complete flow', async () => {
      const invalidSubstance: NewSubstance = {
        name: '', // Invalid: empty name
        category: SubstanceCategory.SUPPLEMENTS,
        defaultUnit: 'mg',
        description: 'Invalid substance'
      };

      const result = await substanceDatabase.addCustomSubstance(invalidSubstance);

      // Verify validation error handling
      expect(result.success).toBe(false);
      expect(result.validationErrors?.name).toBeTruthy();
      expect(result.substanceError?.code).toBe('VALIDATION_ERROR');

      // Verify database was not called
      expect(mockSupabaseHelpers.addCustomSubstance).not.toHaveBeenCalled();
    });

    it('should handle duplicate name errors with proper classification', async () => {
      // Mock existing substance names
      (substanceDatabase as any).getExistingSubstanceNames = jest.fn()
        .mockResolvedValue(['Integration Test Substance']);

      const result = await substanceDatabase.addCustomSubstance(validSubstance);

      // Verify duplicate error handling
      expect(result.success).toBe(false);
      expect(result.substanceError?.code).toBe('DUPLICATE_NAME');
      expect(result.error).toContain('already exists');

      // Verify database was not called due to pre-check
      expect(mockSupabaseHelpers.addCustomSubstance).not.toHaveBeenCalled();
    });

    it('should handle database constraint violations', async () => {
      // Mock database constraint violation
      const constraintError = new Error('duplicate key value violates unique constraint');
      (constraintError as any).code = '23505';
      
      mockSupabaseHelpers.addCustomSubstance.mockRejectedValue(constraintError);

      const result = await substanceDatabase.addCustomSubstance(validSubstance);

      // Verify error classification and handling
      expect(result.success).toBe(false);
      expect(result.substanceError?.code).toBe('DUPLICATE_NAME');
      expect(SubstanceErrorHandler.isRetryable(result.substanceError!)).toBe(false);
    });

    it('should handle permission denied errors', async () => {
      // Mock permission error
      const permissionError = new Error('insufficient privileges');
      (permissionError as any).code = '42501';
      
      mockSupabaseHelpers.addCustomSubstance.mockRejectedValue(permissionError);

      const result = await substanceDatabase.addCustomSubstance(validSubstance);

      // Verify permission error handling
      expect(result.success).toBe(false);
      expect(result.substanceError?.code).toBe('PERMISSION_DENIED');
      expect(result.error).toContain('permission');
    });
  });

  describe('Retry Mechanism Integration', () => {
    it('should retry network errors with exponential backoff', async () => {
      let attemptCount = 0;
      const retryCallback = jest.fn();

      mockSupabaseHelpers.addCustomSubstance.mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          const error = new Error('Network error');
          (error as any).code = 'NETWORK_ERROR';
          throw error;
        }
        return Promise.resolve({
          id: 'network-retry-success',
          name: 'Integration Test Substance',
          category_id: 'supplements-id',
          default_unit: 'mg',
          description: 'A substance for integration testing',
          created_at: '2024-01-01T00:00:00Z',
          substance_categories: {
            id: 'supplements-id',
            name: 'supplements'
          }
        });
      });

      const startTime = Date.now();
      const result = await substanceDatabase.addCustomSubstance(validSubstance, retryCallback);
      const endTime = Date.now();

      // Verify success after retries
      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
      expect(retryCallback).toHaveBeenCalledTimes(2);

      // Verify exponential backoff timing (should take at least 3 seconds: 1s + 2s)
      expect(endTime - startTime).toBeGreaterThan(3000);
    });

    it('should not retry non-retryable errors', async () => {
      const retryCallback = jest.fn();

      // Mock validation error (non-retryable)
      const validationError = new Error('validation failed');
      (validationError as any).code = 'VALIDATION_ERROR';
      
      mockSupabaseHelpers.addCustomSubstance.mockRejectedValue(validationError);

      const result = await substanceDatabase.addCustomSubstance(validSubstance, retryCallback);

      // Verify no retry for non-retryable error
      expect(result.success).toBe(false);
      expect(retryCallback).not.toHaveBeenCalled();
      expect(mockSupabaseHelpers.addCustomSubstance).toHaveBeenCalledTimes(1);
    });

    it('should fail after maximum retry attempts', async () => {
      const retryCallback = jest.fn();

      // Mock persistent network error
      const networkError = new Error('Persistent network error');
      (networkError as any).code = 'NETWORK_ERROR';
      
      mockSupabaseHelpers.addCustomSubstance.mockRejectedValue(networkError);

      const result = await substanceDatabase.addCustomSubstance(validSubstance, retryCallback);

      // Verify failure after max retries
      expect(result.success).toBe(false);
      expect(result.substanceError?.code).toBe('NETWORK_ERROR');
      expect(retryCallback).toHaveBeenCalledTimes(3); // Default max attempts
      expect(mockSupabaseHelpers.addCustomSubstance).toHaveBeenCalledTimes(3);
    });
  });

  describe('Data Flow Integration', () => {
    it('should maintain data integrity through complete flow', async () => {
      const mockInsertedSubstance = {
        id: 'data-integrity-test',
        name: 'Integration Test Substance',
        category_id: 'supplements-id',
        default_unit: 'mg',
        description: 'A substance for integration testing',
        created_at: '2024-01-01T00:00:00Z',
        substance_categories: {
          id: 'supplements-id',
          name: 'supplements'
        }
      };

      mockSupabaseHelpers.addCustomSubstance.mockResolvedValue(mockInsertedSubstance);

      // Execute flow
      const result = await substanceDatabase.addCustomSubstance(validSubstance);

      // Verify data transformation and integrity
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInsertedSubstance);

      // Verify input was properly sanitized and transformed
      expect(mockSupabaseHelpers.addCustomSubstance).toHaveBeenCalledWith({
        name: 'Integration Test Substance', // Should be trimmed
        category_id: 'supplements-id', // Should be mapped from enum
        default_unit: 'mg', // Should be lowercase
        description: 'A substance for integration testing'
      });
    });

    it('should handle cache updates after successful insertion', async () => {
      const mockRefreshCache = jest.fn().mockResolvedValue(undefined);
      (substanceDatabase as any).refreshSubstanceCache = mockRefreshCache;

      const mockInsertedSubstance = {
        id: 'cache-test',
        name: 'Integration Test Substance',
        category_id: 'supplements-id',
        default_unit: 'mg',
        description: 'A substance for integration testing',
        created_at: '2024-01-01T00:00:00Z',
        substance_categories: {
          id: 'supplements-id',
          name: 'supplements'
        }
      };

      mockSupabaseHelpers.addCustomSubstance.mockResolvedValue(mockInsertedSubstance);

      const result = await substanceDatabase.addCustomSubstance(validSubstance);

      // Verify cache refresh was called
      expect(result.success).toBe(true);
      expect(mockRefreshCache).toHaveBeenCalled();
    });

    it('should handle cache refresh failures gracefully', async () => {
      const mockRefreshCache = jest.fn().mockRejectedValue(new Error('Cache refresh failed'));
      (substanceDatabase as any).refreshSubstanceCache = mockRefreshCache;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const mockInsertedSubstance = {
        id: 'cache-fail-test',
        name: 'Integration Test Substance',
        category_id: 'supplements-id',
        default_unit: 'mg',
        description: 'A substance for integration testing',
        created_at: '2024-01-01T00:00:00Z',
        substance_categories: {
          id: 'supplements-id',
          name: 'supplements'
        }
      };

      mockSupabaseHelpers.addCustomSubstance.mockResolvedValue(mockInsertedSubstance);

      const result = await substanceDatabase.addCustomSubstance(validSubstance);

      // Verify operation still succeeds despite cache failure
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInsertedSubstance);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to refresh substance cache:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Integration', () => {
    it('should complete flow within acceptable time limits', async () => {
      const mockInsertedSubstance = {
        id: 'performance-test',
        name: 'Integration Test Substance',
        category_id: 'supplements-id',
        default_unit: 'mg',
        description: 'A substance for integration testing',
        created_at: '2024-01-01T00:00:00Z',
        substance_categories: {
          id: 'supplements-id',
          name: 'supplements'
        }
      };

      mockSupabaseHelpers.addCustomSubstance.mockResolvedValue(mockInsertedSubstance);

      const startTime = Date.now();
      const result = await substanceDatabase.addCustomSubstance(validSubstance);
      const endTime = Date.now();

      // Verify success and performance
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Error Classification Integration', () => {
    it('should properly classify and handle various error types', async () => {
      const errorScenarios = [
        {
          error: { code: '23505', message: 'duplicate key' },
          expectedCode: 'DUPLICATE_NAME',
          expectedRetryable: false
        },
        {
          error: { code: '42501', message: 'insufficient privileges' },
          expectedCode: 'PERMISSION_DENIED',
          expectedRetryable: false
        },
        {
          error: { name: 'NetworkError', message: 'network failed' },
          expectedCode: 'NETWORK_ERROR',
          expectedRetryable: true
        },
        {
          error: { status: 500, message: 'internal server error' },
          expectedCode: 'SERVER_ERROR',
          expectedRetryable: true
        }
      ];

      for (const scenario of errorScenarios) {
        mockSupabaseHelpers.addCustomSubstance.mockRejectedValueOnce(scenario.error);

        const result = await substanceDatabase.addCustomSubstance(validSubstance);

        expect(result.success).toBe(false);
        expect(result.substanceError?.code).toBe(scenario.expectedCode);
        expect(SubstanceErrorHandler.isRetryable(result.substanceError!)).toBe(scenario.expectedRetryable);
      }
    });
  });
});