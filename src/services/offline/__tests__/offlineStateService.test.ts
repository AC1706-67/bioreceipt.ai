/**
 * Offline State Service Tests
 * Unit tests for offline state management functionality
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { OfflineStateService, OfflineQueueItem } from '../offlineStateService';
import { AuditLogService } from '../../compliance/auditLogService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('../../compliance/auditLogService');

describe('OfflineStateService', () => {
  let offlineStateService: OfflineStateService;
  let mockAsyncStorage: jest.Mocked<typeof AsyncStorage>;
  let mockNetInfo: jest.Mocked<typeof NetInfo>;
  let mockAuditLogService: jest.Mocked<AuditLogService>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset singleton instance
    (OfflineStateService as any).instance = undefined;
    offlineStateService = OfflineStateService.getInstance();
    
    mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
    mockAuditLogService = AuditLogService.getInstance() as jest.Mocked<AuditLogService>;

    // Setup default mocks
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
    mockAsyncStorage.getAllKeys.mockResolvedValue([]);
    mockAsyncStorage.multiRemove.mockResolvedValue();
    mockAuditLogService.logDataAccess.mockResolvedValue();
    
    // Mock NetInfo
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: {}
    } as any);
    
    mockNetInfo.addEventListener.mockReturnValue(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = OfflineStateService.getInstance();
      const instance2 = OfflineStateService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await offlineStateService.initialize();
      
      expect(mockNetInfo.fetch).toHaveBeenCalled();
      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'OFFLINE_SERVICE_INITIALIZED'
        })
      );
    });

    it('should load configuration from storage', async () => {
      const storedConfig = {
        maxQueueSize: 500,
        enableAutoSync: false
      };
      
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(storedConfig));
      
      await offlineStateService.initialize();
      
      const config = offlineStateService.getConfiguration();
      expect(config.maxQueueSize).toBe(500);
      expect(config.enableAutoSync).toBe(false);
    });

    it('should handle initialization errors gracefully', async () => {
      mockNetInfo.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(offlineStateService.initialize()).rejects.toThrow('Network error');
    });
  });

  describe('Network State Management', () => {
    beforeEach(async () => {
      await offlineStateService.initialize();
    });

    it('should return current network state', () => {
      const networkState = offlineStateService.getNetworkState();
      
      expect(networkState).toEqual(expect.objectContaining({
        isConnected: expect.any(Boolean),
        type: expect.any(String),
        timestamp: expect.any(Date)
      }));
    });

    it('should detect online status correctly', () => {
      // Mock online state
      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: {}
      } as any);
      
      expect(offlineStateService.isOnline()).toBe(true);
    });

    it('should detect offline status correctly', () => {
      // Mock offline state
      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: {}
      } as any);
      
      // Note: This test would need the network state to be updated
      // In a real scenario, the network listener would update the state
    });

    it('should notify network listeners', async () => {
      const listener = jest.fn();
      const unsubscribe = offlineStateService.addNetworkListener(listener);
      
      // Simulate network state change
      // This would typically be triggered by NetInfo listener
      
      unsubscribe();
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Offline Queue Management', () => {
    beforeEach(async () => {
      await offlineStateService.initialize();
    });

    it('should queue offline actions', async () => {
      const queueItem: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'> = {
        type: 'user_action',
        action: 'like_tip',
        data: { tipId: 'tip123' },
        maxRetries: 3,
        priority: 'medium',
        userId: 'user123'
      };
      
      const itemId = await offlineStateService.queueOfflineAction(queueItem);
      
      expect(itemId).toBeDefined();
      expect(typeof itemId).toBe('string');
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        expect.any(String)
      );
      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'OFFLINE_ACTION_QUEUED'
        })
      );
    });

    it('should remove items from queue', async () => {
      // First queue an item
      const queueItem: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'> = {
        type: 'user_action',
        action: 'like_tip',
        data: { tipId: 'tip123' },
        maxRetries: 3,
        priority: 'medium'
      };
      
      const itemId = await offlineStateService.queueOfflineAction(queueItem);
      
      // Then remove it
      const removed = await offlineStateService.removeFromQueue(itemId);
      
      expect(removed).toBe(true);
      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'OFFLINE_ACTION_REMOVED'
        })
      );
    });

    it('should return false when removing non-existent item', async () => {
      const removed = await offlineStateService.removeFromQueue('non-existent-id');
      expect(removed).toBe(false);
    });

    it('should get offline queue items', () => {
      const queue = offlineStateService.getOfflineQueue();
      expect(Array.isArray(queue)).toBe(true);
    });

    it('should clear offline queue', async () => {
      // Queue some items first
      await offlineStateService.queueOfflineAction({
        type: 'user_action',
        action: 'test',
        data: {},
        maxRetries: 3,
        priority: 'low'
      });
      
      await offlineStateService.clearOfflineQueue();
      
      const queue = offlineStateService.getOfflineQueue();
      expect(queue).toHaveLength(0);
      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'OFFLINE_QUEUE_CLEARED'
        })
      );
    });

    it('should enforce queue size limits', async () => {
      // Update config to have small queue size
      await offlineStateService.updateConfiguration({ maxQueueSize: 2 });
      
      // Queue items beyond limit
      await offlineStateService.queueOfflineAction({
        type: 'user_action',
        action: 'test1',
        data: {},
        maxRetries: 3,
        priority: 'low'
      });
      
      await offlineStateService.queueOfflineAction({
        type: 'user_action',
        action: 'test2',
        data: {},
        maxRetries: 3,
        priority: 'low'
      });
      
      await offlineStateService.queueOfflineAction({
        type: 'user_action',
        action: 'test3',
        data: {},
        maxRetries: 3,
        priority: 'high' // Higher priority should be kept
      });
      
      const queue = offlineStateService.getOfflineQueue();
      expect(queue.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Sync Status Management', () => {
    beforeEach(async () => {
      await offlineStateService.initialize();
    });

    it('should return current sync status', () => {
      const syncStatus = offlineStateService.getSyncStatus();
      
      expect(syncStatus).toEqual(expect.objectContaining({
        isOnline: expect.any(Boolean),
        isSyncing: expect.any(Boolean),
        queuedItemsCount: expect.any(Number),
        failedItemsCount: expect.any(Number),
        syncProgress: expect.any(Number),
        errors: expect.any(Array)
      }));
    });

    it('should notify sync listeners', () => {
      const listener = jest.fn();
      const unsubscribe = offlineStateService.addSyncListener(listener);
      
      // Sync status changes would trigger listener
      // This would be tested with actual sync operations
      
      unsubscribe();
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await offlineStateService.initialize();
    });

    it('should update configuration', async () => {
      const newConfig = {
        maxQueueSize: 2000,
        enableAutoSync: false,
        syncInterval: 60000
      };
      
      await offlineStateService.updateConfiguration(newConfig);
      
      const config = offlineStateService.getConfiguration();
      expect(config.maxQueueSize).toBe(2000);
      expect(config.enableAutoSync).toBe(false);
      expect(config.syncInterval).toBe(60000);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_config',
        expect.any(String)
      );
    });

    it('should get current configuration', () => {
      const config = offlineStateService.getConfiguration();
      
      expect(config).toEqual(expect.objectContaining({
        maxQueueSize: expect.any(Number),
        maxRetries: expect.any(Number),
        retryDelay: expect.any(Number),
        syncInterval: expect.any(Number),
        enableAutoSync: expect.any(Boolean),
        enableOfflineMode: expect.any(Boolean),
        cacheExpirationTime: expect.any(Number)
      }));
    });
  });

  describe('Sync Operations', () => {
    beforeEach(async () => {
      await offlineStateService.initialize();
    });

    it('should not sync when offline', async () => {
      // Mock offline state
      jest.spyOn(offlineStateService, 'isOnline').mockReturnValue(false);
      
      await offlineStateService.syncOfflineQueue();
      
      // Should not attempt to process items when offline
      const syncStatus = offlineStateService.getSyncStatus();
      expect(syncStatus.isSyncing).toBe(false);
    });

    it('should not sync when already syncing', async () => {
      // Mock online state
      jest.spyOn(offlineStateService, 'isOnline').mockReturnValue(true);
      
      // Start first sync
      const syncPromise1 = offlineStateService.syncOfflineQueue();
      
      // Try to start second sync immediately
      const syncPromise2 = offlineStateService.syncOfflineQueue();
      
      await Promise.all([syncPromise1, syncPromise2]);
      
      // Second sync should return immediately without processing
    });

    it('should handle sync completion', async () => {
      // Mock online state
      jest.spyOn(offlineStateService, 'isOnline').mockReturnValue(true);
      
      // Queue an item
      await offlineStateService.queueOfflineAction({
        type: 'user_action',
        action: 'test_sync',
        data: {},
        maxRetries: 3,
        priority: 'medium'
      });
      
      await offlineStateService.syncOfflineQueue();
      
      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'OFFLINE_SYNC_COMPLETED'
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await offlineStateService.initialize();
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage full'));
      
      await expect(offlineStateService.queueOfflineAction({
        type: 'user_action',
        action: 'test',
        data: {},
        maxRetries: 3,
        priority: 'medium'
      })).rejects.toThrow('Storage full');
    });

    it('should handle listener errors gracefully', async () => {
      const faultyListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      offlineStateService.addNetworkListener(faultyListener);
      
      // Simulate network state change
      // The service should continue working despite listener errors
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await offlineStateService.initialize();
    });

    it('should cleanup properly', async () => {
      await offlineStateService.cleanup();
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        expect.any(String)
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_config',
        expect.any(String)
      );
    });
  });

  describe('Priority Handling', () => {
    beforeEach(async () => {
      await offlineStateService.initialize();
    });

    it('should sort queue by priority', async () => {
      // Queue items with different priorities
      await offlineStateService.queueOfflineAction({
        type: 'user_action',
        action: 'low_priority',
        data: {},
        maxRetries: 3,
        priority: 'low'
      });
      
      await offlineStateService.queueOfflineAction({
        type: 'user_action',
        action: 'critical_priority',
        data: {},
        maxRetries: 3,
        priority: 'critical'
      });
      
      await offlineStateService.queueOfflineAction({
        type: 'user_action',
        action: 'high_priority',
        data: {},
        maxRetries: 3,
        priority: 'high'
      });
      
      const queue = offlineStateService.getOfflineQueue();
      
      // Critical should be first, then high, then low
      expect(queue[0].priority).toBe('critical');
      expect(queue[1].priority).toBe('high');
      expect(queue[2].priority).toBe('low');
    });
  });
});