/**
 * Photo Selectors - Memoized selectors for photo data
 * Provides optimized data access with reselect memoization
 */

import { createSelector } from 'reselect';
import { usePhotoStore } from './store';
import { Photo, PhotoStatus } from './types';

// Base selectors
const selectPhotos = () => usePhotoStore.getState().photos;
const selectUploadQueue = () => usePhotoStore.getState().uploadQueue;

// Memoized selectors using reselect
export const selectAllPhotos = createSelector(
  [selectPhotos],
  (photos) => Object.values(photos)
);

export const selectPhotosByIntake = createSelector(
  [selectPhotos, (_: any, intakeId: string) => intakeId],
  (photos, intakeId) => 
    Object.values(photos)
      .filter(photo => photo.intakeId === intakeId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
);

export const selectPhotosByStatus = createSelector(
  [selectPhotos, (_: any, status: PhotoStatus) => status],
  (photos, status) =>
    Object.values(photos)
      .filter(photo => photo.status === status)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
);

export const selectQueuedPhotos = createSelector(
  [selectPhotos, selectUploadQueue],
  (photos, uploadQueue) =>
    uploadQueue
      .map(id => photos[id])
      .filter(Boolean)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
);

export const selectPhotoById = createSelector(
  [selectPhotos, (_: any, photoId: string) => photoId],
  (photos, photoId) => photos[photoId]
);

export const selectPhotoStats = createSelector(
  [selectPhotos, selectUploadQueue],
  (photos, uploadQueue) => {
    const photoArray = Object.values(photos);
    const byStatus: Record<PhotoStatus, number> = {
      local: 0,
      queued: 0,
      uploading: 0,
      uploaded: 0,
      error: 0,
    };

    photoArray.forEach(photo => {
      byStatus[photo.status]++;
    });

    return {
      total: photoArray.length,
      byStatus,
      queueLength: uploadQueue.length,
    };
  }
);

export const selectUploadProgress = createSelector(
  [selectPhotos],
  (photos) => {
    const uploadingPhotos = Object.values(photos).filter(photo => photo.status === 'uploading');
    if (uploadingPhotos.length === 0) return null;

    const totalProgress = uploadingPhotos.reduce((sum, photo) => sum + (photo.uploadProgress || 0), 0);
    return {
      averageProgress: totalProgress / uploadingPhotos.length,
      uploadingCount: uploadingPhotos.length,
      photos: uploadingPhotos,
    };
  }
);

// Hook-based selectors for React components
export const usePhotosByIntake = (intakeId: string): Photo[] => {
  return usePhotoStore(state => 
    selectPhotosByIntake(state, intakeId)
  );
};

export const usePhotosByStatus = (status: PhotoStatus): Photo[] => {
  return usePhotoStore(state => 
    selectPhotosByStatus(state, status)
  );
};

export const usePhotoById = (photoId: string): Photo | undefined => {
  return usePhotoStore(state => 
    selectPhotoById(state, photoId)
  );
};

export const usePhotoStats = () => {
  return usePhotoStore(state => 
    selectPhotoStats(state)
  );
};

export const useUploadProgress = () => {
  return usePhotoStore(state => 
    selectUploadProgress(state)
  );
};