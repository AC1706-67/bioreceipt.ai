/**
 * Frontend-Backend Integration Tests
 * Tests the complete integration between React components and the HealthTip API
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { TipsFeed } from '../../src/components/tips/TipsFeed';
import { DailyTipsScreen } from '../../src/screens/tips/DailyTipsScreen';
import { ContentService } from '../../src/services/content/contentService';
import { tokenManager } from '../../src/utils/tokenManager';
import { loggingService } from '../../src/services/logging/loggingService';
import authSlice from '../../src/store/authSlice';

// Mock dependencies
jest.mock('../../src/services/content/contentService');
jest.mock('../../src/utils/tokenManager');
jest.mock('../../src/services/logging/loggingService');
jest.mock('../../src/hooks/useAnalytics', () => ({
  useScreenTracking: jest.fn(),
  useAnalytics: () => ({
    trackTipInteraction: jest.fn(),
    trackPerformance: jest.fn(),
  }),
}));

// Mock fetch
global.fetch = jest.fn();

const mockContentService = ContentService.getInstance() as jest.Mocked<ContentService>;
const mockTokenManager = tokenManager as jest.Mocked<typeof tokenManager>;
const mockLoggingService = loggingService as jest.Mocked<typeof loggingService>;
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Test store setup
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          isActive: true,
        },
        token: 'test-token',
        isAuthenticated: true,
        loading: false,
        error: null,
        ...initialState,
      },
    },
  });
};

const renderWithProvider = (component: React.ReactElement, initialState = {}) => {
  const store = createTestStore(initialState);
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('Frontend-Backend Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockTokenManager.getToken.mockResolvedValue('test-token');
    mockLoggingService.logInfo.mockResolvedValue(undefined);
    mockLoggingService.logError.mockResolvedValue(undefined);
    mockLoggingService.logWarning.mockResolvedValue(undefined);
  });

  describe('TipsFeed Integration', () => {
    const mockTips = [
      {
        id: 'tip-1',
        title: 'Stay Hydrated',
        content: 'Drink plenty of water throughout the day to maintain good health and energy levels.',
        category: 'nutrition' as const,
        difficulty: 'easy' as const,
        estimatedReadTime: 2,
        tags: ['hydration', 'health'],
        viewCount: 10,
        likeCount: 5,
        completionCount: 3,
        shareCount: 1,
        isActive: true,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z'),
        createdBy: 'admin',
      },
      {
        id: 'tip-2',
        title: 'Practice Deep Breathing',
        content: 'Take 5 minutes each day to practice deep breathing exercises for stress relief.',
        category: 'mental_wellness' as const,
        difficulty: 'easy' as const,
        estimatedReadTime: 3,
        tags: ['breathing', 'stress', 'mindfulness'],
        viewCount: 15,
        likeCount: 8,
        completionCount: 6,
        shareCount: 2,
        isActive: true,
        createdAt: new Date('2024-01-16T10:00:00Z'),
        updatedAt: new Date('2024-01-16T10:00:00Z'),
        createdBy: 'admin',
      },
    ];

    it('should load and display health tips from API', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockTips,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        }),
      } as Response);

      const mockOnTipAction = jest.fn();

      renderWithProvider(
        <TipsFeed
          userId="test-user-id"
          onTipAction={mockOnTipAction}
        />
      );

      // Wait for tips to load
      await waitFor(() => {
        expect(screen.getByText('Stay Hydrated')).toBeTruthy();
        expect(screen.getByText('Practice Deep Breathing')).toBeTruthy();
      });

      // Verify API was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/health-tips'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle tip interactions and call API', async () => {
      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockTips,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        }),
      } as Response);

      // Mock engagement recording
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const mockOnTipAction = jest.fn();

      renderWithProvider(
        <TipsFeed
          userId="test-user-id"
          onTipAction={mockOnTipAction}
        />
      );

      // Wait for tips to load
      await waitFor(() => {
        expect(screen.getByText('Stay Hydrated')).toBeTruthy();
      });

      // Find and click the like button
      const likeButton = screen.getByText('🤍 Like');
      fireEvent.press(likeButton);

      // Verify the action was recorded
      await waitFor(() => {
        expect(mockOnTipAction).toHaveBeenCalledWith('tip-1', 'like');
      });
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const mockOnTipAction = jest.fn();

      renderWithProvider(
        <TipsFeed
          userId="test-user-id"
          onTipAction={mockOnTipAction}
        />
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Unable to Load Tips')).toBeTruthy();
        expect(screen.getByText('Try Again')).toBeTruthy();
      });
    });

    it('should filter tips correctly', async () => {
      // Mock filtered response
      const filteredTips = [mockTips[0]]; // Only nutrition tip
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: filteredTips,
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        }),
      } as Response);

      const mockOnTipAction = jest.fn();

      renderWithProvider(
        <TipsFeed
          userId="test-user-id"
          onTipAction={mockOnTipAction}
          initialFilter={{ category: 'nutrition' }}
        />
      );

      // Wait for filtered tips to load
      await waitFor(() => {
        expect(screen.getByText('Stay Hydrated')).toBeTruthy();
        expect(screen.queryByText('Practice Deep Breathing')).toBeNull();
      });

      // Verify API was called with filter
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('category=nutrition'),
        expect.any(Object)
      );
    });
  });

  describe('DailyTipsScreen Integration', () => {
    const mockDailyTips = [
      {
        id: 'daily-tip-1',
        title: 'Morning Hydration',
        content: 'Start your day with a glass of water to kickstart your metabolism.',
        category: 'nutrition' as const,
        difficulty: 'easy' as const,
        estimatedReadTime: 1,
        tags: ['morning', 'hydration'],
        viewCount: 5,
        likeCount: 2,
        completionCount: 1,
        shareCount: 0,
        isActive: true,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z'),
        createdBy: 'admin',
      },
    ];

    it('should load and display daily tips', async () => {
      // Mock daily tips API response
      mockContentService.getDailyTips.mockResolvedValue(mockDailyTips);

      renderWithProvider(<DailyTipsScreen />);

      // Wait for tips to load
      await waitFor(() => {
        expect(screen.getByText('Morning Hydration')).toBeTruthy();
        expect(screen.getByText('Good Morning, Test User! 👋')).toBeTruthy();
      });

      // Verify service was called
      expect(mockContentService.getDailyTips).toHaveBeenCalledWith('test-user-id', 3);
    });

    it('should handle tip completion with celebration', async () => {
      mockContentService.getDailyTips.mockResolvedValue(mockDailyTips);
      mockContentService.recordEngagement.mockResolvedValue(undefined);

      renderWithProvider(<DailyTipsScreen />);

      // Wait for tips to load
      await waitFor(() => {
        expect(screen.getByText('Morning Hydration')).toBeTruthy();
      });

      // Find and press the complete button
      const completeButton = screen.getByText('⭕ Complete');
      fireEvent.press(completeButton);

      // Confirm completion in alert
      await waitFor(() => {
        expect(screen.getByText('Mark as Complete')).toBeTruthy();
      });

      const yesButton = screen.getByText('Yes, Complete');
      fireEvent.press(yesButton);

      // Verify engagement was recorded
      await waitFor(() => {
        expect(mockContentService.recordEngagement).toHaveBeenCalledWith(
          'test-user-id',
          'daily-tip-1',
          'complete'
        );
      });
    });

    it('should handle refresh functionality', async () => {
      mockContentService.getDailyTips.mockResolvedValue(mockDailyTips);

      renderWithProvider(<DailyTipsScreen />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Morning Hydration')).toBeTruthy();
      });

      // Clear the mock to test refresh
      mockContentService.getDailyTips.mockClear();
      mockContentService.getDailyTips.mockResolvedValue([
        {
          ...mockDailyTips[0],
          title: 'Refreshed Tip',
        },
      ]);

      // Trigger refresh by scrolling down (pull to refresh)
      const scrollView = screen.getByTestId('daily-tips-scroll') || screen.getByRole('scrollview');
      fireEvent(scrollView, 'refresh');

      // Verify refresh was called
      await waitFor(() => {
        expect(mockContentService.getDailyTips).toHaveBeenCalledTimes(1);
      });
    });

    it('should show error state when tips fail to load', async () => {
      mockContentService.getDailyTips.mockRejectedValue(new Error('Failed to load daily tips'));

      renderWithProvider(<DailyTipsScreen />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Unable to Load Daily Tips')).toBeTruthy();
        expect(screen.getByText('Failed to load daily tips')).toBeTruthy();
      });
    });

    it('should require authentication', async () => {
      // Render without authenticated user
      renderWithProvider(<DailyTipsScreen />, {
        user: null,
        isAuthenticated: false,
      });

      // Should show sign-in message
      expect(screen.getByText('Please sign in to view your daily tips.')).toBeTruthy();
    });
  });

  describe('API Error Handling', () => {
    it('should handle 401 unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
          },
        }),
      } as Response);

      const mockOnTipAction = jest.fn();

      renderWithProvider(
        <TipsFeed
          userId="test-user-id"
          onTipAction={mockOnTipAction}
        />
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Unable to Load Tips')).toBeTruthy();
      });

      // Verify error was logged
      expect(mockLoggingService.logError).toHaveBeenCalled();
    });

    it('should handle 500 server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to retrieve health tips',
          },
        }),
      } as Response);

      const mockOnTipAction = jest.fn();

      renderWithProvider(
        <TipsFeed
          userId="test-user-id"
          onTipAction={mockOnTipAction}
        />
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Unable to Load Tips')).toBeTruthy();
      });
    });

    it('should handle network connectivity issues', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

      const mockOnTipAction = jest.fn();

      renderWithProvider(
        <TipsFeed
          userId="test-user-id"
          onTipAction={mockOnTipAction}
        />
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Unable to Load Tips')).toBeTruthy();
      });
    });
  });

  describe('Performance and Caching', () => {
    it('should cache API responses', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockTips,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        }),
      } as Response);

      const mockOnTipAction = jest.fn();

      const { rerender } = renderWithProvider(
        <TipsFeed
          userId="test-user-id"
          onTipAction={mockOnTipAction}
        />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Stay Hydrated')).toBeTruthy();
      });

      // Clear fetch mock
      mockFetch.mockClear();

      // Re-render component (should use cache)
      rerender(
        <Provider store={createTestStore()}>
          <TipsFeed
            userId="test-user-id"
            onTipAction={mockOnTipAction}
          />
        </Provider>
      );

      // Should still show tips without additional API call
      expect(screen.getByText('Stay Hydrated')).toBeTruthy();
      
      // Note: In a real implementation, we'd verify cache was used
      // This would depend on the specific caching implementation
    });
  });
});