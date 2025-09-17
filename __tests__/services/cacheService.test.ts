/**
 * Unit tests for cache service
 */

import { CacheService } from '../../src/services/cache/cacheService';
import { HealthTip, UserProfile, UserProgress } from '../../src/types';
import * as storage from '../../src/utils/storage';

// Mock storage utilities
jest.mock('../../src/utils/storage');
const mockStorage = storage as jest.Mocked<typeof storage>;

describe('CacheService', () => {
  let cacheService: CacheService;

  const mockHealthTip: HealthTip = {
    id: 'tip1',
    title: 'Test Tip',
    content: 'Test content',
    category: 'nutrition',
    tags: ['test'],
    difficulty: 'easy',
    estimatedReadTime: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin',
    isActive: true,
  };

  const mockUserProfile: UserProfile = {
    id: 'user1',
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    gender: 'male',
    healthInterests: [{ category: 'nutrition', level: 'beginner' }],
    notificationPreferences: {
      enabled: true,
      dailyTipTime: '09:00',
      streakReminders: true,
      encouragementMessages: true,
      timezone: 'UTC',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  };

  const mockUserProgress: UserProgress = {
    id: 'progress1',
    userId: 'user1',
    currentStreak: 5,
    longestStreak: 10,
    totalTipsCompleted: 25,
    lastActivityDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    cacheService = CacheService.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = CacheService.getInstance();
      const instance2 = CacheService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('cacheHealthTips', () => {
    it('should cache health tips with metadata', async () => {
      mockStorage.storeDataWithExpiration.mockResolvedValue();

      await cacheService.cacheHealthTips([mockHealthTip]);

      expect(mockStorage.storeDataWithExpiration).toHaveBeenCalledWith(
        'HEALTH_TIPS',
        expect.arrayContaining([
          expect.objectContaining({
            ...mockHealthTip,
            cachedAt: expect.any(Date),
            viewCount: 0,
          }),
        ]),
        60,
      );
    });

    it('should throw error if caching fails', async () => {
      mockStorage.storeDataWithExpiration.mockRejectedValue(
        new Error('Storage error'),
      );

      await expect(
        cacheService.cacheHealthTips([mockHealthTip]),
      ).rejects.toThrow('Failed to cache health tips');
    });
  });

  describe('getCachedHealthTips', () => {
    it('should return cached health tips', async () => {
      const cachedTips = [
        {
          ...mockHealthTip,
          cachedAt: new Date(),
          viewCount: 2,
        },
      ];
      mockStorage.getDataIfNotExpired.mockResolvedValue(cachedTips);

      const result = await cacheService.getCachedHealthTips();

      expect(result).toEqual(cachedTips);
      expect(mockStorage.getDataIfNotExpired).toHaveBeenCalledWith(
        'HEALTH_TIPS',
      );
    });

    it('should return empty array if no cached tips', async () => {
      mockStorage.getDataIfNotExpired.mockResolvedValue(null);

      const result = await cacheService.getCachedHealthTips();

      expect(result).toEqual([]);
    });
  });

  describe('cacheDailyTips', () => {
    it('should cache daily tips with date', async () => {
      mockStorage.storeDataWithExpiration.mockResolvedValue();

      await cacheService.cacheDailyTips([mockHealthTip]);

      expect(mockStorage.storeDataWithExpiration).toHaveBeenCalledWith(
        'CACHED_TIPS',
        expect.objectContaining({
          tips: [mockHealthTip],
          date: new Date().toDateString(),
          cachedAt: expect.any(Date),
        }),
        1440,
      );
    });
  });

  describe('getCachedDailyTips', () => {
    it('should return daily tips for today', async () => {
      const todayData = {
        tips: [mockHealthTip],
        date: new Date().toDateString(),
        cachedAt: new Date(),
      };
      mockStorage.getDataIfNotExpired.mockResolvedValue(todayData);

      const result = await cacheService.getCachedDailyTips();

      expect(result).toEqual([mockHealthTip]);
    });

    it('should return empty array and clear cache for old date', async () => {
      const oldData = {
        tips: [mockHealthTip],
        date: '2023-01-01', // Old date
        cachedAt: new Date(),
      };
      mockStorage.getDataIfNotExpired.mockResolvedValue(oldData);
      mockStorage.removeData.mockResolvedValue();

      const result = await cacheService.getCachedDailyTips();

      expect(result).toEqual([]);
      expect(mockStorage.removeData).toHaveBeenCalledWith('CACHED_TIPS');
    });
  });

  describe('cacheUserData', () => {
    it('should cache user profile and progress', async () => {
      mockStorage.storeDataWithExpiration.mockResolvedValue();

      await cacheService.cacheUserData(mockUserProfile, mockUserProgress);

      expect(mockStorage.storeDataWithExpiration).toHaveBeenCalledWith(
        'USER_DATA',
        expect.objectContaining({
          profile: mockUserProfile,
          progress: mockUserProgress,
          lastSync: expect.any(Date),
        }),
        30,
      );
    });
  });

  describe('updateTipViewCount', () => {
    it('should increment view count for specific tip', async () => {
      const cachedTips = [
        {
          ...mockHealthTip,
          cachedAt: new Date(),
          viewCount: 2,
        },
      ];
      mockStorage.getDataIfNotExpired.mockResolvedValue(cachedTips);
      mockStorage.storeDataWithExpiration.mockResolvedValue();

      await cacheService.updateTipViewCount('tip1');

      expect(mockStorage.storeDataWithExpiration).toHaveBeenCalledWith(
        'HEALTH_TIPS',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'tip1',
            viewCount: 3,
          }),
        ]),
        60,
      );
    });
  });

  describe('queueOfflineAction', () => {
    it('should add action to offline queue', async () => {
      const existingQueue = [
        {
          id: 'existing1',
          type: 'engagement' as const,
          data: { tipId: 'tip1' },
          timestamp: new Date(),
          retryCount: 0,
        },
      ];
      mockStorage.getData.mockResolvedValue(existingQueue);
      mockStorage.storeData.mockResolvedValue();

      await cacheService.queueOfflineAction('progress_update', { streak: 5 });

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'OFFLINE_QUEUE',
        expect.arrayContaining([
          existingQueue[0],
          expect.objectContaining({
            type: 'progress_update',
            data: { streak: 5 },
            retryCount: 0,
          }),
        ]),
      );
    });
  });

  describe('getOfflineQueue', () => {
    it('should return offline action queue', async () => {
      const queue = [
        {
          id: 'action1',
          type: 'engagement' as const,
          data: { tipId: 'tip1' },
          timestamp: new Date(),
          retryCount: 0,
        },
      ];
      mockStorage.getData.mockResolvedValue(queue);

      const result = await cacheService.getOfflineQueue();

      expect(result).toEqual(queue);
    });

    it('should return empty array if no queue exists', async () => {
      mockStorage.getData.mockResolvedValue(null);

      const result = await cacheService.getOfflineQueue();

      expect(result).toEqual([]);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const cachedTips = [
        { ...mockHealthTip, cachedAt: new Date(), viewCount: 0 },
      ];
      const dailyTips = [mockHealthTip];
      const offlineQueue = [
        {
          id: 'action1',
          type: 'engagement' as const,
          data: {},
          timestamp: new Date(),
          retryCount: 0,
        },
      ];
      const userData = {
        profile: mockUserProfile,
        progress: mockUserProgress,
        lastSync: new Date(),
      };

      mockStorage.getDataIfNotExpired
        .mockResolvedValueOnce(cachedTips) // getCachedHealthTips
        .mockResolvedValueOnce(dailyTips) // getCachedDailyTips (mocked internally)
        .mockResolvedValueOnce(userData); // getCachedUserData

      mockStorage.getData.mockResolvedValue(offlineQueue); // getOfflineQueue

      const result = await cacheService.getCacheStats();

      expect(result).toEqual({
        healthTipsCount: 1,
        dailyTipsCount: 1,
        offlineQueueCount: 1,
        lastSync: userData.lastSync,
      });
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cache data', async () => {
      mockStorage.removeData.mockResolvedValue();

      await cacheService.clearAllCache();

      expect(mockStorage.removeData).toHaveBeenCalledTimes(4);
      expect(mockStorage.removeData).toHaveBeenCalledWith('HEALTH_TIPS');
      expect(mockStorage.removeData).toHaveBeenCalledWith('USER_DATA');
      expect(mockStorage.removeData).toHaveBeenCalledWith('CACHED_TIPS');
      expect(mockStorage.removeData).toHaveBeenCalledWith('OFFLINE_QUEUE');
    });
  });
});
