/**
 * Photo Error Handling Tests
 * Tests for centralized photo error mapping and classification
 */

import {
  mapPhotoError,
  logPhotoError,
  getPhotoOperationErrorMessage,
  shouldRetryPhotoOperation,
  getRetryDelay,
  PhotoErrorType,
} from '../photoErrors';

describe('Photo Error Handling', () => {
  describe('mapPhotoError', () => {
    it('should map ENOENT error correctly', () => {
      const error = new Error('ENOENT: no such file or directory');
      error.code = 'ENOENT';
      
      const result = mapPhotoError(error, { photoId: 'test-photo', intakeId: 'test-intake' });
      
      expect(result.type).toBe(PhotoErrorType.FILE_NOT_FOUND);
      expect(result.userMessage).toBe('Photo file is missing. Please try taking the photo again.');
      expect(result.isRetryable).toBe(false);
      expect(result.shouldLog).toBe(true);
      expect(result.context?.photoId).toBe('test-photo');
      expect(result.context?.intakeId).toBe('test-intake');
    });

    it('should map EACCES error correctly', () => {
      const error = new Error('EACCES: permission denied');
      error.code = 'EACCES';
      
      const result = mapPhotoError(error, { photoId: 'test-photo' });
      
      expect(result.type).toBe(PhotoErrorType.PERMISSION_DENIED);
      expect(result.userMessage).toBe('Permission denied. Please check app permissions and try again.');
      expect(result.isRetryable).toBe(true);
      expect(result.shouldLog).toBe(true);
    });

    it('should map network errors correctly', () => {
      const error = new Error('Network request failed');
      
      const result = mapPhotoError(error);
      
      expect(result.type).toBe(PhotoErrorType.NETWORK_ERROR);
      expect(result.userMessage).toBe('Network error. Please check your connection and try again.');
      expect(result.isRetryable).toBe(true);
    });

    it('should map HTTP 413 error correctly', () => {
      const error = new Error('Request entity too large');
      error.status = 413;
      
      const result = mapPhotoError(error);
      
      expect(result.type).toBe(PhotoErrorType.FILE_TOO_LARGE);
      expect(result.userMessage).toBe('Photo is too large. Please try a smaller image or compress it.');
      expect(result.isRetryable).toBe(false);
    });

    it('should map HTTP 415 error correctly', () => {
      const error = new Error('Unsupported media type');
      error.status = 415;
      
      const result = mapPhotoError(error);
      
      expect(result.type).toBe(PhotoErrorType.UNSUPPORTED_FORMAT);
      expect(result.userMessage).toBe('Photo format not supported. Please use JPG or PNG format.');
      expect(result.isRetryable).toBe(false);
    });

    it('should map 5xx server errors correctly', () => {
      const error = new Error('Internal server error');
      error.status = 500;
      
      const result = mapPhotoError(error);
      
      expect(result.type).toBe(PhotoErrorType.SERVER_ERROR);
      expect(result.userMessage).toBe('Server temporarily unavailable. Please try again in a moment.');
      expect(result.isRetryable).toBe(true);
    });

    it('should map camera errors correctly', () => {
      const error = new Error('Camera unavailable');
      error.code = 'camera_unavailable';
      
      const result = mapPhotoError(error);
      
      expect(result.type).toBe(PhotoErrorType.CAMERA_ERROR);
      expect(result.userMessage).toBe('Camera unavailable. Please check camera permissions and try again.');
      expect(result.isRetryable).toBe(true);
    });

    it('should map unknown errors correctly', () => {
      const error = new Error('Something unexpected happened');
      
      const result = mapPhotoError(error);
      
      expect(result.type).toBe(PhotoErrorType.UNKNOWN_ERROR);
      expect(result.userMessage).toBe('Something went wrong. Please try again.');
      expect(result.isRetryable).toBe(true);
    });
  });

  describe('getPhotoOperationErrorMessage', () => {
    it('should return capture-specific messages', () => {
      const cameraError = mapPhotoError({ code: 'camera_unavailable' });
      const message = getPhotoOperationErrorMessage('capture', cameraError);
      expect(message).toBe("Couldn't save photo. Try again.");
    });

    it('should return upload-specific messages', () => {
      const networkError = mapPhotoError({ message: 'network error' });
      const message = getPhotoOperationErrorMessage('upload', networkError);
      expect(message).toBe("Upload failed. Check connection.");
    });

    it('should return delete-specific messages', () => {
      const permissionError = mapPhotoError({ code: 'EACCES' });
      const message = getPhotoOperationErrorMessage('delete', permissionError);
      expect(message).toBe("Can't delete photo. Check permissions.");
    });

    it('should return load-specific messages', () => {
      const notFoundError = mapPhotoError({ code: 'ENOENT' });
      const message = getPhotoOperationErrorMessage('load', notFoundError);
      expect(message).toBe("Photo not found.");
    });
  });

  describe('shouldRetryPhotoOperation', () => {
    it('should return true for retryable errors', () => {
      const networkError = mapPhotoError({ message: 'network error' });
      expect(shouldRetryPhotoOperation(networkError)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const fileNotFoundError = mapPhotoError({ code: 'ENOENT' });
      expect(shouldRetryPhotoOperation(fileNotFoundError)).toBe(false);
    });

    it('should return false for file not found even if marked retryable', () => {
      const error = mapPhotoError({ code: 'ENOENT' });
      expect(shouldRetryPhotoOperation(error)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should return exponential backoff for network errors', () => {
      const networkError = mapPhotoError({ message: 'network error' });
      
      const delay1 = getRetryDelay(networkError, 1);
      const delay2 = getRetryDelay(networkError, 2);
      const delay3 = getRetryDelay(networkError, 3);
      
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
      expect(delay3).toBeLessThanOrEqual(30000); // Max delay
    });

    it('should return longer delays for server errors', () => {
      const serverError = mapPhotoError({ status: 500 });
      const networkError = mapPhotoError({ message: 'network error' });
      
      const serverDelay = getRetryDelay(serverError, 2);
      const networkDelay = getRetryDelay(networkError, 2);
      
      expect(serverDelay).toBeGreaterThan(networkDelay);
    });

    it('should cap delay at maximum', () => {
      const error = mapPhotoError({ message: 'test error' });
      const delay = getRetryDelay(error, 10); // High attempt number
      
      expect(delay).toBeLessThanOrEqual(30000);
    });
  });

  describe('logPhotoError', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log error when shouldLog is true', () => {
      const error = mapPhotoError(new Error('test error'), {
        photoId: 'test-photo',
        intakeId: 'test-intake',
        operation: 'upload',
      });
      
      logPhotoError(error);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PhotoError]',
        expect.objectContaining({
          type: error.type,
          message: error.message,
          photoId: 'test-photo',
          intakeId: 'test-intake',
          operation: 'upload',
          isRetryable: error.isRetryable,
        }),
        error.context?.originalError
      );
    });

    it('should not log error when shouldLog is false', () => {
      const error = mapPhotoError(new Error('test error'));
      error.shouldLog = false;
      
      logPhotoError(error);
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});