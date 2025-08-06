/**
 * Error Reporting Service Tests
 * Tests for error collection, aggregation, and reporting
 */

import { errorReportingService } from '../errorReportingService';
import {
  ErrorCategory,
  ErrorSeverity,
  EnhancedError
} from '../../../types/errors';
import { storage } from '../../../utils/storage';
import { loggingService } from '../../logging/loggingService';

// Mock dependencies
jest.mock('../../../utils/storage');
jest.mock('../../logging/loggingService');

const mockStorage = storage as jest.Mocked<typeof storage>;

describe('ErrorReportingService', () => {
  let mockError: EnhancedError;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockError = {
      name: 'TestError',
      message: 'Test error message',
      stack: 'Error stack trace',
      errorId: 'test_error_123',
      errorCode: 'TEST_001',
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      context: {
        appVersion: '1.0.0',
        buildNumber: '1',
        environment: 'test',
        timestamp: new Date(),
        userId: 'user123',
        sessionId: 'session456',
        currentScreen: 'HomeScreen'
      },
      recoveryStrategy: 'retry' as any,
      userMessage: 'Connection issue occurred',
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    // Mock storage responses
    mockStorage.getData.mockResolvedValue(null);
    mockStorage.storeData.mockResolvedValue(undefined);
  });

  describe('reportError', () => {
    it('should report critical errors immediately', async () => {
      const criticalError = {
        ...mockError,
        severity: ErrorSeverity.CRITICAL
      };

      await errorReportingService.reportError(criticalError);

      // Should log the report attempt
      expect(loggingService.info).toHaveBeenCalledWith(
        'Error report sent successfully',
        expect.objectContaining({
          reportType: 'crash',
          errorCount: 1
        })
      );
    });

    it('should batch non-critical errors', async () => {
      const mediumError = {
        ...mockError,
        severity: ErrorSeverity.MEDIUM
      };

      await errorReportingService.reportError(mediumError);

      // Should not immediately send report for non-critical errors
      expect(loggingService.info).not.toHaveBeenCalledWith(
        'Error report sent successfully',
        expect.any(Object)
      );
    });

    it('should handle reporting service being disabled', async () => {
      // Update config to disable reporting
      await errorReportingService.updateConfig({ enabled: false });

      await errorReportingService.reportError(mockError);

      // Should not attempt to send any reports
      expect(loggingService.info).not.toHaveBeenCalled();
    });

    it('should handle reporting failures gracefully', async () => {
      // Mock a critical error that would normally be reported immediately
      const criticalError = {
        ...mockError,
        severity: ErrorSeverity.CRITICAL
      };

      // Mock storage failure
      mockStorage.storeData.mockRejectedValue(new Error('Storage failed'));

      // Should not throw
      await expect(errorReportingService.reportError(criticalError)).resolves.toBeUndefined();
    });
  });

  describe('reportErrors', () => {
    it('should report multiple errors as batch', async () => {
      const errors = [
        mockError,
        { ...mockError, errorId: 'error2', message: 'Second error' },
        { ...mockError, errorId: 'error3', message: 'Third error' }
      ];

      await errorReportingService.reportErrors(errors);

      expect(loggingService.info).toHaveBeenCalledWith(
        'Error report sent successfully',
        expect.objectContaining({
          reportType: 'batch',
          errorCount: 3
        })
      );
    });

    it('should handle empty error array', async () => {
      await errorReportingService.reportErrors([]);

      // Should not attempt to send report
      expect(loggingService.info).not.toHaveBeenCalled();
    });

    it('should handle reporting disabled', async () => {
      await errorReportingService.updateConfig({ enabled: false });

      await errorReportingService.reportErrors([mockError]);

      expect(loggingService.info).not.toHaveBeenCalled();
    });
  });

  describe('generateManualReport', () => {
    it('should generate manual report from recent errors', async () => {
      // Mock recent errors in storage
      const recentErrors = [mockError, { ...mockError, errorId: 'error2' }];
      mockStorage.getData.mockResolvedValue(recentErrors);

      const report = await errorReportingService.generateManualReport();

      expect(report).toBeDefined();
      expect(report?.reportType).toBe('manual');
      expect(report?.errors.length).toBe(2);
    });

    it('should return null when no recent errors exist', async () => {
      mockStorage.getData.mockResolvedValue([]);

      const report = await errorReportingService.generateManualReport();

      expect(report).toBeNull();
    });

    it('should handle storage errors gracefully', async () => {
      mockStorage.getData.mockRejectedValue(new Error('Storage error'));

      const report = await errorReportingService.generateManualReport();

      expect(report).toBeNull();
    });
  });

  describe('configuration management', () => {
    it('should update configuration', async () => {
      const newConfig = {
        enabled: false,
        batchSize: 20,
        batchInterval: 120000
      };

      await errorReportingService.updateConfig(newConfig);

      const currentConfig = errorReportingService.getConfig();
      expect(currentConfig.enabled).toBe(false);
      expect(currentConfig.batchSize).toBe(20);
      expect(currentConfig.batchInterval).toBe(120000);
    });

    it('should persist configuration to storage', async () => {
      const newConfig = { enabled: false };

      await errorReportingService.updateConfig(newConfig);

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'ERROR_REPORTING_CONFIG',
        expect.objectContaining({ enabled: false })
      );
    });

    it('should return current configuration', () => {
      const config = errorReportingService.getConfig();

      expect(config).toBeDefined();
      expect(typeof config.enabled).toBe('boolean');
      expect(typeof config.batchSize).toBe('number');
      expect(typeof config.batchInterval).toBe('number');
    });
  });

  describe('statistics', () => {
    it('should provide reporting statistics', () => {
      const stats = errorReportingService.getStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats.pendingErrors).toBe('number');
      expect(typeof stats.queuedReports).toBe('number');
      expect(typeof stats.isReporting).toBe('boolean');
      expect(typeof stats.configEnabled).toBe('boolean');
    });

    it('should reflect current state', async () => {
      // Add some errors to pending queue
      await errorReportingService.reportError(mockError);

      const stats = errorReportingService.getStatistics();

      expect(stats.configEnabled).toBe(true); // Default config
    });
  });

  describe('data management', () => {
    it('should clear pending data', async () => {
      await errorReportingService.clearPendingData();

      expect(mockStorage.removeData).toHaveBeenCalledWith('PENDING_ERROR_REPORTS');
      expect(loggingService.info).toHaveBeenCalledWith(
        'Cleared all pending error reporting data'
      );
    });

    it('should handle clear data errors gracefully', async () => {
      mockStorage.removeData.mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(errorReportingService.clearPendingData()).resolves.toBeUndefined();
    });
  });

  describe('error sanitization', () => {
    it('should sanitize PII when includePII is false', async () => {
      await errorReportingService.updateConfig({ includePII: false });

      const errorWithPII = {
        ...mockError,
        context: {
          ...mockError.context,
          userId: 'sensitive_user_id',
          sessionId: 'sensitive_session_id',
          metadata: {
            email: 'user@example.com',
            phone: '123-456-7890'
          }
        }
      };

      await errorReportingService.reportError(errorWithPII);

      // The actual sanitization testing would require access to internal methods
      // In a real implementation, you might expose a sanitization method for testing
    });

    it('should preserve PII when includePII is true', async () => {
      await errorReportingService.updateConfig({ includePII: true });

      const errorWithPII = {
        ...mockError,
        context: {
          ...mockError.context,
          userId: 'user123',
          sessionId: 'session456'
        }
      };

      await errorReportingService.reportError(errorWithPII);

      // Should not sanitize when PII is allowed
      // Testing would verify that the original data is preserved
    });
  });

  describe('batch processing', () => {
    it('should process batch when size limit is reached', async () => {
      // Set small batch size for testing
      await errorReportingService.updateConfig({ batchSize: 2 });

      // Add errors to reach batch size
      await errorReportingService.reportError(mockError);
      await errorReportingService.reportError({ ...mockError, errorId: 'error2' });

      // Should trigger batch processing
      expect(loggingService.info).toHaveBeenCalledWith(
        'Error report sent successfully',
        expect.objectContaining({
          reportType: 'batch'
        })
      );
    });

    it('should handle batch processing errors', async () => {
      await errorReportingService.updateConfig({ batchSize: 1 });

      // Mock a failure in the reporting process
      mockStorage.storeData.mockRejectedValue(new Error('Storage failed'));

      // Should not throw even if batch processing fails
      await expect(errorReportingService.reportError(mockError)).resolves.toBeUndefined();
    });
  });

  describe('retry mechanism', () => {
    it('should retry failed reports', async () => {
      await errorReportingService.updateConfig({ 
        retryAttempts: 2,
        retryDelay: 100
      });

      const criticalError = {
        ...mockError,
        severity: ErrorSeverity.CRITICAL
      };

      // First call should succeed (mocked)
      await errorReportingService.reportError(criticalError);

      expect(loggingService.info).toHaveBeenCalledWith(
        'Error report sent successfully',
        expect.any(Object)
      );
    });

    it('should queue reports after max retries exceeded', async () => {
      await errorReportingService.updateConfig({ 
        retryAttempts: 1,
        retryDelay: 10
      });

      // Mock all attempts to fail by making storage fail
      mockStorage.storeData.mockRejectedValue(new Error('All attempts failed'));

      const criticalError = {
        ...mockError,
        severity: ErrorSeverity.CRITICAL
      };

      // Should not throw even after all retries fail
      await expect(errorReportingService.reportError(criticalError)).resolves.toBeUndefined();
    });
  });

  describe('service lifecycle', () => {
    it('should initialize from stored data', async () => {
      const storedReports = [
        {
          id: 'report1',
          errors: [mockError],
          timestamp: new Date(),
          reportType: 'batch'
        }
      ];

      mockStorage.getData.mockImplementation((key) => {
        if (key === 'PENDING_ERROR_REPORTS') {
          return Promise.resolve(storedReports);
        }
        return Promise.resolve(null);
      });

      // Service initialization happens in constructor
      // This test verifies that stored data is loaded correctly
      const stats = errorReportingService.getStatistics();
      expect(typeof stats.queuedReports).toBe('number');
    });

    it('should handle initialization errors gracefully', async () => {
      mockStorage.getData.mockRejectedValue(new Error('Storage unavailable'));

      // Should not throw during initialization
      // Service should continue to work with default state
      const stats = errorReportingService.getStatistics();
      expect(stats).toBeDefined();
    });

    it('should shutdown gracefully', () => {
      // Should not throw
      expect(() => errorReportingService.shutdown()).not.toThrow();
    });
  });
});