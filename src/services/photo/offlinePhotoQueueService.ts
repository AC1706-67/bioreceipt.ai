/**
 * Offline Photo Queue Service
 * Manages photo uploads when offline with automatic retry and exponential backoff
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/netinfo';
import { supabaseHelpers } from '../../config/supabase';

export interface QueuedPhoto {
  id: string;
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
  uploadAttempts: number;
  lastAttemptAt?: string;
  status: 'pending' | 'uploading' | 'failed' | 'completed';
  error?: string;
  createdAt: string;
}

export interface UploadProgress {
  photoId: string;
  progress: number; // 0-100
  status: 'uploading' | 'completed' | 'failed';
  error?: string;
}

export interface QueueStats {
  total: number;
  pending: number;
  uploading: number;
  failed: number;
  completed: number;
}

class OfflinePhotoQueueService {
  private static readonly STORAGE_KEY = 'photo_upload_queue';
  private static readonly MAX_RETRY_ATTEMPTS = 5;
  private static readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private static readonly MAX_RETRY_DELAY = 30000; // 30 seconds
  private static readonly BATCH_SIZE = 3; // Upload 3 photos at once

  private queue: QueuedPhoto[] = [];
  private isProcessing = false;
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private progressCallbacks: Map<string, (progress: UploadProgress) => void> = new Map();
  private networkListener?: () => void;

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize the service and load existing queue
   */
  private async initializeService(): Promise<void> {
    try {
      await this.loadQueue();
      this.setupNetworkListener();
      
      // Start processing if we have items and are online
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected && this.queue.length > 0) {
        this.processQueue();
      }
    } catch (error) {
      console.error('Failed to initialize offline photo queue service:', error);
    }
  }

  /**
   * Add a photo to the upload queue
   */
  async addToQueue(
    localUri: string,
    intakeId: string,
    metadata: Omit<QueuedPhoto['metadata'], 'captureDate'>,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedPhoto: QueuedPhoto = {
      id: photoId,
      localUri,
      intakeId,
      metadata: {
        ...metadata,
        captureDate: new Date().toISOString(),
      },
      uploadAttempts: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.queue.push(queuedPhoto);
    
    if (onProgress) {
      this.progressCallbacks.set(photoId, onProgress);
    }

    await this.saveQueue();

    // Start processing if we're online
    const networkState = await NetInfo.fetch();
    if (networkState.isConnected) {
      this.processQueue();
    }

    return photoId;
  }

  /**
   * Remove a photo from the queue
   */
  async removeFromQueue(photoId: string): Promise<boolean> {
    const index = this.queue.findIndex(photo => photo.id === photoId);
    if (index === -1) {
      return false;
    }

    // Clear any retry timeout
    const timeout = this.retryTimeouts.get(photoId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(photoId);
    }

    // Remove progress callback
    this.progressCallbacks.delete(photoId);

    // Remove from queue
    this.queue.splice(index, 1);
    await this.saveQueue();

    return true;
  }

  /**
   * Get current queue status
   */
  getQueueStats(): QueueStats {
    const stats: QueueStats = {
      total: this.queue.length,
      pending: 0,
      uploading: 0,
      failed: 0,
      completed: 0,
    };

    this.queue.forEach(photo => {
      stats[photo.status]++;
    });

    return stats;
  }

  /**
   * Get all queued photos
   */
  getQueuedPhotos(): QueuedPhoto[] {
    return [...this.queue];
  }

  /**
   * Get photos by status
   */
  getPhotosByStatus(status: QueuedPhoto['status']): QueuedPhoto[] {
    return this.queue.filter(photo => photo.status === status);
  }

  /**
   * Retry failed uploads
   */
  async retryFailedUploads(): Promise<void> {
    const failedPhotos = this.queue.filter(photo => photo.status === 'failed');
    
    for (const photo of failedPhotos) {
      photo.status = 'pending';
      photo.uploadAttempts = 0;
      photo.error = undefined;
      photo.lastAttemptAt = undefined;
    }

    await this.saveQueue();

    // Start processing if we're online
    const networkState = await NetInfo.fetch();
    if (networkState.isConnected) {
      this.processQueue();
    }
  }

  /**
   * Clear completed uploads from queue
   */
  async clearCompleted(): Promise<number> {
    const completedCount = this.queue.filter(photo => photo.status === 'completed').length;
    
    // Remove completed photos and their callbacks
    this.queue = this.queue.filter(photo => {
      if (photo.status === 'completed') {
        this.progressCallbacks.delete(photo.id);
        return false;
      }
      return true;
    });

    await this.saveQueue();
    return completedCount;
  }

  /**
   * Process the upload queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Check network connectivity
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        console.log('No network connection, skipping queue processing');
        return;
      }

      // Get pending photos
      const pendingPhotos = this.queue
        .filter(photo => photo.status === 'pending')
        .slice(0, OfflinePhotoQueueService.BATCH_SIZE);

      if (pendingPhotos.length === 0) {
        return;
      }

      // Process photos in parallel
      const uploadPromises = pendingPhotos.map(photo => this.uploadPhoto(photo));
      await Promise.allSettled(uploadPromises);

      await this.saveQueue();

      // Continue processing if there are more pending photos
      const remainingPending = this.queue.filter(photo => photo.status === 'pending');
      if (remainingPending.length > 0) {
        // Small delay before processing next batch
        setTimeout(() => this.processQueue(), 1000);
      }
    } catch (error) {
      console.error('Error processing photo queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Upload a single photo
   */
  private async uploadPhoto(photo: QueuedPhoto): Promise<void> {
    try {
      // Update status to uploading
      photo.status = 'uploading';
      photo.uploadAttempts++;
      photo.lastAttemptAt = new Date().toISOString();

      // Notify progress callback
      this.notifyProgress(photo.id, {
        photoId: photo.id,
        progress: 0,
        status: 'uploading',
      });

      // Simulate upload progress (in real implementation, this would come from the upload service)
      const progressInterval = setInterval(() => {
        const currentProgress = Math.min(90, Math.random() * 80 + 10);
        this.notifyProgress(photo.id, {
          photoId: photo.id,
          progress: currentProgress,
          status: 'uploading',
        });
      }, 500);

      // Perform the actual upload
      const uploadResult = await supabaseHelpers.uploadIntakeMedia(
        photo.localUri,
        photo.intakeId,
        photo.metadata
      );

      clearInterval(progressInterval);

      // Update photo with upload result
      photo.status = 'completed';
      photo.error = undefined;

      // Notify completion
      this.notifyProgress(photo.id, {
        photoId: photo.id,
        progress: 100,
        status: 'completed',
      });

      console.log(`Successfully uploaded photo ${photo.id}`);
    } catch (error) {
      console.error(`Failed to upload photo ${photo.id}:`, error);
      
      photo.status = 'failed';
      photo.error = error instanceof Error ? error.message : 'Unknown error';

      // Notify failure
      this.notifyProgress(photo.id, {
        photoId: photo.id,
        progress: 0,
        status: 'failed',
        error: photo.error,
      });

      // Schedule retry if we haven't exceeded max attempts
      if (photo.uploadAttempts < OfflinePhotoQueueService.MAX_RETRY_ATTEMPTS) {
        this.scheduleRetry(photo);
      }
    }
  }

  /**
   * Schedule a retry for a failed upload
   */
  private scheduleRetry(photo: QueuedPhoto): void {
    const delay = Math.min(
      OfflinePhotoQueueService.INITIAL_RETRY_DELAY * Math.pow(2, photo.uploadAttempts - 1),
      OfflinePhotoQueueService.MAX_RETRY_DELAY
    );

    console.log(`Scheduling retry for photo ${photo.id} in ${delay}ms (attempt ${photo.uploadAttempts})`);

    const timeout = setTimeout(() => {
      photo.status = 'pending';
      this.retryTimeouts.delete(photo.id);
      this.processQueue();
    }, delay);

    this.retryTimeouts.set(photo.id, timeout);
  }

  /**
   * Setup network connectivity listener
   */
  private setupNetworkListener(): void {
    this.networkListener = NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isProcessing) {
        const pendingPhotos = this.queue.filter(photo => photo.status === 'pending');
        if (pendingPhotos.length > 0) {
          console.log('Network reconnected, processing photo queue');
          this.processQueue();
        }
      }
    });
  }

  /**
   * Notify progress callback
   */
  private notifyProgress(photoId: string, progress: UploadProgress): void {
    const callback = this.progressCallbacks.get(photoId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Load queue from storage
   */
  private async loadQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(OfflinePhotoQueueService.STORAGE_KEY);
      if (queueData) {
        this.queue = JSON.parse(queueData);
        
        // Reset uploading status to pending (in case app was closed during upload)
        this.queue.forEach(photo => {
          if (photo.status === 'uploading') {
            photo.status = 'pending';
          }
        });
      }
    } catch (error) {
      console.error('Failed to load photo queue from storage:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to storage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        OfflinePhotoQueueService.STORAGE_KEY,
        JSON.stringify(this.queue)
      );
    } catch (error) {
      console.error('Failed to save photo queue to storage:', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear all retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();

    // Clear progress callbacks
    this.progressCallbacks.clear();

    // Remove network listener
    if (this.networkListener) {
      this.networkListener();
    }

    this.isProcessing = false;
  }
}

// Export singleton instance
export const offlinePhotoQueueService = new OfflinePhotoQueueService();
export default offlinePhotoQueueService;