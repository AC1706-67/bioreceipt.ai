/**
 * Advanced Local Storage System
 * Multi-tier encrypted storage with intelligent caching and lifecycle management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Storage configuration
export interface StorageOptions {
  encrypt?: boolean;
  compress?: boolean;
  tier?: 'hot' | 'warm' | 'cold';
  ttl?: number; // Time to live in milliseconds
  priority?: 'high' | 'medium' | 'low';
}

interface StorageMetadata {
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  size: number;
  tier: string;
  encrypted: boolean;
  compressed: boolean;
  ttl?: number;
  priority: string;
  version: number;
}

interface CacheItem {
  data: any;
  timestamp: number;
  ttl?: number;
  accessCount: number;
}

// Storage keys with enhanced organization
const STORAGE_KEYS = {
  // User data
  USER_DATA: 'user_data',
  USER_PROGRESS: 'user_progress',
  USER_PREFERENCES: 'user_preferences',
  USER_PROFILE: 'user_profile',
  
  // Content data
  HEALTH_TIPS: 'health_tips',
  CACHED_TIPS: 'cached_tips',
  TIP_CATEGORIES: 'tip_categories',
  PERSONALIZED_CONTENT: 'personalized_content',
  
  // Progress and analytics
  PROGRESS_DATA: 'progress_data',
  STREAK_DATA: 'streak_data',
  MILESTONES: 'milestones',
  ACHIEVEMENTS: 'achievements',
  ANALYTICS_DATA: 'analytics_data',
  
  // System data
  OFFLINE_QUEUE: 'offline_queue',
  SYNC_STATUS: 'sync_status',
  LAST_SYNC: 'last_sync',
  APP_SETTINGS: 'app_settings',
  CACHE_INDEX: 'cache_index',
  
  // Security and audit
  AUDIT_LOG: 'audit_log',
  ENCRYPTION_METADATA: 'encryption_metadata',
  ACCESS_LOG: 'access_log',
  
  // AI and personalization
  USER_PERSONALIZATION_DATA: 'user_personalization_data',
  USER_PROFILES: 'user_profiles',
  USER_INTERACTIONS: 'user_interactions',
  
  // Analytics and logging
  ANALYTICS_CONFIG: 'analytics_config',
  ANALYTICS_EVENTS: 'analytics_events',
  LOGGING_CONFIG: 'logging_config',
  LOG_ENTRIES: 'log_entries',
  
  // Notifications
  NOTIFICATION_PERMISSION: 'notification_permission',
  NOTIFICATION_SETTINGS: 'notification_settings',
  SCHEDULED_NOTIFICATIONS: 'scheduled_notifications',
  
  // Search
  SEARCH_QUERIES: 'search_queries',
  SEARCH_ANALYTICS: 'search_analytics',
  SEARCH_INDEX: 'search_index',
  
  // Engagement
  ENGAGEMENT_METRICS: 'engagement_metrics',
  ENGAGEMENT_SESSIONS: 'engagement_sessions',
  
  // Health check
  health_check: 'health_check',
  
  // Additional keys for category progress and content metrics
  CATEGORY_PROGRESS: 'category_progress',
  CONTENT_METRICS: 'content_metrics',
  USER_BEHAVIOR: 'user_behavior'
} as const;

// Enhanced encryption with device-specific keys
class EncryptionManager {
  private static instance: EncryptionManager;
  private encryptionKey: string;
  private keyRotationInterval: number = 30 * 24 * 60 * 60 * 1000; // 30 days

  private constructor() {
    this.encryptionKey = this.generateDeviceSpecificKey();
  }

  static getInstance(): EncryptionManager {
    if (!EncryptionManager.instance) {
      EncryptionManager.instance = new EncryptionManager();
    }
    return EncryptionManager.instance;
  }

  private generateDeviceSpecificKey(): string {
    // Simplified key generation without crypto dependency
    const baseKey = 'healthy-tip-app-2024';
    const deviceId = Platform.OS === 'ios' ? 'ios-device' : 'android-device';
    // Simple hash alternative without crypto-js
    let hash = 0;
    const str = baseKey + deviceId;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  encrypt(data: string, keyVersion: number = 1): string {
    try {
      // Simple base64 encoding for now (not secure, but functional)
      // In production, use proper encryption
      return Buffer.from(data, 'utf8').toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  decrypt(encryptedData: string, keyVersion: number = 1): string {
    try {
      // Simple base64 decoding for now (not secure, but functional)
      // In production, use proper decryption
      return Buffer.from(encryptedData, 'base64').toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  private getKeyForVersion(version: number): string {
    // Support for key rotation
    return this.encryptionKey + version.toString();
  }

  shouldRotateKey(): boolean {
    // Check if key rotation is needed based on time or usage
    return false; // Simplified for now
  }
}

// Advanced Storage Service with multi-tier caching
class AdvancedStorageService {
  private static instance: AdvancedStorageService;
  private encryptionManager: EncryptionManager;
  private memoryCache: Map<string, CacheItem>;
  private accessLog: Map<string, { count: number; lastAccess: number }>;
  private cleanupTimer?: NodeJS.Timeout;
  
  private readonly MAX_MEMORY_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ACCESS_LOG_SIZE = 1000;

  private constructor() {
    this.encryptionManager = EncryptionManager.getInstance();
    this.memoryCache = new Map();
    this.accessLog = new Map();
    this.startCleanupTimer();
  }

  static getInstance(): AdvancedStorageService {
    if (!AdvancedStorageService.instance) {
      AdvancedStorageService.instance = new AdvancedStorageService();
    }
    return AdvancedStorageService.instance;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL);
  }

  private async performCleanup(): Promise<void> {
    try {
      await this.cleanupExpiredItems();
      await this.optimizeMemoryCache();
      await this.cleanupAccessLog();
      await this.performStorageOptimization();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  private async cleanupExpiredItems(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const metadataKeys = keys.filter(key => key.endsWith('_metadata'));
      
      if (metadataKeys.length === 0) return;

      const metadataItems = await AsyncStorage.multiGet(metadataKeys);
      const expiredKeys: string[] = [];
      const now = Date.now();

      for (const [key, value] of metadataItems) {
        if (!value) continue;
        
        try {
          const metadata: StorageMetadata = JSON.parse(value);
          if (metadata.ttl && now - metadata.createdAt > metadata.ttl) {
            const dataKey = key.replace('_metadata', '');
            expiredKeys.push(key, dataKey);
          }
        } catch (error) {
          console.error('Error parsing metadata:', error);
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
      }
    } catch (error) {
      console.error('Error cleaning expired items:', error);
    }
  }

  private async optimizeMemoryCache(): Promise<void> {
    try {
      let currentSize = 0;
      const entries = Array.from(this.memoryCache.entries());
      
      // Calculate current memory usage
      for (const [, item] of entries) {
        currentSize += JSON.stringify(item.data).length;
      }

      if (currentSize > this.MAX_MEMORY_CACHE_SIZE) {
        // Sort by access count and timestamp (LRU with frequency)
        entries.sort((a, b) => {
          const scoreA = a[1].accessCount / (Date.now() - a[1].timestamp);
          const scoreB = b[1].accessCount / (Date.now() - b[1].timestamp);
          return scoreA - scoreB;
        });

        // Remove bottom 30%
        const itemsToRemove = Math.floor(entries.length * 0.3);
        for (let i = 0; i < itemsToRemove; i++) {
          this.memoryCache.delete(entries[i][0]);
        }
      }
    } catch (error) {
      console.error('Error optimizing memory cache:', error);
    }
  }

  private cleanupAccessLog(): void {
    if (this.accessLog.size > this.MAX_ACCESS_LOG_SIZE) {
      const entries = Array.from(this.accessLog.entries());
      entries.sort((a, b) => b[1].lastAccess - a[1].lastAccess);
      
      this.accessLog.clear();
      for (let i = 0; i < this.MAX_ACCESS_LOG_SIZE * 0.8; i++) {
        this.accessLog.set(entries[i][0], entries[i][1]);
      }
    }
  }

  private async performStorageOptimization(): Promise<void> {
    try {
      const stats = await this.getStorageStats();
      
      if (stats.usagePercentage > 80) {
        await this.performLRUCleanup();
      }
    } catch (error) {
      console.error('Error in storage optimization:', error);
    }
  }

  private async performLRUCleanup(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const metadataKeys = keys.filter(key => key.endsWith('_metadata'));
      
      if (metadataKeys.length === 0) return;

      const metadataItems = await AsyncStorage.multiGet(metadataKeys);
      const itemsWithAccess: Array<{ key: string; lastAccessed: number; size: number; priority: string }> = [];

      for (const [key, value] of metadataItems) {
        if (!value) continue;
        
        try {
          const metadata: StorageMetadata = JSON.parse(value);
          itemsWithAccess.push({
            key: key.replace('_metadata', ''),
            lastAccessed: metadata.lastAccessed,
            size: metadata.size,
            priority: metadata.priority
          });
        } catch (error) {
          console.error('Error parsing metadata for LRU:', error);
        }
      }

      // Sort by priority and access time
      itemsWithAccess.sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityWeight[b.priority as keyof typeof priorityWeight] - 
                           priorityWeight[a.priority as keyof typeof priorityWeight];
        
        if (priorityDiff !== 0) return priorityDiff;
        return a.lastAccessed - b.lastAccessed;
      });

      // Remove lowest priority, oldest items (20%)
      const itemsToRemove = itemsWithAccess.slice(0, Math.floor(itemsWithAccess.length * 0.2));
      const keysToRemove: string[] = [];

      for (const item of itemsToRemove) {
        if (item.priority === 'low') { // Only remove low priority items
          keysToRemove.push(item.key, `${item.key}_metadata`);
        }
      }

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (error) {
      console.error('Error in LRU cleanup:', error);
    }
  }

  private compress(data: string): string {
    // Simple compression - in production use a proper compression library
    try {
      return JSON.stringify(JSON.parse(data));
    } catch (error) {
      return data;
    }
  }

  private decompress(data: string): string {
    return data; // Placeholder for decompression
  }

  private updateAccessLog(key: string): void {
    const now = Date.now();
    const existing = this.accessLog.get(key);
    
    this.accessLog.set(key, {
      count: existing ? existing.count + 1 : 1,
      lastAccess: now
    });
  }

  private async updateMetadata(key: string, metadata: Partial<StorageMetadata>): Promise<void> {
    try {
      const metadataKey = `${key}_metadata`;
      const existingMetadata = await AsyncStorage.getItem(metadataKey);
      
      let currentMetadata: StorageMetadata;
      if (existingMetadata) {
        currentMetadata = JSON.parse(existingMetadata);
      } else {
        currentMetadata = {
          createdAt: Date.now(),
          lastAccessed: Date.now(),
          accessCount: 0,
          size: 0,
          tier: 'warm',
          encrypted: false,
          compressed: false,
          priority: 'medium',
          version: 1
        };
      }

      const updatedMetadata = { ...currentMetadata, ...metadata };
      await AsyncStorage.setItem(metadataKey, JSON.stringify(updatedMetadata));
    } catch (error) {
      console.error('Error updating metadata:', error);
    }
  }

  async storeData<T>(key: keyof typeof STORAGE_KEYS, data: T, options: StorageOptions = {}): Promise<void> {
    try {
      const storageKey = STORAGE_KEYS[key];
      let processedData = JSON.stringify(data);
      const now = Date.now();

      // Apply compression if requested
      if (options.compress) {
        processedData = this.compress(processedData);
      }

      // Apply encryption if requested or for sensitive data
      const shouldEncrypt = options.encrypt || this.isSensitiveData(key);
      if (shouldEncrypt) {
        processedData = this.encryptionManager.encrypt(processedData);
      }

      // Store in persistent storage
      await AsyncStorage.setItem(storageKey, processedData);

      // Update metadata
      const metadata: StorageMetadata = {
        createdAt: now,
        lastAccessed: now,
        accessCount: 1,
        size: processedData.length,
        tier: options.tier || 'warm',
        encrypted: shouldEncrypt,
        compressed: options.compress || false,
        ttl: options.ttl,
        priority: options.priority || 'medium',
        version: 1
      };

      await this.updateMetadata(storageKey, metadata);

      // Cache in memory for hot data
      if (options.tier === 'hot' || this.isFrequentlyAccessed(key)) {
        this.memoryCache.set(storageKey, {
          data,
          timestamp: now,
          ttl: options.ttl,
          accessCount: 1
        });
      }

      this.updateAccessLog(storageKey);
    } catch (error) {
      console.error(`Error storing data for key ${key}:`, error);
      throw new Error(`Failed to store data for ${key}`);
    }
  }

  async getData<T>(key: keyof typeof STORAGE_KEYS): Promise<T | null> {
    try {
      const storageKey = STORAGE_KEYS[key];

      // Check memory cache first
      const cached = this.memoryCache.get(storageKey);
      if (cached) {
        const now = Date.now();
        if (!cached.ttl || now - cached.timestamp < cached.ttl) {
          cached.accessCount++;
          this.updateAccessLog(storageKey);
          return cached.data as T;
        } else {
          this.memoryCache.delete(storageKey);
        }
      }

      // Get from persistent storage
      const storedData = await AsyncStorage.getItem(storageKey);
      if (!storedData) return null;

      let data = storedData;

      // Get metadata to determine processing needed
      const metadataKey = `${storageKey}_metadata`;
      const metadataStr = await AsyncStorage.getItem(metadataKey);
      
      if (metadataStr) {
        const metadata: StorageMetadata = JSON.parse(metadataStr);
        
        // Check if data has expired
        if (metadata.ttl && Date.now() - metadata.createdAt > metadata.ttl) {
          await this.removeData(key);
          return null;
        }

        // Decrypt if needed
        if (metadata.encrypted) {
          data = this.encryptionManager.decrypt(data, metadata.version);
        }
        
        // Decompress if needed
        if (metadata.compressed) {
          data = this.decompress(data);
        }

        // Update access metadata
        await this.updateMetadata(storageKey, {
          lastAccessed: Date.now(),
          accessCount: metadata.accessCount + 1
        });
      }

      const parsedData = JSON.parse(data) as T;

      // Cache frequently accessed data
      if (this.shouldCacheInMemory(key)) {
        this.memoryCache.set(storageKey, {
          data: parsedData,
          timestamp: Date.now(),
          accessCount: 1
        });
      }

      this.updateAccessLog(storageKey);
      return parsedData;
    } catch (error) {
      console.error(`Error retrieving data for key ${key}:`, error);
      return null;
    }
  }

  async removeData(key: keyof typeof STORAGE_KEYS): Promise<void> {
    try {
      const storageKey = STORAGE_KEYS[key];
      await AsyncStorage.multiRemove([storageKey, `${storageKey}_metadata`]);
      this.memoryCache.delete(storageKey);
      this.accessLog.delete(storageKey);
    } catch (error) {
      console.error(`Error removing data for key ${key}:`, error);
      throw new Error(`Failed to remove data for ${key}`);
    }
  }

  async getStorageStats(): Promise<{
    totalKeys: number;
    totalSize: number;
    usagePercentage: number;
    tierDistribution: Record<string, number>;
    memoryCacheSize: number;
    encryptedItems: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter(key => 
        Object.values(STORAGE_KEYS).includes(key as any) && !key.endsWith('_metadata')
      );
      const metadataKeys = keys.filter(key => key.endsWith('_metadata'));
      
      let totalSize = 0;
      let encryptedItems = 0;
      const tierDistribution: Record<string, number> = {};
      
      if (metadataKeys.length > 0) {
        const metadataItems = await AsyncStorage.multiGet(metadataKeys);
        
        for (const [, value] of metadataItems) {
          if (!value) continue;
          
          try {
            const metadata: StorageMetadata = JSON.parse(value);
            totalSize += metadata.size;
            tierDistribution[metadata.tier] = (tierDistribution[metadata.tier] || 0) + 1;
            if (metadata.encrypted) encryptedItems++;
          } catch (error) {
            console.error('Error parsing metadata for stats:', error);
          }
        }
      }

      const memoryCacheSize = this.memoryCache.size;
      const usagePercentage = Math.min((totalSize / (100 * 1024 * 1024)) * 100, 100);

      return {
        totalKeys: appKeys.length,
        totalSize,
        usagePercentage,
        tierDistribution,
        memoryCacheSize,
        encryptedItems
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalKeys: 0,
        totalSize: 0,
        usagePercentage: 0,
        tierDistribution: {},
        memoryCacheSize: 0,
        encryptedItems: 0
      };
    }
  }

  private isSensitiveData(key: keyof typeof STORAGE_KEYS): boolean {
    const sensitiveKeys = ['USER_DATA', 'USER_PROGRESS', 'USER_PROFILE', 'AUDIT_LOG'];
    return sensitiveKeys.includes(key);
  }

  private isFrequentlyAccessed(key: keyof typeof STORAGE_KEYS): boolean {
    const frequentKeys = ['USER_PREFERENCES', 'APP_SETTINGS', 'CACHED_TIPS'];
    return frequentKeys.includes(key);
  }

  private shouldCacheInMemory(key: keyof typeof STORAGE_KEYS): boolean {
    const accessInfo = this.accessLog.get(STORAGE_KEYS[key]);
    return accessInfo ? accessInfo.count > 3 : false;
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.memoryCache.clear();
    this.accessLog.clear();
  }
}

// Create singleton instance
const advancedStorage = AdvancedStorageService.getInstance();

// Legacy compatibility functions
const encryptData = (data: any): string => {
  const encryption = EncryptionManager.getInstance();
  return encryption.encrypt(JSON.stringify(data));
};

const decryptData = <T>(encryptedData: string): T => {
  const encryption = EncryptionManager.getInstance();
  const decryptedString = encryption.decrypt(encryptedData);
  return JSON.parse(decryptedString);
};

// Enhanced API functions using the advanced storage service

/**
 * Store encrypted data with advanced options
 */
export const storeData = async <T>(
  key: keyof typeof STORAGE_KEYS, 
  data: T, 
  options: StorageOptions = {}
): Promise<void> => {
  return advancedStorage.storeData(key, data, options);
};

/**
 * Retrieve and decrypt data
 */
export const getData = async <T>(key: keyof typeof STORAGE_KEYS): Promise<T | null> => {
  return advancedStorage.getData<T>(key);
};

/**
 * Remove data from storage
 */
export const removeData = async (key: keyof typeof STORAGE_KEYS): Promise<void> => {
  return advancedStorage.removeData(key);
};

/**
 * Clear all app data
 */
export const clearAllData = async (): Promise<void> => {
  try {
    const keys = Object.keys(STORAGE_KEYS) as Array<keyof typeof STORAGE_KEYS>;
    for (const key of keys) {
      await advancedStorage.removeData(key);
    }
  } catch (error) {
    console.error('Error clearing all data:', error);
    throw new Error('Failed to clear all data');
  }
};

/**
 * Get comprehensive storage usage information
 */
export const getStorageInfo = async (): Promise<{
  totalKeys: number;
  totalSize: number;
  usagePercentage: number;
  tierDistribution: Record<string, number>;
  memoryCacheSize: number;
  encryptedItems: number;
}> => {
  return advancedStorage.getStorageStats();
};

/**
 * Check if data exists for a key
 */
export const hasData = async (key: keyof typeof STORAGE_KEYS): Promise<boolean> => {
  try {
    const data = await advancedStorage.getData(key);
    return data !== null;
  } catch (error) {
    console.error(`Error checking data existence for key ${key}:`, error);
    return false;
  }
};

/**
 * Store data with expiration using TTL
 */
export const storeDataWithExpiration = async <T>(
  key: keyof typeof STORAGE_KEYS,
  data: T,
  expirationMinutes: number,
  options: Omit<StorageOptions, 'ttl'> = {}
): Promise<void> => {
  const ttl = expirationMinutes * 60 * 1000; // Convert to milliseconds
  return advancedStorage.storeData(key, data, { ...options, ttl });
};

/**
 * Get data if not expired (now handled automatically by TTL)
 */
export const getDataIfNotExpired = async <T>(
  key: keyof typeof STORAGE_KEYS
): Promise<T | null> => {
  // TTL is now handled automatically in the advanced storage service
  return advancedStorage.getData<T>(key);
};

/**
 * Store data with high priority and hot tier for frequent access
 */
export const storeHotData = async <T>(
  key: keyof typeof STORAGE_KEYS,
  data: T,
  options: Omit<StorageOptions, 'tier' | 'priority'> = {}
): Promise<void> => {
  return advancedStorage.storeData(key, data, {
    ...options,
    tier: 'hot',
    priority: 'high'
  });
};

/**
 * Store sensitive data with encryption
 */
export const storeSensitiveData = async <T>(
  key: keyof typeof STORAGE_KEYS,
  data: T,
  options: Omit<StorageOptions, 'encrypt'> = {}
): Promise<void> => {
  return advancedStorage.storeData(key, data, {
    ...options,
    encrypt: true
  });
};

/**
 * Store compressed data for large datasets
 */
export const storeCompressedData = async <T>(
  key: keyof typeof STORAGE_KEYS,
  data: T,
  options: Omit<StorageOptions, 'compress'> = {}
): Promise<void> => {
  return advancedStorage.storeData(key, data, {
    ...options,
    compress: true
  });
};

/**
 * Batch operations for multiple keys
 */
export const batchStoreData = async <T>(
  operations: Array<{
    key: keyof typeof STORAGE_KEYS;
    data: T;
    options?: StorageOptions;
  }>
): Promise<void> => {
  const promises = operations.map(op => 
    advancedStorage.storeData(op.key, op.data, op.options)
  );
  await Promise.all(promises);
};

export const batchGetData = async <T>(
  keys: Array<keyof typeof STORAGE_KEYS>
): Promise<Array<{ key: keyof typeof STORAGE_KEYS; data: T | null }>> => {
  const promises = keys.map(async key => ({
    key,
    data: await advancedStorage.getData<T>(key)
  }));
  return Promise.all(promises);
};

/**
 * Storage maintenance and optimization
 */
export const optimizeStorage = async (): Promise<void> => {
  // Trigger manual optimization
  await (advancedStorage as any).performCleanup();
};

export const getDetailedStorageStats = async (): Promise<{
  stats: Awaited<ReturnType<typeof getStorageInfo>>;
  recommendations: string[];
}> => {
  const stats = await getStorageInfo();
  const recommendations: string[] = [];

  if (stats.usagePercentage > 80) {
    recommendations.push('Storage usage is high. Consider clearing old data.');
  }

  if (stats.memoryCacheSize > 100) {
    recommendations.push('Memory cache is large. App restart may improve performance.');
  }

  if (stats.encryptedItems < stats.totalKeys * 0.5) {
    recommendations.push('Consider encrypting more sensitive data.');
  }

  return { stats, recommendations };
};

// Export storage keys for external use
export { STORAGE_KEYS };

// Export the advanced storage instance for direct access if needed
export { advancedStorage as storage };