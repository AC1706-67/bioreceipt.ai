/**
 * Photo Management - Main Export
 * Single source of truth for photo management
 */

// Types
export type {
  Photo,
  PhotoStatus,
  PhotoState,
  PhotoActions,
  PhotoStore,
  PhotoEvent,
  PhotoConfig,
} from './types';

export { DEFAULT_PHOTO_CONFIG } from './types';

// Store
export { usePhotoStore, initializePhotoStore, photoSelectors } from './store';

// Utilities
export {
  saveLocal,
  enqueueUpload,
  uploadPhoto,
  markUploaded,
  listByIntake,
  processUploadQueue,
  purgeOrphans,
  cleanupTempFiles,
  getStorageStats,
  retryFailedUploads,
  initializePhotoManagement,
  initializePhotoStorage,
  getPhotoInfo,
  deleteLocal,
} from './utils';

// Hooks
export {
  usePhotoManager,
  useIntakePhotos,
  usePhotoUploadQueue,
  usePhotoStats,
} from './usePhotoManager';

// Legacy exports for backward compatibility
export type { IntakePhoto } from './selectors';
export { getPhotosByIntake, getPhotosByIntakes } from './selectors';