/**
 * Substance Cache Service Tests - Performance Optimization Testing
 * Tests caching, optimistic updates, and performance monitoring
 */

import { substanceCacheService } from '../substanceCacheService';
import { storeDataWithExpiration, getDataIfNotExpired, removeData } from '../../../utils/storage';

// Mock storage utilities
jest.mock('../../../utils/storage', () => ({
  storeDataWithExpiration: jest.fn(),
  getDataIfNotExpired: jest.fn(),
  removeData: jest.fn(),
  storeData: jest.fn(),
  getData: jest.fn(),
}));

const mockStoreDataWithExpiration = storeDataWithExpiration as jest.MockedFunction<typeof storeDataWithExpiration>;
const mockGetDataIfNotExpired = getDataIfNotExpired as jest.MockedFunction<typeof getDataIfNotExpired>;
const mockRemoveData = removeData as jest.MockedFunction<typeof removeData>;

describe('SubstanceCacheService', () => {
  const mockSubstance = {
    id: 'test-substance-1',
    name: 'Test Substance',
    created_by: null,
    substance_categories: {
      id: 'category-1',
      name: 'Test Category',
    },
  };

  const mockUserSubstance = {
    id: 'user-substance-1',
    name: 'User Substance',
    created_by: 'user-123',
    substance_categories: {
      id: 'category-2',
      name: 'Custom Category',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache between tests
    substanceCacheService.clearAllCaches();
  });

  describe('Substance Caching', () => {
    it('should cache substances successfully', async () => {
      const substances = [mockSubstance, mockUserSubstance];
      
      await substanceCacheService.cacheSubstances(substances);
      
      expect(mockStoreDataWithExpiration).toHaveBeenCalledWith(
        'substances_all',
        expect.objectContaining({
          substances,
          version: '1.0',
          userSpecific: false,
        }),
        30 * 60 * 1000 // 30 minutes
      );
    });

    it('should cache user-specific substances', async () => {
      const substances = [mockUserSubstance];
      const userId = 'user-123';
      
      await substanceCacheService.cacheSubstances(substances, userId);
      
      expect(mockStoreDataWithExpiration).toHaveBeenCalledWith(
        'substances_user_user-123',
        expect.objectContaining({
          substances,
          version: '1.0',
          userSpecific: true,
        }),
        30 * 60 * 1000
      );
    });

    it('should retrieve cached substances from memory', async () => {
      const substances = [mockSubstance];
      
      // Cache substances first
      await substanceCacheService.cacheSubstances(substances);
      
      // Retrieve from cache
      const cachedSubstances = await substanceCacheService.getCachedSubstances();
      
      expect(cachedSubstances).toEqual(substances);
      expect(mockGetDataIfNotExpired).not.toHaveBeenCalled(); // Should use memory cache
    });

    it('should fall back to storage when memory cache is empty', async () => {
      const substances = [mockSubstance];
      const cachedData = {
        substances,
        timestamp: Date.now(),
        version: '1.0',
        userSpecific: false,
      };
      
      mockGetDataIfNotExpired.mockResolvedValue(cachedData);
      
      const result = await substanceCacheService.getCachedSubstances();
      
      expect(result).toEqual(substances);
      expect(mockGetDataIfNotExpired).toHaveBeenCalledWith('substances_all');
    });

    it('should return null when no cache is available', async () => {
      mockGetDataIfNotExpired.mockResolvedValue(null);
      
      const result = await substanceCacheService.getCachedSubstances();
      
      expect(result).toBeNull();
    });
  });

  describe('Optimistic Updates', () => {
    it('should add optimistic update and return update ID', () => {
      const updateId = substanceCacheService.addOptimisticUpdate(mockSubstance);
      
      expect(updateId).toMatch(/^optimistic_\d+_[a-z0-9]+$/);
      
      const metrics = substanceCacheService.getMetrics();
      expect(metrics.optimisticUpdates).toBe(1);
    });

    it('should confirm optimistic update', () => {
      const updateId = substanceCacheService.addOptimisticUpdate(mockSubstance);
      
      substanceCacheService.confirmOptimisticUpdate(updateId);
      
      // Update should still exist but marked as confirmed
      // This is tested indirectly through the merge functionality
    });

    it('should fail optimistic update', () => {
      const updateId = substanceCacheService.addOptimisticUpdate(mockSubstance);
      
      substanceCacheService.failOptimisticUpdate(updateId);
      
      // Update should be marked as failed and removed after timeout
    });

    it('should merge optimistic updates with cached substances', async () => {
      const cachedSubstances = [mockSubstance];
      const optimisticSubstance = { ...mockUserSubstance, id: 'optimistic-1' };
      
      // Cache initial substances
      await substanceCacheService.cacheSubstances(cachedSubstances);
      
      // Add optimistic update
      substanceCacheService.addOptimisticUpdate(optimisticSubstance);
      
      // Retrieve substances (should include optimistic update)
      const result = await substanceCacheService.getCachedSubstances();
      
      expect(result).toHaveLength(2);
      expect(result).toContain(mockSubstance);
      expect(result).toContainEqual(optimisticSubstance);
    });

    it('should not duplicate substances in optimistic updates', async () => {
      const substances = [mockSubstance];
      
      // Cache substances
      await substanceCacheService.cacheSubstances(substances);
      
      // Try to add the same substance as optimistic update
      substanceCacheService.addOptimisticUpdate(mockSubstance);
      
      const result = await substanceCacheService.getCachedSubstances();
      
      expect(result).toHaveLength(1); // Should not duplicate
    });
  });

  describe('Search Result Caching', () => {
    it('should cache search results', async () => {
      const query = 'test';
      const results = [mockSubstance];
      
      await substanceCacheService.cacheSearchResults(query, results);
      
      expect(mockStoreDataWithExpiration).toHaveBeenCalledWith(
        'substance_search_test',
        expect.objectContaining({
          substances: results,
        }),
        5 * 60 * 1000 // 5 minutes
      );
    });

    it('should not cache very short queries', async () => {
      const query = 'a';
      const results = [mockSubstance];
      
      await substanceCacheService.cacheSearchResults(query, results);
      
      expect(mockStoreDataWithExpiration).not.toHaveBeenCalled();
    });

    it('should retrieve cached search results', async () => {
      const query = 'test';
      const results = [mockSubstance];
      const cachedData = {
        substances: results,
        timestamp: Date.now(),
        version: '1.0',
        userSpecific: false,
      };
      
      mockGetDataIfNotExpired.mockResolvedValue(cachedData);
      
      const result = await substanceCacheService.getCachedSearchResults(query);
      
      expect(result).toEqual(results);
      expect(mockGetDataIfNotExpired).toHaveBeenCalledWith('substance_search_test');
    });

    it('should return null for very short search queries', async () => {
      const result = await substanceCacheService.getCachedSearchResults('a');
      
      expect(result).toBeNull();
      expect(mockGetDataIfNotExpired).not.toHaveBeenCalled();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate substance cache', async () => {
      const substances = [mockSubstance];
      
      // Cache substances first
      await substanceCacheService.cacheSubstances(substances);
      
      // Invalidate cache
      await substanceCacheService.invalidateSubstanceCache();
      
      expect(mockRemoveData).toHaveBeenCalledWith('substances_all');
      
      // Should return null after invalidation
      mockGetDataIfNotExpired.mockResolvedValue(null);
      const result = await substanceCacheService.getCachedSubstances();
      expect(result).toBeNull();
    });

    it('should invalidate user-specific cache', async () => {
      const userId = 'user-123';
      
      await substanceCacheService.invalidateSubstanceCache(userId);
      
      expect(mockRemoveData).toHaveBeenCalledWith('substances_user_user-123');
    });
  });

  describe('Performance Metrics', () => {
    it('should track cache hits and misses', async () => {
      // Cache miss
      mockGetDataIfNotExpired.mockResolvedValue(null);
      await substanceCacheService.getCachedSubstances();
      
      // Cache substances
      const substances = [mockSubstance];
      await substanceCacheService.cacheSubstances(substances);
      
      // Cache hit
      await substanceCacheService.getCachedSubstances();
      
      const metrics = substanceCacheService.getMetrics();
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(1);
    });

    it('should calculate cache hit ratio', async () => {
      // Start with no cache
      mockGetDataIfNotExpired.mockResolvedValue(null);
      await substanceCacheService.getCachedSubstances(); // Miss
      
      // Cache substances
      const substances = [mockSubstance];
      await substanceCacheService.cacheSubstances(substances);
      
      // Hit
      await substanceCacheService.getCachedSubstances();
      
      const hitRatio = substanceCacheService.getCacheHitRatio();
      expect(hitRatio).toBe(0.5); // 1 hit out of 2 total requests
    });

    it('should track optimistic updates in metrics', () => {
      substanceCacheService.addOptimisticUpdate(mockSubstance);
      substanceCacheService.addOptimisticUpdate(mockUserSubstance);
      
      const metrics = substanceCacheService.getMetrics();
      expect(metrics.optimisticUpdates).toBe(2);
    });

    it('should track cache invalidations', async () => {
      await substanceCacheService.invalidateSubstanceCache();
      
      const metrics = substanceCacheService.getMetrics();
      expect(metrics.invalidations).toBe(1);
    });
  });

  describe('Cache Preloading', () => {
    it('should preload substances using provided function', async () => {
      const substances = [mockSubstance, mockUserSubstance];
      const loadFunction = jest.fn().mockResolvedValue(substances);
      
      await substanceCacheService.preloadSubstances(loadFunction);
      
      expect(loadFunction).toHaveBeenCalled();
      expect(mockStoreDataWithExpiration).toHaveBeenCalledWith(
        'substances_all',
        expect.objectContaining({ substances }),
        30 * 60 * 1000
      );
    });

    it('should handle preload errors gracefully', async () => {
      const loadFunction = jest.fn().mockRejectedValue(new Error('Load failed'));
      
      // Should not throw
      await expect(substanceCacheService.preloadSubstances(loadFunction)).resolves.toBeUndefined();
      
      expect(loadFunction).toHaveBeenCalled();
      expect(mockStoreDataWithExpiration).not.toHaveBeenCalled();
    });
  });

  describe('Cache Cleanup', () => {
    it('should clear all caches', async () => {
      // Add some data
      const substances = [mockSubstance];
      await substanceCacheService.cacheSubstances(substances);
      substanceCacheService.addOptimisticUpdate(mockUserSubstance);
      
      // Clear all caches
      await substanceCacheService.clearAllCaches();
      
      // Metrics should be reset
      const metrics = substanceCacheService.getMetrics();
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
      expect(metrics.optimisticUpdates).toBe(0);
      expect(metrics.invalidations).toBe(0);
      
      // Storage should be cleared
      expect(mockRemoveData).toHaveBeenCalledTimes(4); // All cache keys
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockStoreDataWithExpiration.mockRejectedValue(new Error('Storage error'));
      
      // Should not throw
      await expect(substanceCacheService.cacheSubstances([mockSubstance])).resolves.toBeUndefined();
    });

    it('should handle retrieval errors gracefully', async () => {
      mockGetDataIfNotExpired.mockRejectedValue(new Error('Retrieval error'));
      
      const result = await substanceCacheService.getCachedSubstances();
      
      expect(result).toBeNull();
      
      const metrics = substanceCacheService.getMetrics();
      expect(metrics.cacheMisses).toBe(1);
    });
  });
});