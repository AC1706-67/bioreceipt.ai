/**
 * PhotoErrorClassificationService Tests
 * Tests error classification and user-friendly message generation
 */

import photoErrorClassificationService, { PhotoErrorType, PhotoErrorSeverity } from '../photoErrorClassificationService';

describe('PhotoErrorClassificationService', () => {
  describe('Error Classification', () => {
    it('classifies camera permission errors correctly', () => {
      const error = new Error('Camera permission denied');
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.CAMERA_PERMISSION_DENIED);
      expect(errorInfo.severity).toBe(PhotoErrorSeverity.HIGH);
      expect(errorInfo.title).toBe('Camera Permission Required');
      expect(errorInfo.shouldRetry).toBe(false);
    });

    it('classifies camera unavailable errors correctly', () => {
      const error = new Error('Camera is not available');
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.CAMERA_UNAVAILABLE);
      expect(errorInfo.severity).toBe(PhotoErrorSeverity.MEDIUM);
      expect(errorInfo.shouldRetry).toBe(true);
      expect(errorInfo.maxRetries).toBe(3);
    });

    it('classifies storage permission errors correctly', () => {
      const error = new Error('Storage permission denied');
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.STORAGE_PERMISSION_DENIED);
      expect(errorInfo.severity).toBe(PhotoErrorSeverity.HIGH);
      expect(errorInfo.shouldRetry).toBe(false);
    });

    it('classifies storage full errors correctly', () => {
      const error = new Error('Device storage is full');
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.STORAGE_FULL);
      expect(errorInfo.severity).toBe(PhotoErrorSeverity.HIGH);
      expect(errorInfo.shouldRetry).toBe(false);
    });

    it('classifies network errors correctly', () => {
      const error = new Error('Network connection failed');
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.NETWORK_ERROR);
      expect(errorInfo.severity).toBe(PhotoErrorSeverity.MEDIUM);
      expect(errorInfo.shouldRetry).toBe(true);
      expect(errorInfo.maxRetries).toBe(5);
    });

    it('classifies upload failed errors correctly', () => {
      const error = new Error('Photo upload failed');
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.UPLOAD_FAILED);
      expect(errorInfo.severity).toBe(PhotoErrorSeverity.MEDIUM);
      expect(errorInfo.shouldRetry).toBe(true);
    });

    it('classifies file too large errors correctly', () => {
      const error = new Error('File size exceeds limit');
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.FILE_TOO_LARGE);
      expect(errorInfo.severity).toBe(PhotoErrorSeverity.MEDIUM);
      expect(errorInfo.shouldRetry).toBe(false);
    });

    it('classifies invalid file format errors correctly', () => {
      const error = new Error('Unsupported file format');
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.INVALID_FILE_FORMAT);
      expect(errorInfo.severity).toBe(PhotoErrorSeverity.MEDIUM);
      expect(errorInfo.shouldRetry).toBe(false);
    });

    it('classifies capture failed errors correctly', () => {
      const error = new Error('Photo capture failed');
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.CAPTURE_FAILED);
      expect(errorInfo.severity).toBe(PhotoErrorSeverity.MEDIUM);
      expect(errorInfo.shouldRetry).toBe(true);
      expect(errorInfo.maxRetries).toBe(2);
    });

    it('classifies processing failed errors correctly', () => {
      const error = new Error('Photo processing failed');
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.PROCESSING_FAILED);
      expect(errorInfo.severity).toBe(PhotoErrorSeverity.MEDIUM);
      expect(errorInfo.shouldRetry).toBe(true);
    });

    it('classifies deletion failed errors correctly', () => {
      const error = new Error('Failed to delete photo');
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.DELETION_FAILED);
      expect(errorInfo.severity).toBe(PhotoErrorSeverity.LOW);
      expect(errorInfo.shouldRetry).toBe(true);
    });

    it('classifies unknown errors correctly', () => {
      const error = new Error('Some random error');
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.UNKNOWN_ERROR);
      expect(errorInfo.severity).toBe(PhotoErrorSeverity.MEDIUM);
      expect(errorInfo.shouldRetry).toBe(true);
      expect(errorInfo.maxRetries).toBe(1);
    });
  });

  describe('Error Code Classification', () => {
    it('classifies errors by error code', () => {
      const error = { message: 'Some error', code: 'PERMISSION_DENIED' };
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.CAMERA_PERMISSION_DENIED);
    });

    it('classifies camera unavailable by code', () => {
      const error = { message: 'Error occurred', code: 'CAMERA_UNAVAILABLE' };
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.CAMERA_UNAVAILABLE);
    });

    it('classifies network error by code', () => {
      const error = { message: 'Error occurred', code: 'NETWORK_ERROR' };
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.NETWORK_ERROR);
    });

    it('classifies storage full by code', () => {
      const error = { message: 'Error occurred', code: 'STORAGE_FULL' };
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.STORAGE_FULL);
    });
  });

  describe('String Error Classification', () => {
    it('classifies string errors correctly', () => {
      const error = 'Network timeout occurred';
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.NETWORK_ERROR);
      expect(errorInfo.message).toBe(error);
    });

    it('handles empty string errors', () => {
      const error = '';
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.UNKNOWN_ERROR);
    });
  });

  describe('User-Friendly Messages', () => {
    it('provides user-friendly message for camera permission error', () => {
      const error = new Error('Camera permission denied');
      const message = photoErrorClassificationService.getUserFriendlyMessage(error);
      
      expect(message).toBe('We need camera permission to take photos. Please allow camera access in your device settings.');
    });

    it('provides user-friendly message for network error', () => {
      const error = new Error('Network connection failed');
      const message = photoErrorClassificationService.getUserFriendlyMessage(error);
      
      expect(message).toBe('Unable to upload photo due to network issues. Your photo will be saved and uploaded when connection is restored.');
    });

    it('provides user-friendly message for storage full error', () => {
      const error = new Error('Device storage is full');
      const message = photoErrorClassificationService.getUserFriendlyMessage(error);
      
      expect(message).toBe('Your device storage is full. Please free up some space and try again.');
    });
  });

  describe('Recovery Options', () => {
    it('provides appropriate recovery options for camera permission error', () => {
      const error = new Error('Camera permission denied');
      const options = photoErrorClassificationService.getRecoveryOptions(error);
      
      expect(options).toHaveLength(3);
      expect(options[0].action).toBe('settings');
      expect(options[0].label).toBe('Open Settings');
      expect(options[1].action).toBe('alternative');
      expect(options[1].label).toBe('Choose from Gallery');
      expect(options[2].action).toBe('dismiss');
    });

    it('provides appropriate recovery options for network error', () => {
      const error = new Error('Network connection failed');
      const options = photoErrorClassificationService.getRecoveryOptions(error);
      
      expect(options).toHaveLength(3);
      expect(options[0].action).toBe('retry');
      expect(options[1].action).toBe('alternative');
      expect(options[2].action).toBe('dismiss');
    });

    it('provides appropriate recovery options for file too large error', () => {
      const error = new Error('File size exceeds limit');
      const options = photoErrorClassificationService.getRecoveryOptions(error);
      
      expect(options).toHaveLength(3);
      expect(options[0].action).toBe('alternative');
      expect(options[0].label).toBe('Compress Photo');
      expect(options[1].action).toBe('alternative');
      expect(options[1].label).toBe('Choose Different Photo');
    });

    it('provides contact support option for unknown errors', () => {
      const error = new Error('Some random error');
      const options = photoErrorClassificationService.getRecoveryOptions(error);
      
      const supportOption = options.find(option => option.action === 'contact_support');
      expect(supportOption).toBeDefined();
      expect(supportOption?.label).toBe('Contact Support');
    });
  });

  describe('Retry Configuration', () => {
    it('provides correct retry configuration for network errors', () => {
      const error = new Error('Network connection failed');
      const shouldRetry = photoErrorClassificationService.shouldRetry(error);
      const config = photoErrorClassificationService.getRetryConfig(error);
      
      expect(shouldRetry).toBe(true);
      expect(config.maxRetries).toBe(5);
      expect(config.delay).toBe(2000);
    });

    it('provides correct retry configuration for camera unavailable', () => {
      const error = new Error('Camera is not available');
      const shouldRetry = photoErrorClassificationService.shouldRetry(error);
      const config = photoErrorClassificationService.getRetryConfig(error);
      
      expect(shouldRetry).toBe(true);
      expect(config.maxRetries).toBe(3);
      expect(config.delay).toBe(2000);
    });

    it('indicates no retry for permission errors', () => {
      const error = new Error('Camera permission denied');
      const shouldRetry = photoErrorClassificationService.shouldRetry(error);
      
      expect(shouldRetry).toBe(false);
    });

    it('provides default retry configuration for unknown errors', () => {
      const error = new Error('Some random error');
      const config = photoErrorClassificationService.getRetryConfig(error);
      
      expect(config.maxRetries).toBe(1);
      expect(config.delay).toBe(2000);
    });
  });

  describe('Edge Cases', () => {
    it('handles null error gracefully', () => {
      const errorInfo = photoErrorClassificationService.classifyError(null);
      
      expect(errorInfo.type).toBe(PhotoErrorType.UNKNOWN_ERROR);
      expect(errorInfo.message).toBe('Unknown error');
    });

    it('handles undefined error gracefully', () => {
      const errorInfo = photoErrorClassificationService.classifyError(undefined);
      
      expect(errorInfo.type).toBe(PhotoErrorType.UNKNOWN_ERROR);
      expect(errorInfo.message).toBe('Unknown error');
    });

    it('handles error object without message', () => {
      const error = { code: 'SOME_ERROR' };
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.UNKNOWN_ERROR);
      expect(errorInfo.message).toBe('Unknown error');
    });

    it('handles complex error objects', () => {
      const error = {
        message: 'Network timeout',
        code: 'TIMEOUT',
        stack: 'Error stack trace...',
        details: { timeout: 5000 },
      };
      
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      expect(errorInfo.type).toBe(PhotoErrorType.NETWORK_ERROR);
      expect(errorInfo.message).toBe('Network timeout');
    });
  });

  describe('Case Sensitivity', () => {
    it('handles case-insensitive error messages', () => {
      const error1 = new Error('CAMERA PERMISSION DENIED');
      const error2 = new Error('camera permission denied');
      const error3 = new Error('Camera Permission Denied');
      
      const errorInfo1 = photoErrorClassificationService.classifyError(error1);
      const errorInfo2 = photoErrorClassificationService.classifyError(error2);
      const errorInfo3 = photoErrorClassificationService.classifyError(error3);
      
      expect(errorInfo1.type).toBe(PhotoErrorType.CAMERA_PERMISSION_DENIED);
      expect(errorInfo2.type).toBe(PhotoErrorType.CAMERA_PERMISSION_DENIED);
      expect(errorInfo3.type).toBe(PhotoErrorType.CAMERA_PERMISSION_DENIED);
    });
  });

  describe('Multiple Keywords', () => {
    it('prioritizes more specific error patterns', () => {
      const error = new Error('Camera capture failed due to permission denied');
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      // Should classify as permission error rather than capture failed
      expect(errorInfo.type).toBe(PhotoErrorType.CAMERA_PERMISSION_DENIED);
    });

    it('handles compound error messages', () => {
      const error = new Error('Network timeout during upload failed');
      const errorInfo = photoErrorClassificationService.classifyError(error);
      
      // Should classify as network error (appears first in detection logic)
      expect(errorInfo.type).toBe(PhotoErrorType.NETWORK_ERROR);
    });
  });
});