import { progressTrackingService } from '../../../src/services/progress/progressTrackingService';
import { storage } from '../../../src/utils/storage';
import { cacheService } from '../../../src/services/cache/cacheService';
import { kiroAIService } from '../../../src/services/ai/kiroAIService';
import { notificationService } from '../../../src/services/notification/notificationService';
import { analyticsService } from '../../../src/services/analytics/analyticsService';

// Mock dependencies
jest.mock('../../../src/utils/storage');
jest.mock('../../../src/services/cache/cacheService');
jest.mock('../../../src/services/ai/kiroAIService');
jest.mock('../../../src/services/notification/notificationService');
jest.mock('../../../src/services/analytics/analyticsService');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockKiroAIService = kiroAIService as jest.Mocked<typeof kiroAIService>;
const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;
const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;

describe('ProgressTrackingService', () => {
  const mockUserId = 'test-user-123';
  const mockEngagement = {
    tipId: 'tip-123',
    userId: mockUserId,
    action: 'view' as const,
    timestamp: new Date()
  };
  const mockQuality = {
    readingTime: 120,
    interactionCount: 3,
    completionRate: 1,
    retentionScore: 0.8,
    applicationAttempted: true,
    feedbackProvided: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.delete.mockResolvedValue(undefined);
    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.setItem.mockResolvedValue(undefined);
    mockKiroAIService.generateInsights.mockResolvedValue({});
    mockNotificationService.scheduleNotification.mockResolvedValue(undefined);
    mockAnalyticsService.trackEvent.mockResolvedValue(undefined);
  });

  describe('initializeUserProgress', () => {
    it('should create initial progress for new user', async () => {
      const result = await progressTrackingService.initializeUserProgress(mockUserId);

      expect(result).toMatchObject({
        userId: mockUserId,
        currentStreak: 0,
        longestStreak: 0,
        totalTipsCompleted: 0,
        totalEngagementTime: 0,
        streakFreezeUsed: 0,
        streakFreezeRemaining: 3
      });

      expect(result.categoryProgress).toHaveLength(6);
      expect(result.weeklyGoals).toEqual([]);
      expect(result.monthlyGoals).toEqual([]);
      expect(result.achievements).toEqual([]);
      expect(result.milestones).toEqual([]);

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        `progress_${mockUserId}`,
        expect.any(String)
      );
    });

    it('should handle initialization errors', async () => {
      mockStorage.setItem.mockRejectedValue(new Error('Storage error'));

      await expect(progressTrackingService.initializeUserProgress(mockUserId))
        .rejects.toThrow('Failed to initialize user progress');
    });
  });

  describe('recordEngagement', () => {
    const mockProgress = {
      id: `progress_${mockUserId}`,
      userId: mockUserId,
      currentStreak: 5,
      longestStreak: 10,
      totalTipsCompleted: 25,
      totalEngagementTime: 1500,
      lastActivityDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      streakFreezeUsed: 0,
      streakFreezeRemaining: 3,
      categoryProgress: [
        {
          category: 'nutrition' as const,
          completedTips: 10,
          totalTimeSpent: 600,
          currentStreak: 3,
          longestStreak: 5,
          averageEngagementScore: 0.8,
          lastActivityDate: new Date(),
          progressPercentage: 50,
          level: 'intermediate' as const
        }
      ],
      weeklyGoals: [],
      monthlyGoals: [],
      achievements: [],
      milestones: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(() => {
      mockStorage.getItem.mockResolvedValue(JSON.stringify(mockProgress));
    });

    it('should record engagement and update progress', async () => {
      await progressTrackingService.recordEngagement(mockUserId, mockEngagement, mockQuality);

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        `progress_${mockUserId}`,
        expect.stringContaining('"totalTipsCompleted":26')
      );

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        `progress_${mockUserId}`,
        expect.stringContaining('"totalEngagementTime":1620')
      );

      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        'progress_updated',
        expect.objectContaining({
          userId: mockUserId,
          tipId: mockEngagement.tipId,
          engagementTime: mockQuality.readingTime
        })
      );
    });

    it('should update streak when engagement is on new day', async () => {
      const yesterdayProgress = {
        ...mockProgress,
        lastActivityDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
      };
      mockStorage.getItem.mockResolvedValue(JSON.stringify(yesterdayProgress));

      await progressTrackingService.recordEngagement(mockUserId, mockEngagement, mockQuality);

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        `progress_${mockUserId}`,
        expect.stringContaining('"currentStreak":6')
      );
    });

    it('should handle engagement recording errors', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('Storage error'));

      await expect(progressTrackingService.recordEngagement(mockUserId, mockEngagement, mockQuality))
        .rejects.toThrow('Failed to record engagement');
    });
  });

  describe('getUserProgress', () => {
    const mockProgress = {
      id: `progress_${mockUserId}`,
      userId: mockUserId,
      currentStreak: 5,
      longestStreak: 10,
      totalTipsCompleted: 25,
      totalEngagementTime: 1500,
      lastActivityDate: new Date().toISOString(),
      streakFreezeUsed: 0,
      streakFreezeRemaining: 3,
      categoryProgress: [],
      weeklyGoals: [],
      monthlyGoals: [],
      achievements: [],
      milestones: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it('should return cached progress if available', async () => {
      mockCacheService.get.mockResolvedValue(mockProgress);

      const result = await progressTrackingService.getUserProgress(mockUserId);

      expect(result).toEqual(mockProgress);
      expect(mockStorage.getItem).not.toHaveBeenCalled();
    });

    it('should fetch from storage and cache if not cached', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockStorage.getItem.mockResolvedValue(JSON.stringify(mockProgress));

      const result = await progressTrackingService.getUserProgress(mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(result.currentStreak).toBe(5);
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should initialize progress if not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockStorage.getItem.mockResolvedValue(null);

      const result = await progressTrackingService.getUserProgress(mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(result.currentStreak).toBe(0);
      expect(mockStorage.setItem).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));

      await expect(progressTrackingService.getUserProgress(mockUserId))
        .rejects.toThrow('Failed to get user progress');
    });
  });

  describe('getUserMilestones', () => {
    const mockMilestones = [
      {
        id: 'milestone-1',
        userId: mockUserId,
        type: 'streak' as const,
        title: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        targetValue: 7,
        currentValue: 5,
        isCompleted: false,
        difficulty: 'medium' as const,
        reward: {
          type: 'badge' as const,
          value: 'week_warrior',
          description: 'Week Warrior badge'
        },
        aiGenerated: false,
        celebrationShown: false,
        createdAt: new Date()
      },
      {
        id: 'milestone-2',
        userId: mockUserId,
        type: 'completion' as const,
        title: 'First Steps',
        description: 'Complete 5 health tips',
        targetValue: 5,
        currentValue: 5,
        isCompleted: true,
        completedAt: new Date(),
        difficulty: 'easy' as const,
        reward: {
          type: 'badge' as const,
          value: 'first_steps',
          description: 'First Steps badge'
        },
        aiGenerated: false,
        celebrationShown: true,
        createdAt: new Date()
      }
    ];

    it('should return all milestones when includeCompleted is true', async () => {
      mockStorage.getItem.mockResolvedValue(JSON.stringify(mockMilestones));

      const result = await progressTrackingService.getUserMilestones(mockUserId, true);

      expect(result).toHaveLength(2);
      expect(result[0].isCompleted).toBe(false);
      expect(result[1].isCompleted).toBe(true);
    });

    it('should return only incomplete milestones when includeCompleted is false', async () => {
      mockStorage.getItem.mockResolvedValue(JSON.stringify(mockMilestones));

      const result = await progressTrackingService.getUserMilestones(mockUserId, false);

      expect(result).toHaveLength(1);
      expect(result[0].isCompleted).toBe(false);
    });

    it('should return empty array if no milestones found', async () => {
      mockStorage.getItem.mockResolvedValue(null);

      const result = await progressTrackingService.getUserMilestones(mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('Storage error'));

      await expect(progressTrackingService.getUserMilestones(mockUserId))
        .rejects.toThrow('Failed to get user milestones');
    });
  });

  describe('getUserAchievements', () => {
    const mockAchievements = [
      {
        id: 'achievement-1',
        userId: mockUserId,
        badgeId: 'first_tip',
        title: 'First Tip',
        description: 'Completed your first health tip',
        category: 'general' as const,
        rarity: 'common' as const,
        unlockedAt: new Date(),
        progress: 100,
        maxProgress: 100,
        isVisible: true,
        imageUrl: '/badges/first_tip.png'
      }
    ];

    it('should return user achievements', async () => {
      mockStorage.getItem.mockResolvedValue(JSON.stringify(mockAchievements));

      const result = await progressTrackingService.getUserAchievements(mockUserId);

      expect(result).toEqual(mockAchievements);
    });

    it('should return empty array if no achievements found', async () => {
      mockStorage.getItem.mockResolvedValue(null);

      const result = await progressTrackingService.getUserAchievements(mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('Storage error'));

      await expect(progressTrackingService.getUserAchievements(mockUserId))
        .rejects.toThrow('Failed to get user achievements');
    });
  });

  describe('useStreakFreeze', () => {
    const mockProgress = {
      id: `progress_${mockUserId}`,
      userId: mockUserId,
      currentStreak: 5,
      longestStreak: 10,
      totalTipsCompleted: 25,
      totalEngagementTime: 1500,
      lastActivityDate: new Date(),
      streakFreezeUsed: 1,
      streakFreezeRemaining: 2,
      categoryProgress: [],
      weeklyGoals: [],
      monthlyGoals: [],
      achievements: [],
      milestones: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should use streak freeze when available', async () => {
      mockStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(mockProgress)) // getUserProgress
        .mockResolvedValueOnce(JSON.stringify({ // getStreakData
          id: `streak_${mockUserId}_daily`,
          userId: mockUserId,
          streakType: 'daily',
          currentCount: 5,
          longestCount: 10,
          startDate: new Date(),
          lastActivityDate: new Date(),
          isActive: true,
          freezeCount: 1,
          streakHistory: [],
          qualityScore: 0.8,
          consistencyScore: 0.7,
          metadata: {
            averageEngagementTime: 60,
            preferredEngagementTime: '09:00',
            categoryDistribution: {},
            difficultyDistribution: {},
            seasonalPatterns: []
          }
        }));

      const result = await progressTrackingService.useStreakFreeze(mockUserId);

      expect(result).toBe(true);
      expect(mockStorage.setItem).toHaveBeenCalledTimes(2); // Progress and streak data
      expect(mockNotificationService.scheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'streak',
          title: 'Streak Freeze Activated! 🧊'
        })
      );
    });

    it('should return false when no streak freezes remaining', async () => {
      const noFreezesProgress = {
        ...mockProgress,
        streakFreezeRemaining: 0
      };
      mockStorage.getItem.mockResolvedValue(JSON.stringify(noFreezesProgress));

      const result = await progressTrackingService.useStreakFreeze(mockUserId);

      expect(result).toBe(false);
      expect(mockStorage.setItem).not.toHaveBeenCalled();
      expect(mockNotificationService.scheduleNotification).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await progressTrackingService.useStreakFreeze(mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('getProgressInsights', () => {
    const mockInsights = [
      {
        id: 'insight-1',
        userId: mockUserId,
        type: 'pattern' as const,
        title: 'Time Pattern Detected',
        description: 'You engage most at 9 AM',
        actionable: true,
        actionText: 'Set a daily reminder',
        priority: 'medium' as const,
        category: 'general' as const,
        confidence: 0.8,
        generatedAt: new Date(),
        isRead: false,
        isActedUpon: false,
        metadata: {
          dataPoints: ['behavior_analysis'],
          correlations: [],
          predictions: [],
          recommendations: []
        }
      }
    ];

    it('should return progress insights', async () => {
      mockStorage.getItem.mockResolvedValue(JSON.stringify(mockInsights));

      const result = await progressTrackingService.getProgressInsights(mockUserId, 5);

      expect(result).toEqual(mockInsights);
    });

    it('should filter out expired insights', async () => {
      const expiredInsight = {
        ...mockInsights[0],
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      };
      mockStorage.getItem.mockResolvedValue(JSON.stringify([expiredInsight]));

      const result = await progressTrackingService.getProgressInsights(mockUserId);

      expect(result).toEqual([]);
    });

    it('should limit results to specified count', async () => {
      const manyInsights = Array(10).fill(null).map((_, i) => ({
        ...mockInsights[0],
        id: `insight-${i}`
      }));
      mockStorage.getItem.mockResolvedValue(JSON.stringify(manyInsights));

      const result = await progressTrackingService.getProgressInsights(mockUserId, 3);

      expect(result).toHaveLength(3);
    });

    it('should handle errors gracefully', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('Storage error'));

      await expect(progressTrackingService.getProgressInsights(mockUserId))
        .rejects.toThrow('Failed to get progress insights');
    });
  });
});