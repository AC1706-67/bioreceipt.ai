/**
 * Photo Toast Service Tests
 * Tests for user-friendly error notifications with retry actions
 */

import {
  showPhotoErrorToast,
  showPhotoSuccessToast,
  showPhotoProgressToast,
  PhotoToastMessages,
} from '../photoToastService';
import { mapPhotoError, PhotoErrorType } from '../photoErrors';

describe('Photo Toast Service', () => {
  let mockShowToast: jest.Mock;

  beforeEach(() => {
    mockShowToast = jest.fn();
  });

  describe('showPhotoErrorToast', () => {
    it('should show capture error toast with correct message', () => {
      const error = mapPhotoError({ code: 'camera_unavailable' });
      const mockRetry = jest.fn();
      
      showPhotoErrorToast(error, 'capture', mockRetry, mockShowToast);
      
      expect(mockShowToast).toHaveBeenCalledWith(
        "Couldn't save photo. Try again.",
        'error',
        expect.objectContaining({
          duration: 6000,
          action: expect.objectContaining({
            label: 'Retry',
            onPress: mockRetry,
            style: 'primary',
          }),
        })
      );
    });

    it('should show upload error toast with retry action', () => {
      const error = mapPhotoError({ message: 'network error' });
      const mockRetry = jest.fn();
      
      showPhotoErrorToast(error, 'upload', mockRetry, mockShowToast);
      
      expect(mockShowToast).toHaveBeenCalledWith(
        'Upload failed. Check connection.',
        'error',
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Retry',
            onPress: mockRetry,
          }),
        })
      );
    });

    it('should show persistent toast for permission errors', () => {
      const error = mapPhotoError({ code: 'EACCES' });
      
      showPhotoErrorToast(error, 'capture', undefined, mockShowToast);
      
      expect(mockShowToast).toHaveBeenCalledWith(
        'Camera permission needed. Check settings.',
        'error',
        expect.objectContaining({
          persistent: true,
        })
      );
    });

    it('should not show retry action for non-retryable errors', () => {
      const error = mapPhotoError({ status: 413 });
      
      showPhotoErrorToast(error, 'upload', jest.fn(), mockShowToast);
      
      expect(mockShowToast).toHaveBeenCalledWith(
        'Photo too large. Try a smaller image.',
        'error',
        expect.objectContaining({
          duration: 4000, // Shorter duration for non-retryable
        })
      );
      
      const callArgs = mockShowToast.mock.calls[0][2];
      expect(callArgs.action).toBeUndefined();
    });

    it('should fallback to console when no toast service provided', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const error = mapPhotoError({ message: 'test error' });
      
      showPhotoErrorToast(error, 'upload');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PhotoToast]',
        'Upload failed. Try again.',
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('showPhotoSuccessToast', () => {
    it('should show capture success message', () => {
      showPhotoSuccessToast('capture', mockShowToast);
      
      expect(mockShowToast).toHaveBeenCalledWith(
        'Photo saved successfully',
        'success',
        { duration: 3000 }
      );
    });

    it('should show upload success message', () => {
      showPhotoSuccessToast('upload', mockShowToast);
      
      expect(mockShowToast).toHaveBeenCalledWith(
        'Photo uploaded successfully',
        'success',
        { duration: 3000 }
      );
    });

    it('should show delete success message', () => {
      showPhotoSuccessToast('delete', mockShowToast);
      
      expect(mockShowToast).toHaveBeenCalledWith(
        'Photo deleted successfully',
        'success',
        { duration: 3000 }
      );
    });

    it('should fallback to console when no toast service provided', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      showPhotoSuccessToast('capture');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PhotoToast]',
        'Photo saved successfully'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('showPhotoProgressToast', () => {
    it('should show upload progress with percentage', () => {
      showPhotoProgressToast('uploading', 75, mockShowToast);
      
      expect(mockShowToast).toHaveBeenCalledWith(
        'Uploading photo... 75%',
        'info',
        { duration: 1000 }
      );
    });

    it('should show upload progress without percentage', () => {
      showPhotoProgressToast('uploading', undefined, mockShowToast);
      
      expect(mockShowToast).toHaveBeenCalledWith(
        'Uploading photo...',
        'info',
        { duration: 1000 }
      );
    });

    it('should show processing message', () => {
      showPhotoProgressToast('processing', undefined, mockShowToast);
      
      expect(mockShowToast).toHaveBeenCalledWith(
        'Processing photo...',
        'info',
        { duration: 1000 }
      );
    });

    it('should fallback to console when no toast service provided', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      showPhotoProgressToast('uploading', 50);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PhotoToast]',
        'Uploading photo... 50%'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('PhotoToastMessages', () => {
    it('should have all required message constants', () => {
      expect(PhotoToastMessages.CAPTURE_FAILED).toBe("Couldn't save photo. Try again.");
      expect(PhotoToastMessages.CAMERA_PERMISSION).toBe("Camera permission needed. Check settings.");
      expect(PhotoToastMessages.STORAGE_FULL).toBe("Not enough storage space.");
      expect(PhotoToastMessages.UPLOAD_FAILED).toBe("Upload failed. Try again.");
      expect(PhotoToastMessages.UPLOAD_NETWORK).toBe("Upload failed. Check connection.");
      expect(PhotoToastMessages.UPLOAD_TOO_LARGE).toBe("Photo too large. Try a smaller image.");
      expect(PhotoToastMessages.UPLOAD_SERVER_ERROR).toBe("Server busy. Try again shortly.");
      expect(PhotoToastMessages.PHOTO_SAVED).toBe("Photo saved successfully");
      expect(PhotoToastMessages.PHOTO_UPLOADED).toBe("Photo uploaded successfully");
      expect(PhotoToastMessages.PHOTO_DELETED).toBe("Photo deleted successfully");
      expect(PhotoToastMessages.UPLOADING).toBe("Uploading photo...");
      expect(PhotoToastMessages.PROCESSING).toBe("Processing photo...");
    });
  });
});