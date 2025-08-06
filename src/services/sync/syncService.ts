/**
 * Synchronization Service
 * Handles offline/online data synchronization
 */

import NetInfo from '@react-native-community/netinfo';
import { CacheService, OfflineAction } from '../cache/cacheService';
import { storeData, getData } from '../../utils/storage';

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingActions: number;
  syncInProgress: boolean;
}

export interface SyncResult {
  success: boolean;
  syncedActions: number;
  failedActions: number;
  errors: string[];
}

/**
 * Sync Service Class
 */
export class SyncService {
  private static instance: SyncService;
  private cacheService: CacheService;
  private syncInProgress = false;
  private networkListeners: (() => void)[] = [];

  private constructor() {
    this.cacheService = CacheService.getInstance();
    this.setupNetworkListener();
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Setup network connectivity listener
   */
  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.syncInProgress) {
        // Auto-sync when connection is restored
        this.syncOfflineActions().catch(error => {
          console.error('Auto-sync failed:', error);
        });
      }
    });
  }

  /**
   * Check if device is online
   */
  public async isOnline(): Promise<boolean> {
    try {
      const netInfo = await NetInfo.fetch();
      return netInfo.isConnected === true;
    } catch (error) {
      console.error('Error checking network status:', error);
      return false;
    }
  }

  /**
   * Get current sync status
   */
  public async getSyncStatus(): Promise<SyncStatus> {
    try {
      const isOnline = await this.isOnline();
      const offlineQueue = await this.cacheService.getOfflineQueue();
      const lastSyncTime = await getData<Date>('LAST_SYNC');

      return {
        isOnline,
        lastSyncTime,
        pendingActions: offlineQueue.length,
        syncInProgress: this.syncInProgress,
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        isOnline: false,
        lastSyncTime: null,
        pendingActions: 0,
        syncInProgress: false,
      };
    }
  }

  /**
   * Sync offline actions with server
   */
  public async syncOfflineActions(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        syncedActions: 0,
        failedActions: 0,
        errors: ['Sync already in progress'],
      };
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      syncedActions: 0,
      failedActions: 0,
      errors: [],
    };

    try {
      const isOnline = await this.isOnline();
      if (!isOnline) {
        throw new Error('Device is offline');
      }

      const offlineQueue = await this.cacheService.getOfflineQueue();
      
      for (const action of offlineQueue) {
        try {
          await this.syncSingleAction(action);
          await this.cacheService.removeFromOfflineQueue(action.id);
          result.syncedActions++;
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          
          // Update retry count
          await this.cacheService.updateOfflineActionRetryCount(action.id);
          
          // Remove action if it has failed too many times
          if (action.retryCount >= 3) {
            await this.cacheService.removeFromOfflineQueue(action.id);
            result.errors.push(`Action ${action.id} failed after 3 retries`);
          }
          
          result.failedActions++;
        }
      }

      // Update last sync time
      await storeData('LAST_SYNC', new Date());

    } catch (error) {
      console.error('Sync process failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Sync a single offline action
   */
  private async syncSingleAction(action: OfflineAction): Promise<void> {
    // Mock API calls - replace with actual API integration
    switch (action.type) {
      case 'engagement':
        await this.syncEngagementAction(action);
        break;
      case 'progress_update':
        await this.syncProgressAction(action);
        break;
      case 'profile_update':
        await this.syncProfileAction(action);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Sync engagement action
   */
  private async syncEngagementAction(action: OfflineAction): Promise<void> {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In real implementation, this would be:
    // await apiService.recordEngagement(action.data);
    
    console.log('Synced engagement action:', action.data);
  }

  /**
   * Sync progress action
   */
  private async syncProgressAction(action: OfflineAction): Promise<void> {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In real implementation, this would be:
    // await apiService.updateProgress(action.data);
    
    console.log('Synced progress action:', action.data);
  }

  /**
   * Sync profile action
   */
  private async syncProfileAction(action: OfflineAction): Promise<void> {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In real implementation, this would be:
    // await apiService.updateProfile(action.data);
    
    console.log('Synced profile action:', action.data);
  }

  /**
   * Force sync all pending actions
   */
  public async forceSyncAll(): Promise<SyncResult> {
    try {
      const isOnline = await this.isOnline();
      if (!isOnline) {
        throw new Error('Cannot force sync while offline');
      }

      return await this.syncOfflineActions();
    } catch (error) {
      console.error('Force sync failed:', error);
      return {
        success: false,
        syncedActions: 0,
        failedActions: 0,
        errors: [error instanceof Error ? error.message : 'Force sync failed'],
      };
    }
  }

  /**
   * Clear sync data
   */
  public async clearSyncData(): Promise<void> {
    try {
      await this.cacheService.clearAllCache();
      await storeData('LAST_SYNC', null);
    } catch (error) {
      console.error('Error clearing sync data:', error);
      throw new Error('Failed to clear sync data');
    }
  }

  /**
   * Add network listener
   */
  public addNetworkListener(callback: (isOnline: boolean) => void): () => void {
    const unsubscribe = NetInfo.addEventListener(state => {
      callback(state.isConnected === true);
    });

    this.networkListeners.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Remove all network listeners
   */
  public removeAllNetworkListeners(): void {
    this.networkListeners.forEach(unsubscribe => unsubscribe());
    this.networkListeners = [];
  }

  /**
   * Handle offline action
   */
  public async handleOfflineAction(
    type: OfflineAction['type'],
    data: any
  ): Promise<void> {
    try {
      const isOnline = await this.isOnline();
      
      if (isOnline) {
        // If online, try to sync immediately
        try {
          const mockAction: OfflineAction = {
            id: `temp_${Date.now()}`,
            type,
            data,
            timestamp: new Date(),
            retryCount: 0,
          };
          
          await this.syncSingleAction(mockAction);
        } catch (error) {
          // If immediate sync fails, queue for later
          await this.cacheService.queueOfflineAction(type, data);
        }
      } else {
        // If offline, queue the action
        await this.cacheService.queueOfflineAction(type, data);
      }
    } catch (error) {
      console.error('Error handling offline action:', error);
      throw new Error('Failed to handle offline action');
    }
  }

  /**
   * Get sync statistics
   */
  public async getSyncStats(): Promise<{
    totalPendingActions: number;
    lastSyncTime: Date | null;
    syncSuccessRate: number;
    isOnline: boolean;
  }> {
    try {
      const status = await this.getSyncStatus();
      const cacheStats = await this.cacheService.getCacheStats();
      
      return {
        totalPendingActions: status.pendingActions,
        lastSyncTime: status.lastSyncTime,
        syncSuccessRate: 0.95, // Mock success rate - would be calculated from actual sync history
        isOnline: status.isOnline,
      };
    } catch (error) {
      console.error('Error getting sync stats:', error);
      return {
        totalPendingActions: 0,
        lastSyncTime: null,
        syncSuccessRate: 0,
        isOnline: false,
      };
    }
  }
}