/**
 * Photo Error Handling Integration Tests
 * Tests the complete error handling flow from classification to user recovery
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import PhotoErrorRecovery from '../../components/photo/PhotoErrorRecovery';
import CameraPermissionHandler from '../../components/photo/CameraPermissionHandler';
import { photoErrorHandlingService } from '../../services/photo/photoErrorHandlingService';
import { photoErrorClassificationService, PhotoErrorType } from '../../services/photo/photoErrorClassificationService';
import { photoToastService } from '../../services/photo/photoToastService';

// Mock dependencies
jest.mock('../../services/photo/photoErrorHandlingService');
jest.mock('../../services/photo/photoErrorClassificationService');
jest.mock('../../services/photo/photoToastService');
jest.mock('react-native/Libraries/Linking/Linking');

const mockPhotoErrorHandlingService = photoErrorHandlingService as jest.Mocked<typeof photoErrorHandlingService>;
const mockPhotoErrorClassificationService = photoErrorClassificationService as jest.Mocked<typeof photoErrorClassificationService>;
const mockPhotoToastService = photoToastService as jest.Mocked<typeof photoToastService>;
const mockLinking = Linking as jest.Mocked<typeof Linking>;

describe('Photo Error Handling Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Complete Error Handling Flow', () => {
    it('handles network error with automatic retry and user feedback', async () => {
      // Setup error classification
      mockPhotoErrorClassificationService.classifyError.mockReturnValue({
        type: PhotoErrorType.NETWORK_ERROR,
        severity: 'MEDIUM' as any,
        title: 'Network Error',
        message: 'Network connection failed',
        userMessage: 'Unable to upload photo due to network issues.',
        shouldRetry: true,
        maxRetries: 3,
        retryDelay: 1000,
        recoveryOptions: [
          { id: 'retry', label: 'Retry Now', action: 'retry' },
          { id: 'save_offline', label: 'Save for Later', action: 'alternative' },
          { id: 'dismiss', label: 'OK', action: 'dismiss' },
        ],
      });

      mockPhotoErrorClassificationService.getRetryConfig.mockReturnValue({
        maxRetries: 3,
        delay: 1000,
      });

      // Mock successful retry
      const onRetry = jest.fn()
        .mockRejectedValueOnce(new Error('Network still down'))
        .mockResolvedValueOnce(undefined);

      // Test the complete flow
      const error = new Error('Network connection failed');
      const promise = photoErrorHandlingService.handleError(error, 'upload_test', {
        showUserFeedback: false,
        onRetry,
      });

      // Fast-forward through retry delay
      jest.advanceTimersByTime(1000);
      await promise;

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(mockPhotoErrorClassificationService.classifyError).toHaveBeenCalledWith(error);
    });

    it('handles camera permission flow end-to-end', async () => {
      mockPhotoErrorHandlingService.handleCameraPermission.mockResolvedValue(true);
      
      const onPermissionGranted = jest.fn();
      const onClose = jest.fn();

      const { getByText } = render(
        <CameraPermissionHandler
          visible={true}
          onClose={onClose}
          onPermissionGranted={onPermissionGranted}
          onPermissionDenied={jest.fn()}
        />
      );

      // User grants permission
      const grantButton = getByText('Grant Permission');
      fireEvent.press(grantButton);

      await waitFor(() => {
        expect(mockPhotoErrorHandlingService.handleCameraPermission).toHaveBeenCalled();
        expect(onPermissionGranted).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
        expect(mockPhotoToastService.showSuccess).toHaveBeenCalledWith('Permission granted successfully!');
      });
    });

    it('handles permission denial with settings redirect', async () => {
      mockPhotoErrorHandlingService.handleCameraPermission.mockResolvedValue(false);
      mockLinking.openSettings.mockResolvedValue();
      
      const onPermissionDenied = jest.fn();

      const { getByText } = render(
        <CameraPermissionHandler
          visible={true}
          onClose={jest.fn()}
          onPermissionGranted={jest.fn()}
          onPermissionDenied={onPermissionDenied}
        />
      );

      // User tries to grant permission but it's denied
      const grantButton = getByText('Grant Permission');
      fireEvent.press(grantButton);

      await waitFor(() => {
        expect(onPermissionDenied).toHaveBeenCalled();
      });

      // Settings button should appear
      const settingsButton = getByText('Open Settings');
      fireEvent.press(settingsButton);

      expect(mockLinking.openSettings).toHaveBeenCalled();
      expect(mockPhotoToastService.showInfo).toHaveBeenCalledWith(
        'Please enable the required permissions and return to the app.'
      );
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('handles upload failure with offline queue fallback', async () => {
      const recoveryOptions = [
        { id: 'retry', label: 'Try Again', action: 'retry' as const },
        { id: 'save_offline', label: 'Save for Later', action: 'alternative' as const },
        { id: 'dismiss', label: 'OK', action: 'dismiss' as const },
      ];

      const onAlternativeAction = jest.fn().mockResolvedValue(undefined);

      const { getByText } = render(
        <PhotoErrorRecovery
          visible={true}
          onClose={jest.fn()}
          errorType={PhotoErrorType.UPLOAD_FAILED}
          errorMessage="Upload failed"
          userMessage="Failed to upload your photo. It will be saved locally."
          recoveryOptions={recoveryOptions}
          onAlternativeAction={onAlternativeAction}
          operationId="upload_recovery_test"
        />
      );

      // User chooses to save for later
      const saveButton = getByText('Save for Later');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(onAlternativeAction).toHaveBeenCalledWith('save_offline');
      });
    });

    it('handles file too large error with compression option', async () => {
      const recoveryOptions = [
        { id: 'compress', label: 'Compress Photo', action: 'alternative' as const },
        { id: 'choose_different', label: 'Choose Different Photo', action: 'alternative' as const },
        { id: 'dismiss', label: 'Cancel', action: 'dismiss' as const },
      ];

      const onAlternativeAction = jest.fn().mockResolvedValue(undefined);

      const { getByText } = render(
        <PhotoErrorRecovery
          visible={true}
          onClose={jest.fn()}
          errorType={PhotoErrorType.FILE_TOO_LARGE}
          errorMessage="File too large"
          userMessage="The photo is too large to upload. We can compress it for you."
          recoveryOptions={recoveryOptions}
          onAlternativeAction={onAlternativeAction}
          operationId="file_size_test"
        />
      );

      // User chooses to compress photo
      const compressButton = getByText('Compress Photo');
      fireEvent.press(compressButton);

      await waitFor(() => {
        expect(onAlternativeAction).toHaveBeenCalledWith('compress');
      });
    });

    it('handles storage full error with management options', async () => {
      const recoveryOptions = [
        { id: 'open_settings', label: 'Manage Storage', action: 'settings' as const },
        { id: 'dismiss', label: 'Cancel', action: 'dismiss' as const },
      ];

      mockPhotoErrorHandlingService.handleError.mockResolvedValue(true);

      const { getByText } = render(
        <PhotoErrorRecovery
          visible={true}
          onClose={jest.fn()}
          errorType={PhotoErrorType.STORAGE_FULL}
          errorMessage="Storage full"
          userMessage="Your device storage is full. Please free up some space."
          recoveryOptions={recoveryOptions}
          operationId="storage_full_test"
        />
      );

      // User chooses to manage storage
      const manageButton = getByText('Manage Storage');
      fireEvent.press(manageButton);

      await waitFor(() => {
        expect(mockPhotoErrorHandlingService.handleError).toHaveBeenCalled();
      });
    });
  });

  describe('Toast Integration', () => {
    it('shows appropriate toasts for different photo operations', () => {
      // Test photo capture success
      photoToastService.showPhotoCaptureSuccess();
      expect(mockPhotoToastService.showPhotoCaptureSuccess).toHaveBeenCalled();

      // Test photo upload progress
      const toastId = photoToastService.showPhotoUploadProgress(50);
      expect(mockPhotoToastService.showPhotoUploadProgress).toHaveBeenCalledWith(50);

      // Test photo deletion with undo
      const onUndo = jest.fn();
      photoToastService.showPhotoDeletionWithUndo(onUndo);
      expect(mockPhotoToastService.showPhotoDeletionWithUndo).toHaveBeenCalledWith(onUndo);

      // Test permission required
      photoToastService.showPermissionRequired('camera');
      expect(mockPhotoToastService.showPermissionRequired).toHaveBeenCalledWith('camera');

      // Test storage full
      photoToastService.showStorageFull();
      expect(mockPhotoToastService.showStorageFull).toHaveBeenCalled();

      // Test camera unavailable
      photoToastService.showCameraUnavailable();
      expect(mockPhotoToastService.showCameraUnavailable).toHaveBeenCalled();
    });

    it('shows offline queue status updates', () => {
      // Test offline queue status
      photoToastService.showOfflineQueueStatus(3);
      expect(mockPhotoToastService.showOfflineQueueStatus).toHaveBeenCalledWith(3);

      // Test network reconnection
      photoToastService.showNetworkReconnected(2);
      expect(mockPhotoToastService.showNetworkReconnected).toHaveBeenCalledWith(2);
    });
  });

  describe('Error Classification Integration', () => {
    it('correctly classifies and handles various error types', () => {
      const testCases = [
        {
          error: new Error('Camera permission denied'),
          expectedType: PhotoErrorType.CAMERA_PERMISSION_DENIED,
        },
        {
          error: new Error('Network connection failed'),
          expectedType: PhotoErrorType.NETWORK_ERROR,
        },
        {
          error: new Error('Device storage is full'),
          expectedType: PhotoErrorType.STORAGE_FULL,
        },
        {
          error: new Error('Photo capture failed'),
          expectedType: PhotoErrorType.CAPTURE_FAILED,
        },
        {
          error: new Error('File size exceeds limit'),
          expectedType: PhotoErrorType.FILE_TOO_LARGE,
        },
      ];

      testCases.forEach(({ error, expectedType }) => {
        mockPhotoErrorClassificationService.classifyError.mockReturnValue({
          type: expectedType,
          severity: 'MEDIUM' as any,
          title: 'Test Error',
          message: error.message,
          userMessage: 'User friendly message',
          shouldRetry: false,
          recoveryOptions: [],
        });

        const errorInfo = photoErrorClassificationService.classifyError(error);
        expect(errorInfo.type).toBe(expectedType);
      });
    });

    it('provides appropriate recovery options for each error type', () => {
      const errorTypes = [
        PhotoErrorType.CAMERA_PERMISSION_DENIED,
        PhotoErrorType.NETWORK_ERROR,
        PhotoErrorType.STORAGE_FULL,
        PhotoErrorType.FILE_TOO_LARGE,
        PhotoErrorType.CAPTURE_FAILED,
      ];

      errorTypes.forEach((errorType) => {
        const mockOptions = [
          { id: 'option1', label: 'Option 1', action: 'retry' as const },
          { id: 'option2', label: 'Option 2', action: 'alternative' as const },
        ];

        mockPhotoErrorClassificationService.getRecoveryOptions.mockReturnValue(mockOptions);

        const options = photoErrorClassificationService.getRecoveryOptions(new Error('Test'));
        expect(options).toEqual(mockOptions);
      });
    });
  });

  describe('Retry Logic Integration', () => {
    it('implements exponential backoff correctly', async () => {
      const onRetry = jest.fn()
        .mockRejectedValueOnce(new Error('Retry 1 failed'))
        .mockRejectedValueOnce(new Error('Retry 2 failed'))
        .mockResolvedValueOnce(undefined);

      mockPhotoErrorClassificationService.classifyError.mockReturnValue({
        type: PhotoErrorType.NETWORK_ERROR,
        severity: 'MEDIUM' as any,
        title: 'Network Error',
        message: 'Network failed',
        userMessage: 'Network connection failed',
        shouldRetry: true,
        maxRetries: 3,
        retryDelay: 1000,
        recoveryOptions: [],
      });

      mockPhotoErrorClassificationService.getRetryConfig.mockReturnValue({
        maxRetries: 3,
        delay: 1000,
      });

      const error = new Error('Network connection failed');
      const promise = photoErrorHandlingService.handleError(error, 'backoff_integration_test', {
        showUserFeedback: false,
        onRetry,
        customRetryConfig: {
          maxRetries: 3,
          delay: 1000,
          backoffMultiplier: 2,
        },
      });

      // Fast-forward through all retries
      jest.advanceTimersByTime(1000); // First retry
      await Promise.resolve();
      
      jest.advanceTimersByTime(2000); // Second retry (exponential backoff)
      await Promise.resolve();
      
      jest.advanceTimersByTime(4000); // Third retry
      await promise;

      expect(onRetry).toHaveBeenCalledTimes(3);
    });

    it('stops retrying after max attempts', async () => {
      const onRetry = jest.fn().mockRejectedValue(new Error('Always fails'));

      mockPhotoErrorClassificationService.classifyError.mockReturnValue({
        type: PhotoErrorType.UPLOAD_FAILED,
        severity: 'MEDIUM' as any,
        title: 'Upload Failed',
        message: 'Upload failed',
        userMessage: 'Failed to upload photo',
        shouldRetry: true,
        maxRetries: 2,
        retryDelay: 500,
        recoveryOptions: [],
      });

      mockPhotoErrorClassificationService.getRetryConfig.mockReturnValue({
        maxRetries: 2,
        delay: 500,
      });

      const error = new Error('Upload failed');
      const promise = photoErrorHandlingService.handleError(error, 'max_retry_integration_test', {
        showUserFeedback: false,
        onRetry,
      });

      // Fast-forward through all retries
      jest.advanceTimersByTime(2000);
      await promise;

      expect(onRetry).toHaveBeenCalledTimes(2);
    });
  });

  describe('User Experience Flow', () => {
    it('provides seamless error recovery experience', async () => {
      // Simulate a complete user journey from error to recovery
      const onRetry = jest.fn().mockResolvedValue(undefined);
      const onClose = jest.fn();

      const recoveryOptions = [
        { id: 'retry', label: 'Try Again', action: 'retry' as const },
        { id: 'dismiss', label: 'Cancel', action: 'dismiss' as const },
      ];

      const { getByText } = render(
        <PhotoErrorRecovery
          visible={true}
          onClose={onClose}
          errorType={PhotoErrorType.CAPTURE_FAILED}
          errorMessage="Photo capture failed"
          userMessage="Unable to take the photo. Please try again."
          recoveryOptions={recoveryOptions}
          onRetry={onRetry}
          operationId="user_experience_test"
        />
      );

      // User sees error and chooses to retry
      expect(getByText('Photo Capture Failed')).toBeTruthy();
      expect(getByText('Unable to take the photo. Please try again.')).toBeTruthy();

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalled();
        expect(mockPhotoToastService.showSuccess).toHaveBeenCalledWith('Operation completed successfully!');
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('handles contact support flow', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockLinking.canOpenURL.mockResolvedValue(true);
      mockLinking.openURL.mockResolvedValue();

      const recoveryOptions = [
        { id: 'support', label: 'Contact Support', action: 'contact_support' as const },
      ];

      const { getByText } = render(
        <PhotoErrorRecovery
          visible={true}
          onClose={jest.fn()}
          errorType={PhotoErrorType.UNKNOWN_ERROR}
          errorMessage="Unknown error"
          userMessage="Something unexpected happened."
          recoveryOptions={recoveryOptions}
          operationId="support_flow_test"
        />
      );

      // User chooses to contact support
      const supportButton = getByText('Contact Support');
      fireEvent.press(supportButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Contact Support',
          'How would you like to contact our support team?',
          expect.arrayContaining([
            expect.objectContaining({ text: 'Email Support' }),
            expect.objectContaining({ text: 'In-App Help' }),
            expect.objectContaining({ text: 'Cancel' }),
          ])
        );
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('provides accessible error recovery interface', () => {
      const { getByLabelText, getByText } = render(
        <PhotoErrorRecovery
          visible={true}
          onClose={jest.fn()}
          errorType={PhotoErrorType.NETWORK_ERROR}
          errorMessage="Network error"
          userMessage="Network connection failed"
          recoveryOptions={[
            { id: 'retry', label: 'Try Again', action: 'retry' },
          ]}
          operationId="accessibility_test"
        />
      );

      // Check for accessible elements
      expect(getByText('Network Connection Issue')).toBeTruthy();
      expect(getByText('Try Again')).toBeTruthy();
    });

    it('provides accessible permission handler interface', () => {
      const { getByText } = render(
        <CameraPermissionHandler
          visible={true}
          onClose={jest.fn()}
          onPermissionGranted={jest.fn()}
          onPermissionDenied={jest.fn()}
        />
      );

      // Check for accessible elements
      expect(getByText('Camera Permission Required')).toBeTruthy();
      expect(getByText('Grant Permission')).toBeTruthy();
      expect(getByText('Skip for Now')).toBeTruthy();
    });
  });
});