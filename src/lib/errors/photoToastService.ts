/**
 * Photo Toast Service - User-friendly error notifications with retry actions
 * Integrates with existing Toast context for consistent UX
 */

import { PhotoError, getPhotoOperationErrorMessage, PhotoErrorType } from './photoErrors';

export interface PhotoToastAction {
  label: string;
  onPress: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface PhotoToastOptions {
  duration?: number;
  action?: PhotoToastAction;
  persistent?: boolean;
}

/**
 * Show photo error toast with appropriate message and retry action
 */
export const showPhotoErrorToast = (
  error: PhotoError,
  operation: 'capture' | 'upload' | 'delete' | 'load',
  onRetry?: () => void,
  showToast?: (message: string, type: 'error' | 'success' | 'info', options?: any) => void
): void => {
  const message = getPhotoOperationErrorMessage(operation, error);
  
  const options: PhotoToastOptions = {
    duration: error.isRetryable ? 6000 : 4000, // Longer duration for retryable errors
    persistent: error.type === PhotoErrorType.PERMISSION_DENIED, // Keep permission errors visible
  };

  // Add retry action for retryable errors
  if (error.isRetryable && onRetry) {
    options.action = {
      label: 'Retry',
      onPress: onRetry,
      style: 'primary',
    };
  }

  // Use existing toast service if available
  if (showToast) {
    showToast(message, 'error', options);
  } else {
    // Fallback to console if no toast service
    console.warn('[PhotoToast]', message, options);
  }
};

/**
 * Show success toast for photo operations
 */
export const showPhotoSuccessToast = (
  operation: 'capture' | 'upload' | 'delete',
  showToast?: (message: string, type: 'error' | 'success' | 'info', options?: any) => void
): void => {
  let message = '';
  
  switch (operation) {
    case 'capture':
      message = 'Photo saved successfully';
      break;
    case 'upload':
      message = 'Photo uploaded successfully';
      break;
    case 'delete':
      message = 'Photo deleted successfully';
      break;
  }

  if (showToast) {
    showToast(message, 'success', { duration: 3000 });
  } else {
    console.log('[PhotoToast]', message);
  }
};

/**
 * Show photo operation progress toast
 */
export const showPhotoProgressToast = (
  operation: 'uploading' | 'processing',
  progress?: number,
  showToast?: (message: string, type: 'error' | 'success' | 'info', options?: any) => void
): void => {
  let message = '';
  
  switch (operation) {
    case 'uploading':
      message = progress ? `Uploading photo... ${Math.round(progress)}%` : 'Uploading photo...';
      break;
    case 'processing':
      message = 'Processing photo...';
      break;
  }

  if (showToast) {
    showToast(message, 'info', { duration: 1000 });
  } else {
    console.log('[PhotoToast]', message);
  }
};

/**
 * Specific toast messages for common photo scenarios
 */
export const PhotoToastMessages = {
  // Capture errors
  CAPTURE_FAILED: "Couldn't save photo. Try again.",
  CAMERA_PERMISSION: "Camera permission needed. Check settings.",
  STORAGE_FULL: "Not enough storage space.",
  
  // Upload errors
  UPLOAD_FAILED: "Upload failed. Try again.",
  UPLOAD_NETWORK: "Upload failed. Check connection.",
  UPLOAD_TOO_LARGE: "Photo too large. Try a smaller image.",
  UPLOAD_SERVER_ERROR: "Server busy. Try again shortly.",
  
  // Success messages
  PHOTO_SAVED: "Photo saved successfully",
  PHOTO_UPLOADED: "Photo uploaded successfully",
  PHOTO_DELETED: "Photo deleted successfully",
  
  // Progress messages
  UPLOADING: "Uploading photo...",
  PROCESSING: "Processing photo...",
} as const;