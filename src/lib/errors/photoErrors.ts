/**
 * Photo Error Handling - Centralized error mapping and classification
 * Maps common photo operation errors to user-friendly messages
 */

export enum PhotoErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED', 
  NETWORK_ERROR = 'NETWORK_ERROR',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  SERVER_ERROR = 'SERVER_ERROR',
  STORAGE_FULL = 'STORAGE_FULL',
  CAMERA_ERROR = 'CAMERA_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface PhotoError {
  type: PhotoErrorType;
  message: string;
  userMessage: string;
  isRetryable: boolean;
  shouldLog: boolean;
  context?: {
    photoId?: string;
    intakeId?: string;
    operation?: string;
    originalError?: any;
  };
}

/**
 * Maps raw errors to structured PhotoError objects
 */
export const mapPhotoError = (
  error: any,
  context?: {
    photoId?: string;
    intakeId?: string;
    operation?: string;
  }
): PhotoError => {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  const errorCode = error?.code || error?.status || error?.statusCode;

  // File system errors - ENOENT (local file missing)
  if (errorCode === 'ENOENT' || errorMessage.includes('ENOENT') || errorMessage.includes('file not found')) {
    return {
      type: PhotoErrorType.FILE_NOT_FOUND,
      message: 'Local photo file not found',
      userMessage: 'Photo file is missing. Please try taking the photo again.',
      isRetryable: false,
      shouldLog: true,
      context: { ...context, originalError: error },
    };
  }

  // Permission errors - EACCES
  if (errorCode === 'EACCES' || errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
    return {
      type: PhotoErrorType.PERMISSION_DENIED,
      message: 'Permission denied accessing photo file',
      userMessage: 'Permission denied. Please check app permissions and try again.',
      isRetryable: true,
      shouldLog: true,
      context: { ...context, originalError: error },
    };
  }

  // Network errors
  if (
    errorCode === 'NETWORK_ERROR' ||
    errorMessage.toLowerCase().includes('network') ||
    errorMessage.toLowerCase().includes('fetch') ||
    errorMessage.toLowerCase().includes('timeout') ||
    errorCode === 'ENOTFOUND' ||
    errorCode === 'ECONNREFUSED'
  ) {
    return {
      type: PhotoErrorType.NETWORK_ERROR,
      message: 'Network error during photo operation',
      userMessage: 'Network error. Please check your connection and try again.',
      isRetryable: true,
      shouldLog: true,
      context: { ...context, originalError: error },
    };
  }

  // HTTP 413 - Payload too large
  if (errorCode === 413 || errorMessage.includes('413') || errorMessage.includes('payload too large')) {
    return {
      type: PhotoErrorType.FILE_TOO_LARGE,
      message: 'Photo file is too large',
      userMessage: 'Photo is too large. Please try a smaller image or compress it.',
      isRetryable: false,
      shouldLog: true,
      context: { ...context, originalError: error },
    };
  }

  // HTTP 415 - Unsupported media type
  if (errorCode === 415 || errorMessage.includes('415') || errorMessage.includes('unsupported media')) {
    return {
      type: PhotoErrorType.UNSUPPORTED_FORMAT,
      message: 'Unsupported photo format',
      userMessage: 'Photo format not supported. Please use JPG or PNG format.',
      isRetryable: false,
      shouldLog: true,
      context: { ...context, originalError: error },
    };
  }

  // Server errors (5xx - retryable)
  if (
    (typeof errorCode === 'number' && errorCode >= 500 && errorCode < 600) ||
    errorMessage.includes('500') ||
    errorMessage.includes('502') ||
    errorMessage.includes('503') ||
    errorMessage.includes('504')
  ) {
    return {
      type: PhotoErrorType.SERVER_ERROR,
      message: `Server error: ${errorCode || 'Unknown'}`,
      userMessage: 'Server temporarily unavailable. Please try again in a moment.',
      isRetryable: true,
      shouldLog: true,
      context: { ...context, originalError: error },
    };
  }

  // Storage errors
  if (errorMessage.includes('storage') && errorMessage.includes('full')) {
    return {
      type: PhotoErrorType.STORAGE_FULL,
      message: 'Device storage is full',
      userMessage: 'Not enough storage space. Please free up some space and try again.',
      isRetryable: false,
      shouldLog: true,
      context: { ...context, originalError: error },
    };
  }

  // Camera errors
  if (
    errorMessage.includes('camera') ||
    errorMessage.includes('Camera') ||
    errorCode === 'camera_unavailable'
  ) {
    return {
      type: PhotoErrorType.CAMERA_ERROR,
      message: 'Camera error',
      userMessage: 'Camera unavailable. Please check camera permissions and try again.',
      isRetryable: true,
      shouldLog: true,
      context: { ...context, originalError: error },
    };
  }

  // Default unknown error
  return {
    type: PhotoErrorType.UNKNOWN_ERROR,
    message: errorMessage,
    userMessage: 'Something went wrong. Please try again.',
    isRetryable: true,
    shouldLog: true,
    context: { ...context, originalError: error },
  };
};

/**
 * Get user-friendly error messages for specific operations
 */
export const getPhotoOperationErrorMessage = (
  operation: 'capture' | 'upload' | 'delete' | 'load',
  error: PhotoError
): string => {
  switch (operation) {
    case 'capture':
      if (error.type === PhotoErrorType.CAMERA_ERROR) {
        return "Couldn't save photo. Try again.";
      }
      if (error.type === PhotoErrorType.PERMISSION_DENIED) {
        return "Camera permission needed. Check settings.";
      }
      if (error.type === PhotoErrorType.STORAGE_FULL) {
        return "Not enough storage space.";
      }
      return "Couldn't save photo. Try again.";

    case 'upload':
      if (error.type === PhotoErrorType.NETWORK_ERROR) {
        return "Upload failed. Check connection.";
      }
      if (error.type === PhotoErrorType.FILE_TOO_LARGE) {
        return "Photo too large. Try a smaller image.";
      }
      if (error.type === PhotoErrorType.SERVER_ERROR) {
        return "Server busy. Try again shortly.";
      }
      return "Upload failed. Try again.";

    case 'delete':
      if (error.type === PhotoErrorType.PERMISSION_DENIED) {
        return "Can't delete photo. Check permissions.";
      }
      return "Couldn't delete photo. Try again.";

    case 'load':
      if (error.type === PhotoErrorType.FILE_NOT_FOUND) {
        return "Photo not found.";
      }
      if (error.type === PhotoErrorType.NETWORK_ERROR) {
        return "Can't load photo. Check connection.";
      }
      return "Couldn't load photo. Try again.";

    default:
      return error.userMessage;
  }
};

/**
 * Log photo error with breadcrumbs
 */
export const logPhotoError = (error: PhotoError): void => {
  if (!error.shouldLog) return;

  const logData = {
    type: error.type,
    message: error.message,
    photoId: error.context?.photoId,
    intakeId: error.context?.intakeId,
    operation: error.context?.operation,
    timestamp: new Date().toISOString(),
    isRetryable: error.isRetryable,
  };

  // Use existing logger if available, otherwise console.warn
  if (typeof console !== 'undefined') {
    console.warn('[PhotoError]', logData, error.context?.originalError);
  }

  // TODO: Integrate with existing analytics/logging service
  // Example: analyticsService.logError('photo_error', logData);
};

/**
 * Check if error should trigger a retry
 */
export const shouldRetryPhotoOperation = (error: PhotoError): boolean => {
  return error.isRetryable && error.type !== PhotoErrorType.FILE_NOT_FOUND;
};

/**
 * Get retry delay based on error type (in milliseconds)
 */
export const getRetryDelay = (error: PhotoError, attemptNumber: number): number => {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  let multiplier = 1;

  switch (error.type) {
    case PhotoErrorType.NETWORK_ERROR:
      multiplier = 2; // Exponential backoff for network errors
      break;
    case PhotoErrorType.SERVER_ERROR:
      multiplier = 3; // Longer delay for server errors
      break;
    default:
      multiplier = 1.5;
  }

  const delay = Math.min(baseDelay * Math.pow(multiplier, attemptNumber - 1), maxDelay);
  return delay;
};