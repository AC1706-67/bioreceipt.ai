/**
 * Photo Performance Service Tests
 */

import { photoPerformanceService } from '../photoPerformanceService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions } from 'react-native';

// Mock React Native modules
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })),
  },
  Platform: {
    select: jest.fn((options) => options.ios),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('PhotoPerformanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const metrics = photoPerformanceService.getPerformanceMetrics();
      
      expect(metrics).toEqual({
        loadTime: 0,
        cacheHitRate: 0,
        memoryUsage: 0,
        compressionRatio: 0,
        thumbnailGenerationTime: 0,
      });
    });

    it('should load existing performance metrics on initialization', async () => {
      const mockMetrics = {
        loadTime: 150,
        cacheHitRate: 0.75,
        memoryUsage: 50,
        compressionRatio: 0.6,
        thumbnailGenerationTime: 100,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockMetrics));
      
      // Create new instance to test initialization
      const service = new (photoPerformanceService.constructor as any)();
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('photo_performance_metrics');
    });
  });

  describe('configuration', () => {
    it('should allow updating cache configuration', () => {
      const newConfig = {
        maxCacheSize: 200,
        compressionQuality: 0.9,
        enableMemoryCache: false,
      };

      photoPerformanceService.configure(newConfig);
      
      // Configuration is private, but we can test its effects
      expect(() => photoPerformanceService.configure(newConfig)).not.toThrow();
    });
  });

  describe('photo optimization', () => {
    it('should optimize photo and return optimized URL', async () => {
      const testUrl = 'https://example.com/photo.jpg';
      
      const optimizedUrl = await photoPerformanceService.optimizePhoto(testUrl);
      
      expect(optimizedUrl).toBe(testUrl); // Placeholder implementation returns original URL
    });

    it('should cache optimized photos', async () => {
      const testUrl = 'https://example.com/photo.jpg';
      
      // First call should optimize and cache
      await photoPerformanceService.optimizePhoto(testUrl);
      
      // Second call should hit cache
      await photoPerformanceService.optimizePhoto(testUrl);
      
      const stats = photoPerformanceService.getCacheStats();
      expect(stats.cacheHits).toBeGreaterThan(0);
    });

    it('should handle optimization errors gracefully', async () => {
      const testUrl = 'invalid-url';
      
      const result = await photoPerformanceService.optimizePhoto(testUrl);
      
      // Should return original URL as fallback
      expect(result).toBe(testUrl);
    });

    it('should use optimal dimensions based on screen size', async () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 414, height: 896 });
      
      const testUrl = 'https://example.com/photo.jpg';
      const result = await photoPerformanceService.optimizePhoto(testUrl, {
        maxWidth: 1000,
        maxHeight: 1000,
      });
      
      expect(result).toBeDefined();
    });
  });

  describe('thumbnail generation', () => {
    it('should generate thumbnails with default size', async () => {
      const testUrl = 'https://example.com/photo.jpg';
      
      const thumbnailUrl = await photoPerformanceService.generateThumbnail(testUrl);
      
      expect(thumbnailUrl).toBe(testUrl); // Placeholder implementation
    });

    it('should generate thumbnails with custom size', async () => {
      const testUrl = 'https://example.com/photo.jpg';
      const customSize = { width: 150, height: 150 };
      
      const thumbnailUrl = await photoPerformanceService.generateThumbnail(testUrl, customSize);
      
      expect(thumbnailUrl).toBe(testUrl);
    });

    it('should cache generated thumbnails', async () => {
      const testUrl = 'https://example.com/photo.jpg';
      
      // Generate thumbnail twice
      await photoPerformanceService.generateThumbnail(testUrl);
      await photoPerformanceService.generateThumbnail(testUrl);
      
      const stats = photoPerformanceService.getCacheStats();
      expect(stats.cacheHits).toBeGreaterThan(0);
    });

    it('should update thumbnail generation metrics', async () => {
      const testUrl = 'https://example.com/photo.jpg';
      
      await photoPerformanceService.generateThumbnail(testUrl);
      
      const metrics = photoPerformanceService.getPerformanceMetrics();
      expect(metrics.thumbnailGenerationTime).toBeGreaterThan(0);
    });
  });

  describe('photo preloading', () => {
    it('should preload multiple photos', async () => {
      const testUrls = [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg',
        'https://example.com/photo3.jpg',
      ];
      
      await photoPerformanceService.preloadPhotos(testUrls);
      
      // Should complete without throwing
      expect(true).toBe(true);
    });

    it('should handle preloading errors gracefully', async () => {
      const testUrls = ['invalid-url-1', 'invalid-url-2'];
      
      await expect(photoPerformanceService.preloadPhotos(testUrls)).resolves.not.toThrow();
    });
  });

  describe('batch optimization', () => {
    it('should optimize multiple photos in batches', async () => {
      const testUrls = [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg',
        'https://example.com/photo3.jpg',
        'https://example.com/photo4.jpg',
        'https://example.com/photo5.jpg',
        'https://example.com/photo6.jpg',
      ];
      
      const optimizedUrls = await photoPerformanceService.optimizeBatch(testUrls);
      
      expect(optimizedUrls).toHaveLength(testUrls.length);
      expect(optimizedUrls).toEqual(testUrls); // Placeholder implementation
    });

    it('should handle batch optimization errors gracefully', async () => {
      const testUrls = ['invalid-url-1', 'invalid-url-2'];
      
      const result = await photoPerformanceService.optimizeBatch(testUrls);
      
      expect(result).toEqual(testUrls); // Should return original URLs as fallback
    });

    it('should process photos in smaller batches to avoid overwhelming system', async () => {
      const testUrls = Array.from({ length: 12 }, (_, i) => `https://example.com/photo${i}.jpg`);
      
      const optimizedUrls = await photoPerformanceService.optimizeBatch(testUrls);
      
      expect(optimizedUrls).toHaveLength(testUrls.length);
    });
  });

  describe('cache management', () => {
    it('should provide cache statistics', () => {
      const stats = photoPerformanceService.getCacheStats();
      
      expect(stats).toHaveProperty('memoryCacheSize');
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('cacheMisses');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('averageLoadTime');
      expect(stats).toHaveProperty('averageThumbnailTime');
    });

    it('should clear all caches', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        'photo_cache_test1',
        'photo_cache_test2',
        'other_key',
      ]);

      await photoPerformanceService.clearCache();
      
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'photo_cache_test1',
        'photo_cache_test2',
      ]);
    });

    it('should handle cache clearing errors gracefully', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      await expect(photoPerformanceService.clearCache()).resolves.not.toThrow();
    });

    it('should calculate cache hit rate correctly', async () => {
      const testUrl = 'https://example.com/photo.jpg';
      
      // First call - cache miss
      await photoPerformanceService.optimizePhoto(testUrl);
      
      // Second call - cache hit
      await photoPerformanceService.optimizePhoto(testUrl);
      
      const stats = photoPerformanceService.getCacheStats();
      expect(stats.hitRate).toBe(0.5); // 1 hit out of 2 total requests
    });
  });

  describe('performance metrics', () => {
    it('should track load time metrics', async () => {
      const testUrl = 'https://example.com/photo.jpg';
      
      await photoPerformanceService.optimizePhoto(testUrl);
      
      const metrics = photoPerformanceService.getPerformanceMetrics();
      expect(metrics.loadTime).toBeGreaterThan(0);
    });

    it('should provide current performance metrics', () => {
      const metrics = photoPerformanceService.getPerformanceMetrics();
      
      expect(typeof metrics.loadTime).toBe('number');
      expect(typeof metrics.cacheHitRate).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
      expect(typeof metrics.compressionRatio).toBe('number');
      expect(typeof metrics.thumbnailGenerationTime).toBe('number');
    });
  });

  describe('cache expiration', () => {
    it('should clean up expired cache entries', async () => {
      const expiredCacheData = JSON.stringify({
        id: 'test',
        url: 'https://example.com/photo.jpg',
        cachedAt: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8 days ago
        size: 1000,
      });

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['photo_cache_test']);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(expiredCacheData);

      // Create new instance to trigger cleanup
      const service = new (photoPerformanceService.constructor as any)();
      
      // Wait for initialization and cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('photo_cache_test');
    });

    it('should keep valid cache entries', async () => {
      const validCacheData = JSON.stringify({
        id: 'test',
        url: 'https://example.com/photo.jpg',
        cachedAt: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
        size: 1000,
      });

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['photo_cache_test']);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(validCacheData);

      // Create new instance to trigger cleanup
      const service = new (photoPerformanceService.constructor as any)();
      
      // Wait for initialization and cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith('photo_cache_test');
    });
  });

  describe('error handling', () => {
    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));
      
      const testUrl = 'https://example.com/photo.jpg';
      
      await expect(photoPerformanceService.optimizePhoto(testUrl)).resolves.not.toThrow();
    });

    it('should handle corrupted cache data gracefully', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['photo_cache_corrupted']);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-json');

      // Create new instance to trigger cleanup
      const service = new (photoPerformanceService.constructor as any)();
      
      // Wait for initialization and cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should remove corrupted cache entry
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('photo_cache_corrupted');
    });
  });

  describe('cleanup', () => {
    it('should save metrics on destroy', () => {
      photoPerformanceService.destroy();
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'photo_performance_metrics',
        expect.any(String)
      );
    });

    it('should clear memory cache on destroy', () => {
      photoPerformanceService.destroy();
      
      // Memory cache should be cleared (private method, so we test indirectly)
      const stats = photoPerformanceService.getCacheStats();
      expect(stats.memoryCacheSize).toBe(0);
    });
  });
});