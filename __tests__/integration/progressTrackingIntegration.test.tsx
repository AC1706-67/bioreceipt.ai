import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProgressDashboard } from '../../src/screens/progress/ProgressDashboard';
import { progressTrackingService } from '../../src/services/progress/progressTrackingService';
import { progressAnalyticsService } from '../../src/services/progress/progressAnalyticsService';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (callback: () => void) => callback(),
}));

// Mock auth hook
jest.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user-123' } }),
}));

// Mock services
jest.mock('../../src/services/progress/progressTrackingService');
jest.mock('../../src/services/progress/progressAnalyticsService');

const mockProgressService = progressTrackingService as jest.Mocked<
  typeof progressTrackingService
>;
const mockAnalyticsService = progressAnalyticsService as jest.Mocked<
  typeof progressAnalyticsService
>;

describe('Progress Tracking Integration', () => {
  const mockUserProgress = {
    id: 'progress_test-user-123',
    userId: 'test-user-123',
    currentStreak: 7,
    longestStreak: 15,
    totalTipsCompleted: 42,
    totalEngagementTime: 2100,
    lastActivityDate: new Date(),
    streakFreezeUsed: 1,
    streakFreezeRemaining: 2,
    categoryProgress: [],
    weeklyGoals: [],
    monthlyGoals: [],
    achievements: [],
    milestones: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAnalytics = {
    userId: 'test-user-123',
    timeframe: 'month' as const,
    engagementTrends: [],
    categoryBreakdown: [],
    streakAnalysis: {
      currentStreakHealth: 85,
      streakStability: 78,
      riskOfBreaking: 15,
      optimalEngagementTime: '09:00',
      streakQualityTrend: 'improving' as const,
      recommendedActions: ['Keep up the great work!'],
    },
    goalProgress: {
      weeklyGoalCompletion: 85,
      monthlyGoalCompletion: 70,
      goalAchievementTrend: 'improving' as const,
      averageGoalDifficulty: 2,
      recommendedGoalAdjustments: [],
    },
    behaviorPatterns: [],
    predictions: [],
    recommendations: [],
    generatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgressService.getUserProgress.mockResolvedValue(mockUserProgress);
    mockAnalyticsService.generateProgressAnalytics.mockResolvedValue(
      mockAnalytics,
    );
    mockAnalyticsService.calculateProgressScore.mockResolvedValue({
      overallScore: 82,
      categoryScores: {},
      factors: { consistency: 85, engagement: 78, diversity: 80, growth: 85 },
      trend: 'improving' as const,
    });
  });

  it('should load and display progress data', async () => {
    const { getByText } = render(<ProgressDashboard />);

    await waitFor(() => {
      expect(getByText('Your Progress')).toBeTruthy();
    });

    expect(mockProgressService.getUserProgress).toHaveBeenCalledWith(
      'test-user-123',
    );
    expect(mockAnalyticsService.generateProgressAnalytics).toHaveBeenCalledWith(
      'test-user-123',
      'month',
    );
  });
});
