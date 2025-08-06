/**
 * Photo Toast Service
 * Provides toast notifications for photo operations with consistent styling and behavior
 */

import React from 'react';
import { ToastAndroid, Platform, Alert } from 'react-native';

export enum ToastType {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
  LOADING = 'LOADING',
}

export interface ToastOptions {
  duration?: number;
  position?: 'top' | 'center' | 'bottom';
  action?: {
    label: string;
    onPress: () => void;
  };
  icon?: string;
  persistent?: boolean;
}

export interface PhotoToastMessage {
  type: ToastType;
  title?: string;
  message: string;
  options?: ToastOptions;
}

class PhotoToastService {
  private activeToasts: Map<string, any> = new Map();
  private toastQueue: PhotoToastMessage[] = [];
  private isProcessingQueue = false;

  /**
   * Show a success toast for photo operations
   */
  showSuccess(message: string, options?: ToastOptions): void {
    this.showToast({
      type: ToastType.SUCCESS,
      message,
      options: {
        icon: '✅',
        duration: 3000,
        ...options,
      },
    });
  }

  /**
   * Show an error toast for photo operations
   */
  showError(message: string, options?: ToastOptions): void {
    this.showToast({
      type: ToastType.ERROR,
      message,
      options: {
        icon: '❌',
        duration: 5000,
        ...options,
      },
    });
  }

  /**
   * Show a warning toast for photo operations
   */
  showWarning(message: string, options?: ToastOptions): void {
    this.showToast({
      type: ToastType.WARNING,
      message,
      options: {
        icon: '⚠️',
        duration: 4000,
        ...options,
      },
    });
  }

  /**
   * Show an info toast for photo operations
   */
  showInfo(message: string, options?: ToastOptions): void {
    this.showToast({
      type: ToastType.INFO,
      message,
      options: {
        icon: 'ℹ️',
        duration: 3000,
        ...options,
      },
    });
  }

  /**
   * Show a loading toast for photo operations
   */
  showLoading(message: string, options?: ToastOptions): string {
    const toastId = `loading_${Date.now()}`;
    this.showToast({
      type: ToastType.LOADING,
      message,
      options: {
        icon: '⏳',
        persistent: true,
        ...options,
      },
    });
    return toastId;
  }

  /**
   * Hide a specific toast (useful for loading toasts)
   */
  hideToast(toastId: string): void {
    if (this.activeToasts.has(toastId)) {
      const toast = this.activeToasts.get(toastId);
      if (toast && toast.hide) {
        toast.hide();
      }
      this.activeToasts.delete(toastId);
    }
  }

  /**
   * Show photo capture success
   */
  showPhotoCaptureSuccess(): void {
    this.showSuccess('Photo captured successfully!', {
      duration: 2000,
    });
  }

  /**
   * Show photo upload success
   */
  showPhotoUploadSuccess(): void {
    this.showSuccess('Photo uploaded successfully!', {
      duration: 2000,
    });
  }

  /**
   * Show photo upload progress
   */
  showPhotoUploadProgress(progress: number): string {
    return this.showLoading(`Uploading photo... ${Math.round(progress)}%`, {
      duration: 0, // Persistent until manually hidden
    });
  }

  /**
   * Show photo deletion success
   */
  showPhotoDeletionSuccess(): void {
    this.showSuccess('Photo deleted successfully!', {
      duration: 2000,
    });
  }

  /**
   * Show photo deletion with undo option
   */
  showPhotoDeletionWithUndo(onUndo: () => void): void {
    this.showSuccess('Photo deleted', {
      duration: 5000,
      action: {
        label: 'UNDO',
        onPress: onUndo,
      },
    });
  }

  /**
   * Show photo processing status
   */
  showPhotoProcessing(): string {
    return this.showLoading('Processing photo...', {
      icon: '🔄',
    });
  }

  /**
   * Show photo compression status
   */
  showPhotoCompression(): string {
    return this.showLoading('Compressing photo...', {
      icon: '🗜️',
    });
  }

  /**
   * Show offline photo queue status
   */
  showOfflineQueueStatus(count: number): void {
    this.showInfo(`${count} photo${count !== 1 ? 's' : ''} queued for upload`, {
      duration: 3000,
      action: {
        label: 'VIEW',
        onPress: () => {
          // This would open the photo queue modal
          console.log('Opening photo queue...');
        },
      },
    });
  }

  /**
   * Show network reconnection status
   */
  showNetworkReconnected(queuedCount: number): void {
    if (queuedCount > 0) {
      this.showInfo(`Network reconnected. Uploading ${queuedCount} queued photo${queuedCount !== 1 ? 's' : ''}...`, {
        duration: 3000,
      });
    }
  }

  /**
   * Show permission required message
   */
  showPermissionRequired(permissionType: 'camera' | 'storage'): void {
    const message = permissionType === 'camera' 
      ? 'Camera permission required to take photos'
      : 'Storage permission required to save photos';
    
    this.showWarning(message, {
      duration: 5000,
      action: {
        label: 'SETTINGS',
        onPress: () => {
          // This would open app settings
          console.log('Opening app settings...');
        },
      },
    });
  }

  /**
   * Show storage full warning
   */
  showStorageFull(): void {
    this.showWarning('Device storage is full. Please free up space to continue.', {
      duration: 6000,
      action: {
        label: 'MANAGE',
        onPress: () => {
          // This would open storage management
          console.log('Opening storage management...');
        },
      },
    });
  }

  /**
   * Show camera unavailable message
   */
  showCameraUnavailable(): void {
    this.showWarning('Camera is currently unavailable. Please try again.', {
      duration: 4000,
      action: {
        label: 'RETRY',
        onPress: () => {
          // This would retry camera access
          console.log('Retrying camera access...');
        },
      },
    });
  }

  /**
   * Show generic toast message
   */
  private showToast(toast: PhotoToastMessage): void {
    if (Platform.OS === 'android') {
      this.showAndroidToast(toast);
    } else {
      this.showIOSToast(toast);
    }
  }

  /**
   * Show toast on Android using ToastAndroid
   */
  private showAndroidToast(toast: PhotoToastMessage): void {
    const { message, options = {} } = toast;
    const { duration = 3000, icon } = options;
    
    const displayMessage = icon ? `${icon} ${message}` : message;
    const toastDuration = duration > 3000 ? ToastAndroid.LONG : ToastAndroid.SHORT;
    
    ToastAndroid.show(displayMessage, toastDuration);
  }

  /**
   * Show toast on iOS using Alert (fallback)
   */
  private showIOSToast(toast: PhotoToastMessage): void {
    const { message, options = {} } = toast;
    const { action, icon } = options;
    
    const displayMessage = icon ? `${icon} ${message}` : message;
    
    if (action) {
      Alert.alert(
        toast.title || 'Notification',
        displayMessage,
        [
          { text: 'OK', style: 'cancel' },
          { text: action.label, onPress: action.onPress },
        ]
      );
    } else {
      // For iOS, we would typically use a third-party toast library
      // For now, we'll use a simple alert for critical messages
      if (toast.type === ToastType.ERROR || toast.type === ToastType.WARNING) {
        Alert.alert('Notification', displayMessage, [{ text: 'OK' }]);
      } else {
        // For success/info messages, we might use a custom toast component
        console.log(`Toast: ${displayMessage}`);
      }
    }
  }

  /**
   * Queue a toast for later display
   */
  queueToast(toast: PhotoToastMessage): void {
    this.toastQueue.push(toast);
    this.processQueue();
  }

  /**
   * Process the toast queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.toastQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.toastQueue.length > 0) {
      const toast = this.toastQueue.shift();
      if (toast) {
        this.showToast(toast);
        
        // Wait a bit before showing the next toast to avoid overwhelming the user
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Clear all queued toasts
   */
  clearQueue(): void {
    this.toastQueue = [];
  }

  /**
   * Hide all active toasts
   */
  hideAllToasts(): void {
    this.activeToasts.forEach((toast, id) => {
      this.hideToast(id);
    });
  }

  /**
   * Get predefined photo operation messages
   */
  getPhotoMessages() {
    return {
      capture: {
        success: 'Photo captured successfully!',
        failed: 'Failed to capture photo. Please try again.',
        permissionDenied: 'Camera permission required to take photos.',
        cameraUnavailable: 'Camera is currently unavailable.',
      },
      upload: {
        success: 'Photo uploaded successfully!',
        failed: 'Failed to upload photo. It will be retried automatically.',
        progress: (progress: number) => `Uploading photo... ${Math.round(progress)}%`,
        queued: 'Photo queued for upload when connection is restored.',
      },
      delete: {
        success: 'Photo deleted successfully!',
        failed: 'Failed to delete photo. Please try again.',
        withUndo: 'Photo deleted',
      },
      processing: {
        compressing: 'Compressing photo...',
        resizing: 'Resizing photo...',
        processing: 'Processing photo...',
        failed: 'Failed to process photo. Please try again.',
      },
      storage: {
        full: 'Device storage is full. Please free up space.',
        permissionDenied: 'Storage permission required to save photos.',
      },
      network: {
        offline: 'You are offline. Photos will be uploaded when connection is restored.',
        reconnected: (count: number) => `Network reconnected. Uploading ${count} queued photo${count !== 1 ? 's' : ''}...`,
      },
    };
  }
}

// Export singleton instance
export const photoToastService = new PhotoToastService();
export default photoToastService;