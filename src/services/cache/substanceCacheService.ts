/**
 * Substance Cache Service - Performance Optimizations for Custom Substance Addition
 * Implements optimistic updates, intelligent caching, and performance monitoring
 */

import { Database } from '../../config/supabase';
import { storeData, getData, removeData, storeDataWithExpiration, getDataIfNotExpired } from '../../utils/storage';

type Substance = Database['public']['Tables']['substances']['Row'] & {
  substance_categories: { id: string; name: string };
};

interface SubstanceCacheMetrics {
  cacheHits: number;
  cacheMisses: number;
  optimisticUpdates: number;
  invalidations: number;
  averageLoadTime: number;
  lastRefresh: Date;
}

interface CachedSubstanceData {
  substances: Substance[];
  timestamp: number;
  version: string;
  userSpecific: boolean;
}

interface OptimisticUpdate {
  id: string;
  substance: Substance;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

class SubstanceCacheService {
  private static instance: SubstanceCacheService;
  private memoryCache: Map<string, CachedSubstanceData> = new Map();
  private optimisticUpdates: Map<string, OptimisticUpdate> = new Map();
  private metrics: SubstanceCacheMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    optimisticUpdates: 0,
    invalidations: 0,
    averageLoadTime: 0,
    lastRefresh: new Date(),
  };
  
  private readonly CACHE_KEYS = {
    ALL_SUBSTANCES: 'substances_all',
    USER_SUBSTANCES: 'substances_user_',
    CATEGORIES: 'substance_categories',
    SEARCH_RESULTS: 'substance_search_',
  };
  
  private readonly CACHE_DURATION = {
    SUBSTANCES: 30 * 60 * 1000, // 30 minutes
    SEARCH_RESULTS: 5 * 60 * 1000, // 5 minutes
    CATEGORIES: 60 * 60 * 1000, // 1 hour
  };

  public static getInstance(): SubstanceCacheService {
    if (!SubstanceCacheService.instance) {
      SubstanceCacheService.instance = new SubstanceCacheService();
    }
    return SubstanceCacheService.instance;
  }

  /**
   * Get cached substances with fallback to storage
   */
  async getCachedSubstances(userId?: string): Promise<Substance[] | null> {
    const startTime = Date.now();
    const cacheKey = userId ? `${this.CACHE_KEYS.USER_SUBSTANCES}${userId}` : this.CACHE_KEYS.ALL_SUBSTANCES;
    
    try {
      // Check memory cache first
      const memoryData = this.memoryCache.get(cacheKey);
      if (memoryData && this.isValidCache(memoryData)) {
        this.metrics.cacheHits++;
        return this.mergeWithOptimisticUpdates(memoryData.substances);
      }
      
      // Check persistent storage
      const storageData = await getDataIfNotExpired<CachedSubstanceData>(cacheKey);
      if (storageData && this.isValidCache(storageData)) {
        // Update memory cache
        this.memoryCache.set(cacheKey, storageData);
        this.metrics.cacheHits++;
        return this.mergeWithOptimisticUpdates(storageData.substances);
      }
      
      this.metrics.cacheMisses++;
      return null;
    } catch (error) {
      console.error('Error getting cached substances:', error);
      this.metrics.cacheMisses++;
      return null;
    } finally {
      this.updateAverageLoadTime(Date.now() - startTime);
    }
  }

  /**
   * Cache substances with intelligent storage strategy
   */
  async cacheSubstances(substances: Substance[], userId?: string): Promise<void> {
    const cacheKey = userId ? `${this.CACHE_KEYS.USER_SUBSTANCES}${userId}` : this.CACHE_KEYS.ALL_SUBSTANCES;
    const cacheData: CachedSubstanceData = {
      substances,
      timestamp: Date.now(),
      version: '1.0',
      userSpecific: !!userId,
    };
    
    try {
      // Store in memory cache
      this.memoryCache.set(cacheKey, cacheData);
      
      // Store in persistent storage with expiration
      await storeDataWithExpiration(
        cacheKey,
        cacheData,
        this.CACHE_DURATION.SUBSTANCES
      );
      
      this.metrics.lastRefresh = new Date();
    } catch (error) {
      console.error('Error caching substances:', error);
    }
  }

  /**
   * Add optimistic update for immediate UI feedback
   */
  addOptimisticUpdate(substance: Substance): string {
    const updateId = `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const optimisticUpdate: OptimisticUpdate = {
      id: updateId,
      substance,
      timestamp: Date.now(),
      status: 'pending',
    };
    
    this.optimisticUpdates.set(updateId, optimisticUpdate);
    this.metrics.optimisticUpdates++;
    
    // Auto-cleanup after 5 minutes
    setTimeout(() => {
      if (this.optimisticUpdates.has(updateId)) {
        this.optimisticUpdates.delete(updateId);
      }
    }, 5 * 60 * 1000);
    
    return updateId;
  }

  /**
   * Confirm optimistic update (substance was successfully created)
   */
  confirmOptimisticUpdate(updateId: string): void {
    const update = this.optimisticUpdates.get(updateId);
    if (update) {
      update.status = 'confirmed';
      // Keep confirmed updates for a short time for consistency
      setTimeout(() => {
        this.optimisticUpdates.delete(updateId);
      }, 30 * 1000);
    }
  }

  /**
   * Fail optimistic update (substance creation failed)
   */
  failOptimisticUpdate(updateId: string): void {
    const update = this.optimisticUpdates.get(updateId);
    if (update) {
      update.status = 'failed';
      // Remove failed updates immediately
      setTimeout(() => {
        this.optimisticUpdates.delete(updateId);
      }, 1000);
    }
  }

  /**
   * Invalidate cache after successful substance creation
   */
  async invalidateSubstanceCache(userId?: string): Promise<void> {
    try {
      const cacheKey = userId ? `${this.CACHE_KEYS.USER_SUBSTANCES}${userId}` : this.CACHE_KEYS.ALL_SUBSTANCES;
      
      // Remove from memory cache
      this.memoryCache.delete(cacheKey);
      
      // Remove from persistent storage
      await removeData(cacheKey);
      
      // Clear related search caches
      await this.clearSearchCache();
      
      this.metrics.invalidations++;
    } catch (error) {
      console.error('Error invalidating substance cache:', error);
    }
  }

  /**
   * Cache search results for faster subsequent searches
   */
  async cacheSearchResults(query: string, results: Substance[]): Promise<void> {
    if (query.length < 2) return; // Don't cache very short queries
    
    const cacheKey = `${this.CACHE_KEYS.SEARCH_RESULTS}${query.toLowerCase()}`;
    const cacheData: CachedSubstanceData = {
      substances: results,
      timestamp: Date.now(),
      version: '1.0',
      userSpecific: false,
    };
    
    try {
      await storeDataWithExpiration(
        cacheKey,
        cacheData,
        this.CACHE_DURATION.SEARCH_RESULTS
      );
    } catch (error) {
      console.error('Error caching search results:', error);
    }
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(query: string): Promise<Substance[] | null> {
    if (query.length < 2) return null;
    
    const cacheKey = `${this.CACHE_KEYS.SEARCH_RESULTS}${query.toLowerCase()}`;
    
    try {
      const cachedData = await getDataIfNotExpired<CachedSubstanceData>(cacheKey);
      if (cachedData && this.isValidCache(cachedData)) {
        this.metrics.cacheHits++;
        return this.mergeWithOptimisticUpdates(cachedData.substances);
      }
      
      this.metrics.cacheMisses++;
      return null;
    } catch (error) {
      console.error('Error getting cached search results:', error);
      return null;
    }
  }

  /**
   * Clear search cache
   */
  private async clearSearchCache(): Promise<void> {
    try {
      // This is a simplified approach - in a real implementation,
      // you might want to track search cache keys more systematically
      const searchKeys = Array.from(this.memoryCache.keys())
        .filter(key => key.startsWith(this.CACHE_KEYS.SEARCH_RESULTS));
      
      for (const key of searchKeys) {
        this.memoryCache.delete(key);
        await removeData(key);
      }
    } catch (error) {
      console.error('Error clearing search cache:', error);
    }
  }

  /**
   * Merge cached substances with optimistic updates
   */
  private mergeWithOptimisticUpdates(substances: Substance[]): Substance[] {
    const optimisticSubstances = Array.from(this.optimisticUpdates.values())
      .filter(update => update.status === 'pending' || update.status === 'confirmed')
      .map(update => update.substance);
    
    // Remove duplicates and merge
    const existingIds = new Set(substances.map(s => s.id));
    const newOptimisticSubstances = optimisticSubstances.filter(s => !existingIds.has(s.id));
    
    return [...substances, ...newOptimisticSubstances];
  }

  /**
   * Check if cached data is still valid
   */
  private isValidCache(cacheData: CachedSubstanceData): boolean {
    const age = Date.now() - cacheData.timestamp;
    return age < this.CACHE_DURATION.SUBSTANCES;
  }

  /**
   * Update average load time metric
   */
  private updateAverageLoadTime(loadTime: number): void {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    this.metrics.averageLoadTime = 
      (this.metrics.averageLoadTime * (totalRequests - 1) + loadTime) / totalRequests;
  }

  /**
   * Get cache performance metrics
   */
  getMetrics(): SubstanceCacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache hit ratio
   */
  getCacheHitRatio(): number {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return total > 0 ? this.metrics.cacheHits / total : 0;
  }

  /**
   * Clear all caches (useful for testing or troubleshooting)
   */
  async clearAllCaches(): Promise<void> {
    try {
      this.memoryCache.clear();
      this.optimisticUpdates.clear();
      
      // Clear persistent storage
      for (const key of Object.values(this.CACHE_KEYS)) {
        await removeData(key);
      }
      
      // Reset metrics
      this.metrics = {
        cacheHits: 0,
        cacheMisses: 0,
        optimisticUpdates: 0,
        invalidations: 0,
        averageLoadTime: 0,
        lastRefresh: new Date(),
      };
    } catch (error) {
      console.error('Error clearing all caches:', error);
    }
  }

  /**
   * Preload substances for better performance
   */
  async preloadSubstances(loadFunction: () => Promise<Substance[]>, userId?: string): Promise<void> {
    try {
      const substances = await loadFunction();
      await this.cacheSubstances(substances, userId);
    } catch (error) {
      console.error('Error preloading substances:', error);
    }
  }
}

export const substanceCacheService = SubstanceCacheService.getInstance();
export type { Substance, SubstanceCacheMetrics, OptimisticUpdate };