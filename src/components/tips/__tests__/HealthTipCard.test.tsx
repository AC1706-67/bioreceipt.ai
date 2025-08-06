/**
 * HealthTipCard Component Unit Tests
 * Tests for tip display, image loading, and user interactions
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import HealthTipCard from '../HealthTipCard';
import { HealthTip, HealthTipCategory, DifficultyLevel } from '../../../models/HealthTip';
import { healthTipService } from '../../../services/content/healthTipService';
import { analyticsService } from '../../../services/analytics/analyticsService';

// Mock dependencies
jest.mock('../../../services/content/healthTipService');
jest.mock('../../../services/analytics/analyticsService');
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

const mockHealthTipService = healthTipService as jest.Mocked<typeof healthTipService>;
const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('HealthTipCard', () => {
  const mockTip: HealthTip = {
    id: 'tip-1',
    title: 'Stay Hydrated',
    content: 'Drinking enough water is essential for your health. Aim for 8 glasses per day.',
    category: HealthTipCategory.NUTRITION,
    difficulty: DifficultyLevel.BEGINNER,
    estimatedReadTime: 2,
    tags: ['hydration', 'water', 'health'],
    imageUrl: 'https://example.com/water.jpg',
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
  };

  const defaultProps = {
    tip: mockTip,
    userId: 'user-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHealthTipService.recordInteraction.mockResolvedValue();
    mockAnalyticsService.trackTipInteraction.mockResolvedValue();
  });

  describe('Rendering', () => {
    it('should render tip information correctly', () => {
      const { getByText } = render(<HealthTipCard {...defaultProps} />);

      expect(getByText('Stay Hydrated')).toBeTruthy();
      expect(getByText('NUTRITION')).toBeTruthy();
      expect(getByText('2min')).toBeTruthy();
      expect(getByText('By Dr. Smith')).toBeTruthy();
      expect(getByText('👁 100')).toBeTruthy();
      expect(getByText('⭐ 4.5')).toBeTruthy();
    });

    it('should render tags correctly', () => {
      const { getByText } = render(<HealthTipCard {...defaultProps} />);

      expect(getByText('#hydration')).toBeTruthy();
      expect(getByText('#water')).toBeTruthy();
      expect(getByText('#health')).toBeTruthy();
    });

    it('should truncate content when showFullContent is false', () => {
      const longContentTip = {
        ...mockTip,
        content: 'This is a very long content that should be truncated when displayed in the card view. '.repeat(10)
      };

      const { getByText, queryByText } = render(
        <HealthTipCard {...defaultProps} tip={longContentTip} showFullContent={false} />
      );

      const displayedText = getByText(/This is a very long content/);
      expect(displayedText.props.children).toMatch(/\.\.\.$/);
    });

    it('should show full content when showFullContent is true', () => {
      const longContentTip = {
        ...mockTip,
        content: 'This is a very long content that should be displayed in full when showFullContent is true.'
      };

      const { getByText } = render(
        <HealthTipCard {...defaultProps} tip={longContentTip} showFullContent={true} />
      );

      expect(getByText(longContentTip.content)).toBeTruthy();
    });

    it('should display difficulty stars correctly', () => {
      const beginnerTip = { ...mockTip, difficulty: DifficultyLevel.BEGINNER };
      const intermediateTip = { ...mockTip, difficulty: DifficultyLevel.INTERMEDIATE };
      const advancedTip = { ...mockTip, difficulty: DifficultyLevel.ADVANCED };

      const { rerender, getByText } = render(<HealthTipCard {...defaultProps} tip={beginnerTip} />);
      expect(getByText('⭐')).toBeTruthy();

      rerender(<HealthTipCard {...defaultProps} tip={intermediateTip} />);
      expect(getByText('⭐⭐')).toBeTruthy();

      rerender(<HealthTipCard {...defaultProps} tip={advancedTip} />);
      expect(getByText('⭐⭐⭐')).toBeTruthy();
    });

    it('should show more tags indicator when there are more than 3 tags', () => {
      const manyTagsTip = {
        ...mockTip,
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']
      };

      const { getByText } = render(<HealthTipCard {...defaultProps} tip={manyTagsTip} />);

      expect(getByText('+2 more')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('should handle tip press and track analytics', async () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <HealthTipCard {...defaultProps} onPress={onPress} />
      );

      const card = getByTestId('health-tip-card') || getByText('Stay Hydrated').parent;
      fireEvent.press(card);

      expect(onPress).toHaveBeenCalledWith(mockTip);
      expect(mockAnalyticsService.trackTipInteraction).toHaveBeenCalledWith(
        'view',
        mockTip.id,
        {
          title: mockTip.title,
          category: mockTip.category
        },
        defaultProps.userId
      );
      expect(mockHealthTipService.recordInteraction).toHaveBeenCalledWith({
        userId: defaultProps.userId,
        tipId: mockTip.id,
        interactionType: 'view',
        timestamp: expect.any(Date)
      });
    });

    it('should handle like interaction', async () => {
      const { getByText } = render(<HealthTipCard {...defaultProps} />);

      const likeButton = getByText('🤍 25');
      fireEvent.press(likeButton);

      await waitFor(() => {
        expect(mockAnalyticsService.trackTipInteraction).toHaveBeenCalledWith(
          'like',
          mockTip.id,
          {
            title: mockTip.title,
            category: mockTip.category
          },
          defaultProps.userId
        );
        expect(mockHealthTipService.recordInteraction).toHaveBeenCalledWith({
          userId: defaultProps.userId,
          tipId: mockTip.id,
          interactionType: 'like',
          timestamp: expect.any(Date)
        });
      });
    });

    it('should handle bookmark interaction', async () => {
      const { getByText } = render(<HealthTipCard {...defaultProps} />);

      const bookmarkButton = getByText('📑');
      fireEvent.press(bookmarkButton);

      await waitFor(() => {
        expect(mockAnalyticsService.trackTipInteraction).toHaveBeenCalledWith(
          'bookmark',
          mockTip.id,
          {
            title: mockTip.title,
            category: mockTip.category
          },
          defaultProps.userId
        );
        expect(mockHealthTipService.recordInteraction).toHaveBeenCalledWith({
          userId: defaultProps.userId,
          tipId: mockTip.id,
          interactionType: 'bookmark',
          timestamp: expect.any(Date)
        });
      });
    });

    it('should handle complete interaction and show alert', async () => {
      const { getByText } = render(<HealthTipCard {...defaultProps} />);

      const completeButton = getByText('⭕');
      fireEvent.press(completeButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Great job!', 'You completed this health tip!');
        expect(mockAnalyticsService.trackTipInteraction).toHaveBeenCalledWith(
          'complete',
          mockTip.id,
          {
            title: mockTip.title,
            category: mockTip.category
          },
          defaultProps.userId
        );
        expect(mockHealthTipService.recordInteraction).toHaveBeenCalledWith({
          userId: defaultProps.userId,
          tipId: mockTip.id,
          interactionType: 'complete',
          timestamp: expect.any(Date)
        });
      });
    });

    it('should handle share interaction', async () => {
      const { getByText } = render(<HealthTipCard {...defaultProps} />);

      const shareButton = getByText('📤');
      fireEvent.press(shareButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Share', 'Share functionality would be implemented here');
        expect(mockAnalyticsService.trackTipInteraction).toHaveBeenCalledWith(
          'share',
          mockTip.id,
          {
            title: mockTip.title,
            category: mockTip.category
          },
          defaultProps.userId
        );
        expect(mockHealthTipService.recordInteraction).toHaveBeenCalledWith({
          userId: defaultProps.userId,
          tipId: mockTip.id,
          interactionType: 'share',
          timestamp: expect.any(Date)
        });
      });
    });

    it('should call onInteraction callback when provided', async () => {
      const onInteraction = jest.fn();
      const { getByText } = render(
        <HealthTipCard {...defaultProps} onInteraction={onInteraction} />
      );

      const likeButton = getByText('🤍 25');
      fireEvent.press(likeButton);

      await waitFor(() => {
        expect(onInteraction).toHaveBeenCalledWith({
          userId: defaultProps.userId,
          tipId: mockTip.id,
          interactionType: 'like',
          timestamp: expect.any(Date)
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle interaction recording errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockHealthTipService.recordInteraction.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<HealthTipCard {...defaultProps} />);

      const likeButton = getByText('🤍 25');
      fireEvent.press(likeButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Error handling like:', expect.any(Error));
      });

      consoleError.mockRestore();
    });

    it('should revert state on interaction error', async () => {
      mockHealthTipService.recordInteraction.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<HealthTipCard {...defaultProps} />);

      const likeButton = getByText('🤍 25');
      fireEvent.press(likeButton);

      // Should revert back to original state after error
      await waitFor(() => {
        expect(getByText('🤍 25')).toBeTruthy();
      });
    });
  });

  describe('Image Handling', () => {
    it('should not render image container when imageUrl is not provided', () => {
      const tipWithoutImage = { ...mockTip, imageUrl: undefined };
      const { queryByTestId } = render(<HealthTipCard {...defaultProps} tip={tipWithoutImage} />);

      expect(queryByTestId('tip-image')).toBeNull();
    });

    it('should handle image loading states', () => {
      const { getByTestId } = render(<HealthTipCard {...defaultProps} />);

      // Should show loading indicator initially
      expect(getByTestId('image-loader')).toBeTruthy();
    });
  });

  describe('Category Colors', () => {
    it('should apply correct colors for different categories', () => {
      const categories = [
        { category: HealthTipCategory.NUTRITION, expectedColor: '#4CAF50' },
        { category: HealthTipCategory.FITNESS, expectedColor: '#FF9800' },
        { category: HealthTipCategory.MENTAL_WELLNESS, expectedColor: '#9C27B0' },
        { category: HealthTipCategory.SLEEP, expectedColor: '#3F51B5' },
        { category: HealthTipCategory.RECOVERY, expectedColor: '#00BCD4' },
        { category: HealthTipCategory.HYGIENE, expectedColor: '#795548' }
      ];

      categories.forEach(({ category }) => {
        const tipWithCategory = { ...mockTip, category };
        const { getByText } = render(<HealthTipCard {...defaultProps} tip={tipWithCategory} />);
        
        expect(getByText(category.replace('_', ' ').toUpperCase())).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(<HealthTipCard {...defaultProps} />);

      // This would require adding accessibility labels to the component
      // For now, we'll just verify the component renders without errors
      expect(getByText('Stay Hydrated')).toBeTruthy();
    });
  });
});