/**
 * Integration tests for analytics flow
 * Tests the complete analytics tracking and reporting flow
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AnalyticsDashboard } from '../../src/components/analytics/AnalyticsDashboard';
import { ConsentManager } from '../../src/components/analytics/ConsentManager';
import { AnalyticsService } from '../../src/services/analytics/analyticsService';
import { authSlice } from '../../src/store/authSlice';
import { AnalyticsEvent } from '../../src/types/analytics';
import * as storage from '../../src/utils/storage';

// Mock dependencies
jest.mock('../../src/utils/storage');
jest.mock('../../src/services/sync/syncService');

const mockStorage = storage as jest.Mocked<typeof storage>;

// Mock user data
const mockUser = {
  id: 'user123',
  email: 'test@example.com',
  name: 'Test User',
  age: 30,
  gender: 'male' as const,
  healthGoals: ['weight_loss'],
  activityLevel: 'moderate' as const,
  dietaryPreferences: [],
  healthConditions: [],
  interests: ['nutrition'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Create test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
    },
    preloadedState: {
      auth: {
        user: mockUser,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        error: null,
      },
    },
  });
};

describe('Analytics Flow Integration', () => {
  let store: ReturnType<typeof createTestStore>;
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    store = createTestStore();
    analyticsService = AnalyticsService.getInstance();
    jest.clearAllMocks();
    mockStorage.getData.mockResolvedValue([]);
    mockStorage.storeData.mockResolvedValue();
  });

  describe('Consent Management Flow', () => {
    it('should handle consent acceptance', async () => {
      const onConsentGiven = jest.fn();
      const onConsentDeclined = jest.fn();

      const { getByText } = render(
        <ConsentManager
          visible={true}
          onConsentGiven={onConsentGiven}
          onConsentDeclined={onConsentDeclined}
        />
      );

      // Check initial screen elements
      expect(getByText('Privacy & Data Collection')).toBeTruthy();
      expect(getByText('Accept All')).toBeTruthy();
      expect(getByText('Decline')).toBeTruthy();

      // Accept all consent
      const acceptButton = getByText('Accept All');
      fireEvent.press(acceptButton);

      await waitFor(() => {
        expect(onConsentGiven).toHaveBeenCalledWith(
          expect.objectContaining({
            analyticsConsent: true,
            performanceConsent: true,
            crashReportingConsent: true,
            trackingLevel: 'standard',
          })
        );
      });
    });

    it('should handle consent decline', async () => {
      const onConsentGiven = jest.fn();
      const onConsentDeclined = jest.fn();

      const { getByText } = render(
        <ConsentManager
          visible={true}
          onConsentGiven={onConsentGiven}
          onConsentDeclined={onConsentDeclined}
        />
      );

      // Decline consent
      const declineButton = getByText('Decline');
      fireEvent.press(declineButton);

      await waitFor(() => {
        expect(onConsentDeclined).toHaveBeenCalled();
      });
    });

    it('should handle custom consent settings', async () => {
      const onConsentGiven = jest.fn();
      const onConsentDeclined = jest.fn();

      const { getByText } = render(
        <ConsentManager
          visible={true}
          onConsentGiven={onConsentGiven}
          onConsentDeclined={onConsentDeclined}
        />
      );

      // Open custom settings
      const customizeButton = getByText('Customize');
      fireEvent.press(customizeButton);

      await waitFor(() => {
        expect(getByText('Data Collection Details')).toBeTruthy();
      });

      // Save custom preferences
      const saveButton = getByText('Save Preferences');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(onConsentGiven).toHaveBeenCalled();
      });
    });
  });

  describe('Analytics Tracking Flow', () => {
    beforeEach(async () => {
      await analyticsService.initialize(true, 'standard');
    });

    it('should track user journey through app', async () => {
      // Track app launch
      await analyticsService.trackEvent('app_launch', {
        userId: 'user123',
      });

      // Track screen view
      await analyticsService.trackScreenView('DailyTipsScreen', 'user123');

      // Track tip interaction
      await analyticsService.trackTipInteraction(
        'view',
        'tip123',
        { title: 'Test Tip', category: 'nutrition' },
        'user123'
      );

      // Track tip like
      await analyticsService.trackTipInteraction(
        'like',
        'tip123',
        { title: 'Test Tip', category: 'nutrition' },
        'user123'
      );

      // Verify events were stored
      expect(mockStorage.storeData).toHaveBeenCalledTimes(4);
      
      // Check that events have correct structure
      const lastCall = mockStorage.storeData.mock.calls[3];
      const events = lastCall[1] as AnalyticsEvent[];
      expect(events).toHaveLength(4);
      expect(events[0].eventType).toBe('app_launch');
      expect(events[1].eventType).toBe('screen_view');
      expect(events[2].eventType).toBe('tip_view');
      expect(events[3].eventType).toBe('tip_like');
    });

    it('should track search activity', async () => {
      await analyticsService.trackSearch('healthy recipes', 25, 'user123');

      const events = mockStorage.storeData.mock.calls[0][1] as AnalyticsEvent[];
      expect(events[0].eventType).toBe('search_performed');
      expect(events[0].eventData.searchQuery).toBe('healthy recipes');
      expect(events[0].eventData.searchResults).toBe(25);
    });

    it('should track performance metrics', async () => {
      await analyticsService.trackPerformance('page_load_time', 1200, {
        page: 'tips',
        userId: 'user123',
      });

      const events = mockStorage.storeData.mock.calls[0][1] as AnalyticsEvent[];
      expect(events[0].eventType).toBe('performance_metric');
      expect(events[0].eventData.action).toBe('page_load_time');
      expect(events[0].eventData.value).toBe(1200);
    });
  });

  describe('Analytics Dashboard Flow', () => {
    const mockAnalyticsData: AnalyticsEvent[] = [
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
        userId: 'user1',
        eventType: 'tip_view',
        eventData: { 
          tipId: 'tip1', 
          tipTitle: 'Popular Tip', 
          tipCategory: 'nutrition' 
        },
        timestamp: new Date('2024-01-01T10:05:00Z'),
        sessionId: 'session1',
      },
      {
        id: 'event3',
        userId: 'user2',
        eventType: 'tip_like',
        eventData: { 
          tipId: 'tip1', 
          tipTitle: 'Popular Tip', 
          tipCategory: 'nutrition' 
        },
        timestamp: new Date('2024-01-01T11:00:00Z'),
        sessionId: 'session2',
      },
    ];

    it('should display analytics dashboard with metrics', async () => {
      mockStorage.getData.mockResolvedValue(mockAnalyticsData);

      const { getByText } = render(
        <Provider store={store}>
          <AnalyticsDashboard />
        </Provider>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(getByText('Analytics Dashboard')).toBeTruthy();
        expect(getByText('Overview')).toBeTruthy();
        expect(getByText('User Engagement')).toBeTruthy();
      });

      // Check that metrics are displayed
      await waitFor(() => {
        expect(getByText('Total Users')).toBeTruthy();
        expect(getByText('Active Users')).toBeTruthy();
        expect(getByText('Total Sessions')).toBeTruthy();
      });
    });

    it('should handle empty analytics data', async () => {
      mockStorage.getData.mockResolvedValue([]);

      const { getByText } = render(
        <Provider store={store}>
          <AnalyticsDashboard />
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('No analytics data available')).toBeTruthy();
      });
    });

    it('should allow period selection', async () => {
      mockStorage.getData.mockResolvedValue(mockAnalyticsData);

      const { getByText } = render(
        <Provider store={store}>
          <AnalyticsDashboard />
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Day')).toBeTruthy();
        expect(getByText('Week')).toBeTruthy();
        expect(getByText('Month')).toBeTruthy();
      });

      // Select different period
      const dayButton = getByText('Day');
      fireEvent.press(dayButton);

      // Verify period selection works
      expect(dayButton.props.style).toContainEqual(
        expect.objectContaining({ backgroundColor: '#3498db' })
      );
    });
  });

  describe('User Engagement Metrics', () => {
    const mockUserEvents: AnalyticsEvent[] = [
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
    ];

    it('should calculate user engagement metrics correctly', async () => {
      mockStorage.getData.mockResolvedValue(mockUserEvents);
      await analyticsService.initialize(true, 'standard');

      const metrics = await analyticsService.getUserEngagementMetrics('user123');

      expect(metrics).toBeDefined();
      expect(metrics!.userId).toBe('user123');
      expect(metrics!.sessionCount).toBe(1);
      expect(metrics!.tipsViewed).toBe(1);
      expect(metrics!.tipsLiked).toBe(1);
      expect(metrics!.tipsCompleted).toBe(1);
      expect(metrics!.favoriteCategories).toContain('nutrition');
    });
  });

  describe('Data Privacy and GDPR Compliance', () => {
    beforeEach(async () => {
      await analyticsService.initialize(true, 'standard');
    });

    it('should export user data for GDPR compliance', async () => {
      const mockEvents: AnalyticsEvent[] = [
        {
          id: 'event1',
          userId: 'user123',
          eventType: 'app_launch',
          eventData: {},
          timestamp: new Date(),
          sessionId: 'session1',
        },
      ];
      mockStorage.getData.mockResolvedValue(mockEvents);

      const exportedData = await analyticsService.exportUserData('user123');

      expect(exportedData).toHaveLength(1);
      expect(exportedData[0].userId).toBe('user123');
    });

    it('should delete user data for GDPR compliance', async () => {
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

    it('should respect minimal tracking level', async () => {
      await analyticsService.initialize(true, 'minimal');

      await analyticsService.trackSearch('sensitive query', 5, 'user123');

      const events = mockStorage.storeData.mock.calls[0][1] as AnalyticsEvent[];
      expect(events[0].eventData.searchQuery).toBe('[REDACTED]');
    });
  });

  describe('Performance Tracking', () => {
    beforeEach(async () => {
      await analyticsService.initialize(true, 'standard');
    });

    it('should track component load times', async () => {
      const startTime = Date.now();
      const loadTime = 500;

      await analyticsService.trackPerformance('component_load_time', loadTime, {
        componentName: 'DailyTipsScreen',
        startTime,
      });

      const events = mockStorage.storeData.mock.calls[0][1] as AnalyticsEvent[];
      expect(events[0].eventType).toBe('performance_metric');
      expect(events[0].eventData.action).toBe('component_load_time');
      expect(events[0].eventData.value).toBe(loadTime);
      expect(events[0].eventData.componentName).toBe('DailyTipsScreen');
    });

    it('should track API call performance', async () => {
      await analyticsService.trackPerformance('api_call', 1200, {
        endpoint: '/api/tips',
        success: 'true',
      });

      const events = mockStorage.storeData.mock.calls[0][1] as AnalyticsEvent[];
      expect(events[0].eventData.endpoint).toBe('/api/tips');
      expect(events[0].eventData.success).toBe('true');
    });
  });
});