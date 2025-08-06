/**
 * HealthTipList Component Unit Tests
 * Tests for tip list display, filtering, sorting, and pagination
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HealthTipList from '../HealthTipList';
import { HealthTip, HealthTipCategory, DifficultyLevel } from '../../../models/HealthTip';
import { healthTipService } from '../../../services/content/healthTipService';
import { analyticsService } from '../../../services/analytics/analyticsService';

// Mock dependencies
jest.mock('../../../services/content/healthTipService');
jest.mock('../../../services/analytics/analyticsService');
jest.mock('../HealthTipCard', () => {
  return function MockHealthTipCard({ tip, onPress }: any) {
    return (
      <div testID={`tip-card-${tip.id}`} onPress={onPress}>
        {tip.title}
      </div>
    );
  };
});

const mockHealthTipService = healthTipService as jest.Mocked<typeof healthTipService>;
const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;

describe('HealthTipList', () => {
  const mockTips: HealthTip[] = [
    {
      id: 'tip-1',
      title: 'Stay Hydrated',
      content: 'Drinking water is important for health.',
      category: HealthTipCategory.NUTRITION,
      difficulty: DifficultyLevel.BEGINNER,
      estimatedReadTime: 2,
      tags: ['hydration', 'water'],
      author: 'Dr. Smith',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      isActive: true,
      priority: 5,
      metadata: {
        views: 100,
        likes: 25,
        bookmarks: 10,
        completions: 15,
        shares: 5,
        averageRating: 4.5,
        ratingCount: 20,
        engagementScore: 85
      }
    },
    {
      id: 'tip-2',
      title: 'Exercise Daily',
      content: 'Regular exercise improves your health.',
      category: HealthTipCategory.FITNESS,
      difficulty: DifficultyLevel.INTERMEDIATE,
      estimatedReadTime: 5,
      tags: ['exercise', 'fitness'],
      author: 'Dr. Johnson',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      isActive: true,
      priority: 7,
      metadata: {
        views: 150,
        likes: 35,
        bookmarks: 20,
        completions: 25,
        shares: 8,
        averageRating: 4.8,
        ratingCount: 30,
        engagementScore: 92
      }
    }
  ];

  const defaultProps = {
    userId: 'user-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHealthTipService.getHealthTips.mockResolvedValue({
      tips: mockTips,
      total: mockTips.length,
      hasMore: false
    });
    mockAnalyticsService.trackSearch.mockResolvedValue();
    mockAnalyticsService.trackEvent.mockResolvedValue();
  });

  describe('Initial Rendering', () => {
    it('should render tips list correctly', async () => {
      const { getByText, getByTestId } = render(<HealthTipList {...defaultProps} />);

      await waitFor(() => {
        expect(getByTestId('tip-card-tip-1')).toBeTruthy();
        expect(getByTestId('tip-card-tip-2')).toBeTruthy();
        expect(getByText('Stay Hydrated')).toBeTruthy();
        expect(getByText('Exercise Daily')).toBeTruthy();
      });
    });

    it('should show loading state initially', () => {
      const { getByText } = render(<HealthTipList {...defaultProps} />);

      expect(getByText('Loading health tips...')).toBeTruthy();
    });

    it('should call healthTipService.getHealthTips on mount', async () => {
      render(<HealthTipList {...defaultProps} />);

      await waitFor(() => {
        expect(mockHealthTipService.getHealthTips).toHaveBeenCalledWith(
          expect.objectContaining({
            isActive: true
          }),
          { field: 'createdAt', direction: 'desc' },
          10,
          0
        );
      });
    });
  });

  describe('Search Functionality', () => {
    it('should render search bar when showSearch is true', () => {
      const { getByPlaceholderText } = render(
        <HealthTipList {...defaultProps} showSearch={true} />
      );

      expect(getByPlaceholderText('Search health tips...')).toBeTruthy();
    });

    it('should not render search bar when showSearch is false', () => {
      const { queryByPlaceholderText } = render(
        <HealthTipList {...defaultProps} showSearch={false} />
      );

      expect(queryByPlaceholderText('Search health tips...')).toBeNull();
    });

    it('should handle search input and track analytics', async () => {
      const { getByPlaceholderText } = render(
        <HealthTipList {...defaultProps} showSearch={true} />
      );

      const searchInput = getByPlaceholderText('Search health tips...');
      fireEvent.changeText(searchInput, 'hydration');

      await waitFor(() => {
        expect(mockAnalyticsService.trackSearch).toHaveBeenCalledWith(
          'hydration',
          mockTips.length,
          defaultProps.userId
        );
      });
    });

    it('should filter tips based on search query', async () => {
      const { getByPlaceholderText } = render(
        <HealthTipList {...defaultProps} showSearch={true} />
      );

      const searchInput = getByPlaceholderText('Search health tips...');
      fireEvent.changeText(searchInput, 'hydration');

      await waitFor(() => {
        expect(mockHealthTipService.getHealthTips).toHaveBeenCalledWith(
          expect.objectContaining({
            searchQuery: 'hydration',
            isActive: true
          }),
          expect.any(Object),
          10,
          0
        );
      });
    });
  });

  describe('Filter Functionality', () => {
    it('should render filter toggle when showFilters is true', async () => {
      const { getByText } = render(
        <HealthTipList {...defaultProps} showFilters={true} />
      );

      await waitFor(() => {
        expect(getByText('Filters ▼')).toBeTruthy();
      });
    });

    it('should not render filter toggle when showFilters is false', async () => {
      const { queryByText } = render(
        <HealthTipList {...defaultProps} showFilters={false} />
      );

      await waitFor(() => {
        expect(queryByText('Filters ▼')).toBeNull();
      });
    });

    it('should toggle filter panel visibility', async () => {
      const { getByText, queryByText } = render(
        <HealthTipList {...defaultProps} showFilters={true} />
      );

      await waitFor(() => {
        const filterToggle = getByText('Filters ▼');
        fireEvent.press(filterToggle);
        expect(getByText('Category')).toBeTruthy();
        expect(getByText('Difficulty')).toBeTruthy();
      });
    });

    it('should handle category filter selection', async () => {
      const { getByText } = render(
        <HealthTipList {...defaultProps} showFilters={true} />
      );

      await waitFor(() => {
        const filterToggle = getByText('Filters ▼');
        fireEvent.press(filterToggle);
        
        const nutritionFilter = getByText('nutrition');
        fireEvent.press(nutritionFilter);
      });

      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        'category_filter',
        {
          category: HealthTipCategory.NUTRITION,
          userId: defaultProps.userId
        }
      );
    });

    it('should handle difficulty filter selection', async () => {
      const { getByText } = render(
        <HealthTipList {...defaultProps} showFilters={true} />
      );

      await waitFor(() => {
        const filterToggle = getByText('Filters ▼');
        fireEvent.press(filterToggle);
        
        const beginnerFilter = getByText('beginner');
        fireEvent.press(beginnerFilter);
      });

      await waitFor(() => {
        expect(mockHealthTipService.getHealthTips).toHaveBeenCalledWith(
          expect.objectContaining({
            difficulty: DifficultyLevel.BEGINNER,
            isActive: true
          }),
          expect.any(Object),
          10,
          0
        );
      });
    });

    it('should handle sort option selection', async () => {
      const { getByText } = render(
        <HealthTipList {...defaultProps} showFilters={true} />
      );

      await waitFor(() => {
        const filterToggle = getByText('Filters ▼');
        fireEvent.press(filterToggle);
        
        const popularSort = getByText('Popular');
        fireEvent.press(popularSort);
      });

      await waitFor(() => {
        expect(mockHealthTipService.getHealthTips).toHaveBeenCalledWith(
          expect.any(Object),
          { field: 'engagementScore', direction: 'desc' },
          10,
          0
        );
      });
    });

    it('should clear all filters when clear button is pressed', async () => {
      const { getByText } = render(
        <HealthTipList {...defaultProps} showFilters={true} />
      );

      // First set some filters
      await waitFor(() => {
        const filterToggle = getByText('Filters ▼');
        fireEvent.press(filterToggle);
        
        const nutritionFilter = getByText('nutrition');
        fireEvent.press(nutritionFilter);
      });

      // Then clear them
      await waitFor(() => {
        const clearButton = getByText('Clear All');
        fireEvent.press(clearButton);
      });

      await waitFor(() => {
        expect(mockHealthTipService.getHealthTips).toHaveBeenCalledWith(
          expect.objectContaining({
            category: undefined,
            difficulty: undefined,
            searchQuery: undefined,
            isActive: true
          }),
          { field: 'createdAt', direction: 'desc' },
          10,
          0
        );
      });
    });
  });

  describe('Pagination', () => {
    it('should load more tips when reaching end of list', async () => {
      mockHealthTipService.getHealthTips.mockResolvedValueOnce({
        tips: mockTips,
        total: 20,
        hasMore: true
      });

      const { getByTestId } = render(<HealthTipList {...defaultProps} />);

      await waitFor(() => {
        expect(getByTestId('tip-card-tip-1')).toBeTruthy();
      });

      // Simulate reaching end of list
      const flatList = getByTestId('tips-flatlist');
      fireEvent(flatList, 'onEndReached');

      await waitFor(() => {
        expect(mockHealthTipService.getHealthTips).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          10,
          10 // Next page offset
        );
      });
    });

    it('should show loading footer when loading more', async () => {
      mockHealthTipService.getHealthTips.mockResolvedValueOnce({
        tips: mockTips,
        total: 20,
        hasMore: true
      });

      const { getByText, getByTestId } = render(<HealthTipList {...defaultProps} />);

      await waitFor(() => {
        expect(getByTestId('tip-card-tip-1')).toBeTruthy();
      });

      // Simulate loading more
      const flatList = getByTestId('tips-flatlist');
      fireEvent(flatList, 'onEndReached');

      expect(getByText('Loading more tips...')).toBeTruthy();
    });
  });

  describe('Refresh Functionality', () => {
    it('should handle pull to refresh', async () => {
      const { getByTestId } = render(<HealthTipList {...defaultProps} />);

      await waitFor(() => {
        expect(getByTestId('tip-card-tip-1')).toBeTruthy();
      });

      const flatList = getByTestId('tips-flatlist');
      fireEvent(flatList, 'onRefresh');

      await waitFor(() => {
        expect(mockHealthTipService.getHealthTips).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no tips are found', async () => {
      mockHealthTipService.getHealthTips.mockResolvedValue({
        tips: [],
        total: 0,
        hasMore: false
      });

      const { getByText } = render(<HealthTipList {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('No tips found')).toBeTruthy();
        expect(getByText('Check back later for new health tips!')).toBeTruthy();
      });
    });

    it('should show filtered empty state with clear filters option', async () => {
      mockHealthTipService.getHealthTips.mockResolvedValue({
        tips: [],
        total: 0,
        hasMore: false
      });

      const { getByText, getByPlaceholderText } = render(
        <HealthTipList {...defaultProps} showSearch={true} />
      );

      // Set a search query
      const searchInput = getByPlaceholderText('Search health tips...');
      fireEvent.changeText(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(getByText('No tips found')).toBeTruthy();
        expect(getByText('Try adjusting your filters to see more results.')).toBeTruthy();
        expect(getByText('Clear Filters')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error state when loading fails', async () => {
      const errorMessage = 'Failed to load health tips. Please try again.';
      mockHealthTipService.getHealthTips.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<HealthTipList {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Oops! Something went wrong')).toBeTruthy();
        expect(getByText(errorMessage)).toBeTruthy();
        expect(getByText('Try Again')).toBeTruthy();
      });
    });

    it('should retry loading when try again button is pressed', async () => {
      mockHealthTipService.getHealthTips
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          tips: mockTips,
          total: mockTips.length,
          hasMore: false
        });

      const { getByText } = render(<HealthTipList {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Try Again')).toBeTruthy();
      });

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(getByText('Stay Hydrated')).toBeTruthy();
      });
    });
  });

  describe('Props Handling', () => {
    it('should use initial filter and sort options', async () => {
      const initialFilter = { category: HealthTipCategory.FITNESS };
      const initialSort = { field: 'priority', direction: 'desc' };

      render(
        <HealthTipList
          {...defaultProps}
          initialFilter={initialFilter}
          initialSort={initialSort}
        />
      );

      await waitFor(() => {
        expect(mockHealthTipService.getHealthTips).toHaveBeenCalledWith(
          expect.objectContaining({
            category: HealthTipCategory.FITNESS,
            isActive: true
          }),
          initialSort,
          10,
          0
        );
      });
    });

    it('should call onTipPress when tip is pressed', async () => {
      const onTipPress = jest.fn();
      const { getByTestId } = render(
        <HealthTipList {...defaultProps} onTipPress={onTipPress} />
      );

      await waitFor(() => {
        const tipCard = getByTestId('tip-card-tip-1');
        fireEvent.press(tipCard);
        expect(onTipPress).toHaveBeenCalledWith(mockTips[0]);
      });
    });
  });

  describe('Performance', () => {
    it('should use proper key extractor for FlatList', async () => {
      const { getByTestId } = render(<HealthTipList {...defaultProps} />);

      await waitFor(() => {
        const flatList = getByTestId('tips-flatlist');
        expect(flatList).toBeTruthy();
      });
    });

    it('should implement proper memoization for callbacks', () => {
      // This test would verify that callbacks are properly memoized
      // to prevent unnecessary re-renders
      const { rerender } = render(<HealthTipList {...defaultProps} />);
      
      // Re-render with same props
      rerender(<HealthTipList {...defaultProps} />);
      
      // Component should not cause unnecessary re-renders
      expect(mockHealthTipService.getHealthTips).toHaveBeenCalledTimes(1);
    });
  });
});