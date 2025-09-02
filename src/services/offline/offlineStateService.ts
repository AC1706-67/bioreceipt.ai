/**
 * Offline State Service
 * Comprehensive offline state detection and management system
 */
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuditLogService } from '../compliance/auditLogService';

// Network State Interface
export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: NetInfoStateType;
  details: any;
  timestamp: Date;
}

// Offline Queue Item Interface
export interface OfflineQueueItem {
  id: string;
  type: 'api_call' | 'data_sync' | 'user_action' | 'analytics_event';
  action: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  metadata?: Record<string, any>;
}

// Offline Configuration
export interface OfflineConfig {
  maxQueueSize: number;
  maxRetries: number;
  retryDelay: number; // milliseconds
  syncInterval: number; // milliseconds
  enableAutoSync: boolean;
  enableOfflineMode: boolean;
  cacheExpirationTime: number; // milliseconds
}

// Sync Status
export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  queuedItemsCount: number;
  failedItemsCount: number;
  syncProgress: number; // 0-100
  errors: string[];
}

export class OfflineStateService {
  private static instance: OfflineStateService;
  private auditLogService: AuditLogService;
  private networkState: NetworkState;
  private offlineQueue: OfflineQueueItem[] = [];
  private syncStatus: SyncStatus;
  private config: OfflineConfig;
  private syncTimer?: NodeJS.Timeout;
  private listeners: Set<(state: NetworkState) => void> = new Set();
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();

  private constructor() {
    this.auditLogService = AuditLogService.getInstance();
    
    // Initialize network state
    this.networkState = {
      isConnected: false,
      isInternetReachable: null,
      type: NetInfoStateType.unknown,
      details: null,
      timestamp: new Date()
    };

    // Initialize sync status
    this.syncStatus = {
      isOnline: false,
      isSyncing: false,
      lastSyncTime: null,
      queuedItemsCount: 0,
      failedItemsCount: 0,
      syncProgress: 0,
      errors: []
    };

    // Default configuration
    this.config = {
      maxQueueSize: 1000,
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      syncInterval: 30000, // 30 seconds
      enableAutoSync: true,
      enableOfflineMode: true,
      cacheExpirationTime: 24 * 60 * 60 * 1000 // 24 hours
    };
  }

  public static getInstance(): OfflineStateService {
    if (!OfflineStateService.instance) {
      OfflineStateService.instance = new OfflineStateService();
    }
    return OfflineStateService.instance;
  }

  /**
   * Initialize offline state service
   */
  public async initialize(): Promise<void> {
    try {
      // Load configuration and queue from storage
      await this.loadConfiguration();
      await this.loadOfflineQueue();

      // Set up network state listener
      this.setupNetworkListener();

      // Get initial network state
      const initialState = await NetInfo.fetch();
      this.updateNetworkState(initialState);

      // Start sync timer if auto-sync is enabled
      if (this.config.enableAutoSync) {
        this.startSyncTimer();
      }

      // Log initialization
      await this.auditLogService.logDataAccess({
        userId: 'system',
        action: 'OFFLINE_SERVICE_INITIALIZED',
        resourceType: 'OFFLINE_SERVICE',
        resourceId: 'initialization',
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          config: this.config,
          queueSize: this.offlineQueue.length,
          networkState: this.networkState
        }
      });

      console.log('Offline state service initialized');
    } catch (error) {
      console.error('Failed to initialize offline state service:', error);
      throw error;
    }
  }

  /**
   * Get current network state
   */
  public getNetworkState(): NetworkState {
    return { ...this.networkState };
  }

  /**
   * Get current sync status
   */
  public getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Check if device is online
   */
  public isOnline(): boolean {
    return this.networkState.isConnected && this.networkState.isInternetReachable !== false;
  }

  /**
   * Check if offline mode is enabled
   */
  public isOfflineModeEnabled(): boolean {
    return this.config.enableOfflineMode;
  }

  /**
   * Add item to offline queue
   */
  public async queueOfflineAction(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    try {
      // Check queue size limit
      if (this.offlineQueue.length >= this.config.maxQueueSize) {
        // Remove oldest low-priority items
        this.cleanupQueue();
      }

      const queueItem: OfflineQueueItem = {
        id: this.generateQueueItemId(),
        timestamp: new Date(),
        retryCount: 0,
        ...item
      };

      // Add to queue
      this.offlineQueue.push(queueItem);

      // Sort by priority and timestamp
      this.sortQueue();

      // Save queue to storage
      await this.saveOfflineQueue();

      // Update sync status
      this.updateSyncStatus();

      // Log queue action
      await this.auditLogService.logDataAccess({
        userId: item.userId || 'system',
        action: 'OFFLINE_ACTION_QUEUED',
        resourceType: 'OFFLINE_QUEUE',
        resourceId: queueItem.id,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          type: item.type,
          action: item.action,
          priority: item.priority,
          queueSize: this.offlineQueue.length
        }
      });

      // Try immediate sync if online
      if (this.isOnline() && !this.syncStatus.isSyncing) {
        this.syncOfflineQueue().catch(console.error);
      }

      return queueItem.id;
    } catch (error) {
      console.error('Failed to queue offline action:', error);
      throw error;
    }
  }

  /**
   * Remove item from offline queue
   */
  public async removeFromQueue(itemId: string): Promise<boolean> {
    try {
      const index = this.offlineQueue.findIndex(item => item.id === itemId);
      if (index === -1) {
        return false;
      }

      const removedItem = this.offlineQueue.splice(index, 1)[0];
      await this.saveOfflineQueue();
      this.updateSyncStatus();

      // Log removal
      await this.auditLogService.logDataAccess({
        userId: removedItem.userId || 'system',
        action: 'OFFLINE_ACTION_REMOVED',
        resourceType: 'OFFLINE_QUEUE',
        resourceId: itemId,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          type: removedItem.type,
          action: removedItem.action,
          queueSize: this.offlineQueue.length
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to remove item from queue:', error);
      return false;
    }
  }

  /**
   * Get offline queue items
   */
  public getOfflineQueue(): OfflineQueueItem[] {
    return [...this.offlineQueue];
  }

  /**
   * Sync offline queue
   */
  public async syncOfflineQueue(): Promise<void> {
    if (!this.isOnline() || this.syncStatus.isSyncing) {
      return;
    }

    try {
      this.syncStatus.isSyncing = true;
      this.syncStatus.syncProgress = 0;
      this.syncStatus.errors = [];
      this.notifySyncListeners();

      const itemsToSync = [...this.offlineQueue];
      let processedCount = 0;
      let successCount = 0;
      let failedCount = 0;

      for (const item of itemsToSync) {
        try {
          // Process the queued item
          const success = await this.processQueueItem(item);
          
          if (success) {
            // Remove from queue
            await this.removeFromQueue(item.id);
            successCount++;
          } else {
            // Increment retry count
            item.retryCount++;
            
            if (item.retryCount >= item.maxRetries) {
              // Move to failed items or remove
              await this.handleFailedItem(item);
              failedCount++;
            }
          }
        } catch (error) {
          console.error(`Failed to process queue item ${item.id}:`, error);
          this.syncStatus.errors.push(`Failed to process ${item.action}: ${error.message}`);
          
          item.retryCount++;
          if (item.retryCount >= item.maxRetries) {
            await this.handleFailedItem(item);
            failedCount++;
          }
        }

        processedCount++;
        this.syncStatus.syncProgress = (processedCount / itemsToSync.length) * 100;
        this.notifySyncListeners();

        // Small delay between items to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update sync status
      this.syncStatus.lastSyncTime = new Date();
      this.syncStatus.failedItemsCount = failedCount;
      this.updateSyncStatus();

      // Log sync completion
      await this.auditLogService.logDataAccess({
        userId: 'system',
        action: 'OFFLINE_SYNC_COMPLETED',
        resourceType: 'OFFLINE_SYNC',
        resourceId: 'sync_operation',
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          itemsProcessed: processedCount,
          successCount,
          failedCount,
          remainingQueueSize: this.offlineQueue.length
        }
      });

      console.log(`Offline sync completed: ${successCount} success, ${failedCount} failed`);
    } catch (error) {
      console.error('Failed to sync offline queue:', error);
      this.syncStatus.errors.push(`Sync failed: ${error.message}`);
    } finally {
      this.syncStatus.isSyncing = false;
      this.syncStatus.syncProgress = 100;
      this.notifySyncListeners();
    }
  }

  /**
   * Add network state listener
   */
  public addNetworkListener(listener: (state: NetworkState) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Add sync status listener
   */
  public addSyncListener(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  /**
   * Update offline configuration
   */
  public async updateConfiguration(newConfig: Partial<OfflineConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...newConfig };
      await this.saveConfiguration();

      // Restart sync timer if interval changed
      if (newConfig.syncInterval !== undefined || newConfig.enableAutoSync !== undefined) {
        this.stopSyncTimer();
        if (this.config.enableAutoSync) {
          this.startSyncTimer();
        }
      }

      console.log('Offline configuration updated:', newConfig);
    } catch (error) {
      console.error('Failed to update offline configuration:', error);
      throw error;
    }
  }

  /**
   * Get offline configuration
   */
  public getConfiguration(): OfflineConfig {
    return { ...this.config };
  }

  /**
   * Clear offline queue
   */
  public async clearOfflineQueue(): Promise<void> {
    try {
      const queueSize = this.offlineQueue.length;
      this.offlineQueue = [];
      await this.saveOfflineQueue();
      this.updateSyncStatus();

      // Log queue clear
      await this.auditLogService.logDataAccess({
        userId: 'system',
        action: 'OFFLINE_QUEUE_CLEARED',
        resourceType: 'OFFLINE_QUEUE',
        resourceId: 'queue_clear',
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: { clearedItemsCount: queueSize }
      });

      console.log(`Offline queue cleared: ${queueSize} items removed`);
    } catch (error) {
      console.error('Failed to clear offline queue:', error);
      throw error;
    }
  }

  // Private helper methods

  private setupNetworkListener(): void {
    NetInfo.addEventListener((state: NetInfoState) => {
      this.updateNetworkState(state);
    });
  }

  private updateNetworkState(state: NetInfoState): void {
    const wasOnline = this.isOnline();
    
    this.networkState = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      details: state.details,
      timestamp: new Date()
    };

    this.syncStatus.isOnline = this.isOnline();
    
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.networkState);
      } catch (error) {
        console.error('Network listener error:', error);
      }
    });

    // Trigger sync if came back online
    if (!wasOnline && this.isOnline() && this.offlineQueue.length > 0) {
      this.syncOfflineQueue().catch(console.error);
    }

    this.notifySyncListeners();
  }

  private updateSyncStatus(): void {
    this.syncStatus.queuedItemsCount = this.offlineQueue.length;
    this.notifySyncListeners();
  }

  private notifySyncListeners(): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(this.syncStatus);
      } catch (error) {
        console.error('Sync listener error:', error);
      }
    });
  }

  private async processQueueItem(item: OfflineQueueItem): Promise<boolean> {
    try {
      // This would be implemented based on the specific action type
      // For now, we'll simulate processing
      console.log(`Processing queue item: ${item.action}`);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate success/failure based on retry count
      const successRate = Math.max(0.7, 1 - (item.retryCount * 0.2));
      return Math.random() < successRate;
    } catch (error) {
      console.error(`Failed to process queue item ${item.id}:`, error);
      return false;
    }
  }

  private async handleFailedItem(item: OfflineQueueItem): Promise<void> {
    try {
      // Log failed item
      await this.auditLogService.logDataAccess({
        userId: item.userId || 'system',
        action: 'OFFLINE_ACTION_FAILED',
        resourceType: 'OFFLINE_QUEUE',
        resourceId: item.id,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: false,
        details: {
          type: item.type,
          action: item.action,
          retryCount: item.retryCount,
          maxRetries: item.maxRetries
        }
      });

      // Remove from queue
      await this.removeFromQueue(item.id);
    } catch (error) {
      console.error('Failed to handle failed item:', error);
    }
  }

  private cleanupQueue(): void {
    // Remove oldest low-priority items
    const lowPriorityItems = this.offlineQueue
      .filter(item => item.priority === 'low')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (lowPriorityItems.length > 0) {
      const itemToRemove = lowPriorityItems[0];
      const index = this.offlineQueue.indexOf(itemToRemove);
      if (index !== -1) {
        this.offlineQueue.splice(index, 1);
      }
    }
  }

  private sortQueue(): void {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    this.offlineQueue.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by timestamp (older first)
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
  }

  private startSyncTimer(): void {
    this.stopSyncTimer();
    this.syncTimer = setInterval(() => {
      if (this.isOnline() && this.offlineQueue.length > 0) {
        this.syncOfflineQueue().catch(console.error);
      }
    }, this.config.syncInterval);
  }

  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  private generateQueueItemId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('offline_config');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load offline configuration:', error);
    }
  }

  private async saveConfiguration(): Promise<void> {
    try {
      await AsyncStorage.setItem('offline_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save offline configuration:', error);
      throw error;
    }
  }

  private async loadOfflineQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('offline_queue');
      if (stored) {
        const queue = JSON.parse(stored);
        this.offlineQueue = queue.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        this.sortQueue();
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  private async saveOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('offline_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
      throw error;
    }
  }

  /**
   * Cleanup on service termination
   */
  public async cleanup(): Promise<void> {
    try {
      this.stopSyncTimer();
      
      // Save current state
      await this.saveOfflineQueue();
      await this.saveConfiguration();

      // Clear listeners
      this.listeners.clear();
      this.syncListeners.clear();

      console.log('Offline state service cleaned up');
    } catch (error) {
      console.error('Failed to cleanup offline state service:', error);
    }
  }
}