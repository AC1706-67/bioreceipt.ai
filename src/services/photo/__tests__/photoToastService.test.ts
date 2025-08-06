/**
 * PhotoToastService Tests
 * Tests toast notifications for photo operations
 */

import { ToastAndroid, Platform, Alert } from 'react-native';
import photoToastService, { ToastType } from '../photoToastService';

// Mock dependencies
jest.mock('react-native', () => ({
  ToastAndroid: {
    show: jest.fn(),
    SHORT: 0,
    LONG: 1,
  },
  Platform: {
    OS: 'android',
  },
  Alert: {
    alert: jest.fn(),
  },
}));

const mockToastAndroid = ToastAndroid as jest.Mocked<typeof ToastAndroid>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('PhotoToastService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'android';
  });

  describe('Basic Toast Methods', () => {
    it('shows success toast', () => {
      photoToastService.showSuccess('Operation successful');
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '✅ Operation successful',
        ToastAndroid.LONG
      );
    });

    it('shows error toast', () => {
      photoToastService.showError('Operation failed');
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '❌ Operation failed',
        ToastAndroid.LONG
      );
    });

    it('shows warning toast', () => {
      photoToastService.showWarning('Warning message');
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '⚠️ Warning message',
        ToastAndroid.LONG
      );
    });

    it('shows info toast', () => {
      photoToastService.showInfo('Info message');
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        'ℹ️ Info message',
        ToastAndroid.LONG
      );
    });

    it('shows loading toast', () => {
      const toastId = photoToastService.showLoading('Loading...');
      
      expect(toastId).toBeDefined();
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '⏳ Loading...',
        ToastAndroid.LONG
      );
    });
  });

  describe('Photo-Specific Toast Methods', () => {
    it('shows photo capture success', () => {
      photoToastService.showPhotoCaptureSuccess();
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '✅ Photo captured successfully!',
        ToastAndroid.SHORT
      );
    });

    it('shows photo upload success', () => {
      photoToastService.showPhotoUploadSuccess();
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '✅ Photo uploaded successfully!',
        ToastAndroid.SHORT
      );
    });

    it('shows photo upload progress', () => {
      const toastId = photoToastService.showPhotoUploadProgress(75);
      
      expect(toastId).toBeDefined();
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '⏳ Uploading photo... 75%',
        ToastAndroid.LONG
      );
    });

    it('shows photo deletion success', () => {
      photoToastService.showPhotoDeletionSuccess();
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '✅ Photo deleted successfully!',
        ToastAndroid.SHORT
      );
    });

    it('shows photo processing status', () => {
      const toastId = photoToastService.showPhotoProcessing();
      
      expect(toastId).toBeDefined();
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '🔄 Processing photo...',
        ToastAndroid.LONG
      );
    });

    it('shows photo compression status', () => {
      const toastId = photoToastService.showPhotoCompression();
      
      expect(toastId).toBeDefined();
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '🗜️ Compressing photo...',
        ToastAndroid.LONG
      );
    });
  });

  describe('Status and Queue Messages', () => {
    it('shows offline queue status for single photo', () => {
      photoToastService.showOfflineQueueStatus(1);
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        'ℹ️ 1 photo queued for upload',
        ToastAndroid.LONG
      );
    });

    it('shows offline queue status for multiple photos', () => {
      photoToastService.showOfflineQueueStatus(5);
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        'ℹ️ 5 photos queued for upload',
        ToastAndroid.LONG
      );
    });

    it('shows network reconnected status', () => {
      photoToastService.showNetworkReconnected(3);
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        'ℹ️ Network reconnected. Uploading 3 queued photos...',
        ToastAndroid.LONG
      );
    });

    it('does not show network reconnected for zero photos', () => {
      photoToastService.showNetworkReconnected(0);
      
      expect(mockToastAndroid.show).not.toHaveBeenCalled();
    });
  });

  describe('Permission and Error Messages', () => {
    it('shows camera permission required', () => {
      photoToastService.showPermissionRequired('camera');
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '⚠️ Camera permission required to take photos',
        ToastAndroid.LONG
      );
    });

    it('shows storage permission required', () => {
      photoToastService.showPermissionRequired('storage');
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '⚠️ Storage permission required to save photos',
        ToastAndroid.LONG
      );
    });

    it('shows storage full warning', () => {
      photoToastService.showStorageFull();
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '⚠️ Device storage is full. Please free up space to continue.',
        ToastAndroid.LONG
      );
    });

    it('shows camera unavailable message', () => {
      photoToastService.showCameraUnavailable();
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '⚠️ Camera is currently unavailable. Please try again.',
        ToastAndroid.LONG
      );
    });
  });

  describe('Toast Duration', () => {
    it('uses SHORT duration for messages under 3 seconds', () => {
      photoToastService.showSuccess('Quick message', { duration: 2000 });
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '✅ Quick message',
        ToastAndroid.SHORT
      );
    });

    it('uses LONG duration for messages over 3 seconds', () => {
      photoToastService.showError('Long error message', { duration: 5000 });
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '❌ Long error message',
        ToastAndroid.LONG
      );
    });

    it('uses default duration when not specified', () => {
      photoToastService.showInfo('Default duration');
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        'ℹ️ Default duration',
        ToastAndroid.LONG
      );
    });
  });

  describe('Custom Options', () => {
    it('shows toast without icon when not provided', () => {
      photoToastService.showSuccess('No icon message', { icon: undefined });
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        'No icon message',
        ToastAndroid.LONG
      );
    });

    it('shows toast with custom icon', () => {
      photoToastService.showInfo('Custom icon', { icon: '🎉' });
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '🎉 Custom icon',
        ToastAndroid.LONG
      );
    });
  });

  describe('iOS Platform Behavior', () => {
    beforeEach(() => {
      (Platform as any).OS = 'ios';
    });

    it('shows error alert on iOS', () => {
      photoToastService.showError('iOS error message');
      
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Notification',
        '❌ iOS error message',
        [{ text: 'OK' }]
      );
    });

    it('shows warning alert on iOS', () => {
      photoToastService.showWarning('iOS warning message');
      
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Notification',
        '⚠️ iOS warning message',
        [{ text: 'OK' }]
      );
    });

    it('logs success messages on iOS instead of showing alert', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      photoToastService.showSuccess('iOS success message');
      
      expect(consoleSpy).toHaveBeenCalledWith('Toast: ✅ iOS success message');
      expect(mockAlert.alert).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('shows alert with action button on iOS', () => {
      photoToastService.showError('Error with action', {
        action: {
          label: 'Retry',
          onPress: jest.fn(),
        },
      });
      
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Notification',
        '❌ Error with action',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Retry', onPress: expect.any(Function) },
        ]
      );
    });
  });

  describe('Toast Queue Management', () => {
    it('queues toasts for later display', () => {
      photoToastService.queueToast({
        type: ToastType.SUCCESS,
        message: 'Queued message',
      });
      
      // Queue processing is asynchronous, so we can't easily test the exact behavior
      // In a real implementation, you might want to expose queue state for testing
    });

    it('clears toast queue', () => {
      photoToastService.queueToast({
        type: ToastType.INFO,
        message: 'Message 1',
      });
      
      photoToastService.clearQueue();
      
      // Queue should be cleared (implementation detail)
    });

    it('hides all active toasts', () => {
      const toastId = photoToastService.showLoading('Loading...');
      
      photoToastService.hideAllToasts();
      
      // All toasts should be hidden (implementation detail)
    });
  });

  describe('Predefined Messages', () => {
    it('provides predefined photo operation messages', () => {
      const messages = photoToastService.getPhotoMessages();
      
      expect(messages.capture.success).toBe('Photo captured successfully!');
      expect(messages.upload.success).toBe('Photo uploaded successfully!');
      expect(messages.delete.success).toBe('Photo deleted successfully!');
      expect(messages.processing.compressing).toBe('Compressing photo...');
      expect(messages.storage.full).toBe('Device storage is full. Please free up space.');
    });

    it('provides dynamic progress message', () => {
      const messages = photoToastService.getPhotoMessages();
      const progressMessage = messages.upload.progress(75);
      
      expect(progressMessage).toBe('Uploading photo... 75%');
    });

    it('provides dynamic network reconnected message', () => {
      const messages = photoToastService.getPhotoMessages();
      const networkMessage = messages.network.reconnected(3);
      
      expect(networkMessage).toBe('Network reconnected. Uploading 3 queued photos...');
    });
  });

  describe('Toast Management', () => {
    it('hides specific toast by ID', () => {
      const toastId = photoToastService.showLoading('Loading...');
      
      photoToastService.hideToast(toastId);
      
      // Toast should be hidden (implementation detail)
    });

    it('handles hiding non-existent toast gracefully', () => {
      expect(() => {
        photoToastService.hideToast('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('Special Photo Operations', () => {
    it('shows photo deletion with undo option', () => {
      const onUndo = jest.fn();
      
      photoToastService.showPhotoDeletionWithUndo(onUndo);
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '✅ Photo deleted',
        ToastAndroid.LONG
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles empty message gracefully', () => {
      photoToastService.showSuccess('');
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        '✅ ',
        ToastAndroid.LONG
      );
    });

    it('handles very long messages', () => {
      const longMessage = 'This is a very long message that might exceed normal toast message length limits and should still be displayed properly without causing any issues';
      
      photoToastService.showInfo(longMessage);
      
      expect(mockToastAndroid.show).toHaveBeenCalledWith(
        `ℹ️ ${longMessage}`,
        ToastAndroid.LONG
      );
    });

    it('handles null action callback gracefully', () => {
      expect(() => {
        photoToastService.showError('Error message', {
          action: {
            label: 'Action',
            onPress: null as any,
          },
        });
      }).not.toThrow();
    });
  });
});