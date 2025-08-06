/**
 * Unit tests for content service
 */

import { ContentService } from '../../src/services/content/contentService';
import { HealthTip, HealthCategory, TipDifficulty } from '../../src/types';
import { CacheService } from '../../src/services/cache/cacheService';
import { SyncService } from '../../src/services/sync/syncService';

// Mock dependencies
jest.mock('../../src/services/cache/cacheService');
jest.mock('../../src/services/sync/syncService');

const mockCacheService = CacheService as jest.MockedClass<typeof CacheService>;
const mockSyncService = SyncService as jest.MockedClass<typeof SyncService>;

describe('ContentService', () => {
  let contentService: ContentService;
  let mockCacheInstance: jest.Mocked<CacheService>;
  let mockSyncInstance: jest.Mocked<SyncService>;

  const mockHealthTip: HealthTip = {
    id: 'tip1',
    title: 'Test Tip',
    content: 'Test content for health tip',
    category: 'nutrition',
    tags: ['test', 'health'],
    difficulty: 'easy',
    estimatedReadTime: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin',
    isActive: true,
  };

  beforeEach(() => {
    // Create mock instances
    mockCacheInstance = {
      getCachedHealthTips: jest.fn(),
      cacheHealthTips: jest.fn(),
      getCachedDailyTips: jest.fn(),
      cacheDailyTips: jest.fn(),
      updateTipViewCount: jest.fn(),
    } as any;

    mockSyncInstance = {
      handleOfflineAction: jest.fn(),
    } as any;

    // Mock the getInstance methods
    mockCacheService.getInstance.mockReturnValue(mockCacheInstance);
    mockSyncService.getInstance.mockReturnValue(mockSyncInstance);

    contentService = ContentService.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ContentService.getInstance();
      const instance2 = ContentService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('getHealthTips', () => {
    it('should return cached tips if available', async () => {
      const cachedTips = [{ ...mockHealthTip, cachedAt: new Date(), viewCount: 0 }];
      mockCacheInstance.getCachedHealthTips.mockResolvedValue(cachedTips);

      const result = await contentService.getHealthTips();

      expect(result).toEqual([mockHealthTip]);
      expect(mockCacheInstance.getCachedHealthTips).toHaveBeenCalled();
    });

    it('should fetch from API and cache if no cached tips', async () => {
      mockCacheInstance.getCachedHealthTips.mockResolvedValue([]);
      mockCacheInstance.cacheHealthTips.mockResolvedValue();

      const result = await contentService.getHealthTips();

      expect(result.length).toBeGreaterThan(0);
      expect(mockCacheInstance.cacheHealthTips).toHaveBeenCalled();
    });

    it('should apply category filter', async () => {
      const nutritionTip = { ...mockHealthTip, category: 'nutrition' as HealthCategory };
      const fitnessTip = { ...mockHealthTip, id: 'tip2', category: 'fitness' as HealthCategory };
      const cachedTips = [
        { ...nutritionTip, cachedAt: new Date(), viewCount: 0 },
        { ...fitnessTip, cachedAt: new Date(), viewCount: 0 },
      ];
      
      mockCacheInstance.getCachedHealthTips.mockResolvedValue(cachedTips);

      const result = await contentService.getHealthTips({ category: 'nutrition' });

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('nutrition');
    });

    it('should apply difficulty filter', async () => {
      const easyTip = { ...mockHealthTip, difficulty: 'easy' as TipDifficulty };
      const hardTip = { ...mockHealthTip, id: 'tip2', difficulty: 'hard' as TipDifficulty };
      const cachedTips = [
        { ...easyTip, cachedAt: new Date(), viewCount: 0 },
        { ...hardTip, cachedAt: new Date(), viewCount: 0 },
      ];
      
      mockCacheInstance.getCachedHealthTips.mockResolvedValue(cachedTips);

      const result = await contentService.getHealthTips({ difficulty: 'easy' });

      expect(result).toHaveLength(1);
      expect(result[0].difficulty).toBe('easy');
    });

    it('should apply search query filter', async () => {
      const matchingTip = { ...mockHealthTip, title: 'Hydration Tips' };
      const nonMatchingTip = { ...mockHealthTip, id: 'tip2', title: 'Exercise Guide' };
      const cachedTips = [
        { ...matchingTip, cachedAt: new Date(), viewCount: 0 },
        { ...nonMatchingTip, cachedAt: new Date(), viewCount: 0 },
      ];
      
      mockCacheInstance.getCachedHealthTips.mockResolvedValue(cachedTips);

      const result = await contentService.getHealthTips({ searchQuery: 'hydration' });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Hydration Tips');
    });
  });

  describe('getHealthTipById', () => {
    it('should return tip by ID and update view count', async () => {
      const cachedTips = [{ ...mockHealthTip, cachedAt: new Date(), viewCount: 0 }];
      mockCacheInstance.getCachedHealthTips.mockResolvedValue(cachedTips);
      mockCacheInstance.updateTipViewCount.mockResolvedValue();

      const result = await contentService.getHealthTipById('tip1');

      expect(result).toEqual(mockHealthTip);
      expect(mockCacheInstance.updateTipViewCount).toHaveBeenCalledWith('tip1');
    });

    it('should return null if tip not found', async () => {
      mockCacheInstance.getCachedHealthTips.mockResolvedValue([]);

      const result = await contentService.getHealthTipById('nonexistent');

      expect(result).toBeNull();
      expect(mockCacheInstance.updateTipViewCount).not.toHaveBeenCalled();
    });
  });

  describe('getDailyTips', () => {
    it('should return cached daily tips if available', async () => {
      const dailyTips = [mockHealthTip];
      mockCacheInstance.getCachedDailyTips.mockResolvedValue(dailyTips);

      const result = await contentService.getDailyTips('user1', 3);

      expect(result).toEqual(dailyTips);
      expect(mockCacheInstance.getCachedDailyTips).toHaveBeenCalled();
    });

    it('should generate and cache daily tips if none cached', async () => {
      mockCacheInstance.getCachedDailyTips.mockResolvedValue([]);
      mockCacheInstance.getCachedHealthTips.mockResolvedValue([
        { ...mockHealthTip, cachedAt: new Date(), viewCount: 0 }
      ]);
      mockCacheInstance.cacheDailyTips.mockResolvedValue();

      const result = await contentService.getDailyTips('user1', 3);

      expect(result.length).toBeGreaterThan(0);
      expect(mockCacheInstance.cacheDailyTips).toHaveBeenCalled();
    });

    it('should limit results to requested count', async () => {
      const manyTips = Array.from({ length: 10 }, (_, i) => ({
        ...mockHealthTip,
        id: `tip${i}`,
      }));
      mockCacheInstance.getCachedDailyTips.mockResolvedValue(manyTips);

      const result = await contentService.getDailyTips('user1', 3);

      expect(result).toHaveLength(3);
    });
  });

  describe('recordEngagement', () => {
    it('should handle offline action for engagement', async () => {
      mockSyncInstance.handleOfflineAction.mockResolvedValue();

      await contentService.recordEngagement('user1', 'tip1', 'like');

      expect(mockSyncInstance.handleOfflineAction).toHaveBeenCalledWith(
        'engagement',
        expect.objectContaining({
          tipId: 'tip1',
          userId: 'user1',
          action: 'like',
          timestamp: expect.any(Date),
        })
      );
    });

    it('should throw error if sync service fails', async () => {
      mockSyncInstance.handleOfflineAction.mockRejectedValue(new Error('Sync failed'));

      await expect(
        contentService.recordEngagement('user1', 'tip1', 'like')
      ).rejects.toThrow('Failed to record engagement');
    });
  });

  describe('searchTips', () => {
    it('should search tips by title', async () => {
      const tips = [
        { ...mockHealthTip, title: 'Hydration Tips', cachedAt: new Date(), viewCount: 0 },
        { ...mockHealthTip, id: 'tip2', title: 'Exercise Guide', cachedAt: new Date(), viewCount: 0 },
      ];
      mockCacheInstance.getCachedHealthTips.mockResolvedValue(tips);

      const result = await contentService.searchTips('hydration');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Hydration Tips');
    });

    it('should search tips by content', async () => {
      const tips = [
        { ...mockHealthTip, content: 'Drink plenty of water', cachedAt: new Date(), viewCount: 0 },
        { ...mockHealthTip, id: 'tip2', content: 'Do regular exercise', cachedAt: new Date(), viewCount: 0 },
      ];
      mockCacheInstance.getCachedHealthTips.mockResolvedValue(tips);

      const result = await contentService.searchTips('water');

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Drink plenty of water');
    });

    it('should search tips by tags', async () => {
      const tips = [
        { ...mockHealthTip, tags: ['hydration', 'health'], cachedAt: new Date(), viewCount: 0 },
        { ...mockHealthTip, id: 'tip2', tags: ['exercise', 'fitness'], cachedAt: new Date(), viewCount: 0 },
      ];
      mockCacheInstance.getCachedHealthTips.mockResolvedValue(tips);

      const result = await contentService.searchTips('hydration');

      expect(result).toHaveLength(1);
      expect(result[0].tags).toContain('hydration');
    });
  });

  describe('getTipsByCategory', () => {
    it('should return tips filtered by category', async () => {
      const nutritionTip = { ...mockHealthTip, category: 'nutrition' as HealthCategory };
      const fitnessTip = { ...mockHealthTip, id: 'tip2', category: 'fitness' as HealthCategory };
      const cachedTips = [
        { ...nutritionTip, cachedAt: new Date(), viewCount: 0 },
        { ...fitnessTip, cachedAt: new Date(), viewCount: 0 },
      ];
      
      mockCacheInstance.getCachedHealthTips.mockResolvedValue(cachedTips);

      const result = await contentService.getTipsByCategory('nutrition');

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('nutrition');
    });
  });

  describe('getContentStats', () => {
    it('should return content statistics', async () => {
      const tips = [
        { ...mockHealthTip, category: 'nutrition' as HealthCategory, tags: ['health', 'water'], estimatedReadTime: 2 },
        { ...mockHealthTip, id: 'tip2', category: 'fitness' as HealthCategory, tags: ['exercise', 'health'], estimatedReadTime: 3 },
      ].map(tip => ({ ...tip, cachedAt: new Date(), viewCount: 0 }));
      
      mockCacheInstance.getCachedHealthTips.mockResolvedValue(tips);

      const result = await contentService.getContentStats();

      expect(result.totalTips).toBe(2);
      expect(result.categoryCounts.nutrition).toBe(1);
      expect(result.categoryCounts.fitness).toBe(1);
      expect(result.averageReadTime).toBe(3); // (2 + 3) / 2 = 2.5, rounded to 3
      expect(result.mostPopularTags).toContain('health');
    });
  });
});