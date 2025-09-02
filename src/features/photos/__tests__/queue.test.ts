/**
 * Photo Upload Queue Tests
 * Tests for offline-aware automatic upload processing
 */

import { photoUploadQueue, startPhotoUploadQueue, stopPhotoUploadQueue } from '../queue';
import { usePhotoStore } from '../store';
import NetInfo from '@react-native-community/netinfo';

// Mock dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('../utils');
jest.mock('../store');

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockUsePhotoStore = usePhotoStore as jest.MockedFunction<typeof usePhotoStore>;

describe('Photo Upload Queue', () => {
  let mockStore: any;
  let mockNetInfoListener: (state: any) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock store
    mockStore = {
      getByStatus: jest.fn(),
      getById: jest.fn(),
      photos: {},
      persist: jest.fn(),
    };
    
    mockUsePhotoStore.mockReturnValue(mockStore);
    mockUsePhotoStore.getState = jest.fn().mockReturnValue(mockStore);

    // Mock NetInfo
    mockNetInfo.addEventListener.mockImplementation((listener) => {
      mockNetInfoListener = listener;
      return jest.fn(); // unsubscribe function
    });

    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    } as any);
  });

  afterEach(() => {
    stopPhotoUploadQueue();
  });

  describe('Queue Initialization', () => {
    it('should start queue and subscribe to network changes', async () => {
      const isAuthenticated = jest.fn().mockReturnValue(true);
      
      startPhotoUploadQueue(isAuthenticated);
      
      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
      expect(mockNetInfo.fetch).toHaveBeenCalled();
    });

    it('should stop queue and clean up subscriptions', () => {
      const unsubscribe = jest.fn();
      mockNetInfo.addEventListener.mockReturnValue(unsubscribe);
      
      startPhotoUploadQueue();
      stopPhotoUploadQueue();
      
      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Network State Changes', () => {
    it('should start processing when network comes online', async () => {
      const isAuthenticated = jest.fn().mockReturnValue(true);
      mockStore.getByStatus.mockReturnValue([]);
      
      startPhotoUploadQueue(isAuthenticated);
      
      // Simulate going offline then online
      mockNetInfoListener({
        isConnected: false,
        isInternetReachable: false,
      });
      
      mockNetInfoListener({
        isConnected: true,
        isInternetReachable: true,
      });
      
      // Should attempt to process queue
      expect(mockStore.getByStatus).toHaveBeenCalledWith('queued');
      expect(mockStore.getByStatus).toHaveBeenCalledWith('error');
    });

    it('should not process queue when offline', async () => {
      const isAuthenticated = jest.fn().mockReturnValue(true);
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as any);
      
      startPhotoUploadQueue(isAuthenticated);
      
      // Should not call getByStatus since we're offline
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockStore.getByStatus).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Checks', () => {
    it('should not process queue when unauthenticated', async () => {
      const isAuthenticated = jest.fn().mockReturnValue(false);
      
      startPhotoUploadQueue(isAuthenticated);
      
      // Should not process queue
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockStore.getByStatus).not.toHaveBeenCalled();
    });

    it('should use default authentication function if none provided', async () => {
      mockStore.getByStatus.mockReturnValue([]);
      
      startPhotoUploadQueue(); // No auth function provided
      
      // Should still attempt to process (default returns true)
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockStore.getByStatus).toHaveBeenCalled();
    });
  });

  describe('Queue Processing', () => {
    it('should process queued photos', async () => {
      const isAuthenticated = jest.fn().mockReturnValue(true);
      const mockPhoto = {
        id: 'photo1',
        intakeId: 'intake1',
        status: 'queued',
        uploadAttempts: 0,
      };
      
      mockStore.getByStatus.mockImplementation((status) => {
        if (status === 'queued') return [mockPhoto];
        if (status === 'error') return [];
        return [];
      });
      
      startPhotoUploadQueue(isAuthenticated);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockStore.getByStatus).toHaveBeenCalledWith('queued');
      expect(mockStore.getByStatus).toHaveBeenCalledWith('error');
    });

    it('should process error photos that can be retried', async () => {
      const isAuthenticated = jest.fn().mockReturnValue(true);
      const mockErrorPhoto = {
        id: 'photo1',
        intakeId: 'intake1',
        status: 'error',
        uploadAttempts: 1,
        nextRetryAt: new Date(Date.now() - 1000).toISOString(), // Past retry time
      };
      
      mockStore.getByStatus.mockImplementation((status) => {
        if (status === 'queued') return [];
        if (status === 'error') return [mockErrorPhoto];
        return [];
      });
      
      startPhotoUploadQueue(isAuthenticated);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockStore.getByStatus).toHaveBeenCalledWith('error');
    });

    it('should not process error photos that exceed retry limit', async () => {
      const isAuthenticated = jest.fn().mockReturnValue(true);
      const mockErrorPhoto = {
        id: 'photo1',
        intakeId: 'intake1',
        status: 'error',
        uploadAttempts: 5, // Exceeds max retries (3)
      };
      
      mockStore.getByStatus.mockImplementation((status) => {
        if (status === 'queued') return [];
        if (status === 'error') return [mockErrorPhoto];
        return [];
      });
      
      startPhotoUploadQueue(isAuthenticated);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should still call getByStatus but not process the photo
      expect(mockStore.getByStatus).toHaveBeenCalledWith('error');
    });
  });

  describe('Queue Status', () => {
    it('should return correct queue status', () => {
      mockStore.getByStatus.mockImplementation((status) => {
        if (status === 'queued') return [{ id: '1' }, { id: '2' }];
        if (status === 'error') return [{ id: '3' }];
        return [];
      });
      
      const status = photoUploadQueue.getStatus();
      
      expect(status.queuedCount).toBe(2);
      expect(status.errorCount).toBe(1);
      expect(status.totalPending).toBe(3);
      expect(status.isOnline).toBe(false); // Default state
      expect(status.isProcessing).toBe(false);
    });
  });

  describe('Manual Triggers', () => {
    it('should allow manual queue processing trigger', () => {
      const isAuthenticated = jest.fn().mockReturnValue(true);
      mockStore.getByStatus.mockReturnValue([]);
      
      startPhotoUploadQueue(isAuthenticated);
      
      // Simulate online state
      mockNetInfoListener({
        isConnected: true,
        isInternetReachable: true,
      });
      
      photoUploadQueue.triggerProcessing();
      
      expect(mockStore.getByStatus).toHaveBeenCalled();
    });

    it('should not trigger processing when offline', () => {
      const isAuthenticated = jest.fn().mockReturnValue(true);
      
      startPhotoUploadQueue(isAuthenticated);
      
      // Keep offline state (default)
      photoUploadQueue.triggerProcessing();
      
      // Should not process when offline
      expect(mockStore.getByStatus).not.toHaveBeenCalled();
    });
  });
});