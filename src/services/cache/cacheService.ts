/**
 * Advanced Multi-Level Cache Service
 * Intelligent caching with predictive preloading and performance optimization
 */

import { HealthTip, UserProfile, UserProgress, UserEngagement } from '../../types';
import { storeData, getData, removeData, storeDataWithExpiration, getDataIfNotExpired, StorageOptions } from '../../utils/storage';

// Advanced cache configuration with multiple tiers
interface CacheLevel {
  name: 'memory' | 'disk' | 'network';
  maxSize: number; // in bytes
  ttl: number; // in minutes
  priority: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  totalRequests: number;
  averageResponseTime: number;
}

interface PredictiveCacheItem {
  data: any;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  accessPattern: number[];
  predictedNextAccess: number;
  importance: number;
  size: number;
}

const CACHE_LEVELS: CacheLevel[] = [
  { name: 'memory', maxSize: 50 * 1024 * 1024, ttl: 5, priority: 1 }, // 50MB, 5min
  { name: 'disk', maxSize: 200 * 1024 * 1024, ttl: 60, priority: 2 }, // 200MB, 1hr
  { name: 'network', maxSize: 100 * 1024 * 1024, ttl: 30, priority: 3 } // 100MB, 30min
];

const CACHE_DURATIONS = {
  HEALTH_TIPS: 60, // 1 hour
  USER_PROFILE: 30, // 30 minutes
  USER_PROGRESS: 15, // 15 minutes
  DAILY_TIPS: 1440, // 24 hours
  PERSONALIZED_CONTENT: 120, // 2 hours
  ANALYTICS_DATA: 180, // 3 hours
  PROGRESS_DATA: 10, // 10 minutes
  STREAK_DATA: 5, // 5 minutes
} as const;

export interface CachedHealthTip extends HealthTip {
  cachedAt: Date;
  viewCount: number;
}

export interface CachedUserData {
  profile: UserProfile;
  progress: UserProgress;
  lastSync: Date;
}

export interface OfflineAction {
  id: string;
  type: 'engagement' | 'progress_update' | 'profile_update' | 'analytics_batch' | 'log_batch';
  data: any;
  timestamp: Date;
  retryCount: number;
}

/**
 * Advanced Cache Service Class with Multi-Level Caching
 */
export class CacheService {
  private static instance: CacheService;
  private memoryCache: Map<string, PredictiveCacheItem>;
  private metrics: CacheMetrics;
  private cleanupTimer?: NodeJS.Timeout;
  private predictionTimer?: NodeJS.Timeout;
  private accessLog: Map<string, { count: number; lastAccess: number; avgResponseTime: number }>;

  private readonly CLEANUP_INTERVAL = 2 * 60 * 1000; // 2 minutes
  private readonly PREDICTION_INTERVAL = 10 * 60 * 1000; // 10 minutes
  private readonly PREDICTION_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.memoryCache = new Map();
    this.accessLog = new Map();
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      averageResponseTime: 0
    };
    
    this.startCleanupTimer();
    this.startPredictionTimer();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performAdvancedCleanup();
    }, this.CLEANUP_INTERVAL);
  }

  private startPredictionTimer(): void {
    this.predictionTimer = setInterval(() => {
      this.performPredictivePreloading();
    }, this.PREDICTION_INTERVAL);
  }

  private async performAdvancedCleanup(): Promise<void> {
    try {
      await this.cleanupExpiredMemoryItems();
      await this.optimizeMemoryCache();
      await this.updateAccessPatterns();
    } catch (error) {
      console.error('Error during advanced cleanup:', error);
    }
  }

  private async cleanupExpiredMemoryItems(): Promise<void> {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of Array.from(this.memoryCache.entries())) {
      const age = now - item.createdAt.getTime();
      const maxAge = CACHE_LEVELS[0].ttl * 60 * 1000; // Convert minutes to milliseconds
      
      if (age > maxAge) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.memoryCache.delete(key);
      this.metrics.evictions++;
    });
  }

  private async optimizeMemoryCache(): Promise<void> {
    const maxSize = CACHE_LEVELS[0].maxSize;
    let currentSize = 0;

    // Calculate current memory usage
    for (const [, item] of Array.from(this.memoryCache.entries())) {
      currentSize += item.size;
    }

    if (currentSize > maxSize) {
      // Use advanced eviction algorithm
      const sortedItems = Array.from(this.memoryCache.entries())
        .map(([key, item]) => ({
          key,
          item,
          score: this.calculateEvictionScore(item)
        }))
        .sort((a, b) => a.score - b.score);

      // Remove items until we're under 80% of max size
      const targetSize = maxSize * 0.8;
      let removedSize = 0;

      for (const { key, item } of sortedItems) {
        if (currentSize - removedSize <= targetSize) break;
        
        this.memoryCache.delete(key);
        removedSize += item.size;
        this.metrics.evictions++;
      }
    }
  }

  private calculateEvictionScore(item: PredictiveCacheItem): number {
    const now = Date.now();
    const age = now - item.createdAt.getTime();
    const timeSinceAccess = now - item.lastAccessed.getTime();
    const accessFrequency = item.accessCount / Math.max(age / (60 * 60 * 1000), 1); // per hour

    // Lower score = higher priority for eviction
    const ageScore = age / (24 * 60 * 60 * 1000); // Normalize to days
    const accessScore = 1 / (accessFrequency + 1);
    const recencyScore = timeSinceAccess / (60 * 60 * 1000); // Normalize to hours
    const importanceScore = 1 - item.importance;
    const sizeScore = item.size / (1024 * 1024); // Normalize to MB

    return (ageScore * 0.2) + (accessScore * 0.25) + (recencyScore * 0.25) + 
           (importanceScore * 0.2) + (sizeScore * 0.1);
  }

  private async updateAccessPatterns(): Promise<void> {
    const now = Date.now();
    
    for (const [, item] of Array.from(this.memoryCache.entries())) {
      // Update access pattern (keep last 24 hours)
      item.accessPattern = item.accessPattern.filter(
        timestamp => now - timestamp < this.PREDICTION_WINDOW
      );

      // Update predicted next access
      if (item.accessPattern.length > 1) {
        const intervals = [];
        for (let i = 1; i < item.accessPattern.length; i++) {
          intervals.push(item.accessPattern[i] - item.accessPattern[i - 1]);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        item.predictedNextAccess = item.lastAccessed.getTime() + avgInterval;
      }
    }
  }

  private async performPredictivePreloading(): Promise<void> {
    const now = Date.now();
    const preloadWindow = 5 * 60 * 1000; // 5 minutes

    for (const [key, item] of Array.from(this.memoryCache.entries())) {
      if (item.predictedNextAccess && 
          item.predictedNextAccess - now < preloadWindow && 
          item.predictedNextAccess > now) {
        
        // Boost importance for predicted items
        item.importance = Math.min(item.importance * 1.1, 1.0);
        
        // In a real implementation, this would trigger preloading of related data
        await this.preloadRelatedData(key);
      }
    }
  }

  private async preloadRelatedData(key: string): Promise<void> {
    // Implement predictive preloading logic based on key patterns
    try {
      if (key.includes('health_tips')) {
        // Preload related tips
        await this.preloadRelatedTips(key);
      } else if (key.includes('user_progress')) {
        // Preload related progress data
        await this.preloadProgressData(key);
      }
    } catch (error) {
      console.error('Error preloading related data:', error);
    }
  }

  private async preloadRelatedTips(key: string): Promise<void> {
    // Implementation would depend on tip categorization and user preferences
    // For now, this is a placeholder
  }

  private async preloadProgressData(key: string): Promise<void> {
    // Implementation would preload related progress metrics
    // For now, this is a placeholder
  }

  private calculateImportance(data: any, accessCount: number): number {
    // Calculate importance based on data type and access patterns
    let importance = 0.5; // Base importance

    // Boost importance for frequently accessed items
    importance += Math.min(accessCount / 10, 0.3);

    // Boost importance for user-specific data
    if (typeof data === 'object' && data.userId) {
      importance += 0.2;
    }

    // Boost importance for recent data
    if (typeof data === 'object' && data.createdAt) {
      const age = Date.now() - new Date(data.createdAt).getTime();
      const dayInMs = 24 * 60 * 60 * 1000;
      if (age < dayInMs) {
        importance += 0.1;
      }
    }

    return Math.min(importance, 1.0);
  }

  private updateAccessLog(key: string, responseTime: number): void {
    const existing = this.accessLog.get(key);
    
    if (existing) {
      const newCount = existing.count + 1;
      const newAvgResponseTime = (existing.avgResponseTime * existing.count + responseTime) / newCount;
      
      this.accessLog.set(key, {
        count: newCount,
        lastAccess: Date.now(),
        avgResponseTime: newAvgResponseTime
      });
    } else {
      this.accessLog.set(key, {
        count: 1,
        lastAccess: Date.now(),
        avgResponseTime: responseTime
      });
    }
  }

  /**
   * Advanced cache get with multi-level support
   */
  public async getAdvanced<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Check memory cache first
      const memoryItem = this.memoryCache.get(key);
      if (memoryItem) {
        const now = new Date();
        memoryItem.lastAccessed = now;
        memoryItem.accessCount++;
        memoryItem.accessPattern.push(now.getTime());
        
        this.metrics.hits++;
        const responseTime = Date.now() - startTime;
        this.updateAccessLog(key, responseTime);
        
        return memoryItem.data as T;
      }

      // Check persistent storage
      const persistentData = await getDataIfNotExpired<T>(key as any);
      if (persistentData) {
        // Promote to memory cache if frequently accessed
        const accessInfo = this.accessLog.get(key);
        if (accessInfo && accessInfo.count > 2) {
          await this.setAdvanced(key, persistentData, { level: 'memory' });
        }
        
        this.metrics.hits++;
        const responseTime = Date.now() - startTime;
        this.updateAccessLog(key, responseTime);
        
        return persistentData;
      }

      this.metrics.misses++;
      return null;
    } catch (error) {
      console.error('Error in advanced cache get:', error);
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * Advanced cache set with multi-level support
   */
  public async setAdvanced<T>(
    key: string, 
    data: T, 
    options: { 
      level?: 'memory' | 'disk';
      ttl?: number;
      importance?: number;
    } = {}
  ): Promise<void> {
    try {
      const now = new Date();
      const dataSize = JSON.stringify(data).length;
      const importance = options.importance || this.calculateImportance(data, 0);

      if (options.level === 'memory' || !options.level) {
        // Store in memory cache
        const item: PredictiveCacheItem = {
          data,
          createdAt: now,
          lastAccessed: now,
          accessCount: 1,
          accessPattern: [now.getTime()],
          predictedNextAccess: now.getTime() + (60 * 1000), // Predict access in 1 minute
          importance,
          size: dataSize
        };

        this.memoryCache.set(key, item);
      }

      // Also store in persistent storage for durability
      const storageOptions: StorageOptions = {
        tier: options.level === 'memory' ? 'hot' : 'warm',
        ttl: options.ttl ? options.ttl * 60 * 1000 : undefined, // Convert minutes to milliseconds
        priority: importance > 0.7 ? 'high' : importance > 0.4 ? 'medium' : 'low'
      };

      await storeDataWithExpiration(
        key as any, 
        data, 
        options.ttl || CACHE_DURATIONS.HEALTH_TIPS,
        storageOptions
      );
    } catch (error) {
      console.error('Error in advanced cache set:', error);
      throw error;
    }
  }

  /**
   * Intelligent cache warming
   */
  public async warmCache(keys: string[], dataLoader: (key: string) => Promise<any>): Promise<void> {
    const promises = keys.map(async key => {
      try {
        const data = await dataLoader(key);
        await this.setAdvanced(key, data, { level: 'memory', importance: 0.8 });
      } catch (error) {
        console.error(`Error warming cache for key ${key}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Pattern-based cache invalidation
   */
  public async invalidatePattern(pattern: RegExp): Promise<void> {
    // Invalidate memory cache
    const keysToDelete = Array.from(this.memoryCache.keys()).filter(key => pattern.test(key));
    keysToDelete.forEach(key => this.memoryCache.delete(key));

    // Invalidate persistent storage (would need to implement pattern matching in storage)
    // For now, we'll just clear related keys we know about
    if (pattern.source.includes('health_tips')) {
      await removeData('HEALTH_TIPS');
      await removeData('CACHED_TIPS');
    }
    if (pattern.source.includes('user')) {
      await removeData('USER_DATA');
      await removeData('USER_PROGRESS');
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  public async getAdvancedStats(): Promise<{
    memory: {
      items: number;
      size: number;
      hitRate: number;
      averageImportance: number;
    };
    persistent: {
      healthTipsCount: number;
      dailyTipsCount: number;
      offlineQueueCount: number;
      lastSync: Date | null;
    };
    performance: CacheMetrics;
    predictions: {
      totalPredictions: number;
      upcomingAccesses: number;
    };
  }> {
    try {
      // Memory cache stats
      let totalMemorySize = 0;
      let totalImportance = 0;
      
      for (const [, item] of Array.from(this.memoryCache.entries())) {
        totalMemorySize += item.size;
        totalImportance += item.importance;
      }

      const averageImportance = this.memoryCache.size > 0 ? totalImportance / this.memoryCache.size : 0;
      const hitRate = this.metrics.totalRequests > 0 ? (this.metrics.hits / this.metrics.totalRequests) * 100 : 0;

      // Persistent cache stats (legacy)
      const persistentStats = await this.getCacheStats();

      // Prediction stats
      const now = Date.now();
      const upcomingAccesses = Array.from(this.memoryCache.values())
        .filter(item => item.predictedNextAccess && item.predictedNextAccess > now && item.predictedNextAccess < now + (60 * 60 * 1000))
        .length;

      return {
        memory: {
          items: this.memoryCache.size,
          size: totalMemorySize,
          hitRate,
          averageImportance
        },
        persistent: persistentStats,
        performance: this.metrics,
        predictions: {
          totalPredictions: this.memoryCache.size,
          upcomingAccesses
        }
      };
    } catch (error) {
      console.error('Error getting advanced stats:', error);
      return {
        memory: { items: 0, size: 0, hitRate: 0, averageImportance: 0 },
        persistent: { healthTipsCount: 0, dailyTipsCount: 0, offlineQueueCount: 0, lastSync: null },
        performance: { hits: 0, misses: 0, evictions: 0, totalRequests: 0, averageResponseTime: 0 },
        predictions: { totalPredictions: 0, upcomingAccesses: 0 }
      };
    }
  }

  /**
   * Cleanup and destroy
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    if (this.predictionTimer) {
      clearInterval(this.predictionTimer);
    }
    this.memoryCache.clear();
    this.accessLog.clear();
  }

  /**
   * Cache health tips with intelligent storage
   */
  public async cacheHealthTips(tips: HealthTip[]): Promise<void> {
    try {
      const cachedTips: CachedHealthTip[] = tips.map(tip => ({
        ...tip,
        cachedAt: new Date(),
        viewCount: 0,
      }));

      await storeDataWithExpiration('HEALTH_TIPS', cachedTips, CACHE_DURATIONS.HEALTH_TIPS);
    } catch (error) {
      console.error('Error caching health tips:', error);
      throw new Error('Failed to cache health tips');
    }
  }

  /**
   * Get cached health tips
   */
  public async getCachedHealthTips(): Promise<CachedHealthTip[]> {
    try {
      const cachedTips = await getDataIfNotExpired<CachedHealthTip[]>('HEALTH_TIPS');
      return cachedTips || [];
    } catch (error) {
      console.error('Error getting cached health tips:', error);
      return [];
    }
  }

  /**
   * Cache daily tips for offline access
   */
  public async cacheDailyTips(tips: HealthTip[]): Promise<void> {
    try {
      const dailyTipsData = {
        tips,
        date: new Date().toDateString(),
        cachedAt: new Date(),
      };

      await storeDataWithExpiration('CACHED_TIPS', dailyTipsData, CACHE_DURATIONS.DAILY_TIPS);
    } catch (error) {
      console.error('Error caching daily tips:', error);
      throw new Error('Failed to cache daily tips');
    }
  }

  /**
   * Get cached daily tips
   */
  public async getCachedDailyTips(): Promise<HealthTip[]> {
    try {
      const cachedData = await getDataIfNotExpired<{
        tips: HealthTip[];
        date: string;
        cachedAt: Date;
      }>('CACHED_TIPS');

      if (!cachedData) {
        return [];
      }

      // Check if cached tips are for today
      const today = new Date().toDateString();
      if (cachedData.date !== today) {
        await removeData('CACHED_TIPS');
        return [];
      }

      return cachedData.tips;
    } catch (error) {
      console.error('Error getting cached daily tips:', error);
      return [];
    }
  }

  /**
   * Cache user data
   */
  public async cacheUserData(profile: UserProfile, progress: UserProgress): Promise<void> {
    try {
      const userData: CachedUserData = {
        profile,
        progress,
        lastSync: new Date(),
      };

      await storeDataWithExpiration('USER_DATA', userData, CACHE_DURATIONS.USER_PROFILE);
    } catch (error) {
      console.error('Error caching user data:', error);
      throw new Error('Failed to cache user data');
    }
  }

  /**
   * Get cached user data
   */
  public async getCachedUserData(): Promise<CachedUserData | null> {
    try {
      return await getDataIfNotExpired<CachedUserData>('USER_DATA');
    } catch (error) {
      console.error('Error getting cached user data:', error);
      return null;
    }
  }

  /**
   * Update tip view count
   */
  public async updateTipViewCount(tipId: string): Promise<void> {
    try {
      const cachedTips = await this.getCachedHealthTips();
      const updatedTips = cachedTips.map(tip => 
        tip.id === tipId 
          ? { ...tip, viewCount: tip.viewCount + 1 }
          : tip
      );

      await storeDataWithExpiration('HEALTH_TIPS', updatedTips, CACHE_DURATIONS.HEALTH_TIPS);
    } catch (error) {
      console.error('Error updating tip view count:', error);
    }
  }

  /**
   * Queue offline action
   */
  public async queueOfflineAction(
    type: OfflineAction['type'],
    data: any
  ): Promise<void> {
    try {
      const existingQueue = await getData<OfflineAction[]>('OFFLINE_QUEUE') || [];
      
      const newAction: OfflineAction = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: new Date(),
        retryCount: 0,
      };

      const updatedQueue = [...existingQueue, newAction];
      await storeData('OFFLINE_QUEUE', updatedQueue);
    } catch (error) {
      console.error('Error queuing offline action:', error);
      throw new Error('Failed to queue offline action');
    }
  }

  /**
   * Get offline action queue
   */
  public async getOfflineQueue(): Promise<OfflineAction[]> {
    try {
      return await getData<OfflineAction[]>('OFFLINE_QUEUE') || [];
    } catch (error) {
      console.error('Error getting offline queue:', error);
      return [];
    }
  }

  /**
   * Remove action from offline queue
   */
  public async removeFromOfflineQueue(actionId: string): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const updatedQueue = queue.filter(action => action.id !== actionId);
      await storeData('OFFLINE_QUEUE', updatedQueue);
    } catch (error) {
      console.error('Error removing from offline queue:', error);
      throw new Error('Failed to remove from offline queue');
    }
  }

  /**
   * Update retry count for offline action
   */
  public async updateOfflineActionRetryCount(actionId: string): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const updatedQueue = queue.map(action => 
        action.id === actionId 
          ? { ...action, retryCount: action.retryCount + 1 }
          : action
      );
      await storeData('OFFLINE_QUEUE', updatedQueue);
    } catch (error) {
      console.error('Error updating retry count:', error);
      throw new Error('Failed to update retry count');
    }
  }

  /**
   * Clear expired cache entries
   */
  public async clearExpiredCache(): Promise<void> {
    try {
      // This is handled automatically by getDataIfNotExpired,
      // but we can also do a manual cleanup
      const keys = ['HEALTH_TIPS', 'USER_DATA', 'CACHED_TIPS'] as const;

      for (const key of keys) {
        await getDataIfNotExpired(key);
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public async getCacheStats(): Promise<{
    healthTipsCount: number;
    dailyTipsCount: number;
    offlineQueueCount: number;
    lastSync: Date | null;
  }> {
    try {
      const healthTips = await this.getCachedHealthTips();
      const dailyTips = await this.getCachedDailyTips();
      const offlineQueue = await this.getOfflineQueue();
      const userData = await this.getCachedUserData();

      return {
        healthTipsCount: healthTips.length,
        dailyTipsCount: dailyTips.length,
        offlineQueueCount: offlineQueue.length,
        lastSync: userData?.lastSync || null,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        healthTipsCount: 0,
        dailyTipsCount: 0,
        offlineQueueCount: 0,
        lastSync: null,
      };
    }
  }

  /**
   * Clear all cache data
   */
  public async clearAllCache(): Promise<void> {
    try {
      const cacheKeys = ['HEALTH_TIPS', 'USER_DATA', 'CACHED_TIPS', 'OFFLINE_QUEUE'] as const;

      for (const key of cacheKeys) {
        await removeData(key);
      }
    } catch (error) {
      console.error('Error clearing all cache:', error);
      throw new Error('Failed to clear all cache');
    }
  }

  /**
   * Preload essential data for offline use
   */
  public async preloadEssentialData(
    tips: HealthTip[],
    userProfile: UserProfile,
    userProgress: UserProgress
  ): Promise<void> {
    try {
      // Cache the most important data for offline access
      await Promise.all([
        this.cacheHealthTips(tips),
        this.cacheDailyTips(tips.slice(0, 5)), // Cache first 5 tips as daily tips
        this.cacheUserData(userProfile, userProgress),
      ]);
    } catch (error) {
      console.error('Error preloading essential data:', error);
      throw new Error('Failed to preload essential data');
    }
  }

  /**
   * Health check for cache service
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - try to set and get a test value
      await this.setAdvanced('health_check_test', 'test', { ttl: 1, level: 'memory', importance: 0.1 });
      const result = await this.getAdvanced('health_check_test');
      return result === 'test';
    } catch (error) {
      console.error('Cache service health check failed:', error);
      return false;
    }
  }

  /**
   * Simple get method (alias for getAdvanced for compatibility)
   */
  public async get<T>(key: string): Promise<T | null> {
    return this.getAdvanced<T>(key);
  }

  /**
   * Simple set method (alias for setAdvanced for compatibility)
   */
  public async set<T>(key: string, data: T, ttlMinutes?: number): Promise<void> {
    return this.setAdvanced(key, data, { ttl: ttlMinutes });
  }

  /**
   * Delete a specific cache key
   */
  public async delete(key: string): Promise<void> {
    try {
      // Remove from memory cache
      this.memoryCache.delete(key);
      
      // Remove from persistent storage
      await removeData(key as any);
    } catch (error) {
      console.error('Error deleting cache key:', error);
      throw new Error(`Failed to delete cache key: ${key}`);
    }
  }

  /**
   * Delete cache keys matching a pattern
   */
  public async deletePattern(pattern: string): Promise<void> {
    try {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      await this.invalidatePattern(regex);
    } catch (error) {
      console.error('Error deleting cache pattern:', error);
      throw new Error(`Failed to delete cache pattern: ${pattern}`);
    }
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();