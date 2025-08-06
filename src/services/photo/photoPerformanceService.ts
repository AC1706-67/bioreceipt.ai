/**
 * Photo Performance Service
 * Provides performance optimizations for photo operations including caching, compression, and loading
 */

import { Image, Dimensions, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PhotoCacheConfig {
  maxCacheSize: number; // in MB
  maxCacheAge: number; // in milliseconds
  compressionQuality: number; // 0-1
  thumbnailSize: { width: number; height: number };
  enableMemoryCache: boolean;
  enableDiskCache: boolean;
}

export interface PhotoOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  progressive?: boolean;
  stripMetadata?: boolean;
}

export interface PerformanceMetrics {
  loadTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  compressionRatio: number;
  thumbnailGenerationTime: number;
}

interface CachedPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  cachedAt: number;
  size: number;
  metadata?: any;
}

class PhotoPerformanceService {
  private static readonly CACHE_KEY_PREFIX = 'photo_cache_';
  private static readonly METRICS_KEY = 'photo_performance_metrics';
  private static readonly DEFAULT_CACHE_SIZE = 100; // 100MB
  private static readonly DEFAULT_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

  private memoryCache: Map<string, CachedPhoto> = new Map();
  private performanceMetrics: PerformanceMetrics = {
    loadTime: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    compressionRatio: 0,
    thumbnailGenerationTime: 0,
  };

  private config: PhotoCacheConfig = {
    maxCacheSize: PhotoPerformanceService.DEFAULT_CACHE_SIZE,
    maxCacheAge: PhotoPerformanceService.DEFAULT_CACHE_AGE,
    compressionQuality: 0.8,
    thumbnailSize: { width: 200, height: 200 },
    enableMemoryCache: true,
    enableDiskCache: true,
  };

  private cacheHits = 0;
  private cacheMisses = 0;

  constructor() {
    this.initializeCache();
  }

  /**
   * Initialize the photo cache system
   */
  private async initializeCache(): Promise<void> {
    try {
      // Load performance metrics
      const metricsData = await AsyncStorage.getItem(PhotoPerformanceService.METRICS_KEY);
      if (metricsData) {
        this.performanceMetrics = JSON.parse(metricsData);
      }

      // Clean up expired cache entries
      await this.cleanupExpiredCache();
      
      // Preload frequently accessed photos
      await this.preloadFrequentPhotos();
    } catch (error) {
      console.error('Failed to initialize photo cache:', error);
    }
  }

  /**
   * Configure cache settings
   */
  configure(config: Partial<PhotoCacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Optimize photo for display
   */
  async optimizePhoto(
    photoUrl: string,
    options: PhotoOptimizationOptions = {}
  ): Promise<string> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cachedPhoto = await this.getCachedPhoto(photoUrl);
      if (cachedPhoto) {
        this.recordCacheHit();
        return cachedPhoto.url;
      }

      this.recordCacheMiss();

      // Get optimal dimensions based on screen size and options
      const optimalDimensions = this.getOptimalDimensions(options);
      
      // Compress and resize photo
      const optimizedUrl = await this.compressPhoto(photoUrl, {
        ...options,
        maxWidth: optimalDimensions.width,
        maxHeight: optimalDimensions.height,
      });

      // Cache the optimized photo
      await this.cachePhoto(photoUrl, optimizedUrl);

      // Update performance metrics
      const loadTime = Date.now() - startTime;
      this.updateLoadTimeMetrics(loadTime);

      return optimizedUrl;
    } catch (error) {
      console.error('Failed to optimize photo:', error);
      return photoUrl; // Return original URL as fallback
    }
  }

  /**
   * Generate thumbnail for photo
   */
  async generateThumbnail(
    photoUrl: string,
    size: { width: number; height: number } = this.config.thumbnailSize
  ): Promise<string> {
    const startTime = Date.now();
    
    try {
      const thumbnailKey = `${photoUrl}_thumb_${size.width}x${size.height}`;
      
      // Check if thumbnail is already cached
      const cachedThumbnail = await this.getCachedPhoto(thumbnailKey);
      if (cachedThumbnail) {
        return cachedThumbnail.url;
      }

      // Generate thumbnail
      const thumbnailUrl = await this.compressPhoto(photoUrl, {
        maxWidth: size.width,
        maxHeight: size.height,
        quality: this.config.compressionQuality,
        format: 'jpeg',
      });

      // Cache thumbnail
      await this.cachePhoto(thumbnailKey, thumbnailUrl);

      // Update thumbnail generation metrics
      const generationTime = Date.now() - startTime;
      this.performanceMetrics.thumbnailGenerationTime = 
        (this.performanceMetrics.thumbnailGenerationTime + generationTime) / 2;

      return thumbnailUrl;
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      return photoUrl;
    }
  }

  /**
   * Preload photos for better performance
   */
  async preloadPhotos(photoUrls: string[]): Promise<void> {
    const preloadPromises = photoUrls.map(async (url) => {
      try {
        // Check if already cached
        const cached = await this.getCachedPhoto(url);
        if (cached) return;

        // Preload and cache
        await this.optimizePhoto(url);
      } catch (error) {
        console.warn(`Failed to preload photo ${url}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Get optimal dimensions based on screen size and options
   */
  private getOptimalDimensions(options: PhotoOptimizationOptions): { width: number; height: number } {
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const pixelRatio = Platform.select({ ios: 2, android: 2 }); // Simplified pixel ratio

    const maxWidth = options.maxWidth || screenWidth * pixelRatio;
    const maxHeight = options.maxHeight || screenHeight * pixelRatio;

    return {
      width: Math.min(maxWidth, 2048), // Cap at 2048px for performance
      height: Math.min(maxHeight, 2048),
    };
  }

  /**
   * Compress photo with specified options
   */
  private async compressPhoto(
    photoUrl: string,
    options: PhotoOptimizationOptions
  ): Promise<string> {
    // In a real implementation, you would use a library like react-native-image-resizer
    // or react-native-image-manipulator for actual compression
    
    // For now, we'll simulate compression and return the original URL
    // This is where you'd implement actual image compression logic
    
    console.log(`Compressing photo ${photoUrl} with options:`, options);
    
    // Simulate compression delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In real implementation:
    // const compressedPhoto = await ImageResizer.createResizedImage(
    //   photoUrl,
    //   options.maxWidth || 1024,
    //   options.maxHeight || 1024,
    //   options.format || 'JPEG',
    //   options.quality || 80
    // );
    // return compressedPhoto.uri;
    
    return photoUrl; // Placeholder
  }

  /**
   * Cache photo in memory and/or disk
   */
  private async cachePhoto(key: string, url: string): Promise<void> {
    const cachedPhoto: CachedPhoto = {
      id: key,
      url,
      cachedAt: Date.now(),
      size: 0, // Would be calculated from actual file
    };

    // Memory cache
    if (this.config.enableMemoryCache) {
      this.memoryCache.set(key, cachedPhoto);
      this.enforceMemoryCacheLimit();
    }

    // Disk cache
    if (this.config.enableDiskCache) {
      try {
        await AsyncStorage.setItem(
          `${PhotoPerformanceService.CACHE_KEY_PREFIX}${key}`,
          JSON.stringify(cachedPhoto)
        );
      } catch (error) {
        console.warn('Failed to cache photo to disk:', error);
      }
    }
  }

  /**
   * Get cached photo from memory or disk
   */
  private async getCachedPhoto(key: string): Promise<CachedPhoto | null> {
    // Check memory cache first
    if (this.config.enableMemoryCache && this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key)!;
      if (this.isCacheValid(cached)) {
        return cached;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Check disk cache
    if (this.config.enableDiskCache) {
      try {
        const cachedData = await AsyncStorage.getItem(
          `${PhotoPerformanceService.CACHE_KEY_PREFIX}${key}`
        );
        
        if (cachedData) {
          const cached: CachedPhoto = JSON.parse(cachedData);
          if (this.isCacheValid(cached)) {
            // Add back to memory cache
            if (this.config.enableMemoryCache) {
              this.memoryCache.set(key, cached);
            }
            return cached;
          } else {
            // Remove expired cache
            await AsyncStorage.removeItem(`${PhotoPerformanceService.CACHE_KEY_PREFIX}${key}`);
          }
        }
      } catch (error) {
        console.warn('Failed to get cached photo from disk:', error);
      }
    }

    return null;
  }

  /**
   * Check if cached photo is still valid
   */
  private isCacheValid(cached: CachedPhoto): boolean {
    const age = Date.now() - cached.cachedAt;
    return age < this.config.maxCacheAge;
  }

  /**
   * Enforce memory cache size limit
   */
  private enforceMemoryCacheLimit(): void {
    const maxEntries = 50; // Simplified limit by entry count
    
    if (this.memoryCache.size > maxEntries) {
      // Remove oldest entries
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);
      
      const entriesToRemove = entries.slice(0, this.memoryCache.size - maxEntries);
      entriesToRemove.forEach(([key]) => {
        this.memoryCache.delete(key);
      });
    }
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupExpiredCache(): Promise<void> {
    try {
      // Clean memory cache
      const memoryEntries = Array.from(this.memoryCache.entries());
      memoryEntries.forEach(([key, cached]) => {
        if (!this.isCacheValid(cached)) {
          this.memoryCache.delete(key);
        }
      });

      // Clean disk cache
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => 
        key.startsWith(PhotoPerformanceService.CACHE_KEY_PREFIX)
      );

      const cleanupPromises = cacheKeys.map(async (key) => {
        try {
          const cachedData = await AsyncStorage.getItem(key);
          if (cachedData) {
            const cached: CachedPhoto = JSON.parse(cachedData);
            if (!this.isCacheValid(cached)) {
              await AsyncStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Remove corrupted cache entries
          await AsyncStorage.removeItem(key);
        }
      });

      await Promise.allSettled(cleanupPromises);
    } catch (error) {
      console.error('Failed to cleanup expired cache:', error);
    }
  }

  /**
   * Preload frequently accessed photos
   */
  private async preloadFrequentPhotos(): Promise<void> {
    // In a real implementation, you'd track photo access frequency
    // and preload the most frequently accessed photos
    console.log('Preloading frequent photos...');
  }

  /**
   * Record cache hit for metrics
   */
  private recordCacheHit(): void {
    this.cacheHits++;
    this.updateCacheHitRate();
  }

  /**
   * Record cache miss for metrics
   */
  private recordCacheMiss(): void {
    this.cacheMisses++;
    this.updateCacheHitRate();
  }

  /**
   * Update cache hit rate metrics
   */
  private updateCacheHitRate(): void {
    const total = this.cacheHits + this.cacheMisses;
    this.performanceMetrics.cacheHitRate = total > 0 ? this.cacheHits / total : 0;
  }

  /**
   * Update load time metrics
   */
  private updateLoadTimeMetrics(loadTime: number): void {
    this.performanceMetrics.loadTime = 
      (this.performanceMetrics.loadTime + loadTime) / 2;
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear disk cache
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => 
        key.startsWith(PhotoPerformanceService.CACHE_KEY_PREFIX)
      );

      await AsyncStorage.multiRemove(cacheKeys);

      // Reset metrics
      this.cacheHits = 0;
      this.cacheMisses = 0;
      this.performanceMetrics.cacheHitRate = 0;

      console.log('Photo cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear photo cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): object {
    return {
      memoryCacheSize: this.memoryCache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: this.performanceMetrics.cacheHitRate,
      averageLoadTime: this.performanceMetrics.loadTime,
      averageThumbnailTime: this.performanceMetrics.thumbnailGenerationTime,
    };
  }

  /**
   * Optimize batch of photos
   */
  async optimizeBatch(
    photoUrls: string[],
    options: PhotoOptimizationOptions = {}
  ): Promise<string[]> {
    const batchSize = 5; // Process in batches to avoid overwhelming the system
    const results: string[] = [];

    for (let i = 0; i < photoUrls.length; i += batchSize) {
      const batch = photoUrls.slice(i, i + batchSize);
      const batchPromises = batch.map(url => this.optimizePhoto(url, options));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.warn(`Failed to optimize photo ${batch[index]}:`, result.reason);
            results.push(batch[index]); // Use original URL as fallback
          }
        });
      } catch (error) {
        console.error('Batch optimization failed:', error);
        // Add original URLs as fallback
        results.push(...batch);
      }
    }

    return results;
  }

  /**
   * Save performance metrics to storage
   */
  private async saveMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        PhotoPerformanceService.METRICS_KEY,
        JSON.stringify(this.performanceMetrics)
      );
    } catch (error) {
      console.warn('Failed to save performance metrics:', error);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.memoryCache.clear();
    this.saveMetrics();
  }
}

// Export singleton instance
export const photoPerformanceService = new PhotoPerformanceService();
export default photoPerformanceService;