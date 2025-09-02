/**
 * useOfflinePhotoQueue Hook
 * React hook for managing offline photo upload queue
 */

import { useState, useEffect, useCallback } from 'react';
import { offlinePhotoQueueService, QueuedPhoto, QueueStats, UploadProgress } from '../services/photo/offlinePhotoQueueService';

export interface PhotoQueueData {
  localUri: string;
  intakeId: string;
  metadata: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    captureDate: string;
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

export interface QueueConfiguration {
  maxRetries?: number;
  retryDelay?: number;
  batchSize?: number;
  compressionQuality?: number;
  enableBatteryOptimization?: boolean;
  enableWifiOnly?: boolean;
  maxQueueSize?: number;
  autoCleanupDays?: number;
  priorityUploadEnabled?: boolean;
}

export interface UseOfflinePhotoQueueResult {
  // State
  queue: QueuedPhoto[];
  stats: QueueStats | null;
  configuration: QueueConfiguration;
  currentUploads: UploadProgress[];
  failedPhotos: QueuedPhoto[];
  isProcessing: boolean;
  isPaused: boolean;
  
  // Actions
  addToQueue: (photoData: PhotoQueueData, priority?: 'low' | 'normal' | 'high') => Promise<string>;
  removeFromQueue: (photoId: string) => Promise<void>;
  retryPhoto: (photoId: string) => Promise<void>;
  retryAllFailed: () => Promise<void>;
  clearQueue: () => Promise<void>;
  pauseQueue: () => void;
  resumeQueue: () => void;
  updateConfiguration: (config: Partial<QueueConfiguration>) => Promise<void>;
  
  // Utilities
  getPhotoById: (photoId: string) => QueuedPhoto | undefined;
  getUploadProgress: (photoId: string) => number;
  getEstimatedTimeRemaining: () => number;
}

export const useOfflinePhotoQueue = (): UseOfflinePhotoQueueResult => {
  const [queue, setQueue] = useState<QueuedPhoto[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [configuration, setConfiguration] = useState<QueueConfiguration>({
    maxRetries: 3,
    retryDelay: 5000,
    batchSize: 3,
    compressionQuality: 0.8,
    enableBatteryOptimization: true,
    enableWifiOnly: false,
    maxQueueSize: 100,
    autoCleanupDays: 7,
    priorityUploadEnabled: true,
  });
  const [currentUploads, setCurrentUploads] = useState<UploadProgress[]>([]);
  const [failedPhotos, setFailedPhotos] = useState<QueuedPhoto[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Initialize and subscribe to service updates
  useEffect(() => {
    const updateState = () => {
      setQueue(offlinePhotoQueueService.getQueuedPhotos());
      setStats(offlinePhotoQueueService.getQueueStats());
      setFailedPhotos(offlinePhotoQueueService.getPhotosByStatus('failed'));
      
      // Update processing state based on uploading photos
      const uploadingPhotos = offlinePhotoQueueService.getPhotosByStatus('uploading');
      setIsProcessing(uploadingPhotos.length > 0);
      
      // Create current uploads from uploading photos
      const uploads: UploadProgress[] = uploadingPhotos.map(photo => ({
        photoId: photo.id,
        progress: 50, // Default progress for uploading photos
        status: 'uploading' as const,
      }));
      setCurrentUploads(uploads);
    };

    // Initial state update
    updateState();

    // Set up periodic updates (in a real implementation, this would be event-driven)
    const interval = setInterval(updateState, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Add photo to queue
  const addToQueue = useCallback(async (
    photoData: PhotoQueueData,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string> => {
    try {
      const photoId = await offlinePhotoQueueService.addToQueue(
        photoData.localUri,
        photoData.intakeId,
        photoData.metadata,
        (progress) => {
          setCurrentUploads(prev => {
            const existing = prev.find(u => u.photoId === progress.photoId);
            if (existing) {
              return prev.map(u => u.photoId === progress.photoId ? progress : u);
            } else {
              return [...prev, progress];
            }
          });
        }
      );
      return photoId;
    } catch (error) {
      console.error('Failed to add photo to queue:', error);
      throw error;
    }
  }, []);

  // Remove photo from queue
  const removeFromQueue = useCallback(async (photoId: string): Promise<void> => {
    try {
      await offlinePhotoQueueService.removeFromQueue(photoId);
      
      // Remove from current uploads if present
      setCurrentUploads(prev => prev.filter(u => u.photoId !== photoId));
    } catch (error) {
      console.error('Failed to remove photo from queue:', error);
      throw error;
    }
  }, []);

  // Retry specific photo
  const retryPhoto = useCallback(async (photoId: string): Promise<void> => {
    try {
      // Find the photo and reset its status
      const photo = queue.find(p => p.id === photoId);
      if (photo) {
        photo.status = 'pending';
        photo.uploadAttempts = 0;
        photo.error = undefined;
        
        // Update local state
        setQueue(prev => prev.map(p => p.id === photoId ? photo : p));
        setFailedPhotos(prev => prev.filter(p => p.id !== photoId));
      }
    } catch (error) {
      console.error('Failed to retry photo:', error);
      throw error;
    }
  }, [queue]);

  // Retry all failed photos
  const retryAllFailed = useCallback(async (): Promise<void> => {
    try {
      await offlinePhotoQueueService.retryFailedUploads();
      setFailedPhotos([]);
    } catch (error) {
      console.error('Failed to retry all failed photos:', error);
      throw error;
    }
  }, []);

  // Clear entire queue
  const clearQueue = useCallback(async (): Promise<void> => {
    try {
      // Clear completed photos first
      await offlinePhotoQueueService.clearCompleted();
      
      // Then clear remaining photos
      const remainingPhotos = offlinePhotoQueueService.getQueuedPhotos();
      for (const photo of remainingPhotos) {
        await offlinePhotoQueueService.removeFromQueue(photo.id);
      }
      
      setQueue([]);
      setCurrentUploads([]);
      setFailedPhotos([]);
    } catch (error) {
      console.error('Failed to clear queue:', error);
      throw error;
    }
  }, []);

  // Pause queue processing
  const pauseQueue = useCallback((): void => {
    setIsPaused(true);
    // In a real implementation, this would pause the service
    console.log('Queue paused');
  }, []);

  // Resume queue processing
  const resumeQueue = useCallback((): void => {
    setIsPaused(false);
    // In a real implementation, this would resume the service
    console.log('Queue resumed');
  }, []);

  // Update configuration
  const updateConfiguration = useCallback(async (config: Partial<QueueConfiguration>): Promise<void> => {
    try {
      setConfiguration(prev => ({ ...prev, ...config }));
      // In a real implementation, this would update the service configuration
      console.log('Configuration updated:', config);
    } catch (error) {
      console.error('Failed to update configuration:', error);
      throw error;
    }
  }, []);

  // Get photo by ID
  const getPhotoById = useCallback((photoId: string): QueuedPhoto | undefined => {
    return queue.find(photo => photo.id === photoId);
  }, [queue]);

  // Get upload progress for a specific photo
  const getUploadProgress = useCallback((photoId: string): number => {
    const upload = currentUploads.find(u => u.photoId === photoId);
    return upload?.progress || 0;
  }, [currentUploads]);

  // Get estimated time remaining
  const getEstimatedTimeRemaining = useCallback((): number => {
    return stats?.estimatedTimeRemaining || 0;
  }, [stats]);

  return {
    // State
    queue,
    stats,
    configuration,
    currentUploads,
    failedPhotos,
    isProcessing,
    isPaused,
    
    // Actions
    addToQueue,
    removeFromQueue,
    retryPhoto,
    retryAllFailed,
    clearQueue,
    pauseQueue,
    resumeQueue,
    updateConfiguration,
    
    // Utilities
    getPhotoById,
    getUploadProgress,
    getEstimatedTimeRemaining,
  };
};

export default useOfflinePhotoQueue;