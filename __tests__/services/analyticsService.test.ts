/**
 * Unit tests for Analytics Service
 */

import { AnalyticsService } from '../../src/services/analytics/analyticsService';
import { AnalyticsEvent } from '../../src/types/analytics';
import * as storage from '../../src/utils/storage';

// Mock dependencies
jest.mock('../../src/utils/storage');
jest.mock('../../src/services/sync/syncService');

const mockStorage = storage as jest.Mocked<typeof storage>;

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    analyticsService = AnalyticsService.getInstance();
    jest.clearAllMocks();
    mockStorage.getData.mockResolvedValue([]);
    mockStorage.storeData.mockResolvedValue();
  });

  describe('initialization', () => {
    it('should initialize with consent', async () => {
      await analyticsService.initialize(true, 'standard');

      const config = analyticsService.getConfig();
      expect(config.consentGiven).toBe(true);
      expect(config.trackingLevel).toBe('standard');
    });

    it('should initialize without consent', async () => {
      await analyticsService.initialize(false, 'minimal');

      const config = analyticsService.getConfig();
      expect(config.consentGiven).toBe(false);
      expect(config.trackingLevel).toBe('minimal');
    });

    it('should load saved config', async () => {
      const savedConfig = {
        enabled: true,
        consentGiven: true,
        trackingLevel: 'detailed' as const,
        retentionDays: 60,
      };
      mockStorage.getData.mockResolvedValueOnce(savedConfig);

      await analyticsService.initialize(true, 'standard');

      const config = analyticsService.getConfig();
      expect(config.trackingLevel).toBe('detailed');
      expect(config.retentionDays).toBe(60);
    });
  });

  describe('event tracking', () => {
    beforeEach(async () => {
      await analyticsService.initialize(true, 'standard');
    });

    it('should track events when consent is given', async () => {
      await analyticsService.trackEvent('app_launch', {
        userId: 'user123',
        screen: 'home',
      });

      expect(mockStorage.storeData).toHaveBeenCalled();
      const storedEvents = mockStorage.storeData.mock.calls[0][1] as AnalyticsEvent[];
      expect(storedEvents).toHaveLength(1);
      expect(storedEvents[0].eventType).toBe('app_launch');
      expect(storedEvents[0].eventData.userId).toBe('user123');
    });

    it('should not track events when consent is not given', async () => {
      await analyticsService.initialize(false);

      await analyticsService.trackEvent('app_launch', {
        userId: 'user123',
      });

      expect(mockStorage.storeData).not.toHaveBeenCalled();
    });

    it('should sanitize event data based on tracking level', async () => {
      await analyticsService.initialize(true, 'minimal');

      await analyticsService.trackEvent('search_performed', {
        searchQuery: 'sensitive query',
        userId: 'user123',
      });

      const storedEvents = mockStorage.storeData.mock.calls[0][1] as AnalyticsEvent[];
      expect(storedEvents[0].eventData.searchQuery).toBeUndefined();
    });

    it('should generate unique event IDs', async () => {
      await analyticsService.trackEvent('tip_view', { tipId: 'tip1' });
      await analyticsService.trackEvent('tip_view', { tipId: 'tip2' });

      expect(mockStorage.storeData).toHaveBeenCalledTimes(2);
      const firstCall = mockStorage.storeData.mock.calls[0][1] as AnalyticsEvent[];
      const secondCall = mockStorage.storeData.mock.calls[1][1] as AnalyticsEvent[];
      
      expect(firstCall[0].id).not.toBe(secondCall[0].id);
    });
  });

  describe('screen tracking', () => {
    beforeEach(async () => {
      await analyticsService.initialize(true, 'standard');
    });

    it('should track screen views', async () => {
      await analyticsService.trackScreenView('HomeScreen', 'user123', {
        previousScreen: 'LoginScreen',
      });

      const storedEvents = mockStorage.storeData.mock.calls[0][1] as AnalyticsEvent[];
      expect(storedEvents[0].eventType).toBe('screen_view');
      expect(storedEvents[0].eventData.screen).toBe('HomeScreen');
      expect(storedEvents[0].eventData.previousScreen).toBe('LoginScreen');
    });
  });

  describe('tip interaction tracking', () => {
    beforeEach(async () => {
      await analyticsService.initialize(true, 'standard');
    });

    it('should track tip views', async () => {
      await analyticsService.trackTipInteraction(
        'view',
        'tip123',
        { title: 'Test Tip', category: 'nutrition' },
        'user123'
      );

      const storedEvents = mockStorage.storeData.mock.calls[0][1] as AnalyticsEvent[];
      expect(storedEvents[0].eventType).toBe('tip_view');
      expect(storedEvents[0].eventData.tipId).toBe('tip123');
      expect(storedEvents[0].eventData.tipTitle).toBe('Test Tip');
      expect(storedEvents[0].eventData.tipCategory).toBe('nutrition');
    });

    it('should track tip likes', async () => {
      await analyticsService.trackTipInteraction(
        'like',
        'tip123',
        { title: 'Test Tip' },
        'user123'
      );

      const storedEvents = mockStorage.storeData.mock.calls[0][1] as AnalyticsEvent[];
      expect(storedEvents[0].eventType).toBe('tip_like');
    });
  });

  describe('search tracking', () => {
    beforeEach(async () => {
      await analyticsService.initialize(true, 'standard');
    });

    it('should track search queries', async () => {
      await analyticsService.trackSearch('healthy recipes', 15, 'user123');

      const storedEvents = mockStorage.storeData.mock.calls[0][1] as AnalyticsEvent[];
      expect(storedEvents[0].eventType).toBe('search_performed');
      expect(storedEvents[0].eventData.searchQuery).toBe('healthy recipes');
      expect(storedEvents[0].eventData.searchResults).toBe(15);
    });

    it('should redact search queries in minimal tracking mode', async () => {
      await analyticsService.initialize(true, 'minimal');

      await analyticsService.trackSearch('sensitive query', 5, 'user123');

      const storedEvents = mockStorage.storeData.mock.calls[0][1] as AnalyticsEvent[];
      expect(storedEvents[0].eventData.searchQuery).toBe('[REDACTED]');
    });
  });

  describe('performance tracking', () => {
    beforeEach(async () => {
      await analyticsService.initialize(true, 'standard');
    });

    it('should track performance metrics', async () => {
      await analyticsService.trackPerformance('page_load_time', 1500, {
        page: 'home',
      });

      const storedEvents = mockStorage.storeData.mock.calls[0][1] as AnalyticsEvent[];
      expect(storedEvents[0].eventType).toBe('performance_metric');
      expect(storedEvents[0].eventData.action).toBe('page_load_time');
      expect(storedEvents[0].eventData.value).toBe(1500);
      expect(storedEvents[0].eventData.page).toBe('home');
    });
  });

  describe('user engagement metrics', () => {
    const mockEvents: AnalyticsEvent[] = [
      {
        id: 'event1',
        userId: 'user123',
        eventType: 'app_launch',
        eventData: {},
        timestamp: new Date('2024-01-01T10:00:00Z'),
        sessionId: 'session1',
      },
      {
        id: 'event2',
        userId: 'user123',
        eventType: 'tip_view',
        eventData: { tipId: 'tip1', tipCategory: 'nutrition' },
        timestamp: new Date('2024-01-01T10:05:00Z'),
        sessionId: 'session1',
      },
      {
        id: 'event3',
        userId: 'user123',
        eventType: 'tip_like',
        eventData: { tipId: 'tip1', tipCategory: 'nutrition' },
        timestamp: new Date('2024-01-01T10:06:00Z'),
        sessionId: 'session1',
      },
      {
        id: 'event4',
        userId: 'user123',
        eventType: 'tip_complete',
        eventData: { tipId: 'tip1', tipCategory: 'nutrition' },
        timestamp: new Date('2024-01-01T10:10:00Z'),
        sessionId: 'session1',
      },
      {
        id: 'event5',
        userId: 'user123',
        eventType: 'search_performed',
        eventData: { searchQuery: 'exercise' },
        timestamp: new Date('2024-01-02T09:00:00Z'),
        sessionId: 'session2',
      },
    ];

    beforeEach(async () => {
      await analyticsService.initialize(true, 'standard');
      mockStorage.getData.mockResolvedValue(mockEvents);
    });

    it('should calculate user engagement metrics', async () => {
      const metrics = await analyticsService.getUserEngagementMetrics('user123');

      expect(metrics).toBeDefined();
      expect(metrics!.userId).toBe('user123');
      expect(metrics!.sessionCount).toBe(2);
      expect(metrics!.tipsViewed).toBe(1);
      expect(metrics!.tipsLiked).toBe(1);
      expect(metrics!.tipsCompleted).toBe(1);
      expect(metrics!.searchesPerformed).toBe(1);
      expect(metrics!.favoriteCategories).toContain('nutrition');
    });

    it('should return null for user with no events', async () => {
      mockStorage.getData.mockResolvedValue([]);

      const metrics = await analyticsService.getUserEngagementMetrics('user123');

      expect(metrics).toBeNull();
    });
  });

  describe('app usage metrics', () => {
    const mockEvents: AnalyticsEvent[] = [
      {
        id: 'event1',
        userId: 'user1',
        eventType: 'app_launch',
        eventData: {},
        timestamp: new Date('2024-01-01T10:00:00Z'),
        sessionId: 'session1',
      },
      {
        id: 'event2',
        userId: 'user2',
        eventType: 'app_launch',
        eventData: {},
        timestamp: new Date('2024-01-01T11:00:00Z'),
        sessionId: 'session2',
      },
      {
        id: 'event3',
        userId: 'user1',
        eventType: 'tip_view',
        eventData: { tipId: 'tip1', tipTitle: 'Popular Tip', tipCategory: 'nutrition' },
        timestamp: new Date('2024-01-01T10:05:00Z'),
        sessionId: 'session1',
      },
      {
        id: 'event4',
        userId: 'user1',
        eventType: 'tip_like',
        eventData: { tipId: 'tip1', tipTitle: 'Popular Tip', tipCategory: 'nutrition' },
        timestamp: new Date('2024-01-01T10:06:00Z'),
        sessionId: 'session1',
      },
    ];

    beforeEach(async () => {
      await analyticsService.initialize(true, 'standard');
      mockStorage.getData.mockResolvedValue(mockEvents);
    });

    it('should calculate app usage metrics', async () => {
      const metrics = await analyticsService.getAppUsageMetrics();

      expect(metrics).toBeDefined();
      expect(metrics!.totalUsers).toBe(2);
      expect(metrics!.sessionMetrics.totalSessions).toBe(2);
      expect(metrics!.contentMetrics.mostViewedTips).toHaveLength(1);
      expect(metrics!.contentMetrics.mostViewedTips[0].tipId).toBe('tip1');
      expect(metrics!.contentMetrics.mostViewedTips[0].views).toBe(1);
      expect(metrics!.contentMetrics.mostLikedTips[0].tipId).toBe('tip1');
      expect(metrics!.contentMetrics.mostLikedTips[0].likes).toBe(1);
    });

    it('should calculate category popularity', async () => {
      const metrics = await analyticsService.getAppUsageMetrics();

      expect(metrics!.contentMetrics.categoryPopularity.nutrition).toBe(2);
    });
  });

  describe('data management', () => {
    beforeEach(async () => {
      await analyticsService.initialize(true, 'standard');
    });

    it('should clear all data', async () => {
      await analyticsService.clearAllData();

      expect(mockStorage.storeData).toHaveBeenCalledWith('ANALYTICS_EVENTS', []);
    });

    it('should export user data', async () => {
      const mockEvents: AnalyticsEvent[] = [
        {
          id: 'event1',
          userId: 'user123',
          eventType: 'app_launch',
          eventData: {},
          timestamp: new Date(),
          sessionId: 'session1',
        },
        {
          id: 'event2',
          userId: 'user456',
          eventType: 'app_launch',
          eventData: {},
          timestamp: new Date(),
          sessionId: 'session2',
        },
      ];
      mockStorage.getData.mockResolvedValue(mockEvents);

      const userData = await analyticsService.exportUserData('user123');

      expect(userData).toHaveLength(1);
      expect(userData[0].userId).toBe('user123');
    });

    it('should delete user data', async () => {
      const mockEvents: AnalyticsEvent[] = [
        {
          id: 'event1',
          userId: 'user123',
          eventType: 'app_launch',
          eventData: {},
          timestamp: new Date(),
          sessionId: 'session1',
        },
        {
          id: 'event2',
          userId: 'user456',
          eventType: 'app_launch',
          eventData: {},
          timestamp: new Date(),
          sessionId: 'session2',
        },
      ];
      mockStorage.getData.mockResolvedValue(mockEvents);

      await analyticsService.deleteUserData('user123');

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'ANALYTICS_EVENTS',
        [mockEvents[1]] // Only user456's event should remain
      );
    });
  });

  describe('configuration management', () => {
    it('should update configuration', async () => {
      await analyticsService.updateConfig({
        retentionDays: 30,
        batchSize: 25,
      });

      const config = analyticsService.getConfig();
      expect(config.retentionDays).toBe(30);
      expect(config.batchSize).toBe(25);
      expect(mockStorage.storeData).toHaveBeenCalledWith('ANALYTICS_CONFIG', expect.objectContaining({
        retentionDays: 30,
        batchSize: 25,
      }));
    });

    it('should get current configuration', () => {
      const config = analyticsService.getConfig();

      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('consentGiven');
      expect(config).toHaveProperty('trackingLevel');
      expect(config).toHaveProperty('retentionDays');
      expect(config).toHaveProperty('batchSize');
      expect(config).toHaveProperty('flushInterval');
    });
  });

  describe('data retention', () => {
    beforeEach(async () => {
      await analyticsService.initialize(true, 'standard');
    });

    it('should clean up old events based on retention policy', async () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const recentDate = new Date();

      const mockEvents: AnalyticsEvent[] = [
        {
          id: 'old_event',
          userId: 'user123',
          eventType: 'app_launch',
          eventData: {},
          timestamp: oldDate,
          sessionId: 'session1',
        },
        {
          id: 'recent_event',
          userId: 'user123',
          eventType: 'app_launch',
          eventData: {},
          timestamp: recentDate,
          sessionId: 'session2',
        },
      ];

      mockStorage.getData.mockResolvedValue(mockEvents);

      await analyticsService.trackEvent('tip_view', { tipId: 'tip1' });

      // Should store only recent events (within retention period)
      const storedEvents = mockStorage.storeData.mock.calls[0][1] as AnalyticsEvent[];
      const oldEvents = storedEvents.filter(e => e.timestamp.getTime() === oldDate.getTime());
      expect(oldEvents).toHaveLength(0);
    });
  });
});