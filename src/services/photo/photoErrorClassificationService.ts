/**
 * Photo Error Classification Service
 * Classifies and provides user-friendly error messages for photo operations
 */

export enum PhotoErrorType {
  CAMERA_PERMISSION_DENIED = 'CAMERA_PERMISSION_DENIED',
  CAMERA_UNAVAILABLE = 'CAMERA_UNAVAILABLE',
  STORAGE_PERMISSION_DENIED = 'STORAGE_PERMISSION_DENIED',
  STORAGE_FULL = 'STORAGE_FULL',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
  CAPTURE_FAILED = 'CAPTURE_FAILED',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  DELETION_FAILED = 'DELETION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum PhotoErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface PhotoErrorInfo {
  type: PhotoErrorType;
  severity: PhotoErrorSeverity;
  title: string;
  message: string;
  userMessage: string;
  recoveryOptions: PhotoRecoveryOption[];
  shouldRetry: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface PhotoRecoveryOption {
  id: string;
  label: string;
  action: 'retry' | 'settings' | 'alternative' | 'dismiss' | 'contact_support';
  description?: string;
  icon?: string;
}

class PhotoErrorClassificationService {
  private readonly errorMap: Map<PhotoErrorType, PhotoErrorInfo> = new Map();

  constructor() {
    this.initializeErrorMap();
  }

  /**
   * Classify an error and return error information
   */
  classifyError(error: Error | string | any): PhotoErrorInfo {
    const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';
    const errorCode = error?.code;
    
    // Try to classify based on error message patterns
    const errorType = this.detectErrorType(errorMessage, errorCode);
    
    const errorInfo = this.errorMap.get(errorType) || this.errorMap.get(PhotoErrorType.UNKNOWN_ERROR)!;
    
    // Customize the error info with specific details if available
    return {
      ...errorInfo,
      message: errorMessage,
    };
  }

  /**
   * Get user-friendly error message for display
   */
  getUserFriendlyMessage(error: Error | string | any): string {
    const errorInfo = this.classifyError(error);
    return errorInfo.userMessage;
  }

  /**
   * Get recovery options for an error
   */
  getRecoveryOptions(error: Error | string | any): PhotoRecoveryOption[] {
    const errorInfo = this.classifyError(error);
    return errorInfo.recoveryOptions;
  }

  /**
   * Check if an error should trigger a retry
   */
  shouldRetry(error: Error | string | any): boolean {
    const errorInfo = this.classifyError(error);
    return errorInfo.shouldRetry;
  }

  /**
   * Get retry configuration for an error
   */
  getRetryConfig(error: Error | string | any): { maxRetries: number; delay: number } {
    const errorInfo = this.classifyError(error);
    return {
      maxRetries: errorInfo.maxRetries || 3,
      delay: errorInfo.retryDelay || 1000,
    };
  }

  /**
   * Detect error type based on error message and code
   */
  private detectErrorType(message: string, code?: string): PhotoErrorType {
    const lowerMessage = message.toLowerCase();
    
    // Permission errors
    if (lowerMessage.includes('permission') && lowerMessage.includes('camera')) {
      return PhotoErrorType.CAMERA_PERMISSION_DENIED;
    }
    if (lowerMessage.includes('permission') && (lowerMessage.includes('storage') || lowerMessage.includes('write'))) {
      return PhotoErrorType.STORAGE_PERMISSION_DENIED;
    }
    
    // Camera errors
    if (lowerMessage.includes('camera') && (lowerMessage.includes('unavailable') || lowerMessage.includes('not available'))) {
      return PhotoErrorType.CAMERA_UNAVAILABLE;
    }
    if (lowerMessage.includes('capture') && lowerMessage.includes('failed')) {
      return PhotoErrorType.CAPTURE_FAILED;
    }
    
    // Storage errors
    if (lowerMessage.includes('storage') && (lowerMessage.includes('full') || lowerMessage.includes('space'))) {
      return PhotoErrorType.STORAGE_FULL;
    }
    
    // Network errors
    if (lowerMessage.includes('network') || lowerMessage.includes('connection') || lowerMessage.includes('timeout')) {
      return PhotoErrorType.NETWORK_ERROR;
    }
    
    // Upload errors
    if (lowerMessage.includes('upload') && lowerMessage.includes('failed')) {
      return PhotoErrorType.UPLOAD_FAILED;
    }
    
    // File errors
    if (lowerMessage.includes('file') && (lowerMessage.includes('large') || lowerMessage.includes('size'))) {
      return PhotoErrorType.FILE_TOO_LARGE;
    }
    if (lowerMessage.includes('format') || lowerMessage.includes('invalid') || lowerMessage.includes('unsupported')) {
      return PhotoErrorType.INVALID_FILE_FORMAT;
    }
    
    // Processing errors
    if (lowerMessage.includes('processing') || lowerMessage.includes('compress') || lowerMessage.includes('resize')) {
      return PhotoErrorType.PROCESSING_FAILED;
    }
    
    // Deletion errors
    if (lowerMessage.includes('delete') && lowerMessage.includes('failed')) {
      return PhotoErrorType.DELETION_FAILED;
    }
    
    // Check error codes
    if (code) {
      switch (code) {
        case 'PERMISSION_DENIED':
          return PhotoErrorType.CAMERA_PERMISSION_DENIED;
        case 'CAMERA_UNAVAILABLE':
          return PhotoErrorType.CAMERA_UNAVAILABLE;
        case 'NETWORK_ERROR':
          return PhotoErrorType.NETWORK_ERROR;
        case 'STORAGE_FULL':
          return PhotoErrorType.STORAGE_FULL;
        default:
          break;
      }
    }
    
    return PhotoErrorType.UNKNOWN_ERROR;
  }

  /**
   * Initialize the error classification map
   */
  private initializeErrorMap(): void {
    this.errorMap.set(PhotoErrorType.CAMERA_PERMISSION_DENIED, {
      type: PhotoErrorType.CAMERA_PERMISSION_DENIED,
      severity: PhotoErrorSeverity.HIGH,
      title: 'Camera Permission Required',
      message: 'Camera permission is required to take photos',
      userMessage: 'We need camera permission to take photos. Please allow camera access in your device settings.',
      shouldRetry: false,
      recoveryOptions: [
        {
          id: 'open_settings',
          label: 'Open Settings',
          action: 'settings',
          description: 'Go to app settings to enable camera permission',
          icon: '⚙️',
        },
        {
          id: 'use_gallery',
          label: 'Choose from Gallery',
          action: 'alternative',
          description: 'Select a photo from your gallery instead',
          icon: '📷',
        },
        {
          id: 'dismiss',
          label: 'Not Now',
          action: 'dismiss',
          description: 'Continue without adding a photo',
        },
      ],
    });

    this.errorMap.set(PhotoErrorType.CAMERA_UNAVAILABLE, {
      type: PhotoErrorType.CAMERA_UNAVAILABLE,
      severity: PhotoErrorSeverity.MEDIUM,
      title: 'Camera Unavailable',
      message: 'Camera is currently unavailable',
      userMessage: 'The camera is currently being used by another app or is unavailable. Please try again in a moment.',
      shouldRetry: true,
      maxRetries: 3,
      retryDelay: 2000,
      recoveryOptions: [
        {
          id: 'retry',
          label: 'Try Again',
          action: 'retry',
          description: 'Attempt to access the camera again',
          icon: '🔄',
        },
        {
          id: 'use_gallery',
          label: 'Choose from Gallery',
          action: 'alternative',
          description: 'Select a photo from your gallery instead',
          icon: '📷',
        },
        {
          id: 'dismiss',
          label: 'Cancel',
          action: 'dismiss',
        },
      ],
    });

    this.errorMap.set(PhotoErrorType.STORAGE_PERMISSION_DENIED, {
      type: PhotoErrorType.STORAGE_PERMISSION_DENIED,
      severity: PhotoErrorSeverity.HIGH,
      title: 'Storage Permission Required',
      message: 'Storage permission is required to save photos',
      userMessage: 'We need storage permission to save your photos. Please allow storage access in your device settings.',
      shouldRetry: false,
      recoveryOptions: [
        {
          id: 'open_settings',
          label: 'Open Settings',
          action: 'settings',
          description: 'Go to app settings to enable storage permission',
          icon: '⚙️',
        },
        {
          id: 'dismiss',
          label: 'Not Now',
          action: 'dismiss',
        },
      ],
    });

    this.errorMap.set(PhotoErrorType.STORAGE_FULL, {
      type: PhotoErrorType.STORAGE_FULL,
      severity: PhotoErrorSeverity.HIGH,
      title: 'Storage Full',
      message: 'Device storage is full',
      userMessage: 'Your device storage is full. Please free up some space and try again.',
      shouldRetry: false,
      recoveryOptions: [
        {
          id: 'open_settings',
          label: 'Manage Storage',
          action: 'settings',
          description: 'Go to device settings to free up storage space',
          icon: '💾',
        },
        {
          id: 'dismiss',
          label: 'Cancel',
          action: 'dismiss',
        },
      ],
    });

    this.errorMap.set(PhotoErrorType.NETWORK_ERROR, {
      type: PhotoErrorType.NETWORK_ERROR,
      severity: PhotoErrorSeverity.MEDIUM,
      title: 'Network Error',
      message: 'Network connection failed',
      userMessage: 'Unable to upload photo due to network issues. Your photo will be saved and uploaded when connection is restored.',
      shouldRetry: true,
      maxRetries: 5,
      retryDelay: 2000,
      recoveryOptions: [
        {
          id: 'retry',
          label: 'Retry Now',
          action: 'retry',
          description: 'Try uploading again',
          icon: '🔄',
        },
        {
          id: 'save_offline',
          label: 'Save for Later',
          action: 'alternative',
          description: 'Photo will be uploaded when connection is restored',
          icon: '💾',
        },
        {
          id: 'dismiss',
          label: 'OK',
          action: 'dismiss',
        },
      ],
    });

    this.errorMap.set(PhotoErrorType.UPLOAD_FAILED, {
      type: PhotoErrorType.UPLOAD_FAILED,
      severity: PhotoErrorSeverity.MEDIUM,
      title: 'Upload Failed',
      message: 'Photo upload failed',
      userMessage: 'Failed to upload your photo. It will be saved locally and uploaded automatically when possible.',
      shouldRetry: true,
      maxRetries: 3,
      retryDelay: 3000,
      recoveryOptions: [
        {
          id: 'retry',
          label: 'Try Again',
          action: 'retry',
          description: 'Attempt to upload the photo again',
          icon: '🔄',
        },
        {
          id: 'save_offline',
          label: 'Save Locally',
          action: 'alternative',
          description: 'Keep photo locally for now',
          icon: '💾',
        },
        {
          id: 'dismiss',
          label: 'OK',
          action: 'dismiss',
        },
      ],
    });

    this.errorMap.set(PhotoErrorType.FILE_TOO_LARGE, {
      type: PhotoErrorType.FILE_TOO_LARGE,
      severity: PhotoErrorSeverity.MEDIUM,
      title: 'File Too Large',
      message: 'Photo file size exceeds limit',
      userMessage: 'The photo is too large to upload. We can compress it for you or you can choose a different photo.',
      shouldRetry: false,
      recoveryOptions: [
        {
          id: 'compress',
          label: 'Compress Photo',
          action: 'alternative',
          description: 'Reduce photo size and try again',
          icon: '🗜️',
        },
        {
          id: 'choose_different',
          label: 'Choose Different Photo',
          action: 'alternative',
          description: 'Select a different photo',
          icon: '📷',
        },
        {
          id: 'dismiss',
          label: 'Cancel',
          action: 'dismiss',
        },
      ],
    });

    this.errorMap.set(PhotoErrorType.INVALID_FILE_FORMAT, {
      type: PhotoErrorType.INVALID_FILE_FORMAT,
      severity: PhotoErrorSeverity.MEDIUM,
      title: 'Invalid File Format',
      message: 'Unsupported file format',
      userMessage: 'This file format is not supported. Please choose a JPEG or PNG image.',
      shouldRetry: false,
      recoveryOptions: [
        {
          id: 'choose_different',
          label: 'Choose Different Photo',
          action: 'alternative',
          description: 'Select a JPEG or PNG image',
          icon: '📷',
        },
        {
          id: 'dismiss',
          label: 'Cancel',
          action: 'dismiss',
        },
      ],
    });

    this.errorMap.set(PhotoErrorType.CAPTURE_FAILED, {
      type: PhotoErrorType.CAPTURE_FAILED,
      severity: PhotoErrorSeverity.MEDIUM,
      title: 'Capture Failed',
      message: 'Failed to capture photo',
      userMessage: 'Unable to take the photo. Please try again or choose a photo from your gallery.',
      shouldRetry: true,
      maxRetries: 2,
      retryDelay: 1000,
      recoveryOptions: [
        {
          id: 'retry',
          label: 'Try Again',
          action: 'retry',
          description: 'Attempt to take another photo',
          icon: '📸',
        },
        {
          id: 'use_gallery',
          label: 'Choose from Gallery',
          action: 'alternative',
          description: 'Select a photo from your gallery',
          icon: '📷',
        },
        {
          id: 'dismiss',
          label: 'Cancel',
          action: 'dismiss',
        },
      ],
    });

    this.errorMap.set(PhotoErrorType.PROCESSING_FAILED, {
      type: PhotoErrorType.PROCESSING_FAILED,
      severity: PhotoErrorSeverity.MEDIUM,
      title: 'Processing Failed',
      message: 'Photo processing failed',
      userMessage: 'Unable to process the photo. Please try with a different photo or try again later.',
      shouldRetry: true,
      maxRetries: 2,
      retryDelay: 2000,
      recoveryOptions: [
        {
          id: 'retry',
          label: 'Try Again',
          action: 'retry',
          description: 'Attempt to process the photo again',
          icon: '🔄',
        },
        {
          id: 'choose_different',
          label: 'Choose Different Photo',
          action: 'alternative',
          description: 'Select a different photo',
          icon: '📷',
        },
        {
          id: 'dismiss',
          label: 'Cancel',
          action: 'dismiss',
        },
      ],
    });

    this.errorMap.set(PhotoErrorType.DELETION_FAILED, {
      type: PhotoErrorType.DELETION_FAILED,
      severity: PhotoErrorSeverity.LOW,
      title: 'Deletion Failed',
      message: 'Failed to delete photo',
      userMessage: 'Unable to delete the photo. Please try again or contact support if the problem persists.',
      shouldRetry: true,
      maxRetries: 2,
      retryDelay: 1000,
      recoveryOptions: [
        {
          id: 'retry',
          label: 'Try Again',
          action: 'retry',
          description: 'Attempt to delete the photo again',
          icon: '🔄',
        },
        {
          id: 'contact_support',
          label: 'Contact Support',
          action: 'contact_support',
          description: 'Get help from our support team',
          icon: '💬',
        },
        {
          id: 'dismiss',
          label: 'Cancel',
          action: 'dismiss',
        },
      ],
    });

    this.errorMap.set(PhotoErrorType.UNKNOWN_ERROR, {
      type: PhotoErrorType.UNKNOWN_ERROR,
      severity: PhotoErrorSeverity.MEDIUM,
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred',
      userMessage: 'Something unexpected happened. Please try again or contact support if the problem continues.',
      shouldRetry: true,
      maxRetries: 1,
      retryDelay: 2000,
      recoveryOptions: [
        {
          id: 'retry',
          label: 'Try Again',
          action: 'retry',
          description: 'Attempt the operation again',
          icon: '🔄',
        },
        {
          id: 'contact_support',
          label: 'Contact Support',
          action: 'contact_support',
          description: 'Get help from our support team',
          icon: '💬',
        },
        {
          id: 'dismiss',
          label: 'Cancel',
          action: 'dismiss',
        },
      ],
    });
  }
}

// Export singleton instance
export const photoErrorClassificationService = new PhotoErrorClassificationService();
export default photoErrorClassificationService;