/**
 * Photo Manager Hook
 * React hook for photo management operations
 */

import { useCallback, useEffect } from 'react';
import { usePhotoStore } from './store';
import { Photo, PhotoStatus } from './types';
import { 
  saveLocal, 
  enqueueUpload, 
  uploadPhoto, 
  markUploaded, 
  listByIntake,
  processUploadQueue,
  purgeOrphans,
  retryFailedUploads,
  initializePhotoManagement,
} from './utils';
import { showPhotoErrorToast, showPhotoSuccessToast } from '../../lib/errors/photoToastService';
import { useToast } from '../../contexts/ToastContext';

export const usePhotoManager = () => {
  const store = usePhotoStore();
  const { showError, showSuccess } = useToast();

  // Initialize on first use
  useEffect(() => {
    initializePhotoManagement().catch(console.error);
  }, []);

  // Core operations
  const addPhoto = useCallback(async (
    intakeId: string, 
    tempUri: string, 
    metadata?: Photo['metadata']
  ): Promise<string> => {
    try {
      // Save to persistent storage
      const uriLocal = await saveLocal(tempUri, intakeId);
      
      // Add to store
      const photoId = store.addLocal(intakeId, uriLocal, metadata);
      
      showSuccess('Photo saved successfully');
      return photoId;
    } catch (error: any) {
      console.error('Failed to add photo:', error);
      showError("Couldn't save photo. Try again.");
      throw error;
    }
  }, [store, showSuccess, showError]);

  const removePhoto = useCallback((photoId: string) => {
    store.remove(photoId);
  }, [store]);

  const uploadPhotoById = useCallback(async (photoId: string): Promise<string> => {
    try {
      const result = await uploadPhoto(photoId);
      showSuccess('Photo uploaded successfully');
      return result;
    } catch (error: any) {
      console.error('Failed to upload photo:', error);
      showError(
        error.userMessage || 'Upload failed. Try again.',
        'Retry',
        () => uploadPhotoById(photoId)
      );
      throw error;
    }
  }, [showSuccess, showError]);

  const enqueuePhotoUpload = useCallback((photoId: string) => {
    enqueueUpload(photoId);
  }, []);

  const markPhotoUploaded = useCallback((photoId: string, uriRemote: string) => {
    markUploaded(photoId, uriRemote);
  }, []);

  // Batch operations
  const processQueue = useCallback(async () => {
    await processUploadQueue();
  }, []);

  const retryFailed = useCallback(async () => {
    await retryFailedUploads();
  }, []);

  const cleanupOrphans = useCallback(async (validIntakeIds: string[]) => {
    return await purgeOrphans(validIntakeIds);
  }, []);

  // Selectors
  const getPhotosByIntake = useCallback((intakeId: string): Photo[] => {
    return store.getByIntake(intakeId);
  }, [store]);

  const getPhotoById = useCallback((photoId: string): Photo | undefined => {
    return store.getById(photoId);
  }, [store]);

  const getPhotosByStatus = useCallback((status: PhotoStatus): Photo[] => {
    return store.getByStatus(status);
  }, [store]);

  const getQueuedPhotos = useCallback((): Photo[] => {
    return store.getQueuedPhotos();
  }, [store]);

  const getStats = useCallback(() => {
    return store.getStats();
  }, [store]);

  // Status checks
  const isUploading = store.isUploading;
  const queueLength = store.uploadQueue.length;
  const hasErrors = store.getByStatus('error').length > 0;
  const hasLocal = store.getByStatus('local').length > 0;

  return {
    // Core operations
    addPhoto,
    removePhoto,
    uploadPhotoById,
    enqueuePhotoUpload,
    markPhotoUploaded,

    // Batch operations
    processQueue,
    retryFailed,
    cleanupOrphans,

    // Selectors
    getPhotosByIntake,
    getPhotoById,
    getPhotosByStatus,
    getQueuedPhotos,
    getStats,

    // Status
    isUploading,
    queueLength,
    hasErrors,
    hasLocal,

    // Store actions (for advanced usage)
    store,
  };
};

// Convenience hooks for specific use cases
export const useIntakePhotos = (intakeId: string) => {
  const { getPhotosByIntake } = usePhotoManager();
  return getPhotosByIntake(intakeId);
};

export const usePhotoUploadQueue = () => {
  const { getQueuedPhotos, processQueue, isUploading, queueLength } = usePhotoManager();
  
  return {
    queuedPhotos: getQueuedPhotos(),
    processQueue,
    isUploading,
    queueLength,
  };
};

export const usePhotoStats = () => {
  const { getStats, hasErrors, hasLocal } = usePhotoManager();
  
  return {
    stats: getStats(),
    hasErrors,
    hasLocal,
  };
};