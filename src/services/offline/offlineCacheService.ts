/**
 * Offline Cache Service
 * Comprehensive content caching and offline data management
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HealthTip } from '../../models/HealthTip';
import { UserProfile } from '../../models/UserProfile';
import { AuditLogService } from '../compliance/auditLogService';

// Cache Entry Interface
export interface CacheEntry<T = any> {
  id: string;
  data: T;
  timestamp: Date;
  expiresAt: Date;
  version: number;
  metadata?: {
    size: number;
    accessCount: number;
    lastAccessed: Date;
    priority: 'low' | 'medium' | 'high' | 'critical';
    tags: string[];
  };
}

// Cache Configuration
export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  defaultTTL: number; // Default time-to-live in milliseconds
  maxEntries: number; // Maximum number of entries
  enableCompression: boolean;
  enableEncryption: boolean;
  cleanupInterval: number; // Cleanup interval in milliseconds
}

// Cache Statistics
export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  lastCleanup: Date | null;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

// Cache Query Options
export interface CacheQueryOptions {
  includeExpired?: boolean;
  sortBy?: 'timestamp' | 'accessCount' | 'size';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  tags?: string[];
}

export class OfflineCacheService {
  private static instance: OfflineCacheService;
  private auditLogService: AuditLogService;
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;
  private accessLog: Map<string, { count: number; lastAccessed: Date }> = new Map();

  private constructor() {
    this.auditLogService = AuditLogService.getInstance();
    
    // Default configuration
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
      maxEntries: 1000,
      enableCompression: true,
      enableEncryption: false,
      cleanupInterval: 60 * 60 * 1000 // 1 hour
    };

    // Initialize statistics
    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
      lastCleanup: null,
      oldestEntry: null,
      newestEntry: null
    };
  }

  public static getInstance(): OfflineCacheService {
    if (!OfflineCacheService.instance) {
      OfflineCacheService.instance = new OfflineCacheService();
    }
    return OfflineCacheService.instance;
  }

  /**
   * Initialize cache service
   */
  public async initialize(): Promise<void> {
    try {
      // Load configuration
      await this.loadConfiguration();

      // Load statistics
      await this.loadStatistics();

      // Start cleanup timer
      this.startCleanupTimer();

      // Log initialization
      await this.auditLogService.logDataAccess({
        userId: 'system',
        action: 'CACHE_SERVICE_INITIALIZED',
        resourceType: 'CACHE_SERVICE',
        resourceId: 'initialization',
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          config: this.config,
          stats: this.stats
        }
      });

      console.log('Offline cache service initialized');
    } catch (error) {
      console.error('Failed to initialize cache service:', error);
      throw error;
    }
  }

  /**
   * Store data in cache
   */
  public async set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      tags?: string[];
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      const now = new Date();
      const ttl = options.ttl || this.config.defaultTTL;
      const expiresAt = new Date(now.getTime() + ttl);
      
      // Serialize data
      const serializedData = JSON.stringify(data);
      const dataSize = new Blob([serializedData]).size;

      // Check if we need to make space
      await this.ensureSpace(dataSize);

      const entry: CacheEntry<T> = {
        id: key,
        data,
        timestamp: now,
        expiresAt,
        version: 1,
        metadata: {
          size: dataSize,
          accessCount: 0,
          lastAccessed: now,
          priority: options.priority || 'medium',
          tags: options.tags || []
        }
      };

      // Store entry
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(entry));

      // Update statistics
      this.stats.totalEntries++;
      this.stats.totalSize += dataSize;
      this.stats.newestEntry = now;
      if (!this.stats.oldestEntry) {
        this.stats.oldestEntry = now;
      }

      await this.saveStatistics();

      // Log cache set
      await this.auditLogService.logDataAccess({
        userId: 'system',
        action: 'CACHE_ENTRY_SET',
        resourceType: 'CACHE_ENTRY',
        resourceId: key,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          size: dataSize,
          ttl,
          priority: options.priority,
          tags: options.tags
        }
      });
    } catch (error) {
      console.error(`Failed to set cache entry ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get data from cache
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      const stored = await AsyncStorage.getItem(`cache_${key}`);
      if (!stored) {
        this.recordCacheMiss(key);
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(stored);
      
      // Check if expired
      if (entry.expiresAt < new Date()) {
        await this.delete(key);
        this.recordCacheMiss(key);
        return null;
      }

      // Update access statistics
      this.recordCacheHit(key);
      entry.metadata!.accessCount++;
      entry.metadata!.lastAccessed = new Date();

      // Update entry in storage
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(entry));

      return entry.data;
    } catch (error) {
      console.error(`Failed to get cache entry ${key}:`, error);
      this.recordCacheMiss(key);
      return null;
    }
  }

  /**
   * Check if key exists in cache
   */
  public async has(key: string): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(`cache_${key}`);
      if (!stored) return false;

      const entry: CacheEntry = JSON.parse(stored);
      
      // Check if expired
      if (entry.expiresAt < new Date()) {
        await this.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Failed to check cache entry ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete entry from cache
   */
  public async delete(key: string): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(`cache_${key}`);
      if (!stored) return false;

      const entry: CacheEntry = JSON.parse(stored);
      
      await AsyncStorage.removeItem(`cache_${key}`);

      // Update statistics
      this.stats.totalEntries--;
      this.stats.totalSize -= entry.metadata?.size || 0;
      await this.saveStatistics();

      // Log cache delete
      await this.auditLogService.logDataAccess({
        userId: 'system',
        action: 'CACHE_ENTRY_DELETED',
        resourceType: 'CACHE_ENTRY',
        resourceId: key,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          size: entry.metadata?.size || 0,
          reason: 'manual_delete'
        }
      });

      return true;
    } catch (error) {
      console.error(`Failed to delete cache entry ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  public async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      await AsyncStorage.multiRemove(cacheKeys);

      // Reset statistics
      this.stats = {
        totalEntries: 0,
        totalSize: 0,
        hitRate: 0,
        missRate: 0,
        evictionCount: 0,
        lastCleanup: new Date(),
        oldestEntry: null,
        newestEntry: null
      };

      await this.saveStatistics();

      // Log cache clear
      await this.auditLogService.logDataAccess({
        userId: 'system',
        action: 'CACHE_CLEARED',
        resourceType: 'CACHE_SERVICE',
        resourceId: 'cache_clear',
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: { clearedEntries: cacheKeys.length }
      });

      console.log(`Cache cleared: ${cacheKeys.length} entries removed`);
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  public getStatistics(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Query cache entries
   */
  public async query(options: CacheQueryOptions = {}): Promise<CacheEntry[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      const entries: CacheEntry[] = [];
      
      for (const key of cacheKeys) {
        try {
          const stored = await AsyncStorage.getItem(key);
          if (stored) {
            const entry: CacheEntry = JSON.parse(stored);
            
            // Check expiration
            if (!options.includeExpired && entry.expiresAt < new Date()) {
              continue;
            }

            // Check tags filter
            if (options.tags && options.tags.length > 0) {
              const entryTags = entry.metadata?.tags || [];
              const hasMatchingTag = options.tags.some(tag => entryTags.includes(tag));
              if (!hasMatchingTag) continue;
            }

            entries.push(entry);
          }
        } catch (error) {
          console.error(`Failed to parse cache entry ${key}:`, error);
        }
      }

      // Sort entries
      if (options.sortBy) {
        entries.sort((a, b) => {
          let aValue: any, bValue: any;
          
          switch (options.sortBy) {
            case 'timestamp':
              aValue = a.timestamp.getTime();
              bValue = b.timestamp.getTime();
              break;
            case 'accessCount':
              aValue = a.metadata?.accessCount || 0;
              bValue = b.metadata?.accessCount || 0;
              break;
            case 'size':
              aValue = a.metadata?.size || 0;
              bValue = b.metadata?.size || 0;
              break;
            default:
              return 0;
          }

          const result = aValue - bValue;
          return options.sortOrder === 'desc' ? -result : result;
        });
      }

      // Apply limit
      if (options.limit && options.limit > 0) {
        return entries.slice(0, options.limit);
      }

      return entries;
    } catch (error) {
      console.error('Failed to query cache entries:', error);
      return [];
    }
  }

  /**
   * Cache health tips for offline access
   */
  public async cacheHealthTips(tips: HealthTip[]): Promise<void> {
    try {
      for (const tip of tips) {
        await this.set(`health_tip_${tip.id}`, tip, {
          ttl: this.config.defaultTTL,
          priority: 'high',
          tags: ['health_tip', tip.category]
        });
      }

      console.log(`Cached ${tips.length} health tips for offline access`);
    } catch (error) {
      console.error('Failed to cache health tips:', error);
      throw error;
    }
  }

  /**
   * Get cached health tips
   */
  public async getCachedHealthTips(category?: string): Promise<HealthTip[]> {
    try {
      const queryOptions: CacheQueryOptions = {
        tags: category ? ['health_tip', category] : ['health_tip'],
        sortBy: 'timestamp',
        sortOrder: 'desc'
      };

      const entries = await this.query(queryOptions);
      return entries.map(entry => entry.data as HealthTip);
    } catch (error) {
      console.error('Failed to get cached health tips:', error);
      return [];
    }
  }

  /**
   * Cache user profile for offline access
   */
  public async cacheUserProfile(profile: UserProfile): Promise<void> {
    try {
      await this.set(`user_profile_${profile.id}`, profile, {
        ttl: this.config.defaultTTL * 7, // 7 days for user profile
        priority: 'critical',
        tags: ['user_profile']
      });

      console.log(`Cached user profile for offline access`);
    } catch (error) {
      console.error('Failed to cache user profile:', error);
      throw error;
    }
  }

  /**
   * Get cached user profile
   */
  public async getCachedUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      return await this.get<UserProfile>(`user_profile_${userId}`);
    } catch (error) {
      console.error('Failed to get cached user profile:', error);
      return null;
    }
  }

  /**
   * Cleanup expired entries
   */
  public async cleanup(): Promise<void> {
    try {
      const now = new Date();
      const entries = await this.query({ includeExpired: true });
      let cleanedCount = 0;
      let reclaimedSize = 0;

      for (const entry of entries) {
        if (entry.expiresAt < now) {
          const size = entry.metadata?.size || 0;
          await this.delete(entry.id);
          cleanedCount++;
          reclaimedSize += size;
        }
      }

      this.stats.lastCleanup = now;
      await this.saveStatistics();

      // Log cleanup
      await this.auditLogService.logDataAccess({
        userId: 'system',
        action: 'CACHE_CLEANUP_COMPLETED',
        resourceType: 'CACHE_SERVICE',
        resourceId: 'cleanup',
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          cleanedEntries: cleanedCount,
          reclaimedSize,
          totalEntries: this.stats.totalEntries
        }
      });

      console.log(`Cache cleanup completed: ${cleanedCount} entries removed, ${reclaimedSize} bytes reclaimed`);
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
      throw error;
    }
  }

  // Private helper methods

  private async ensureSpace(requiredSize: number): Promise<void> {
    // Check if we have enough space
    if (this.stats.totalSize + requiredSize <= this.config.maxSize && 
        this.stats.totalEntries < this.config.maxEntries) {
      return;
    }

    // Evict entries to make space
    await this.evictEntries(requiredSize);
  }

  private async evictEntries(requiredSize: number): Promise<void> {
    try {
      // Get entries sorted by priority and access count (LRU)
      const entries = await this.query({
        sortBy: 'accessCount',
        sortOrder: 'asc'
      });

      let evictedSize = 0;
      let evictedCount = 0;

      for (const entry of entries) {
        if (entry.metadata?.priority === 'critical') {
          continue; // Don't evict critical entries
        }

        const entrySize = entry.metadata?.size || 0;
        await this.delete(entry.id);
        
        evictedSize += entrySize;
        evictedCount++;
        this.stats.evictionCount++;

        // Check if we've freed enough space
        if (evictedSize >= requiredSize && this.stats.totalEntries < this.config.maxEntries) {
          break;
        }
      }

      console.log(`Evicted ${evictedCount} entries, freed ${evictedSize} bytes`);
    } catch (error) {
      console.error('Failed to evict cache entries:', error);
      throw error;
    }
  }

  private recordCacheHit(key: string): void {
    const access = this.accessLog.get(key) || { count: 0, lastAccessed: new Date() };
    access.count++;
    access.lastAccessed = new Date();
    this.accessLog.set(key, access);

    // Update hit rate
    this.updateHitRate(true);
  }

  private recordCacheMiss(key: string): void {
    // Update miss rate
    this.updateHitRate(false);
  }

  private updateHitRate(isHit: boolean): void {
    const totalAccesses = this.stats.hitRate + this.stats.missRate + 1;
    
    if (isHit) {
      this.stats.hitRate = (this.stats.hitRate + 1) / totalAccesses;
      this.stats.missRate = this.stats.missRate / totalAccesses;
    } else {
      this.stats.hitRate = this.stats.hitRate / totalAccesses;
      this.stats.missRate = (this.stats.missRate + 1) / totalAccesses;
    }
  }

  private startCleanupTimer(): void {
    this.stopCleanupTimer();
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(console.error);
    }, this.config.cleanupInterval);
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('cache_config');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load cache configuration:', error);
    }
  }

  private async saveConfiguration(): Promise<void> {
    try {
      await AsyncStorage.setItem('cache_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save cache configuration:', error);
      throw error;
    }
  }

  private async loadStatistics(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('cache_stats');
      if (stored) {
        const stats = JSON.parse(stored);
        this.stats = {
          ...this.stats,
          ...stats,
          lastCleanup: stats.lastCleanup ? new Date(stats.lastCleanup) : null,
          oldestEntry: stats.oldestEntry ? new Date(stats.oldestEntry) : null,
          newestEntry: stats.newestEntry ? new Date(stats.newestEntry) : null
        };
      }
    } catch (error) {
      console.error('Failed to load cache statistics:', error);
    }
  }

  private async saveStatistics(): Promise<void> {
    try {
      await AsyncStorage.setItem('cache_stats', JSON.stringify(this.stats));
    } catch (error) {
      console.error('Failed to save cache statistics:', error);
    }
  }

  /**
   * Update cache configuration
   */
  public async updateConfiguration(newConfig: Partial<CacheConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...newConfig };
      await this.saveConfiguration();

      // Restart cleanup timer if interval changed
      if (newConfig.cleanupInterval !== undefined) {
        this.startCleanupTimer();
      }

      console.log('Cache configuration updated:', newConfig);
    } catch (error) {
      console.error('Failed to update cache configuration:', error);
      throw error;
    }
  }

  /**
   * Get cache configuration
   */
  public getConfiguration(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Service cleanup
   */
  public async serviceCleanup(): Promise<void> {
    try {
      this.stopCleanupTimer();
      await this.saveStatistics();
      await this.saveConfiguration();
      
      console.log('Offline cache service cleaned up');
    } catch (error) {
      console.error('Failed to cleanup cache service:', error);
    }
  }
}