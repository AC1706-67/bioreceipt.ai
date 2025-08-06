/**
 * Error Integration Service Tests
 * Tests for the central error handling integration service
 */

import { errorIntegrationService } from '../errorIntegrationService';
import { enhancedErrorHandler } from '../enhancedErrorHandler';
import { errorAnalyticsService } from '../errorAnalyticsService';
import { errorReportingService } from '../errorReportingService';
import { errorLoggingService } from '../errorLoggingService';
import { loggingService } from '../../logging/loggingService';
import {
  ErrorCategory,
  ErrorSeverity,
  EnhancedError
} from '../../../types/errors';

// Mock all dependencies
jest.mock('../enhancedErrorHandler');
jest.mock('../errorAnalyticsService');
jest.mock('../errorReportingService');
jest.mock('../errorLoggingService');
jest.mock('../../logging/loggingService');

const mockEnhancedErrorHandler = enhancedErrorHandler as jest.Mocked<typeof enhancedErrorHandler>;
const mockAnalyticsService = errorAnalyticsService as jest.Mocked<typeof errorAnalyticsService>;
const mockReportingService = errorReportingService as jest.Mocked<typeof errorReportingService>;
const mockLoggingService = errorLoggingService as jest.Mocked<typeof errorLoggingService>;
const mockMainLoggingService = loggingService as jest.Mocked<typeof loggingService>;

describe('ErrorIntegrationService', () => {
  let mockError: Error;
  let mockEnhancedError: EnhancedError;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockError = new Error('Test error');
    
    mockEnhancedError = {
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
      maxRetries: 3,
      resolved: false
    };

    // Setup default mock responses
    mockEnhancedErrorHandler.handleError.mockResolvedValue(mockEnhancedError);
    mockAnalyticsService.recordError.mockResolvedValue(undefined);
    mockReportingService.reportError.mockResolvedValue(undefined);
    mockLoggingService.logError.mockResolvedValue(undefined);
    mockMainLoggingService.info.mockResolvedValue(undefined);
    mockMainLoggingService.error.mockResolvedValue(undefined);
    mockMainLoggingService.warn.mockResolvedValue(undefined);
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await errorIntegrationService.initialize();

      expect(mockMainLoggingService.info).toHaveBeenCalledWith(
        'Initializing error integration service'
      );
      expect(mockMainLoggingService.info).toHaveBeenCalledWith(
        'Error integration service initialized successfully',
        expect.objectContaining({
          config: expect.any(Object)
        })
      );
    });

    it('should handle initialization errors', async () => {
      mockMainLoggingService.info.mockRejectedValue(new Error('Init failed'));

      await expect(errorIntegrationService.initialize()).rejects.toThrow('Init failed');
    });

    it('should not initialize twice', async () => {
      await errorIntegrationService.initialize();
      await errorIntegrationService.initialize();

      // Should only log initialization once
      expect(mockMainLoggingService.info).toHaveBeenCalledTimes(2); // Once for start, once for success
    });
  });

  describe('handleError', () => {
    beforeEach(async () => {
      await errorIntegrationService.initialize();
    });

    it('should handle error through complete pipeline', async () => {
      const result = await errorIntegrationService.handleError(mockError);

      expect(result.handled).toBe(true);
      expect(result.error).toEqual(mockEnhancedError);
      expect(result.logged).toBe(true);
      expect(result.analyzed).toBe(true);
      expect(result.reported).toBe(true);

      expect(mockEnhancedErrorHandler.handleError).toHaveBeenCalledWith(
        mockError,
        undefined,
        expect.any(Object)
      );
      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        mockEnhancedError,
        expect.objectContaining({
          handledBy: 'ErrorIntegrationService'
        })
      );
      expect(mockAnalyticsService.recordError).toHaveBeenCalledWith(mockEnhancedError);
      expect(mockReportingService.reportError).toHaveBeenCalledWith(mockEnhancedError);
    });

    it('should respect skip options', async () => {
      const result = await errorIntegrationService.handleError(mockError, {}, {
        skipAnalytics: true,
        skipReporting: true,
        skipLogging: true
      });

      expect(result.handled).toBe(true);
      expect(result.logged).toBe(false);
      expect(result.analyzed).toBe(false);
      expect(result.reported).toBe(false);

      expect(mockLoggingService.logError).not.toHaveBeenCalled();
      expect(mockAnalyticsService.recordError).not.toHaveBeenCalled();
      expect(mockReportingService.reportError).not.toHaveBeenCalled();
    });

    it('should handle individual service failures gracefully', async () => {
      mockLoggingService.logError.mockRejectedValue(new Error('Logging failed'));
      mockAnalyticsService.recordError.mockRejectedValue(new Error('Analytics failed'));

      const result = await errorIntegrationService.handleError(mockError);

      expect(result.handled).toBe(true);
      expect(result.logged).toBe(false);
      expect(result.analyzed).toBe(false);
      expect(result.reported).toBe(true); // This one should still succeed
    });

    it('should handle complete integration failure', async () => {
      mockEnhancedErrorHandler.handleError.mockRejectedValue(new Error('Handler failed'));

      await expect(errorIntegrationService.handleError(mockError)).rejects.toThrow('Handler failed');

      // Should attempt fallback logging
      expect(mockMainLoggingService.error).toHaveBeenCalledWith(
        'Error integration service failed',
        expect.objectContaining({
          originalError: mockError.message,
          integrationError: 'Handler failed'
        })
      );
    });

    it('should detect recovered errors', async () => {
      const recoveredError = { ...mockEnhancedError, resolved: true };
      mockEnhancedErrorHandler.handleError.mockResolvedValue(recoveredError);

      const result = await errorIntegrationService.handleError(mockError);

      expect(result.recovered).toBe(true);
    });
  });

  describe('getSystemHealth', () => {
    beforeEach(async () => {
      await errorIntegrationService.initialize();
    });

    it('should return healthy status for good metrics', async () => {
      mockAnalyticsService.getErrorMetrics.mockResolvedValue({
        totalErrors: 10,
        errorRate: 0.05,
        criticalErrorRate: 0.005,
        recoverySuccessRate: 0.8,
        averageResolutionTime: 1000,
        topErrorCategories: [],
        topErrorCodes: [],
        errorTrends: [],
        userImpactScore: 20
      });

      mockAnalyticsService.getErrorInsights.mockResolvedValue({
        criticalIssues: [],
        recommendations: [],
        trends: []
      });

      mockEnhancedErrorHandler.getErrorStatistics.mockReturnValue({
        totalErrors: 10,
        errorsByCategory: {},
        errorsBySeverity: {},
        resolvedErrors: 8,
        pendingRetries: 0
      });

      const health = await errorIntegrationService.getSystemHealth();

      expect(health.overall).toBe('healthy');
      expect(health.errorRate).toBe(0.05);
      expect(health.criticalErrorRate).toBe(0.005);
      expect(health.recoveryRate).toBe(0.8);
    });

    it('should return warning status for moderate issues', async () => {
      mockAnalyticsService.getErrorMetrics.mockResolvedValue({
        totalErrors: 50,
        errorRate: 0.15,
        criticalErrorRate: 0.02,
        recoverySuccessRate: 0.6,
        averageResolutionTime: 3000,
        topErrorCategories: [],
        topErrorCodes: [],
        errorTrends: [],
        userImpactScore: 45
      });

      mockAnalyticsService.getErrorInsights.mockResolvedValue({
        criticalIssues: ['High error rate detected'],
        recommendations: ['Improve error handling'],
        trends: []
      });

      mockEnhancedErrorHandler.getErrorStatistics.mockReturnValue({
        totalErrors: 50,
        errorsByCategory: {},
        errorsBySeverity: {},
        resolvedErrors: 30,
        pendingRetries: 5
      });

      const health = await errorIntegrationService.getSystemHealth();

      expect(health.overall).toBe('warning');
      expect(health.issues).toContain('High error rate detected');
      expect(health.recommendations).toContain('Improve error handling');
    });

    it('should return critical status for severe issues', async () => {
      mockAnalyticsService.getErrorMetrics.mockResolvedValue({
        totalErrors: 200,
        errorRate: 0.25,
        criticalErrorRate: 0.08,
        recoverySuccessRate: 0.3,
        averageResolutionTime: 10000,
        topErrorCategories: [],
        topErrorCodes: [],
        errorTrends: [],
        userImpactScore: 85
      });

      mockAnalyticsService.getErrorInsights.mockResolvedValue({
        criticalIssues: ['System overloaded', 'Critical services failing'],
        recommendations: ['Immediate intervention required'],
        trends: ['Error rate increasing rapidly']
      });

      mockEnhancedErrorHandler.getErrorStatistics.mockReturnValue({
        totalErrors: 200,
        errorsByCategory: {},
        errorsBySeverity: { critical: 16 },
        resolvedErrors: 60,
        pendingRetries: 20
      });

      const health = await errorIntegrationService.getSystemHealth();

      expect(health.overall).toBe('critical');
      expect(health.issues).toContain('System overloaded');
      expect(health.issues).toContain('Critical services failing');
    });

    it('should handle health check failures', async () => {
      mockAnalyticsService.getErrorMetrics.mockRejectedValue(new Error('Metrics failed'));

      const health = await errorIntegrationService.getSystemHealth();

      expect(health.overall).toBe('critical');
      expect(health.issues).toContain('Failed to retrieve system health metrics');
      expect(health.recommendations).toContain('Check error handling services');
    });
  });

  describe('runDiagnostics', () => {
    beforeEach(async () => {
      await errorIntegrationService.initialize();
    });

    it('should run successful diagnostics', async () => {
      mockAnalyticsService.getErrorMetrics.mockResolvedValue({} as any);
      mockReportingService.getStatistics.mockReturnValue({
        pendingErrors: 0,
        queuedReports: 0,
        isReporting: false,
        configEnabled: true
      });
      mockLoggingService.getLogStats.mockResolvedValue({
        totalEntries: 100,
        entriesByLevel: {} as any,
        entriesByCategory: {} as any,
        diskUsage: 1024
      });

      const diagnostics = await errorIntegrationService.runDiagnostics();

      expect(diagnostics.overallHealth).toBe('healthy');
      expect(diagnostics.services.enhancedErrorHandler.status).toBe('ok');
      expect(diagnostics.services.analyticsService.status).toBe('ok');
      expect(diagnostics.services.reportingService.status).toBe('ok');
      expect(diagnostics.services.loggingService.status).toBe('ok');
    });

    it('should detect service failures', async () => {
      mockAnalyticsService.getErrorMetrics.mockRejectedValue(new Error('Analytics down'));
      mockReportingService.getStatistics.mockImplementation(() => {
        throw new Error('Reporting down');
      });

      const diagnostics = await errorIntegrationService.runDiagnostics();

      expect(diagnostics.overallHealth).toBe('warning');
      expect(diagnostics.services.analyticsService.status).toBe('error');
      expect(diagnostics.services.reportingService.status).toBe('error');
      expect(diagnostics.recommendations).toContain('Fix analyticsService: Analytics down');
      expect(diagnostics.recommendations).toContain('Fix reportingService: Reporting down');
    });

    it('should detect critical failures', async () => {
      mockEnhancedErrorHandler.handleError.mockRejectedValue(new Error('Handler critical failure'));

      const diagnostics = await errorIntegrationService.runDiagnostics();

      expect(diagnostics.overallHealth).toBe('critical');
      expect(diagnostics.services.enhancedErrorHandler.status).toBe('error');
      expect(diagnostics.recommendations).toContain('Critical services are failing - immediate attention required');
    });
  });

  describe('configuration management', () => {
    it('should update configuration', async () => {
      const newConfig = {
        enableAnalytics: false,
        enableReporting: false,
        autoRecovery: false
      };

      await errorIntegrationService.updateConfig(newConfig);

      const currentConfig = errorIntegrationService.getConfig();
      expect(currentConfig.enableAnalytics).toBe(false);
      expect(currentConfig.enableReporting).toBe(false);
      expect(currentConfig.autoRecovery).toBe(false);

      expect(mockMainLoggingService.info).toHaveBeenCalledWith(
        'Error integration config updated',
        expect.objectContaining({
          newConfig,
          fullConfig: expect.any(Object)
        })
      );
    });

    it('should return current configuration', () => {
      const config = errorIntegrationService.getConfig();

      expect(config).toBeDefined();
      expect(typeof config.enableAnalytics).toBe('boolean');
      expect(typeof config.enableReporting).toBe('boolean');
      expect(typeof config.enableLogging).toBe('boolean');
      expect(typeof config.enableRealTimeAlerts).toBe('boolean');
      expect(typeof config.autoRecovery).toBe('boolean');
      expect(typeof config.debugMode).toBe('boolean');
    });
  });

  describe('integration statistics', () => {
    it('should return integration statistics', async () => {
      const stats = await errorIntegrationService.getIntegrationStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalErrorsHandled).toBe('number');
      expect(typeof stats.successfulRecoveries).toBe('number');
      expect(typeof stats.failedRecoveries).toBe('number');
      expect(typeof stats.averageHandlingTime).toBe('number');
      expect(typeof stats.serviceHealth).toBe('object');
    });
  });

  describe('error listeners and auto-recovery', () => {
    beforeEach(async () => {
      await errorIntegrationService.initialize();
    });

    it('should handle critical errors with real-time alerts', async () => {
      const criticalError = {
        ...mockEnhancedError,
        severity: ErrorSeverity.CRITICAL
      };

      // Update config to enable real-time alerts
      await errorIntegrationService.updateConfig({ enableRealTimeAlerts: true });

      // Simulate error listener being called
      const errorListener = mockEnhancedErrorHandler.addErrorListener.mock.calls[0][0];
      await errorListener(criticalError);

      expect(mockMainLoggingService.error).toHaveBeenCalledWith(
        'Critical error detected',
        expect.objectContaining({
          errorId: criticalError.errorId,
          errorCode: criticalError.errorCode
        })
      );
    });

    it('should attempt auto-recovery for unresolved errors', async () => {
      const unresolvedError = {
        ...mockEnhancedError,
        resolved: false,
        retryCount: 1
      };

      // Update config to enable auto-recovery
      await errorIntegrationService.updateConfig({ autoRecovery: true });

      // Simulate error listener being called
      const errorListener = mockEnhancedErrorHandler.addErrorListener.mock.calls[0][0];
      await errorListener(unresolvedError);

      expect(mockMainLoggingService.info).toHaveBeenCalledWith(
        expect.stringContaining('recovery'),
        expect.objectContaining({
          errorId: unresolvedError.errorId
        })
      );
    });

    it('should not attempt auto-recovery when disabled', async () => {
      const unresolvedError = {
        ...mockEnhancedError,
        resolved: false,
        retryCount: 1
      };

      // Disable auto-recovery
      await errorIntegrationService.updateConfig({ autoRecovery: false });

      // Simulate error listener being called
      const errorListener = mockEnhancedErrorHandler.addErrorListener.mock.calls[0][0];
      await errorListener(unresolvedError);

      // Should not attempt recovery
      expect(mockMainLoggingService.info).not.toHaveBeenCalledWith(
        expect.stringContaining('recovery'),
        expect.any(Object)
      );
    });
  });

  describe('service lifecycle', () => {
    it('should shutdown gracefully', () => {
      // Should not throw
      expect(() => errorIntegrationService.shutdown()).not.toThrow();

      expect(mockReportingService.shutdown).toHaveBeenCalled();
      expect(mockLoggingService.shutdown).toHaveBeenCalled();
    });
  });
});