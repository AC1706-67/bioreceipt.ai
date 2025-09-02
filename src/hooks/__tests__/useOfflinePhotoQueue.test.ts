/**
 * Tests for useOfflinePhotoQueue hook
 */

import { renderHook, act } from '@testing-library/react-native';
import { useOfflinePhotoQueue } from '../useOfflinePhotoQueue';
import { offlinePhotoQueueService } from '../../services/photo/offlinePhotoQueueService';

// Mock the service
jest.mock('../../services/photo/offlinePhotoQueueService', () => ({
  offlinePhotoQueueService: {
    getQueue: jest.fn(),
    getStats: jest.fn(),
    getConfiguration: jest.fn(),
    getCurrentUploads: jest.fn(),
    getFailedPhotos: jest.fn(),
    addToQueue: jest.fn(),
    removeFromQueue: jest.fn(),
    retryPhoto: jest.fn(),
    retryFailedUploads: jest.fn(),
    clearQueue: jest.fn(),
    pauseProcessing: jest.fn(),
    resumeProcessing: jest.fn(),
    configure: jest.fn(),
    subscribe: jest.fn(),
  },
}));

const mockService = offlinePhotoQueueService as jest.Mocked<typeof offlinePhotoQueueService>;

describe('useOfflinePhotoQueue', () => {
  const mockQueue = [
    {
      id: 'photo1',
      localUri: 'file://photo1.jpg',
      intakeId: 'intake1',
      metadata: {
        fileName: 'photo1.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        captureDate: '2024-01-01T10:00:00Z',
      },
      uploadAttempts: 0,
      queuedAt: '2024-01-01T10:00:00Z',
      priority: 'normal' as const,
      thumbnailGenerated: false,
      uploadProgress: 0,
    },
  ];

  const mockStats = {
    totalQueued: 1,
    uploading: 0,
    failed: 0,
    completed: 0,
    totalSize: 1024000,
    averageUploadTime: 0,
    estimatedTimeRemaining: 0,
    networkStatus: 'online' as const,
    batteryOptimized: true,
    compressionEnabled: false,
  };

  const mockConfig = {
    maxRetries: 3,
    retryDelay: 5000,
    batchSize: 3,
    compressionQuality: 0.8,
    enableBatteryOptimization: true,
    enableWifiOnly: false,
    maxQueueSize: 100,
    autoCleanupDays: 7,
    priorityUploadEnabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockService.getQueue.mockReturnValue(mockQueue);
    mockService.getStats.mockResolvedValue(mockStats);
    mockService.getConfiguration.mockReturnValue(mockConfig);
    mockService.getCurrentUploads.mockReturnValue([]);
    mockService.getFailedPhotos.mockReturnValue([]);
    mockService.subscribe.mockReturnValue(() => {});
  });

  it('should initialize with queue data', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useOfflinePhotoQueue());

    await waitForNextUpdate();

    expect(result.current.queue).toEqual(mockQueue);
    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.configuration).toEqual(mockConfig);
    expect(result.current.currentUploads).toEqual([]);
    expect(result.current.failedPhotos).toEqual([]);
  });

  it('should add photo to queue', async () => {
    mockService.addToQueue.mockResolvedValue('photo2');
    
    const { result, waitForNextUpdate } = renderHook(() => useOfflinePhotoQueue());
    await waitForNextUpdate();

    const photoData = {
      localUri: 'file://photo2.jpg',
      intakeId: 'intake2',
      metadata: {
        fileName: 'photo2.jpg',
        fileSize: 2048000,
        mimeType: 'image/jpeg',
        captureDate: '2024-01-01T11:00:00Z',
      },
    };

    await act(async () => {
      const photoId = await result.current.addToQueue(photoData, 'high');
      expect(photoId).toBe('photo2');
    });

    expect(mockService.addToQueue).toHaveBeenCalledWith(photoData, 'high');
  });

  it('should remove photo from queue', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useOfflinePhotoQueue());
    await waitForNextUpdate();

    await act(async () => {
      await result.current.removeFromQueue('photo1');
    });

    expect(mockService.removeFromQueue).toHaveBeenCalledWith('photo1');
  });

  it('should retry failed photo', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useOfflinePhotoQueue());
    await waitForNextUpdate();

    await act(async () => {
      await result.current.retryPhoto('photo1');
    });

    expect(mockService.retryPhoto).toHaveBeenCalledWith('photo1');
  });

  it('should retry all failed photos', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useOfflinePhotoQueue());
    await waitForNextUpdate();

    await act(async () => {
      await result.current.retryAllFailed();
    });

    expect(mockService.retryFailedUploads).toHaveBeenCalled();
  });

  it('should clear queue', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useOfflinePhotoQueue());
    await waitForNextUpdate();

    await act(async () => {
      await result.current.clearQueue();
    });

    expect(mockService.clearQueue).toHaveBeenCalled();
  });

  it('should pause and resume queue', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useOfflinePhotoQueue());
    await waitForNextUpdate();

    act(() => {
      result.current.pauseQueue();
    });

    expect(mockService.pauseProcessing).toHaveBeenCalled();
    expect(result.current.isPaused).toBe(true);

    act(() => {
      result.current.resumeQueue();
    });

    expect(mockService.resumeProcessing).toHaveBeenCalled();
    expect(result.current.isPaused).toBe(false);
  });

  it('should update configuration', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useOfflinePhotoQueue());
    await waitForNextUpdate();

    const newConfig = { maxRetries: 5, batchSize: 5 };

    await act(async () => {
      await result.current.updateConfiguration(newConfig);
    });

    expect(mockService.configure).toHaveBeenCalledWith(newConfig);
  });

  it('should get photo by id', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useOfflinePhotoQueue());
    await waitForNextUpdate();

    const photo = result.current.getPhotoById('photo1');
    expect(photo).toEqual(mockQueue[0]);

    const nonExistentPhoto = result.current.getPhotoById('nonexistent');
    expect(nonExistentPhoto).toBeUndefined();
  });

  it('should get upload progress', async () => {
    const queueWithProgress = [
      { ...mockQueue[0], uploadProgress: 50 },
    ];
    mockService.getQueue.mockReturnValue(queueWithProgress);

    const { result, waitForNextUpdate } = renderHook(() => useOfflinePhotoQueue());
    await waitForNextUpdate();

    const progress = result.current.getUploadProgress('photo1');
    expect(progress).toBe(50);

    const nonExistentProgress = result.current.getUploadProgress('nonexistent');
    expect(nonExistentProgress).toBe(0);
  });

  it('should get estimated time remaining', async () => {
    const statsWithTime = { ...mockStats, estimatedTimeRemaining: 30000 };
    mockService.getStats.mockResolvedValue(statsWithTime);

    const { result, waitForNextUpdate } = renderHook(() => useOfflinePhotoQueue());
    await waitForNextUpdate();

    const timeRemaining = result.current.getEstimatedTimeRemaining();
    expect(timeRemaining).toBe(30000);
  });

  it('should handle service subscription', async () => {
    const unsubscribe = jest.fn();
    mockService.subscribe.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useOfflinePhotoQueue());

    expect(mockService.subscribe).toHaveBeenCalled();

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    mockService.addToQueue.mockRejectedValue(new Error('Network error'));

    const { result, waitForNextUpdate } = renderHook(() => useOfflinePhotoQueue());
    await waitForNextUpdate();

    const photoData = {
      localUri: 'file://photo2.jpg',
      intakeId: 'intake2',
      metadata: {
        fileName: 'photo2.jpg',
        fileSize: 2048000,
        mimeType: 'image/jpeg',
        captureDate: '2024-01-01T11:00:00Z',
      },
    };

    await expect(
      act(async () => {
        await result.current.addToQueue(photoData);
      })
    ).rejects.toThrow('Network error');

    consoleError.mockRestore();
  });
});