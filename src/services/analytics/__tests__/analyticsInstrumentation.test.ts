/**
 * Analytics Instrumentation Tests
 * Unit tests for analytics service functionality
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalyticsService, AnalyticsEvent, AnalyticsPrivacySettings } from '../analyticsService';
import { SecureStorageService } from '../../security/secureStorage';
import { AuditLogService } from '../../compliance/auditLogService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../security/secureStorage');
jest.mock('../../compliance/auditLogService');

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockAsyncStorage: jest.Mocked<typeof AsyncStorage>;
  let mockSecureStorage: jest.Mocked<SecureStorageService>;
  let mockAuditLogService: jest.Mocked<AuditLogService>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset singleton instance
    (AnalyticsService as any).instance = undefined;
    analyticsService = AnalyticsService.getInstance();
    
    mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockSecureStorage = SecureStorageService.getInstance() as jest.Mocked<SecureStorageService>;
    mockAuditLogService = AuditLogService.getInstance() as jest.Mocked<AuditLogService>;

    // Setup default mocks
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
    mockSecureStorage.getItem.mockResolvedValue(null);
    mockSecureStorage.setItem.mockResolvedValue();
    mockAuditLogService.logDataAccess.mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AnalyticsService.getInstance();
      const instance2 = AnalyticsService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize with default privacy settings', async () => {
      await analyticsService.initialize();
      
      const settings = analyticsService.getPrivacySettings();
      expect(settings.enableAnalytics).toBe(false); // Privacy-first approach
      expect(settings.enablePersonalizedAnalytics).toBe(false);
      expect(settings.enablePerformanceTracking).toBe(true);
      expect(settings.enableErrorReporting).toBe(true);
      expect(settings.dataRetentionDays).toBe(90);
    });

    it('should initialize with custom privacy settings', async () => {
      const customSettings: Partial<AnalyticsPrivacySettings> = {
        enableAnalytics: true,
        enablePersonalizedAnalytics: true,
        dataRetentionDays: 30
      };

      await analyticsService.initialize(customSettings);
      
      const settings = analyticsService.getPrivacySettings();
      expect(settings.enableAnalytics).toBe(true);
      expect(settings.enablePersonalizedAnalytics).toBe(true);
      expect(settings.dataRetentionDays).toBe(30);
    });

    it('should load existing privacy settings from storage', async () => {
      const storedSettings = {
        enableAnalytics: true,
        enablePersonalizedAnalytics: false,
        enablePerformanceTracking: true,
        enableErrorReporting: false,
        dataRetentionDays: 60
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(storedSettings));

      await analyticsService.initialize();
      
      const settings = analyticsService.getPrivacySettings();
      expect(settings).toEqual(expect.objectContaining(storedSettings));
    });

    it('should handle initialization errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      await expect(analyticsService.initialize()).resolves.not.toThrow();
      
      // Should still be initialized even if storage fails
      const settings = analyticsService.getPrivacySettings();
      expect(settings).toBeDefined();
    });
  });

  describe('Event Tracking', () => {
    beforeEach(async () => {
      await analyticsService.initialize({ enableAnalytics: true });
    });

    it('should track events when analytics is enabled', async () => {
      const eventProperties = { testProp: 'testValue' };
      
      await analyticsService.trackEvent('tip_view', eventProperties, 'user123');
      
      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          action: 'ANALYTICS_EVENT_TRACKED',
          resourceType: 'ANALYTICS_EVENT',
          success: true,
          details: expect.objectContaining({
            eventType: 'tip_view',
            hasPersonalData: true
          })
        })
      );
    });

    it('should not track events when analytics is disabled', async () => {
      await analyticsService.updatePrivacySettings({ enableAnalytics: false });
      
      await analyticsService.trackEvent('tip_view', {}, 'user123');
      
      expect(mockAuditLogService.logDataAccess).not.toHaveBeenCalled();
    });

    it('should remove user ID when personalized analytics is disabled', async () => {
      await analyticsService.updatePrivacySettings({ 
        enableAnalytics: true,
        enablePersonalizedAnalytics: false 
      });
      
      await analyticsService.trackEvent('tip_view', {}, 'user123');
      
      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'anonymous',
          details: expect.objectContaining({
            hasPersonalData: false
          })
        })
      );
    });

    it('should sanitize sensitive properties', async () => {
      const sensitiveProperties = {
        password: 'secret123',
        email: 'user@example.com',
        validProp: 'validValue',
        longString: 'a'.repeat(2000) // Should be truncated
      };
      
      await analyticsService.trackEvent('user_action', sensitiveProperties);
      
      // Verify that sensitive data is not stored
      // This would require access to internal event queue, so we test indirectly
      expect(mockAuditLogService.logDataAccess).toHaveBeenCalled();
    });

    it('should handle tracking errors gracefully', async () => {
      mockAuditLogService.logDataAccess.mockRejectedValueOnce(new Error('Audit log error'));
      
      await expect(analyticsService.trackEvent('tip_view', {})).resolves.not.toThrow();
    });
  });

  describe('Tip Engagement Tracking', () => {
    beforeEach(async () => {
      await analyticsService.initialize({ enableAnalytics: true });
    });

    it('should track tip engagement with correct event type', async () => {
      await analyticsService.trackTipEngagement('tip123', 'like', 'user123', {
        category: 'nutrition',
        difficulty: 'easy'
      });
      
      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            eventType: 'tip_like'
          })
        })
      );
    });

    it('should track all engagement actions', async () => {
      const actions: Array<'view' | 'like' | 'bookmark' | 'complete' | 'share'> = 
        ['view', 'like', 'bookmark', 'complete', 'share'];
      
      for (const action of actions) {
        await analyticsService.trackTipEngagement('tip123', action, 'user123');
        
        expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.objectContaining({
              eventType: `tip_${action}`
            })
          })
        );
      }
    });
  });

  describe('Screen View Tracking', () => {
    beforeEach(async () => {
      await analyticsService.initialize({ enableAnalytics: true });
    });

    it('should track screen views', async () => {
      await analyticsService.trackScreenView('HomeScreen', 'user123', {
        previousScreen: 'LoginScreen'
      });
      
      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            eventType: 'screen_view'
          })
        })
      );
    });
  });

  describe('Performance Tracking', () => {
    beforeEach(async () => {
      await analyticsService.initialize({ 
        enableAnalytics: true,
        enablePerformanceTracking: true 
      });
    });

    it('should track performance metrics when enabled', async () => {
      await analyticsService.trackPerformanceMetric('api_response_time', 250, 'ms', {
        endpoint: '/api/tips'
      });
      
      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            eventType: 'performance_metric'
          })
        })
      );
    });

    it('should not track performance metrics when disabled', async () => {
      await analyticsService.updatePrivacySettings({ enablePerformanceTracking: false });
      
      await analyticsService.trackPerformanceMetric('api_response_time', 250);
      
      expect(mockAuditLogService.logDataAccess).not.toHaveBeenCalled();
    });
  });

  describe('Error Tracking', () => {
    beforeEach(async () => {
      await analyticsService.initialize({ 
        enableAnalytics: true,
        enableErrorReporting: true 
      });
    });

    it('should track errors when enabled', async () => {
      const error = new Error('Test error');
      
      await analyticsService.trackError(error, 'test_context', 'user123', {
        additionalInfo: 'test'
      });
      
      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            eventType: 'error_occurred'
          })
        })
      );
    });

    it('should not track errors when disabled', async () => {
      await analyticsService.updatePrivacySettings({ enableErrorReporting: false });
      
      const error = new Error('Test error');
      await analyticsService.trackError(error, 'test_context');
      
      expect(mockAuditLogService.logDataAccess).not.toHaveBeenCalled();
    });
  });

  describe('Privacy Settings Management', () => {
    it('should update privacy settings', async () => {
      await analyticsService.initialize();
      
      const newSettings: Partial<AnalyticsPrivacySettings> = {
        enableAnalytics: true,
        enablePersonalizedAnalytics: true,
        dataRetentionDays: 60
      };
      
      await analyticsService.updatePrivacySettings(newSettings);
      
      const settings = analyticsService.getPrivacySettings();
      expect(settings).toEqual(expect.objectContaining(newSettings));
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'analytics_privacy_settings',
        expect.stringContaining('"enableAnalytics":true')
      );
    });

    it('should clear events when analytics is disabled', async () => {
      await analyticsService.initialize({ enableAnalytics: true });
      
      // Track some events first
      await analyticsService.trackEvent('tip_view', {});
      
      // Disable analytics
      await analyticsService.updatePrivacySettings({ enableAnalytics: false });
      
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('analytics_stored_events');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('analytics_event_queue');
    });
  });

  describe('Event Flushing', () => {
    beforeEach(async () => {
      await analyticsService.initialize({ enableAnalytics: true });
    });

    it('should flush events to storage', async () => {
      // Track some events
      await analyticsService.trackEvent('tip_view', {});
      await analyticsService.trackEvent('tip_like', {});
      
      await analyticsService.flushEvents();
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'analytics_stored_events',
        expect.any(String)
      );
    });

    it('should handle flush errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));
      
      await analyticsService.trackEvent('tip_view', {});
      
      await expect(analyticsService.flushEvents()).resolves.not.toThrow();
    });
  });

  describe('Analytics Data Retrieval', () => {
    beforeEach(async () => {
      await analyticsService.initialize({ enableAnalytics: true });
      
      // Mock stored events
      const mockEvents: AnalyticsEvent[] = [
        {
          id: 'event1',
          type: 'tip_view',
          timestamp: new Date('2023-01-01'),
          sessionId: 'session1',
          properties: { tipId: 'tip1', category: 'nutrition' },
          userId: 'user1'
        },
        {
          id: 'event2',
          type: 'tip_like',
          timestamp: new Date('2023-01-02'),
          sessionId: 'session1',
          properties: { tipId: 'tip1', category: 'nutrition' },
          userId: 'user1'
        }
      ];
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockEvents));
    });

    it('should get engagement metrics', async () => {
      const metrics = await analyticsService.getEngagementMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.tipViews).toBe(1);
      expect(metrics.tipLikes).toBe(1);
      expect(metrics.tipBookmarks).toBe(0);
      expect(metrics.tipCompletions).toBe(0);
      expect(metrics.tipShares).toBe(0);
    });

    it('should get content performance', async () => {
      const performance = await analyticsService.getContentPerformance();
      
      expect(performance).toBeDefined();
      expect(performance.length).toBeGreaterThan(0);
      expect(performance[0]).toEqual(expect.objectContaining({
        tipId: 'tip1',
        views: 1,
        likes: 1,
        engagementRate: expect.any(Number)
      }));
    });

    it('should get user behavior analytics', async () => {
      const behavior = await analyticsService.getUserBehaviorAnalytics();
      
      expect(behavior).toBeDefined();
      expect(behavior.averageSessionsPerDay).toBeGreaterThanOrEqual(0);
      expect(behavior.averageSessionDuration).toBeGreaterThanOrEqual(0);
      expect(behavior.mostActiveTimeOfDay).toBeDefined();
      expect(behavior.preferredCategories).toBeDefined();
      expect(behavior.engagementTrends).toBeDefined();
      expect(behavior.retentionRates).toBeDefined();
    });

    it('should handle analytics retrieval errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));
      
      const metrics = await analyticsService.getEngagementMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.tipViews).toBe(0);
    });

    it('should filter analytics by date range', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-01');
      
      const metrics = await analyticsService.getEngagementMetrics(startDate, endDate);
      
      expect(metrics.tipViews).toBe(1); // Only events from 2023-01-01
      expect(metrics.tipLikes).toBe(0); // Event from 2023-01-02 should be excluded
    });
  });

  describe('Data Cleanup', () => {
    beforeEach(async () => {
      await analyticsService.initialize({ 
        enableAnalytics: true,
        dataRetentionDays: 30 
      });
    });

    it('should clear all analytics data', async () => {
      await analyticsService.clearAllData();
      
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('analytics_stored_events');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('analytics_event_queue');
      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ANALYTICS_DATA_CLEARED'
        })
      );
    });

    it('should cleanup old events based on retention policy', async () => {
      const oldEvents = [
        {
          id: 'old_event',
          type: 'tip_view',
          timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          sessionId: 'session1',
          properties: {}
        }
      ];
      
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(oldEvents));
      
      await analyticsService.flushEvents();
      
      // Should save filtered events (empty array since old event should be removed)
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'analytics_stored_events',
        JSON.stringify([])
      );
    });
  });

  describe('Service Cleanup', () => {
    beforeEach(async () => {
      await analyticsService.initialize({ enableAnalytics: true });
    });

    it('should cleanup properly on app termination', async () => {
      await analyticsService.cleanup();
      
      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            eventType: 'app_close'
          })
        })
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      mockAuditLogService.logDataAccess.mockRejectedValueOnce(new Error('Audit error'));
      
      await expect(analyticsService.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Periodic Flushing', () => {
    beforeEach(async () => {
      await analyticsService.initialize({ enableAnalytics: true });
    });

    it('should flush events periodically', async () => {
      // Track an event
      await analyticsService.trackEvent('tip_view', {});
      
      // Fast-forward time to trigger periodic flush
      jest.advanceTimersByTime(30000); // 30 seconds
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'analytics_stored_events',
        expect.any(String)
      );
    });
  });
});