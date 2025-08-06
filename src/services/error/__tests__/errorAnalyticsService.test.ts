/**
 * Error Analytics Service Tests
 * Tests for error pattern analysis, metrics calculation, and insights generation
 */

import { errorAnalyticsService } from '../errorAnalyticsService';
import {
  ErrorCategory,
  ErrorSeverity,
  EnhancedError,
  ErrorMetrics,
  ErrorPattern,
  UserErrorProfile,
  AnalyticsConfig
} from '../../../types/errors';
import { storage } from '../../../utils/storage';
import { loggingService } from '../../logging/loggingService';

// Mock dependencies
jest.mock('../../../utils/storage');
jest.mock('../../logging/loggingService');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockLoggingService = loggingService as jest.Mocked<typeof loggingService>;

describe('ErrorAnalyticsService', () => {
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
    mockStorage.removeData.mockResolvedValue(undefined);
  });

  describe('recordError', () => {
    it('should record an error for analytics when enabled', async () => {
      await errorAnalyticsService.recordError(mockError);

      // Should log the analytics recording
      expect(mockLoggingService.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error analytics alert'),
        expect.any(Object)
      );
    });

    it('should not record error when analytics is disabled', async () => {
      // Disable analytics
      await errorAnalyticsService.updateConfig({ enabled: false });

      await errorAnalyticsService.recordError(mockError);

      // Should not process the error
      expect(mockLoggingService.warn).not.toHaveBeenCalled();
    });

    it('should update user profile when user ID is present', async () => {
      const errorWithUser = {
        ...mockError,
        context: {
          ...mockError.context,
          userId: 'user123'
        }
      };

      await errorAnalyticsService.recordError(errorWithUser);

      // Should create/update user profile
      const userProfile = await errorAnalyticsService.getUserProfile('user123');
      expect(userProfile).toBeDefined();
    });

    it('should trigger pattern analysis', async () => {
      // Record multiple similar errors to trigger pattern detection
      for (let i = 0; i < 5; i++) {
        await errorAnalyticsService.recordError({
          ...mockError,
          errorId: `error_${i}`,
          timestamp: new Date()
        });
      }

      const patterns = await errorAnalyticsService.getErrorPatterns();
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should handle analytics errors gracefully', async () => {
      // Mock storage failure
      mockStorage.storeData.mockRejectedValue(new Error('Storage failed'));

      // Should not throw
      await expect(errorAnalyticsService.recordError(mockError)).resolves.toBeUndefined();
    });
  });

  describe('getErrorMetrics', () => {
    it('should calculate comprehensive error metrics', async () => {
      // Record some test errors
      const errors = [
        mockError,
        { ...mockError, errorId: 'error2', severity: ErrorSeverity.CRITICAL },
        { ...mockError, errorId: 'error3', severity: ErrorSeverity.LOW, resolved: true }
      ];

      for (const error of errors) {
        await errorAnalyticsService.recordError(error);
      }

      const metrics = await errorAnalyticsService.getErrorMetrics(true);

      expect(metrics).toBeDefined();
      expect(typeof metrics.totalErrors).toBe('number');
      expect(typeof metrics.errorRate).toBe('number');
      expect(typeof metrics.criticalErrorRate).toBe('number');
      expect(typeof metrics.recoverySuccessRate).toBe('number');
      expect(typeof metrics.averageResolutionTime).toBe('number');
      expect(Array.isArray(metrics.topErrorCategories)).toBe(true);
      expect(Array.isArray(metrics.topErrorCodes)).toBe(true);
      expect(Array.isArray(metrics.errorTrends)).toBe(true);
      expect(typeof metrics.userImpactScore).toBe('number');
    });

    it('should use cached metrics when available and valid', async () => {
      // First call should calculate metrics
      const metrics1 = await errorAnalyticsService.getErrorMetrics();
      
      // Second call should use cache
      const metrics2 = await errorAnalyticsService.getErrorMetrics();
      
      expect(metrics1).toEqual(metrics2);
    });

    it('should force refresh when requested', async () => {
      await errorAnalyticsService.recordError(mockError);

      const metrics1 = await errorAnalyticsService.getErrorMetrics();
      const metrics2 = await errorAnalyticsService.getErrorMetrics(true);

      // Both should be defined but force refresh should recalculate
      expect(metrics1).toBeDefined();
      expect(metrics2).toBeDefined();
    });

    it('should handle empty error history', async () => {
      const metrics = await errorAnalyticsService.getErrorMetrics(true);

      expect(metrics.totalErrors).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.userImpactScore).toBe(0);
    });
  });

  describe('getErrorPatterns', () => {
    it('should return detected error patterns', async () => {
      // Create pattern by recording similar errors
      const similarErrors = Array.from({ length: 5 }, (_, i) => ({
        ...mockError,
        errorId: `pattern_error_${i}`,
        timestamp: new Date()
      }));

      for (const error of similarErrors) {
        await errorAnalyticsService.recordError(error);
      }

      const patterns = await errorAnalyticsService.getErrorPatterns();

      expect(Array.isArray(patterns)).toBe(true);
      if (patterns.length > 0) {
        const pattern = patterns[0];
        expect(pattern).toHaveProperty('id');
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('frequency');
        expect(pattern).toHaveProperty('severity');
        expect(pattern).toHaveProperty('suggestedActions');
      }
    });

    it('should sort patterns by frequency', async () => {
      // Create multiple patterns with different frequencies
      const pattern1Errors = Array.from({ length: 3 }, (_, i) => ({
        ...mockError,
        errorId: `pattern1_${i}`,
        errorCode: 'PATTERN1_001'
      }));

      const pattern2Errors = Array.from({ length: 5 }, (_, i) => ({
        ...mockError,
        errorId: `pattern2_${i}`,
        errorCode: 'PATTERN2_001'
      }));

      for (const error of [...pattern1Errors, ...pattern2Errors]) {
        await errorAnalyticsService.recordError(error);
      }

      const patterns = await errorAnalyticsService.getErrorPatterns();

      if (patterns.length >= 2) {
        expect(patterns[0].frequency).toBeGreaterThanOrEqual(patterns[1].frequency);
      }
    });
  });

  describe('getUserProfile', () => {
    it('should return user error profile when it exists', async () => {
      const userError = {
        ...mockError,
        context: {
          ...mockError.context,
          userId: 'user123'
        }
      };

      await errorAnalyticsService.recordError(userError);

      const profile = await errorAnalyticsService.getUserProfile('user123');

      expect(profile).toBeDefined();
      expect(profile?.userId).toBe('user123');
      expect(typeof profile?.totalErrors).toBe('number');
      expect(typeof profile?.errorFrequency).toBe('number');
      expect(profile?.mostCommonCategory).toBeDefined();
      expect(profile?.mostCommonSeverity).toBeDefined();
      expect(Array.isArray(profile?.errorHistory)).toBe(true);
    });

    it('should return null when user profile does not exist', async () => {
      const profile = await errorAnalyticsService.getUserProfile('nonexistent_user');

      expect(profile).toBeNull();
    });

    it('should update profile statistics correctly', async () => {
      const userId = 'user123';
      const userErrors = [
        { ...mockError, context: { ...mockError.context, userId }, severity: ErrorSeverity.HIGH },
        { ...mockError, context: { ...mockError.context, userId }, severity: ErrorSeverity.LOW, resolved: true }
      ];

      for (const error of userErrors) {
        await errorAnalyticsService.recordError(error);
      }

      const profile = await errorAnalyticsService.getUserProfile(userId);

      expect(profile?.totalErrors).toBe(2);
      expect(profile?.recoverySuccessRate).toBe(0.5); // 1 out of 2 resolved
    });
  });

  describe('getErrorInsights', () => {
    it('should return structured insights', async () => {
      await errorAnalyticsService.recordError(mockError);

      const insights = await errorAnalyticsService.getErrorInsights();

      expect(insights).toBeDefined();
      expect(Array.isArray(insights.criticalIssues)).toBe(true);
      expect(Array.isArray(insights.recommendations)).toBe(true);
      expect(Array.isArray(insights.trends)).toBe(true);
    });

    it('should identify critical issues', async () => {
      // Create high critical error rate
      const criticalErrors = Array.from({ length: 10 }, (_, i) => ({
        ...mockError,
        errorId: `critical_${i}`,
        severity: ErrorSeverity.CRITICAL
      }));

      for (const error of criticalErrors) {
        await errorAnalyticsService.recordError(error);
      }

      const insights = await errorAnalyticsService.getErrorInsights();

      expect(insights.criticalIssues.length).toBeGreaterThan(0);
      expect(insights.criticalIssues.some(issue => 
        issue.includes('critical error rate')
      )).toBe(true);
    });

    it('should provide recommendations', async () => {
      // Create errors in a specific category
      const networkErrors = Array.from({ length: 5 }, (_, i) => ({
        ...mockError,
        errorId: `network_${i}`,
        category: ErrorCategory.NETWORK
      }));

      for (const error of networkErrors) {
        await errorAnalyticsService.recordError(error);
      }

      const insights = await errorAnalyticsService.getErrorInsights();

      expect(insights.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect trends', async () => {
      // Create errors over time to establish trends
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await errorAnalyticsService.recordError({
        ...mockError,
        errorId: 'yesterday_error',
        timestamp: yesterday
      });

      await errorAnalyticsService.recordError({
        ...mockError,
        errorId: 'today_error',
        timestamp: now
      });

      const insights = await errorAnalyticsService.getErrorInsights();

      expect(Array.isArray(insights.trends)).toBe(true);
    });
  });

  describe('configuration management', () => {
    it('should update configuration', async () => {
      const newConfig: Partial<AnalyticsConfig> = {
        enabled: false,
        retentionDays: 60,
        minPatternFrequency: 5
      };

      await errorAnalyticsService.updateConfig(newConfig);

      const currentConfig = errorAnalyticsService.getConfig();
      expect(currentConfig.enabled).toBe(false);
      expect(currentConfig.retentionDays).toBe(60);
      expect(currentConfig.minPatternFrequency).toBe(5);
    });

    it('should persist configuration to storage', async () => {
      const newConfig = { enabled: false };

      await errorAnalyticsService.updateConfig(newConfig);

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'ERROR_ANALYTICS_CONFIG',
        expect.objectContaining({ enabled: false })
      );
    });

    it('should return current configuration', () => {
      const config = errorAnalyticsService.getConfig();

      expect(config).toBeDefined();
      expect(typeof config.enabled).toBe('boolean');
      expect(typeof config.retentionDays).toBe('number');
      expect(typeof config.minPatternFrequency).toBe('number');
      expect(typeof config.trendAnalysisDays).toBe('number');
      expect(typeof config.userProfileEnabled).toBe('boolean');
      expect(typeof config.realTimeAlertsEnabled).toBe('boolean');
    });
  });

  describe('data management', () => {
    it('should clear all analytics data', async () => {
      await errorAnalyticsService.clearAllData();

      expect(mockStorage.removeData).toHaveBeenCalledWith('ERROR_ANALYTICS_HISTORY');
      expect(mockStorage.removeData).toHaveBeenCalledWith('ERROR_PATTERNS');
      expect(mockStorage.removeData).toHaveBeenCalledWith('ERROR_USER_PROFILES');
    });

    it('should handle clear data errors gracefully', async () => {
      mockStorage.removeData.mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(errorAnalyticsService.clearAllData()).resolves.toBeUndefined();
    });
  });

  describe('real-time alerts', () => {
    it('should trigger alert for critical errors', async () => {
      const criticalError = {
        ...mockError,
        severity: ErrorSeverity.CRITICAL
      };

      await errorAnalyticsService.recordError(criticalError);

      expect(mockLoggingService.warn).toHaveBeenCalledWith(
        expect.stringContaining('critical_error'),
        expect.any(Object)
      );
    });

    it('should trigger alert for high frequency errors', async () => {
      // Record many similar errors quickly
      for (let i = 0; i < 12; i++) {
        await errorAnalyticsService.recordError({
          ...mockError,
          errorId: `freq_error_${i}`,
          timestamp: new Date()
        });
      }

      expect(mockLoggingService.warn).toHaveBeenCalledWith(
        expect.stringContaining('high_frequency_error'),
        expect.any(Object)
      );
    });

    it('should trigger alert for high error users', async () => {
      const userId = 'problematic_user';
      
      // Create user with high error frequency
      for (let i = 0; i < 10; i++) {
        await errorAnalyticsService.recordError({
          ...mockError,
          errorId: `user_error_${i}`,
          context: {
            ...mockError.context,
            userId
          }
        });
      }

      expect(mockLoggingService.warn).toHaveBeenCalledWith(
        expect.stringContaining('high_error_user'),
        expect.any(Object)
      );
    });
  });

  describe('pattern analysis', () => {
    it('should detect patterns based on error code similarity', async () => {
      const patternErrors = Array.from({ length: 4 }, (_, i) => ({
        ...mockError,
        errorId: `pattern_error_${i}`,
        errorCode: 'COMMON_ERROR_001'
      }));

      for (const error of patternErrors) {
        await errorAnalyticsService.recordError(error);
      }

      const patterns = await errorAnalyticsService.getErrorPatterns();
      
      expect(patterns.some(p => 
        p.pattern.includes('COMMON_ERROR_001')
      )).toBe(true);
    });

    it('should detect patterns based on category and severity', async () => {
      const patternErrors = Array.from({ length: 4 }, (_, i) => ({
        ...mockError,
        errorId: `category_error_${i}`,
        category: ErrorCategory.UI_COMPONENT,
        severity: ErrorSeverity.HIGH
      }));

      for (const error of patternErrors) {
        await errorAnalyticsService.recordError(error);
      }

      const patterns = await errorAnalyticsService.getErrorPatterns();
      
      expect(patterns.some(p => 
        p.pattern.includes('UI_COMPONENT')
      )).toBe(true);
    });

    it('should generate appropriate suggested actions', async () => {
      const networkErrors = Array.from({ length: 4 }, (_, i) => ({
        ...mockError,
        errorId: `network_error_${i}`,
        category: ErrorCategory.NETWORK
      }));

      for (const error of networkErrors) {
        await errorAnalyticsService.recordError(error);
      }

      const patterns = await errorAnalyticsService.getErrorPatterns();
      const networkPattern = patterns.find(p => 
        p.pattern.includes('network')
      );

      if (networkPattern) {
        expect(networkPattern.suggestedActions).toContain('Implement better offline handling');
        expect(networkPattern.suggestedActions).toContain('Add retry logic with exponential backoff');
      }
    });
  });

  describe('metrics calculation', () => {
    it('should calculate error rates correctly', async () => {
      // Mock session count
      mockStorage.getData.mockImplementation((key) => {
        if (key === 'SESSION_ANALYTICS') {
          return Promise.resolve({ totalSessions: 10 });
        }
        return Promise.resolve(null);
      });

      // Record 5 errors
      for (let i = 0; i < 5; i++) {
        await errorAnalyticsService.recordError({
          ...mockError,
          errorId: `rate_error_${i}`
        });
      }

      const metrics = await errorAnalyticsService.getErrorMetrics(true);

      expect(metrics.errorRate).toBe(0.5); // 5 errors / 10 sessions
    });

    it('should calculate recovery success rate correctly', async () => {
      const errors = [
        { ...mockError, errorId: 'resolved_1', resolved: true },
        { ...mockError, errorId: 'resolved_2', resolved: true },
        { ...mockError, errorId: 'unresolved_1', resolved: false }
      ];

      for (const error of errors) {
        await errorAnalyticsService.recordError(error);
      }

      const metrics = await errorAnalyticsService.getErrorMetrics(true);

      expect(metrics.recoverySuccessRate).toBeCloseTo(0.67, 1); // 2/3 resolved
    });

    it('should calculate user impact score correctly', async () => {
      const errors = [
        { ...mockError, errorId: 'critical_1', severity: ErrorSeverity.CRITICAL },
        { ...mockError, errorId: 'high_1', severity: ErrorSeverity.HIGH },
        { ...mockError, errorId: 'low_1', severity: ErrorSeverity.LOW }
      ];

      for (const error of errors) {
        await errorAnalyticsService.recordError(error);
      }

      const metrics = await errorAnalyticsService.getErrorMetrics(true);

      expect(metrics.userImpactScore).toBeGreaterThan(0);
      expect(metrics.userImpactScore).toBeLessThanOrEqual(100);
    });
  });
});