/**
 * Offline Hook
 * React hook for offline functionality and synchronization
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  OfflineStateService, 
  NetworkState, 
  SyncStatus, 
  OfflineQueueItem 
} from '../services/offline/offlineStateService';
import { 
  OfflineCacheService, 
  CacheStats 
} from '../services/offline/offlineCacheService';
import { HealthTip } from '../models/HealthTip';
import { UserProfile } from '../models/UserProfile';

interface UseOfflineOptions {
  enableAutoSync?: boolean;
  enableCaching?: boolean;
  syncOnReconnect?: boolean;
  userId?: string;
}

interface UseOfflineReturn {
  // Network state
  isOnline: boolean;
  networkState: NetworkState;
  
  // Sync status
  syncStatus: SyncStatus;
  isSyncing: boolean;
  
  // Cache statistics
  cacheStats: CacheStats;
  
  // Actions
  queueOfflineAction: (action: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>) => Promise<string>;
  syncNow: () => Promise<void>;
  clearOfflineQueue: () => Promise<void>;
  
  // Cache actions
  cacheHealthTips: (tips: HealthTip[]) => Promise<void>;
  getCachedHealthTips: (category?: string) => Promise<HealthTip[]>;
  cacheUserProfile: (profile: UserProfile) => Promise<void>;
  getCachedUserProfile: (userId: string) => Promise<UserProfile | null>;
  clearCache: () => Promise<void>;
  
  // Utilities
  isOfflineModeEnabled: boolean;
  queuedItemsCount: number;
  canPerformAction: (requiresNetwork?: boolean) => boolean;
}

export const useOffline = (options: UseOfflineOptions = {}): UseOfflineReturn => {
  const {
    enableAutoSync = true,
    enableCaching = true,
    syncOnReconnect = true,
    userId
  } = options;

  const offlineStateService = OfflineStateService.getInstance();
  const offlineCacheService = OfflineCacheService.getInstance();
  
  // State
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: false,
    isInternetReachable: null,
    type: 'unknown' as any,
    details: null,
    timestamp: new Date()
  });
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    lastSyncTime: null,
    queuedItemsCount: 0,
    failedItemsCount: 0,
    syncProgress: 0,
    errors: []
  });
  
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
    missRate: 0,
    evictionCount: 0,
    lastCleanup: null,
    oldestEntry: null,
    newestEntry: null
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const initializationRef = useRef(false);

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      if (initializationRef.current) return;
      initializationRef.current = true;

      try {
        // Initialize offline state service
        await offlineStateService.initialize();
        
        // Initialize cache service if enabled
        if (enableCaching) {
          await offlineCacheService.initialize();
        }

        // Get initial states
        setNetworkState(offlineStateService.getNetworkState());
        setSyncStatus(offlineStateService.getSyncStatus());
        
        if (enableCaching) {
          setCacheStats(offlineCacheService.getStatistics());
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize offline services:', error);
      }
    };

    initializeServices();
  }, [enableCaching]);

  // Set up network state listener
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribeNetwork = offlineStateService.addNetworkListener((state) => {
      setNetworkState(state);
    });

    return unsubscribeNetwork;
  }, [isInitialized]);

  // Set up sync status listener
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribeSync = offlineStateService.addSyncListener((status) => {
      setSyncStatus(status);
    });

    return unsubscribeSync;
  }, [isInitialized]);

  // Update cache stats periodically
  useEffect(() => {
    if (!isInitialized || !enableCaching) return;

    const updateCacheStats = () => {
      setCacheStats(offlineCacheService.getStatistics());
    };

    // Update immediately
    updateCacheStats();

    // Update every 30 seconds
    const interval = setInterval(updateCacheStats, 30000);

    return () => clearInterval(interval);
  }, [isInitialized, enableCaching]);

  // Configure auto-sync
  useEffect(() => {
    if (!isInitialized) return;

    const updateConfig = async () => {
      try {
        await offlineStateService.updateConfiguration({
          enableAutoSync
        });
      } catch (error) {
        console.error('Failed to update offline configuration:', error);
      }
    };

    updateConfig();
  }, [isInitialized, enableAutoSync]);

  // Queue offline action
  const queueOfflineAction = useCallback(async (
    action: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<string> => {
    try {
      return await offlineStateService.queueOfflineAction({
        ...action,
        userId: action.userId || userId
      });
    } catch (error) {
      console.error('Failed to queue offline action:', error);
      throw error;
    }
  }, [userId]);

  // Sync now
  const syncNow = useCallback(async (): Promise<void> => {
    try {
      await offlineStateService.syncOfflineQueue();
    } catch (error) {
      console.error('Failed to sync offline queue:', error);
      throw error;
    }
  }, []);

  // Clear offline queue
  const clearOfflineQueue = useCallback(async (): Promise<void> => {
    try {
      await offlineStateService.clearOfflineQueue();
    } catch (error) {
      console.error('Failed to clear offline queue:', error);
      throw error;
    }
  }, []);

  // Cache health tips
  const cacheHealthTips = useCallback(async (tips: HealthTip[]): Promise<void> => {
    if (!enableCaching) return;
    
    try {
      await offlineCacheService.cacheHealthTips(tips);
    } catch (error) {
      console.error('Failed to cache health tips:', error);
      throw error;
    }
  }, [enableCaching]);

  // Get cached health tips
  const getCachedHealthTips = useCallback(async (category?: string): Promise<HealthTip[]> => {
    if (!enableCaching) return [];
    
    try {
      return await offlineCacheService.getCachedHealthTips(category);
    } catch (error) {
      console.error('Failed to get cached health tips:', error);
      return [];
    }
  }, [enableCaching]);

  // Cache user profile
  const cacheUserProfile = useCallback(async (profile: UserProfile): Promise<void> => {
    if (!enableCaching) return;
    
    try {
      await offlineCacheService.cacheUserProfile(profile);
    } catch (error) {
      console.error('Failed to cache user profile:', error);
      throw error;
    }
  }, [enableCaching]);

  // Get cached user profile
  const getCachedUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!enableCaching) return null;
    
    try {
      return await offlineCacheService.getCachedUserProfile(userId);
    } catch (error) {
      console.error('Failed to get cached user profile:', error);
      return null;
    }
  }, [enableCaching]);

  // Clear cache
  const clearCache = useCallback(async (): Promise<void> => {
    if (!enableCaching) return;
    
    try {
      await offlineCacheService.clear();
      setCacheStats(offlineCacheService.getStatistics());
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }, [enableCaching]);

  // Check if action can be performed
  const canPerformAction = useCallback((requiresNetwork: boolean = true): boolean => {
    if (!requiresNetwork) return true;
    return networkState.isConnected && networkState.isInternetReachable !== false;
  }, [networkState]);

  // Derived values
  const isOnline = networkState.isConnected && networkState.isInternetReachable !== false;
  const isSyncing = syncStatus.isSyncing;
  const isOfflineModeEnabled = offlineStateService.isOfflineModeEnabled();
  const queuedItemsCount = syncStatus.queuedItemsCount;

  return {
    // Network state
    isOnline,
    networkState,
    
    // Sync status
    syncStatus,
    isSyncing,
    
    // Cache statistics
    cacheStats,
    
    // Actions
    queueOfflineAction,
    syncNow,
    clearOfflineQueue,
    
    // Cache actions
    cacheHealthTips,
    getCachedHealthTips,
    cacheUserProfile,
    getCachedUserProfile,
    clearCache,
    
    // Utilities
    isOfflineModeEnabled,
    queuedItemsCount,
    canPerformAction
  };
};

// Hook for offline-aware API calls
export const useOfflineAPI = <T>(
  apiCall: () => Promise<T>,
  options: {
    cacheKey?: string;
    fallbackData?: T;
    queueOnFailure?: boolean;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
  } = {}
) => {
  const { 
    isOnline, 
    queueOfflineAction, 
    getCachedHealthTips,
    cacheHealthTips 
  } = useOffline({ userId: options.userId });
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeCall = useCallback(async (): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      if (isOnline) {
        // Online: make API call
        const result = await apiCall();
        setData(result);
        
        // Cache result if it's health tips
        if (options.cacheKey && Array.isArray(result)) {
          await cacheHealthTips(result as any);
        }
        
        return result;
      } else {
        // Offline: try to get cached data
        if (options.cacheKey) {
          const cachedData = await getCachedHealthTips();
          if (cachedData.length > 0) {
            setData(cachedData as any);
            return cachedData as any;
          }
        }

        // Queue for later if requested
        if (options.queueOnFailure) {
          await queueOfflineAction({
            type: 'api_call',
            action: 'api_retry',
            data: { cacheKey: options.cacheKey },
            maxRetries: 3,
            priority: options.priority || 'medium',
            userId: options.userId
          });
        }

        // Return fallback data
        if (options.fallbackData) {
          setData(options.fallbackData);
          return options.fallbackData;
        }

        throw new Error('No internet connection and no cached data available');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      // Try fallback data on error
      if (options.fallbackData) {
        setData(options.fallbackData);
        return options.fallbackData;
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [isOnline, apiCall, options, queueOfflineAction, getCachedHealthTips, cacheHealthTips]);

  return {
    data,
    loading,
    error,
    execute: executeCall,
    refetch: executeCall
  };
};

// Hook for offline queue management
export const useOfflineQueue = (userId?: string) => {
  const { syncStatus, queueOfflineAction, syncNow, clearOfflineQueue } = useOffline({ userId });

  const queueUserAction = useCallback(async (
    action: string,
    data: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) => {
    return await queueOfflineAction({
      type: 'user_action',
      action,
      data,
      maxRetries: 3,
      priority,
      userId
    });
  }, [queueOfflineAction, userId]);

  const queueAnalyticsEvent = useCallback(async (
    eventType: string,
    eventData: any
  ) => {
    return await queueOfflineAction({
      type: 'analytics_event',
      action: eventType,
      data: eventData,
      maxRetries: 5,
      priority: 'low',
      userId
    });
  }, [queueOfflineAction, userId]);

  const queueDataSync = useCallback(async (
    syncType: string,
    syncData: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'high'
  ) => {
    return await queueOfflineAction({
      type: 'data_sync',
      action: syncType,
      data: syncData,
      maxRetries: 3,
      priority,
      userId
    });
  }, [queueOfflineAction, userId]);

  return {
    syncStatus,
    queueUserAction,
    queueAnalyticsEvent,
    queueDataSync,
    syncNow,
    clearOfflineQueue,
    hasQueuedItems: syncStatus.queuedItemsCount > 0,
    hasSyncErrors: syncStatus.errors.length > 0
  };
};