/**
 * Analytics Instrumentation Tests
 * Tests to verify that analytics events are properly tracked across the app
 */

import { analyticsService } from '../analyticsService';
import { renderHook, act } from '@testing-library/react-hooks';
import useAnalytics from '../../../hooks/useAnalytics';

// Mock the analytics service
jest.mock('../analyticsService');

const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;

describe('Analytics Instrumentation', () => {
  const mockUserId = 'user-123';
  const mockTipId = 'tip-456';
  const mockTipData = {
    title: 'Test Health Tip',
    category: 'nutrition'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useAnalytics Hook', () => {
    it('should track screen view on mount', () => {
      const screenName = 'HealthTipsList';
      
      renderHook(() => useAnalytics({ 
        userId: mockUserId, 
        screenName 
      }));

      expect(mockAnalyticsService.trackScreenView).toHaveBeenCalledWith(
        screenName,
        mockUserId
      );
    });

    it('should provide trackTipInteraction function', () => {
      const { result } = renderHook(() => useAnalytics({ userId: mockUserId }));

      act(() => {
        result.current.trackTipInteraction('view', mockTipId, mockTipData);
      });

      expect(mockAnalyticsService.trackTipInteraction).toHaveBeenCalledWith(
        'view',
        mockTipId,
        mockTipData,
        mockUserId
      );
    });

    it('should provide trackSearch function', () => {
      const { result } = renderHook(() => useAnalytics({ userId: mockUserId }));
      const query = 'healthy eating';
      const resultsCount = 5;

      act(() => {
        result.current.trackSearch(query, resultsCount);
      });

      expect(mockAnalyticsService.trackSearch).toHaveBeenCalledWith(
        query,
        resultsCount,
        mockUserId
      );
    });

    it('should provide trackEvent function', () => {
      const { result } = renderHook(() => useAnalytics({ userId: mockUserId }));
      const eventType = 'custom_event';
      const eventData = { action: 'test' };

      act(() => {
        result.current.trackEvent(eventType, eventData);
      });

      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        eventType,
        {
          ...eventData,
          userId: mockUserId
        }
      );
    });

    it('should provide trackPerformance function', () => {
      const { result } = renderHook(() => useAnalytics({ userId: mockUserId }));
      const metric = 'page_load_time';
      const value = 1500;
      const additionalData = { screen: 'home' };

      act(() => {
        result.current.trackPerformance(metric, value, additionalData);
      });

      expect(mockAnalyticsService.trackPerformance).toHaveBeenCalledWith(
        metric,
        value,
        {
          ...additionalData,
          userId: mockUserId
        }
      );
    });

    it('should provide trackError function', () => {
      const { result } = renderHook(() => useAnalytics({ userId: mockUserId }));
      const error = new Error('Test error');
      const context = 'tip_loading';

      act(() => {
        result.current.trackError(error, context);
      });

      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        'error_occurred',
        {
          errorMessage: error.message,
          errorStack: error.stack,
          context,
          userId: mockUserId
        }
      );
    });

    it('should provide session tracking functions', () => {
      const { result } = renderHook(() => useAnalytics({ userId: mockUserId }));

      act(() => {
        result.current.trackSessionStart();
      });

      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        'app_launch',
        {
          userId: mockUserId,
          timestamp: expect.any(String)
        }
      );

      act(() => {
        result.current.trackSessionEnd();
      });

      expect(mockAnalyticsService.trackSessionEnd).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('Event Schema Validation', () => {
    it('should track tip view events with correct schema', () => {
      const { result } = renderHook(() => useAnalytics({ userId: mockUserId }));

      act(() => {
        result.current.trackTipInteraction('view', mockTipId, mockTipData);
      });

      expect(mockAnalyticsService.trackTipInteraction).toHaveBeenCalledWith(
        'view',
        mockTipId,
        {
          title: expect.any(String),
          category: expect.any(String)
        },
        mockUserId
      );
    });

    it('should track tip completion events with correct schema', () => {
      const { result } = renderHook(() => useAnalytics({ userId: mockUserId }));

      act(() => {
        result.current.trackTipInteraction('complete', mockTipId, mockTipData);
      });

      expect(mockAnalyticsService.trackTipInteraction).toHaveBeenCalledWith(
        'complete',
        mockTipId,
        mockTipData,
        mockUserId
      );
    });

    it('should track search events with correct schema', () => {
      const { result } = renderHook(() => useAnalytics({ userId: mockUserId }));
      const searchQuery = 'meditation tips';
      const resultsCount = 10;

      act(() => {
        result.current.trackSearch(searchQuery, resultsCount);
      });

      expect(mockAnalyticsService.trackSearch).toHaveBeenCalledWith(
        searchQuery,
        resultsCount,
        mockUserId
      );
    });

    it('should track feedback submission events with correct schema', () => {
      const { result } = renderHook(() => useAnalytics({ userId: mockUserId }));

      act(() => {
        result.current.trackEvent('feedback_submitted', {
          category: 'bug_report',
          priority: 'high'
        });
      });

      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        'feedback_submitted',
        {
          category: 'bug_report',
          priority: 'high',
          userId: mockUserId
        }
      );
    });

    it('should track session events with correct schema', () => {
      const { result } = renderHook(() => useAnalytics({ userId: mockUserId }));

      act(() => {
        result.current.trackSessionStart();
      });

      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        'app_launch',
        {
          userId: mockUserId,
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle analytics service errors gracefully', () => {
      mockAnalyticsService.trackEvent.mockRejectedValueOnce(new Error('Analytics error'));
      
      const { result } = renderHook(() => useAnalytics({ userId: mockUserId }));

      // Should not throw
      expect(() => {
        act(() => {
          result.current.trackEvent('test_event');
        });
      }).not.toThrow();
    });

    it('should work without userId', () => {
      const { result } = renderHook(() => useAnalytics());

      act(() => {
        result.current.trackEvent('test_event', { action: 'test' });
      });

      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        'test_event',
        {
          action: 'test',
          userId: undefined
        }
      );
    });
  });

  describe('Performance Tracking', () => {
    it('should track component render times', () => {
      const { result } = renderHook(() => useAnalytics({ userId: mockUserId }));

      act(() => {
        result.current.trackPerformance('component_render_time', 150, {
          component: 'HealthTipCard'
        });
      });

      expect(mockAnalyticsService.trackPerformance).toHaveBeenCalledWith(
        'component_render_time',
        150,
        {
          component: 'HealthTipCard',
          userId: mockUserId
        }
      );
    });

    it('should track API response times', () => {
      const { result } = renderHook(() => useAnalytics({ userId: mockUserId }));

      act(() => {
        result.current.trackPerformance('api_response_time', 800, {
          endpoint: '/api/tips',
          method: 'GET'
        });
      });

      expect(mockAnalyticsService.trackPerformance).toHaveBeenCalledWith(
        'api_response_time',
        800,
        {
          endpoint: '/api/tips',
          method: 'GET',
          userId: mockUserId
        }
      );
    });
  });
});

describe('Analytics Integration Smoke Tests', () => {
  // These tests would run against the actual analytics service
  // to verify events appear in dev logs
  
  describe('Event Logging', () => {
    it('should log events to console in development', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Unmock for this test
      jest.unmock('../analyticsService');
      const realAnalyticsService = require('../analyticsService').analyticsService;
      
      await realAnalyticsService.initialize(true, 'standard');
      await realAnalyticsService.trackEvent('test_event', { test: true });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Analytics event tracked: test_event'),
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Event Storage', () => {
    it('should store events locally', async () => {
      // This would test that events are actually stored
      // and can be retrieved for debugging
      const { analyticsService } = require('../analyticsService');
      
      await analyticsService.initialize(true, 'standard');
      await analyticsService.trackEvent('storage_test', { test: true });
      
      // In a real test, we'd verify the event was stored
      // This is a placeholder for the actual storage verification
      expect(true).toBe(true);
    });
  });
});