/**
 * Unit tests for Progress Service
 */

import {
  ProgressService,
  ProgressUpdate,
} from '../../src/services/progress/progressService';
import { UserProgress } from '../../src/types';
import * as storage from '../../src/utils/storage';

// Mock dependencies
jest.mock('../../src/utils/storage');
jest.mock('../../src/services/cache/cacheService');
jest.mock('../../src/services/sync/syncService');

const mockStorage = storage as jest.Mocked<typeof storage>;

describe('ProgressService', () => {
  let progressService: ProgressService;
  const mockUserId = 'user123';

  beforeEach(() => {
    progressService = ProgressService.getInstance();
    jest.clearAllMocks();
  });

  describe('getUserProgress', () => {
    it('should return user progress from storage', async () => {
      const mockProgress: UserProgress = {
        id: 'progress123',
        userId: mockUserId,
        currentStreak: 5,
        longestStreak: 10,
        totalTipsCompleted: 25,
        lastActivityDate: new Date('2024-01-15'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      mockStorage.getData.mockResolvedValue(mockProgress);

      const result = await progressService.getUserProgress(mockUserId);

      expect(result).toEqual(mockProgress);
      expect(mockStorage.getData).toHaveBeenCalledWith('USER_PROGRESS');
    });

    it('should initialize progress for new user', async () => {
      mockStorage.getData.mockResolvedValue(null);
      mockStorage.storeData.mockResolvedValue();

      const result = await progressService.getUserProgress(mockUserId);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(mockUserId);
      expect(result?.currentStreak).toBe(0);
      expect(result?.longestStreak).toBe(0);
      expect(result?.totalTipsCompleted).toBe(0);
      expect(mockStorage.storeData).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockStorage.getData.mockRejectedValue(new Error('Storage error'));

      const result = await progressService.getUserProgress(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('updateProgress', () => {
    const mockCurrentProgress: UserProgress = {
      id: 'progress123',
      userId: mockUserId,
      currentStreak: 3,
      longestStreak: 5,
      totalTipsCompleted: 10,
      lastActivityDate: new Date('2024-01-14'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-14'),
    };

    beforeEach(() => {
      mockStorage.getData.mockResolvedValue(mockCurrentProgress);
      mockStorage.storeData.mockResolvedValue();
    });

    it('should increment streak for consecutive day completion', async () => {
      const update: ProgressUpdate = {
        userId: mockUserId,
        tipId: 'tip123',
        action: 'complete',
        timestamp: new Date('2024-01-15'), // Next day
      };

      const result = await progressService.updateProgress(update);

      expect(result.currentStreak).toBe(4);
      expect(result.longestStreak).toBe(5);
      expect(result.streakBroken).toBe(false);
      expect(mockStorage.storeData).toHaveBeenCalled();
    });

    it('should reset streak when days are missed', async () => {
      const update: ProgressUpdate = {
        userId: mockUserId,
        tipId: 'tip123',
        action: 'complete',
        timestamp: new Date('2024-01-17'), // Missed a day
      };

      const result = await progressService.updateProgress(update);

      expect(result.currentStreak).toBe(1);
      expect(result.streakBroken).toBe(true);
    });

    it('should not change streak for same day completion', async () => {
      const update: ProgressUpdate = {
        userId: mockUserId,
        tipId: 'tip123',
        action: 'complete',
        timestamp: new Date('2024-01-14'), // Same day
      };

      const result = await progressService.updateProgress(update);

      expect(result.currentStreak).toBe(3);
      expect(result.streakBroken).toBe(false);
    });

    it('should increment total tips completed', async () => {
      const update: ProgressUpdate = {
        userId: mockUserId,
        tipId: 'tip123',
        action: 'complete',
        timestamp: new Date('2024-01-15'),
      };

      await progressService.updateProgress(update);

      const storeCall = mockStorage.storeData.mock.calls.find(
        call => call[0] === 'USER_PROGRESS',
      );
      const updatedProgress = storeCall?.[1] as UserProgress;

      expect(updatedProgress.totalTipsCompleted).toBe(11);
    });

    it('should not increment total for view action', async () => {
      const update: ProgressUpdate = {
        userId: mockUserId,
        tipId: 'tip123',
        action: 'view',
        timestamp: new Date('2024-01-15'),
      };

      await progressService.updateProgress(update);

      const storeCall = mockStorage.storeData.mock.calls.find(
        call => call[0] === 'USER_PROGRESS',
      );
      const updatedProgress = storeCall?.[1] as UserProgress;

      expect(updatedProgress.totalTipsCompleted).toBe(10);
    });

    it('should detect milestone achievement', async () => {
      const progressWithStreak6: UserProgress = {
        ...mockCurrentProgress,
        currentStreak: 6,
      };
      mockStorage.getData.mockResolvedValue(progressWithStreak6);

      const update: ProgressUpdate = {
        userId: mockUserId,
        tipId: 'tip123',
        action: 'complete',
        timestamp: new Date('2024-01-15'),
      };

      const result = await progressService.updateProgress(update);

      expect(result.currentStreak).toBe(7);
      expect(result.newMilestone).toBeDefined();
      expect(result.newMilestone?.days).toBe(7);
      expect(result.newMilestone?.title).toBe('One Week Strong');
    });
  });

  describe('getUserMilestones', () => {
    it('should return milestones with achievement status', async () => {
      const mockProgress: UserProgress = {
        id: 'progress123',
        userId: mockUserId,
        currentStreak: 5,
        longestStreak: 10,
        totalTipsCompleted: 25,
        lastActivityDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStorage.getData.mockResolvedValue(mockProgress);

      const milestones = await progressService.getUserMilestones(mockUserId);

      expect(milestones).toBeDefined();
      expect(milestones.length).toBeGreaterThan(0);

      // Should have achieved 3-day and 7-day milestones
      const threeDayMilestone = milestones.find(m => m.days === 3);
      const sevenDayMilestone = milestones.find(m => m.days === 7);
      const fourteenDayMilestone = milestones.find(m => m.days === 14);

      expect(threeDayMilestone?.achieved).toBe(true);
      expect(sevenDayMilestone?.achieved).toBe(true);
      expect(fourteenDayMilestone?.achieved).toBe(false);
    });

    it('should handle missing progress', async () => {
      mockStorage.getData.mockResolvedValue(null);

      const milestones = await progressService.getUserMilestones(mockUserId);

      expect(milestones).toEqual([]);
    });
  });

  describe('getWeeklyProgress', () => {
    it('should calculate weekly progress correctly', async () => {
      // Mock daily activities
      const mockDailyActivity = {
        date: new Date(),
        tipsViewed: 2,
        tipsCompleted: 1,
        engagementScore: 0.5,
      };

      mockStorage.getData.mockResolvedValue(mockDailyActivity);

      const weeklyProgress = await progressService.getWeeklyProgress(
        mockUserId,
      );

      expect(weeklyProgress).toBeDefined();
      expect(weeklyProgress.activities).toHaveLength(7);
      expect(weeklyProgress.weekStart).toBeInstanceOf(Date);
      expect(weeklyProgress.weekEnd).toBeInstanceOf(Date);
    });

    it('should handle missing daily activities', async () => {
      mockStorage.getData.mockResolvedValue(null);

      const weeklyProgress = await progressService.getWeeklyProgress(
        mockUserId,
      );

      expect(weeklyProgress).toBeDefined();
      expect(weeklyProgress.totalTipsCompleted).toBe(0);
      expect(weeklyProgress.averageEngagement).toBe(0);
      expect(weeklyProgress.streakDays).toBe(0);
    });
  });

  describe('checkForEncouragement', () => {
    it('should detect when user needs encouragement', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 3); // 3 days ago

      const mockProgress: UserProgress = {
        id: 'progress123',
        userId: mockUserId,
        currentStreak: 0,
        longestStreak: 5,
        totalTipsCompleted: 10,
        lastActivityDate: oldDate,
        createdAt: new Date(),
        updatedAt: oldDate,
      };

      mockStorage.getData.mockResolvedValue(mockProgress);

      const result = await progressService.checkForEncouragement(mockUserId);

      expect(result.needsEncouragement).toBe(true);
      expect(result.daysMissed).toBe(3);
      expect(result.lastActivity).toEqual(oldDate);
    });

    it('should not need encouragement for recent activity', async () => {
      const recentDate = new Date();

      const mockProgress: UserProgress = {
        id: 'progress123',
        userId: mockUserId,
        currentStreak: 3,
        longestStreak: 5,
        totalTipsCompleted: 10,
        lastActivityDate: recentDate,
        createdAt: new Date(),
        updatedAt: recentDate,
      };

      mockStorage.getData.mockResolvedValue(mockProgress);

      const result = await progressService.checkForEncouragement(mockUserId);

      expect(result.needsEncouragement).toBe(false);
      expect(result.daysMissed).toBe(0);
    });
  });

  describe('getProgressStats', () => {
    it('should return comprehensive progress statistics', async () => {
      const mockProgress: UserProgress = {
        id: 'progress123',
        userId: mockUserId,
        currentStreak: 5,
        longestStreak: 10,
        totalTipsCompleted: 25,
        lastActivityDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStorage.getData.mockResolvedValue(mockProgress);

      const stats = await progressService.getProgressStats(mockUserId);

      expect(stats).toBeDefined();
      expect(stats.currentStreak).toBe(5);
      expect(stats.longestStreak).toBe(10);
      expect(stats.totalTipsCompleted).toBe(25);
      expect(stats.milestones).toBeDefined();
      expect(stats.averageCompletionRate).toBeGreaterThanOrEqual(0);
      expect(stats.favoriteCategory).toBeDefined();
    });
  });

  describe('resetUserProgress', () => {
    it('should reset user progress to initial state', async () => {
      mockStorage.storeData.mockResolvedValue();

      await progressService.resetUserProgress(mockUserId);

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'USER_PROGRESS',
        expect.objectContaining({
          userId: mockUserId,
          currentStreak: 0,
          longestStreak: 0,
          totalTipsCompleted: 0,
        }),
      );
    });
  });

  describe('getProgressTrends', () => {
    it('should return progress trends over specified days', async () => {
      const mockDailyActivity = {
        date: new Date(),
        tipsViewed: 2,
        tipsCompleted: 1,
        engagementScore: 0.5,
      };

      mockStorage.getData.mockResolvedValue(mockDailyActivity);

      const trends = await progressService.getProgressTrends(mockUserId, 7);

      expect(trends).toBeDefined();
      expect(trends.dates).toHaveLength(7);
      expect(trends.completions).toHaveLength(7);
      expect(trends.streaks).toHaveLength(7);
    });

    it('should handle missing data gracefully', async () => {
      mockStorage.getData.mockResolvedValue(null);

      const trends = await progressService.getProgressTrends(mockUserId, 7);

      expect(trends.dates).toHaveLength(7);
      expect(trends.completions).toEqual([0, 0, 0, 0, 0, 0, 0]);
      expect(trends.streaks).toEqual([0, 0, 0, 0, 0, 0, 0]);
    });
  });
});
