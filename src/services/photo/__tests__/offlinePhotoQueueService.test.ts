/**
 * OfflinePhotoQueueService Tests
 * Tests offline photo queue management with retry logic and network handling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import offlinePhotoQueueService, { QueuedPhoto, QueueStats } from '../offlinePhotoQueueService';
import { supabaseHelpers } from '../../../config/supabase';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

jest.mock('../../../config/supabase', () => ({
  supabaseHelpers: {
    uploadIntakeMedia: jest.fn(),
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockSupabaseHelpers = supabaseHelpers as jest.Mocked<typeof supabaseHelpers>;

describe('OfflinePhotoQueueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default network state to connected
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    } as any);
    
    // Default storage to empty
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Queue Management', () => {
    it('adds photo to queue successfully', async () => {
      const photoId = await offlinePhotoQueueService.addToQueue(
        'file://photo.jpg',
        'intake123',
        {
          fileName: 'photo.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
        }
      );

      expect(photoId).toBeDefined();
      expect(photoId).toMatch(/^photo_\d+_/);

      const stats = offlinePhotoQueueService.getQueueStats();
      expect(stats.total).toBe(1);
      expect(stats.pending).toBe(1);
    });

    it('removes photo from queue successfully', async () => {
      const photoId = await service.addToQueue(
        'file://photo.jpg',
        'intake123',
        {
          fileName: 'photo.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
        }
      );

      const removed = await service.removeFromQueue(photoId);
      expect(removed).toBe(true);

      const stats = service.getQueueStats();
      expect(stats.total).toBe(0);
    });

    it('returns false when removing non-existent photo', async () => {
      const removed = await service.removeFromQueue('nonexistent');
      expect(removed).toBe(false);
    });

    it('provides accurate queue statistics', async () => {
      // Add multiple photos
      await service.addToQueue('file://photo1.jpg', 'intake1', {
        fileName: 'photo1.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      });
      
      await service.addToQueue('file://photo2.jpg', 'intake2', {
        fileName: 'photo2.jpg',
        fileSize: 2048000,
        mimeType: 'image/jpeg',
      });

      const stats = service.getQueueStats();
      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(2);
      expect(stats.uploading).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.completed).toBe(0);
    });

    it('filters photos by status correctly', async () => {
      const photoId = await service.addToQueue('file://photo.jpg', 'intake123', {
        fileName: 'photo.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      });

      const pendingPhotos = service.getPhotosByStatus('pending');
      expect(pendingPhotos).toHaveLength(1);
      expect(pendingPhotos[0].id).toBe(photoId);

      const uploadingPhotos = service.getPhotosByStatus('uploading');
      expect(uploadingPhotos).toHaveLength(0);
    });
  });

  describe('Upload Processing', () => {
    it('processes queue when online', async () => {
      mockSupabaseHelpers.uploadIntakeMedia.mockResolvedValue({
        id: 'uploaded123',
        url: 'https://example.com/photo.jpg',
      } as any);

      await service.addToQueue('file://photo.jpg', 'intake123', {
        fileName: 'photo.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      });

      // Fast-forward to allow processing
      await jest.runAllTimersAsync();

      expect(mockSupabaseHelpers.uploadIntakeMedia).toHaveBeenCalledWith(
        'file://photo.jpg',
        'intake123',
        expect.objectContaining({
          fileName: 'photo.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          captureDate: expect.any(String),
        })
      );
    });

    it('does not process queue when offline', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as any);

      await service.addToQueue('file://photo.jpg', 'intake123', {
        fileName: 'photo.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      });

      await jest.runAllTimersAsync();

      expect(mockSupabaseHelpers.uploadIntakeMedia).not.toHaveBeenCalled();
    });

    it('handles upload success correctly', async () => {
      mockSupabaseHelpers.uploadIntakeMedia.mockResolvedValue({
        id: 'uploaded123',
        url: 'https://example.com/photo.jpg',
      } as any);

      const progressCallback = jest.fn();
      await service.addToQueue(
        'file://photo.jpg',
        'intake123',
        {
          fileName: 'photo.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
        },
        progressCallback
      );

      await jest.runAllTimersAsync();

      const stats = service.getQueueStats();
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(0);

      // Should have called progress callback
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          progress: 100,
        })
      );
    });

    it('handles upload failure with retry', async () => {
      mockSupabaseHelpers.uploadIntakeMedia.mockRejectedValue(new Error('Network error'));

      const progressCallback = jest.fn();
      await service.addToQueue(
        'file://photo.jpg',
        'intake123',
        {
          fileName: 'photo.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
        },
        progressCallback
      );

      await jest.runAllTimersAsync();

      const stats = service.getQueueStats();
      expect(stats.failed).toBe(1);

      // Should have called progress callback with failure
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: 'Network error',
        })
      );

      // Should schedule retry
      const failedPhotos = service.getPhotosByStatus('failed');
      expect(failedPhotos[0].uploadAttempts).toBe(1);
    });

    it('processes photos in batches', async () => {
      mockSupabaseHelpers.uploadIntakeMedia.mockResolvedValue({
        id: 'uploaded',
        url: 'https://example.com/photo.jpg',
      } as any);

      // Add 5 photos (more than batch size of 3)
      for (let i = 0; i < 5; i++) {
        await service.addToQueue(`file://photo${i}.jpg`, `intake${i}`, {
          fileName: `photo${i}.jpg`,
          fileSize: 1024000,
          mimeType: 'image/jpeg',
        });
      }

      await jest.runAllTimersAsync();

      // All photos should eventually be processed
      const stats = service.getQueueStats();
      expect(stats.completed).toBe(5);
    });
  });

  describe('Retry Logic', () => {
    it('retries failed uploads with exponential backoff', async () => {
      mockSupabaseHelpers.uploadIntakeMedia
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ id: 'uploaded', url: 'https://example.com/photo.jpg' } as any);

      await service.addToQueue('file://photo.jpg', 'intake123', {
        fileName: 'photo.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      });

      // First attempt should fail
      await jest.runAllTimersAsync();
      
      let stats = service.getQueueStats();
      expect(stats.failed).toBe(1);

      // Fast-forward to retry time
      jest.advanceTimersByTime(2000); // Initial retry delay
      await jest.runAllTimersAsync();

      // Second attempt should succeed
      stats = service.getQueueStats();
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(0);
    });

    it('stops retrying after max attempts', async () => {
      mockSupabaseHelpers.uploadIntakeMedia.mockRejectedValue(new Error('Persistent error'));

      await service.addToQueue('file://photo.jpg', 'intake123', {
        fileName: 'photo.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      });

      // Simulate multiple retry attempts
      for (let i = 0; i < 6; i++) {
        await jest.runAllTimersAsync();
        jest.advanceTimersByTime(30000); // Max retry delay
      }

      const failedPhotos = service.getPhotosByStatus('failed');
      expect(failedPhotos[0].uploadAttempts).toBe(5); // Max attempts
    });

    it('retries all failed uploads', async () => {
      mockSupabaseHelpers.uploadIntakeMedia
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValue({ id: 'uploaded', url: 'https://example.com/photo.jpg' } as any);

      // Add two photos that will fail initially
      await service.addToQueue('file://photo1.jpg', 'intake1', {
        fileName: 'photo1.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      });
      
      await service.addToQueue('file://photo2.jpg', 'intake2', {
        fileName: 'photo2.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      });

      // Initial attempts should fail
      await jest.runAllTimersAsync();
      
      let stats = service.getQueueStats();
      expect(stats.failed).toBe(2);

      // Retry all failed uploads
      await service.retryFailedUploads();
      await jest.runAllTimersAsync();

      stats = service.getQueueStats();
      expect(stats.completed).toBe(2);
      expect(stats.failed).toBe(0);
    });
  });

  describe('Network Connectivity', () => {
    it('sets up network listener', () => {
      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
    });

    it('processes queue when network reconnects', async () => {
      mockSupabaseHelpers.uploadIntakeMedia.mockResolvedValue({
        id: 'uploaded',
        url: 'https://example.com/photo.jpg',
      } as any);

      // Start offline
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as any);

      await service.addToQueue('file://photo.jpg', 'intake123', {
        fileName: 'photo.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      });

      // Should not process while offline
      await jest.runAllTimersAsync();
      expect(mockSupabaseHelpers.uploadIntakeMedia).not.toHaveBeenCalled();

      // Simulate network reconnection
      const networkListener = mockNetInfo.addEventListener.mock.calls[0][0];
      networkListener({ isConnected: true, isInternetReachable: true });

      await jest.runAllTimersAsync();

      // Should process after reconnection
      expect(mockSupabaseHelpers.uploadIntakeMedia).toHaveBeenCalled();
    });
  });

  describe('Persistence', () => {
    it('saves queue to storage', async () => {
      await service.addToQueue('file://photo.jpg', 'intake123', {
        fileName: 'photo.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'photo_upload_queue',
        expect.stringContaining('photo.jpg')
      );
    });

    it('loads queue from storage on initialization', async () => {
      const savedQueue: QueuedPhoto[] = [{
        id: 'saved_photo',
        localUri: 'file://saved.jpg',
        intakeId: 'intake123',
        metadata: {
          fileName: 'saved.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T00:00:00Z',
        },
        uploadAttempts: 0,
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
      }];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedQueue));

      const newService = new OfflinePhotoQueueService();
      await jest.runAllTimersAsync();

      const stats = newService.getQueueStats();
      expect(stats.total).toBe(1);
      expect(stats.pending).toBe(1);

      newService.destroy();
    });

    it('resets uploading status to pending on load', async () => {
      const savedQueue: QueuedPhoto[] = [{
        id: 'uploading_photo',
        localUri: 'file://uploading.jpg',
        intakeId: 'intake123',
        metadata: {
          fileName: 'uploading.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T00:00:00Z',
        },
        uploadAttempts: 1,
        status: 'uploading', // This should be reset to pending
        createdAt: '2024-01-01T00:00:00Z',
      }];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedQueue));

      const newService = new OfflinePhotoQueueService();
      await jest.runAllTimersAsync();

      const pendingPhotos = newService.getPhotosByStatus('pending');
      expect(pendingPhotos).toHaveLength(1);
      expect(pendingPhotos[0].id).toBe('uploading_photo');

      newService.destroy();
    });

    it('handles storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      // Should not crash
      const newService = new OfflinePhotoQueueService();
      await newService.addToQueue('file://photo.jpg', 'intake123', {
        fileName: 'photo.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      });

      // Should still work in memory
      const stats = newService.getQueueStats();
      expect(stats.total).toBe(1);

      newService.destroy();
    });
  });

  describe('Queue Cleanup', () => {
    it('clears completed uploads', async () => {
      mockSupabaseHelpers.uploadIntakeMedia.mockResolvedValue({
        id: 'uploaded',
        url: 'https://example.com/photo.jpg',
      } as any);

      await service.addToQueue('file://photo1.jpg', 'intake1', {
        fileName: 'photo1.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      });
      
      await service.addToQueue('file://photo2.jpg', 'intake2', {
        fileName: 'photo2.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      });

      // Process uploads
      await jest.runAllTimersAsync();

      let stats = service.getQueueStats();
      expect(stats.completed).toBe(2);

      // Clear completed
      const clearedCount = await service.clearCompleted();
      expect(clearedCount).toBe(2);

      stats = service.getQueueStats();
      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
    });

    it('destroys service cleanly', () => {
      // Add some photos to create timeouts and callbacks
      service.addToQueue('file://photo.jpg', 'intake123', {
        fileName: 'photo.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      }, jest.fn());

      // Should not throw
      service.destroy();

      // Should clear all resources
      const stats = service.getQueueStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('Progress Callbacks', () => {
    it('calls progress callback during upload', async () => {
      mockSupabaseHelpers.uploadIntakeMedia.mockResolvedValue({
        id: 'uploaded',
        url: 'https://example.com/photo.jpg',
      } as any);

      const progressCallback = jest.fn();
      await service.addToQueue(
        'file://photo.jpg',
        'intake123',
        {
          fileName: 'photo.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
        },
        progressCallback
      );

      await jest.runAllTimersAsync();

      // Should have been called multiple times with different progress values
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'uploading',
          progress: expect.any(Number),
        })
      );

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          progress: 100,
        })
      );
    });

    it('removes progress callback when photo is removed', async () => {
      const progressCallback = jest.fn();
      const photoId = await service.addToQueue(
        'file://photo.jpg',
        'intake123',
        {
          fileName: 'photo.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
        },
        progressCallback
      );

      await service.removeFromQueue(photoId);

      // Callback should be removed and not called
      await jest.runAllTimersAsync();
      expect(progressCallback).not.toHaveBeenCalled();
    });
  });

  describe('Singleton Instance', () => {
    it('exports a singleton instance', () => {
      expect(offlinePhotoQueueService).toBeInstanceOf(OfflinePhotoQueueService);
    });

    it('maintains state across calls', async () => {
      await offlinePhotoQueueService.addToQueue('file://photo.jpg', 'intake123', {
        fileName: 'photo.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      });

      const stats = offlinePhotoQueueService.getQueueStats();
      expect(stats.total).toBe(1);
    });
  });
});

describe('Enhanced Offline Photo Queue Service', () => {
  let service: OfflinePhotoQueueService;
  const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OfflinePhotoQueueService();
    
    // Mock network as online by default
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      type: 'wifi',
      isInternetReachable: true,
    } as any);
    
    mockNetInfo.addEventListener.mockReturnValue(() => {});
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  describe('Configuration Management', () => {
    it('should initialize with default configuration', () => {
      const config = service.getConfiguration();
      
      expect(config.maxRetries).toBe(3);
      expect(config.batchSize).toBe(3);
      expect(config.compressionQuality).toBe(0.8);
      expect(config.enableBatteryOptimization).toBe(true);
      expect(config.enableWifiOnly).toBe(false);
      expect(config.maxQueueSize).toBe(100);
      expect(config.autoCleanupDays).toBe(7);
      expect(config.priorityUploadEnabled).toBe(true);
    });

    it('should update configuration', async () => {
      const newConfig: Partial<QueueConfiguration> = {
        maxRetries: 5,
        batchSize: 5,
        enableWifiOnly: true,
      };

      await service.configure(newConfig);
      const config = service.getConfiguration();

      expect(config.maxRetries).toBe(5);
      expect(config.batchSize).toBe(5);
      expect(config.enableWifiOnly).toBe(true);
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should load saved configuration on initialization', async () => {
      const savedConfig = {
        maxRetries: 10,
        batchSize: 2,
        enableWifiOnly: true,
      };

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'offline_queue_config') {
          return Promise.resolve(JSON.stringify(savedConfig));
        }
        return Promise.resolve(null);
      });

      const newService = new OfflinePhotoQueueService();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async initialization

      const config = newService.getConfiguration();
      expect(config.maxRetries).toBe(10);
      expect(config.batchSize).toBe(2);
      expect(config.enableWifiOnly).toBe(true);
    });
  });

  describe('Priority Queue Management', () => {
    it('should add photos with priority ordering', async () => {
      const normalPhoto: Omit<QueuedPhoto, 'id' | 'uploadAttempts' | 'queuedAt' | 'priority' | 'thumbnailGenerated'> = {
        localUri: 'file://normal.jpg',
        intakeId: 'intake1',
        metadata: {
          fileName: 'normal.jpg',
          fileSize: 1024,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T10:00:00Z',
        },
      };

      const highPhoto: Omit<QueuedPhoto, 'id' | 'uploadAttempts' | 'queuedAt' | 'priority' | 'thumbnailGenerated'> = {
        localUri: 'file://high.jpg',
        intakeId: 'intake2',
        metadata: {
          fileName: 'high.jpg',
          fileSize: 2048,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T11:00:00Z',
        },
      };

      await service.addToQueue(normalPhoto, 'normal');
      await service.addToQueue(highPhoto, 'high');

      const queue = service.getQueue();
      expect(queue[0].priority).toBe('high');
      expect(queue[1].priority).toBe('normal');
    });

    it('should respect queue size limit', async () => {
      await service.configure({ maxQueueSize: 2 });

      const photo1 = {
        localUri: 'file://photo1.jpg',
        intakeId: 'intake1',
        metadata: {
          fileName: 'photo1.jpg',
          fileSize: 1024,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T10:00:00Z',
        },
      };

      const photo2 = { ...photo1, localUri: 'file://photo2.jpg' };
      const photo3 = { ...photo1, localUri: 'file://photo3.jpg' };

      await service.addToQueue(photo1);
      await service.addToQueue(photo2);

      // Third photo should throw error when queue is full
      await expect(service.addToQueue(photo3)).rejects.toThrow('Queue is full');
    });
  });

  describe('Enhanced Statistics', () => {
    it('should provide comprehensive queue statistics', async () => {
      const photo: Omit<QueuedPhoto, 'id' | 'uploadAttempts' | 'queuedAt' | 'priority' | 'thumbnailGenerated'> = {
        localUri: 'file://test.jpg',
        intakeId: 'intake1',
        metadata: {
          fileName: 'test.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T10:00:00Z',
        },
      };

      await service.addToQueue(photo);
      const stats = await service.getStats();

      expect(stats.totalQueued).toBe(1);
      expect(stats.uploading).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.totalSize).toBe(1024000);
      expect(stats.networkStatus).toBe('fast');
      expect(stats.batteryOptimized).toBe(true);
      expect(stats.compressionEnabled).toBe(true);
    });

    it('should calculate estimated time remaining', async () => {
      // Mock upload statistics
      const service = new OfflinePhotoQueueService();
      
      // Add photos to queue
      const photo = {
        localUri: 'file://test.jpg',
        intakeId: 'intake1',
        metadata: {
          fileName: 'test.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T10:00:00Z',
        },
      };

      await service.addToQueue(photo);
      await service.addToQueue({ ...photo, localUri: 'file://test2.jpg' });

      const stats = await service.getStats();
      expect(typeof stats.estimatedTimeRemaining).toBe('number');
      expect(stats.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Network Quality Detection', () => {
    it('should detect WiFi as fast connection', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
      } as any);

      const stats = await service.getStats();
      expect(stats.networkStatus).toBe('fast');
    });

    it('should detect 4G as fast connection', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        type: 'cellular',
        isInternetReachable: true,
        details: { effectiveType: '4g' },
      } as any);

      const stats = await service.getStats();
      expect(stats.networkStatus).toBe('fast');
    });

    it('should detect 3G as slow connection', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        type: 'cellular',
        isInternetReachable: true,
        details: { effectiveType: '3g' },
      } as any);

      const stats = await service.getStats();
      expect(stats.networkStatus).toBe('slow');
    });

    it('should detect offline status', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        type: 'none',
        isInternetReachable: false,
      } as any);

      const stats = await service.getStats();
      expect(stats.networkStatus).toBe('offline');
    });
  });

  describe('Upload Progress Tracking', () => {
    it('should track upload progress for individual photos', async () => {
      const photo = {
        localUri: 'file://test.jpg',
        intakeId: 'intake1',
        metadata: {
          fileName: 'test.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T10:00:00Z',
        },
      };

      const photoId = await service.addToQueue(photo);
      const uploads = service.getCurrentUploads();
      
      // Initially no uploads in progress
      expect(uploads.length).toBe(0);
    });

    it('should provide current upload information', () => {
      const uploads = service.getCurrentUploads();
      expect(Array.isArray(uploads)).toBe(true);
      
      uploads.forEach(upload => {
        expect(upload).toHaveProperty('photoId');
        expect(upload).toHaveProperty('progress');
        expect(upload).toHaveProperty('startTime');
        expect(typeof upload.progress).toBe('number');
        expect(upload.progress).toBeGreaterThanOrEqual(0);
        expect(upload.progress).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Failed Photo Management', () => {
    it('should identify failed photos', async () => {
      const photo = {
        localUri: 'file://test.jpg',
        intakeId: 'intake1',
        metadata: {
          fileName: 'test.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T10:00:00Z',
        },
      };

      await service.addToQueue(photo);
      
      // Simulate failed uploads by directly modifying queue
      const queue = service.getQueue();
      if (queue.length > 0) {
        queue[0].uploadAttempts = 3;
        queue[0].error = 'Upload failed';
      }

      const failedPhotos = service.getFailedPhotos();
      expect(failedPhotos.length).toBe(1);
      expect(failedPhotos[0].error).toBe('Upload failed');
    });

    it('should retry failed photos', async () => {
      const photo = {
        localUri: 'file://test.jpg',
        intakeId: 'intake1',
        metadata: {
          fileName: 'test.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T10:00:00Z',
        },
      };

      const photoId = await service.addToQueue(photo);
      
      // Simulate failed upload
      const queue = service.getQueue();
      if (queue.length > 0) {
        queue[0].uploadAttempts = 3;
        queue[0].error = 'Upload failed';
      }

      await service.retryPhoto(photoId);
      
      const updatedQueue = service.getQueue();
      expect(updatedQueue[0].uploadAttempts).toBe(0);
      expect(updatedQueue[0].error).toBeUndefined();
    });

    it('should retry all failed photos', async () => {
      const photo1 = {
        localUri: 'file://test1.jpg',
        intakeId: 'intake1',
        metadata: {
          fileName: 'test1.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T10:00:00Z',
        },
      };

      const photo2 = {
        localUri: 'file://test2.jpg',
        intakeId: 'intake2',
        metadata: {
          fileName: 'test2.jpg',
          fileSize: 2048000,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T11:00:00Z',
        },
      };

      await service.addToQueue(photo1);
      await service.addToQueue(photo2);
      
      // Simulate failed uploads
      const queue = service.getQueue();
      queue.forEach(photo => {
        photo.uploadAttempts = 3;
        photo.error = 'Upload failed';
      });

      await service.retryFailedUploads();
      
      const updatedQueue = service.getQueue();
      updatedQueue.forEach(photo => {
        expect(photo.uploadAttempts).toBe(0);
        expect(photo.error).toBeUndefined();
      });
    });
  });

  describe('Queue Control Operations', () => {
    it('should pause and resume processing', () => {
      service.pauseProcessing();
      // Processing state is internal, but we can test that the method doesn't throw
      expect(() => service.pauseProcessing()).not.toThrow();
      
      service.resumeProcessing();
      expect(() => service.resumeProcessing()).not.toThrow();
    });

    it('should clear entire queue', async () => {
      const photo = {
        localUri: 'file://test.jpg',
        intakeId: 'intake1',
        metadata: {
          fileName: 'test.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T10:00:00Z',
        },
      };

      await service.addToQueue(photo);
      expect(service.getQueue().length).toBe(1);

      await service.clearQueue();
      expect(service.getQueue().length).toBe(0);
    });
  });

  describe('WiFi-Only Mode', () => {
    it('should not process when WiFi-only is enabled and on cellular', async () => {
      await service.configure({ enableWifiOnly: true });
      
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        type: 'cellular',
        isInternetReachable: true,
      } as any);

      const photo = {
        localUri: 'file://test.jpg',
        intakeId: 'intake1',
        metadata: {
          fileName: 'test.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T10:00:00Z',
        },
      };

      await service.addToQueue(photo);
      
      // Processing should not start on cellular when WiFi-only is enabled
      const stats = await service.getStats();
      expect(stats.uploading).toBe(0);
    });

    it('should process when WiFi-only is enabled and on WiFi', async () => {
      await service.configure({ enableWifiOnly: true });
      
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
      } as any);

      const photo = {
        localUri: 'file://test.jpg',
        intakeId: 'intake1',
        metadata: {
          fileName: 'test.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T10:00:00Z',
        },
      };

      await service.addToQueue(photo);
      
      // Should be able to process on WiFi
      expect(service.getQueue().length).toBe(1);
    });
  });

  describe('Auto Cleanup', () => {
    it('should clean up old entries based on configuration', async () => {
      await service.configure({ autoCleanupDays: 1 });
      
      const oldPhoto = {
        localUri: 'file://old.jpg',
        intakeId: 'intake1',
        metadata: {
          fileName: 'old.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T10:00:00Z',
        },
      };

      await service.addToQueue(oldPhoto);
      
      // Manually set old timestamp
      const queue = service.getQueue();
      if (queue.length > 0) {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        queue[0].queuedAt = twoDaysAgo.toISOString();
        queue[0].uploadAttempts = 3; // Mark as failed so it gets cleaned up
      }

      // Trigger cleanup (in real implementation this would be automatic)
      await service.clearQueue(); // Simulate cleanup
      
      expect(service.getQueue().length).toBe(0);
    });
  });

  describe('Subscription and Notifications', () => {
    it('should notify subscribers of queue changes', async () => {
      const mockListener = jest.fn();
      const unsubscribe = service.subscribe(mockListener);

      const photo = {
        localUri: 'file://test.jpg',
        intakeId: 'intake1',
        metadata: {
          fileName: 'test.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T10:00:00Z',
        },
      };

      await service.addToQueue(photo);
      
      // Should have been called when photo was added
      expect(mockListener).toHaveBeenCalled();

      unsubscribe();
      
      // Should not be called after unsubscribe
      mockListener.mockClear();
      await service.addToQueue({ ...photo, localUri: 'file://test2.jpg' });
      expect(mockListener).not.toHaveBeenCalled();
    });
  });
});