/**
 * Photo Upload Queue - Offline-aware automatic upload processing
 * Handles network state changes and automatic retry with exponential backoff
 */

import NetInfo from '@react-native-community/netinfo';
import { usePhotoStore } from './store';
import { uploadPhoto } from './utils';
import { getRetryDelay, shouldRetryPhotoOperation, mapPhotoError } from '../../lib/errors/photoErrors';
import { DEFAULT_PHOTO_CONFIG } from './types';

interface QueueState {
  isProcessing: boolean;
  isOnline: boolean;
  processingPhotoId: string | null;
  retryTimeouts: Map<string, NodeJS.Timeout>;
}

class PhotoUploadQueue {
  private state: QueueState = {
    isProcessing: false,
    isOnline: false,
    processingPhotoId: null,
    retryTimeouts: new Map(),
  };

  private netInfoUnsubscribe: (() => void) | null = null;
  private isAuthenticated: () => boolean = () => true; // Default to authenticated

  /**
   * Start the upload queue - subscribes to network changes and begins processing
   */
  public start(isAuthenticatedFn?: () => boolean): void {
    console.log('Starting photo upload queue...');
    
    if (isAuthenticatedFn) {
      this.isAuthenticated = isAuthenticatedFn;
    }

    // Subscribe to network state changes
    this.netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      const wasOnline = this.state.isOnline;
      this.state.isOnline = state.isConnected === true && state.isInternetReachable === true;
      
      console.log(`Network state changed: ${wasOnline ? 'online' : 'offline'} → ${this.state.isOnline ? 'online' : 'offline'}`);
      
      // If we just came online, start processing the queue
      if (!wasOnline && this.state.isOnline) {
        console.log('Network restored - starting queue processing');
        this.processQueue();
      }
    });

    // Get initial network state and start processing if online
    NetInfo.fetch().then((state) => {
      this.state.isOnline = state.isConnected === true && state.isInternetReachable === true;
      console.log(`Initial network state: ${this.state.isOnline ? 'online' : 'offline'}`);
      
      if (this.state.isOnline) {
        this.processQueue();
      }
    });
  }

  /**
   * Stop the upload queue and clean up subscriptions
   */
  public stop(): void {
    console.log('Stopping photo upload queue...');
    
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    // Clear all retry timeouts
    this.state.retryTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.state.retryTimeouts.clear();

    this.state.isProcessing = false;
    this.state.processingPhotoId = null;
  }

  /**
   * Process the upload queue - uploads photos one at a time
   */
  private async processQueue(): Promise<void> {
    // Don't start processing if already processing or offline
    if (this.state.isProcessing || !this.state.isOnline) {
      return;
    }

    // Check authentication
    if (!this.isAuthenticated()) {
      console.log('User not authenticated - skipping queue processing');
      return;
    }

    this.state.isProcessing = true;

    try {
      const store = usePhotoStore.getState();
      
      // Get photos that need uploading (queued or error with retry available)
      const queuedPhotos = store.getByStatus('queued');
      const errorPhotos = store.getByStatus('error').filter(photo => {
        const attempts = photo.uploadAttempts || 0;
        return attempts < DEFAULT_PHOTO_CONFIG.maxRetries && this.canRetryNow(photo.id);
      });

      const photosToProcess = [...queuedPhotos, ...errorPhotos];
      
      if (photosToProcess.length === 0) {
        console.log('No photos to process in queue');
        this.state.isProcessing = false;
        return;
      }

      console.log(`Processing ${photosToProcess.length} photos in queue`);

      // Process photos one at a time
      for (const photo of photosToProcess) {
        // Check if we're still online and authenticated
        if (!this.state.isOnline || !this.isAuthenticated()) {
          console.log('Going offline or unauthenticated - stopping queue processing');
          break;
        }

        this.state.processingPhotoId = photo.id;
        
        try {
          console.log(`Uploading photo ${photo.id}...`);
          await uploadPhoto(photo.id);
          console.log(`Successfully uploaded photo ${photo.id}`);
          
          // Small delay between uploads to avoid overwhelming the server
          await this.delay(1000);
          
        } catch (error: any) {
          console.error(`Failed to upload photo ${photo.id}:`, error);
          
          // Map the error to determine if we should retry
          const photoError = mapPhotoError(error, {
            photoId: photo.id,
            intakeId: photo.intakeId,
            operation: 'upload',
          });

          if (shouldRetryPhotoOperation(photoError)) {
            this.scheduleRetry(photo.id, (photo.uploadAttempts || 0) + 1);
          }
        }
      }

    } catch (error) {
      console.error('Error processing upload queue:', error);
    } finally {
      this.state.isProcessing = false;
      this.state.processingPhotoId = null;
    }
  }

  /**
   * Schedule a retry for a failed photo upload
   */
  private scheduleRetry(photoId: string, attemptNumber: number): void {
    // Clear any existing retry timeout for this photo
    const existingTimeout = this.state.retryTimeouts.get(photoId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Calculate retry delay with exponential backoff
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay);
    
    console.log(`Scheduling retry for photo ${photoId} in ${delay}ms (attempt ${attemptNumber})`);

    // Update photo with next retry time
    const store = usePhotoStore.getState();
    const nextRetryAt = new Date(Date.now() + delay).toISOString();
    
    // Set the photo to error status with retry info
    store.setError(photoId, `Upload failed. Retrying in ${Math.round(delay / 1000)}s...`);
    
    // Update the photo with retry timing
    const photo = store.getById(photoId);
    if (photo) {
      store.photos[photoId] = {
        ...photo,
        nextRetryAt,
        uploadAttempts: attemptNumber,
      };
      store.persist();
    }

    // Schedule the retry
    const timeout = setTimeout(() => {
      this.state.retryTimeouts.delete(photoId);
      
      // Re-queue the photo for upload
      const currentPhoto = store.getById(photoId);
      if (currentPhoto && currentPhoto.status === 'error') {
        store.enqueue(photoId);
        
        // Start processing if we're online
        if (this.state.isOnline && this.isAuthenticated()) {
          this.processQueue();
        }
      }
    }, delay);

    this.state.retryTimeouts.set(photoId, timeout);
  }

  /**
   * Check if a photo can be retried now (past its retry time)
   */
  private canRetryNow(photoId: string): boolean {
    const store = usePhotoStore.getState();
    const photo = store.getById(photoId);
    
    if (!photo || !photo.nextRetryAt) {
      return true; // No retry time set, can retry now
    }

    const nextRetryTime = new Date(photo.nextRetryAt).getTime();
    const now = Date.now();
    
    return now >= nextRetryTime;
  }

  /**
   * Utility function to create a delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current queue status
   */
  public getStatus() {
    const store = usePhotoStore.getState();
    const queuedCount = store.getByStatus('queued').length;
    const errorCount = store.getByStatus('error').length;
    const retryCount = this.state.retryTimeouts.size;

    return {
      isProcessing: this.state.isProcessing,
      isOnline: this.state.isOnline,
      processingPhotoId: this.state.processingPhotoId,
      queuedCount,
      errorCount,
      retryCount,
      totalPending: queuedCount + errorCount,
    };
  }

  /**
   * Manually trigger queue processing (useful for testing or manual retry)
   */
  public triggerProcessing(): void {
    if (this.state.isOnline && this.isAuthenticated()) {
      console.log('Manually triggering queue processing');
      this.processQueue();
    } else {
      console.log('Cannot trigger processing - offline or unauthenticated');
    }
  }

  /**
   * Clear all retry timeouts for a specific photo
   */
  public clearRetry(photoId: string): void {
    const timeout = this.state.retryTimeouts.get(photoId);
    if (timeout) {
      clearTimeout(timeout);
      this.state.retryTimeouts.delete(photoId);
      console.log(`Cleared retry timeout for photo ${photoId}`);
    }
  }
}

// Create singleton instance
export const photoUploadQueue = new PhotoUploadQueue();

/**
 * Start the photo upload queue
 * Call this from App.tsx after hydration
 */
export const startPhotoUploadQueue = (isAuthenticatedFn?: () => boolean): void => {
  photoUploadQueue.start(isAuthenticatedFn);
};

/**
 * Stop the photo upload queue
 * Call this when the app is being closed or user logs out
 */
export const stopPhotoUploadQueue = (): void => {
  photoUploadQueue.stop();
};

/**
 * Get current queue status
 */
export const getPhotoUploadQueueStatus = () => {
  return photoUploadQueue.getStatus();
};

/**
 * Manually trigger queue processing
 */
export const triggerPhotoUploadQueue = (): void => {
  photoUploadQueue.triggerProcessing();
};

/**
 * Clear retry for a specific photo
 */
export const clearPhotoRetry = (photoId: string): void => {
  photoUploadQueue.clearRetry(photoId);
};