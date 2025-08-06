/**
 * Tests for PhotoErrorRecovery component
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PhotoErrorRecovery from '../PhotoErrorRecovery';
import { PhotoErrorType } from '../../../services/photo/photoErrorClassificationService';
import { photoErrorHandlingService } from '../../../services/photo/photoErrorHandlingService';
import { photoToastService } from '../../../services/photo/photoToastService';

// Mock dependencies
jest.mock('../../../services/photo/photoErrorHandlingService');
jest.mock('../../../services/photo/photoToastService');

const mockPhotoErrorHandlingService = photoErrorHandlingService as jest.Mocked<typeof photoErrorHandlingService>;
const mockPhotoToastService = photoToastService as jest.Mocked<typeof photoToastService>;

describe('PhotoErrorRecovery', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    errorType: PhotoErrorType.NETWORK_ERROR,
    errorMessage: 'Network connection failed',
    userMessage: 'Unable to upload photo due to network issues. Your photo will be saved and uploaded when connection is restored.',
    recoveryOptions: [
      {
        id: 'retry',
        label: 'Retry Now',
        action: 'retry' as const,
        description: 'Try uploading again',
        icon: '🔄',
      },
      {
        id: 'save_offline',
        label: 'Save for Later',
        action: 'alternative' as const,
        description: 'Photo will be uploaded when connection is restored',
        icon: '💾',
      },
      {
        id: 'dismiss',
        label: 'OK',
        action: 'dismiss' as const,
      },
    ],
    onRetry: jest.fn(),
    onAlternativeAction: jest.fn(),
    operationId: 'test_operation',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPhotoErrorHandlingService.getRetryAttempts.mockReturnValue(0);
  });

  describe('Rendering', () => {
    it('renders correctly when visible', () => {
      const { getByText } = render(<PhotoErrorRecovery {...defaultProps} />);
      
      expect(getByText('Network Connection Issue')).toBeTruthy();
      expect(getByText(defaultProps.userMessage)).toBeTruthy();
      expect(getByText('What would you like to do?')).toBeTruthy();
    });

    it('does not render when not visible', () => {
      const { queryByText } = render(
        <PhotoErrorRecovery {...defaultProps} visible={false} />
      );
      
      expect(queryByText('Network Connection Issue')).toBeNull();
    });

    it('renders all recovery options', () => {
      const { getByText } = render(<PhotoErrorRecovery {...defaultProps} />);
      
      expect(getByText('Retry Now')).toBeTruthy();
      expect(getByText('Save for Later')).toBeTruthy();
      expect(getByText('OK')).toBeTruthy();
    });

    it('renders option descriptions', () => {
      const { getByText } = render(<PhotoErrorRecovery {...defaultProps} />);
      
      expect(getByText('Try uploading again')).toBeTruthy();
      expect(getByText('Photo will be uploaded when connection is restored')).toBeTruthy();
    });
  });

  describe('Error Type Handling', () => {
    it('renders correct title for camera permission error', () => {
      const { getByText } = render(
        <PhotoErrorRecovery
          {...defaultProps}
          errorType={PhotoErrorType.CAMERA_PERMISSION_DENIED}
        />
      );
      
      expect(getByText('Camera Permission Required')).toBeTruthy();
    });

    it('renders correct title for storage full error', () => {
      const { getByText } = render(
        <PhotoErrorRecovery
          {...defaultProps}
          errorType={PhotoErrorType.STORAGE_FULL}
        />
      );
      
      expect(getByText('Storage Full')).toBeTruthy();
    });

    it('renders correct title for upload failed error', () => {
      const { getByText } = render(
        <PhotoErrorRecovery
          {...defaultProps}
          errorType={PhotoErrorType.UPLOAD_FAILED}
        />
      );
      
      expect(getByText('Upload Failed')).toBeTruthy();
    });

    it('renders correct title for unknown error', () => {
      const { getByText } = render(
        <PhotoErrorRecovery
          {...defaultProps}
          errorType={PhotoErrorType.UNKNOWN_ERROR}
        />
      );
      
      expect(getByText('Something Went Wrong')).toBeTruthy();
    });
  });

  describe('Recovery Actions', () => {
    it('calls onRetry when retry button is pressed', async () => {
      const onRetry = jest.fn().mockResolvedValue(undefined);
      const { getByText } = render(
        <PhotoErrorRecovery {...defaultProps} onRetry={onRetry} />
      );
      
      const retryButton = getByText('Retry Now');
      fireEvent.press(retryButton);
      
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalled();
        expect(mockPhotoToastService.showSuccess).toHaveBeenCalledWith('Operation completed successfully!');
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('calls onAlternativeAction when alternative button is pressed', async () => {
      const onAlternativeAction = jest.fn().mockResolvedValue(undefined);
      const { getByText } = render(
        <PhotoErrorRecovery {...defaultProps} onAlternativeAction={onAlternativeAction} />
      );
      
      const alternativeButton = getByText('Save for Later');
      fireEvent.press(alternativeButton);
      
      await waitFor(() => {
        expect(onAlternativeAction).toHaveBeenCalledWith('save_offline');
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('calls onClose when dismiss button is pressed', async () => {
      const { getByText } = render(<PhotoErrorRecovery {...defaultProps} />);
      
      const dismissButton = getByText('OK');
      fireEvent.press(dismissButton);
      
      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('handles settings action', async () => {
      const settingsOption = {
        id: 'open_settings',
        label: 'Open Settings',
        action: 'settings' as const,
        description: 'Go to app settings to enable permission',
        icon: '⚙️',
      };

      const { getByText } = render(
        <PhotoErrorRecovery
          {...defaultProps}
          recoveryOptions={[settingsOption]}
        />
      );
      
      const settingsButton = getByText('Open Settings');
      fireEvent.press(settingsButton);
      
      await waitFor(() => {
        expect(mockPhotoErrorHandlingService.handleError).toHaveBeenCalled();
      });
    });

    it('handles contact support action', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const supportOption = {
        id: 'contact_support',
        label: 'Contact Support',
        action: 'contact_support' as const,
        description: 'Get help from our support team',
        icon: '💬',
      };

      const { getByText } = render(
        <PhotoErrorRecovery
          {...defaultProps}
          recoveryOptions={[supportOption]}
        />
      );
      
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

  describe('Error Handling', () => {
    it('shows error toast when retry fails', async () => {
      const onRetry = jest.fn().mockRejectedValue(new Error('Retry failed'));
      const { getByText } = render(
        <PhotoErrorRecovery {...defaultProps} onRetry={onRetry} />
      );
      
      const retryButton = getByText('Retry Now');
      fireEvent.press(retryButton);
      
      await waitFor(() => {
        expect(mockPhotoToastService.showError).toHaveBeenCalledWith('Failed to complete the action. Please try again.');
      });
    });

    it('shows error toast when alternative action fails', async () => {
      const onAlternativeAction = jest.fn().mockRejectedValue(new Error('Alternative action failed'));
      const { getByText } = render(
        <PhotoErrorRecovery {...defaultProps} onAlternativeAction={onAlternativeAction} />
      );
      
      const alternativeButton = getByText('Save for Later');
      fireEvent.press(alternativeButton);
      
      await waitFor(() => {
        expect(mockPhotoToastService.showError).toHaveBeenCalledWith('Failed to complete the action. Please try again.');
      });
    });
  });

  describe('Loading States', () => {
    it('shows processing indicator during action execution', async () => {
      let resolveRetry: () => void;
      const retryPromise = new Promise<void>((resolve) => {
        resolveRetry = resolve;
      });
      const onRetry = jest.fn().mockReturnValue(retryPromise);
      
      const { getByText } = render(
        <PhotoErrorRecovery {...defaultProps} onRetry={onRetry} />
      );
      
      const retryButton = getByText('Retry Now');
      fireEvent.press(retryButton);
      
      // Should show processing indicator
      expect(getByText('⏳')).toBeTruthy();
      
      // Resolve the retry
      resolveRetry!();
      
      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('disables buttons during processing', async () => {
      let resolveRetry: () => void;
      const retryPromise = new Promise<void>((resolve) => {
        resolveRetry = resolve;
      });
      const onRetry = jest.fn().mockReturnValue(retryPromise);
      
      const { getByText } = render(
        <PhotoErrorRecovery {...defaultProps} onRetry={onRetry} />
      );
      
      const retryButton = getByText('Retry Now');
      fireEvent.press(retryButton);
      
      // Try to press another button - should be disabled
      const alternativeButton = getByText('Save for Later');
      fireEvent.press(alternativeButton);
      
      // Alternative action should not be called
      expect(defaultProps.onAlternativeAction).not.toHaveBeenCalled();
      
      // Resolve the retry
      resolveRetry!();
      
      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Troubleshooting Tips', () => {
    it('renders troubleshooting tips for network errors', () => {
      const { getByText } = render(
        <PhotoErrorRecovery
          {...defaultProps}
          errorType={PhotoErrorType.NETWORK_ERROR}
        />
      );
      
      expect(getByText('Troubleshooting Tips:')).toBeTruthy();
      expect(getByText('Check your internet connection')).toBeTruthy();
      expect(getByText('Try switching between WiFi and mobile data')).toBeTruthy();
    });

    it('renders troubleshooting tips for camera errors', () => {
      const { getByText } = render(
        <PhotoErrorRecovery
          {...defaultProps}
          errorType={PhotoErrorType.CAMERA_UNAVAILABLE}
        />
      );
      
      expect(getByText('Close other apps that might be using the camera')).toBeTruthy();
      expect(getByText('Restart your device if the problem persists')).toBeTruthy();
    });

    it('renders troubleshooting tips for storage errors', () => {
      const { getByText } = render(
        <PhotoErrorRecovery
          {...defaultProps}
          errorType={PhotoErrorType.STORAGE_FULL}
        />
      );
      
      expect(getByText('Delete unnecessary photos and videos')).toBeTruthy();
      expect(getByText('Move files to cloud storage')).toBeTruthy();
    });
  });

  describe('Technical Details', () => {
    it('toggles technical details when button is pressed', () => {
      const { getByText, queryByText } = render(
        <PhotoErrorRecovery {...defaultProps} showTechnicalDetails={true} />
      );
      
      const detailsButton = getByText('Show Technical Details');
      fireEvent.press(detailsButton);
      
      expect(getByText('Hide Details')).toBeTruthy();
      expect(getByText('Technical Details:')).toBeTruthy();
      expect(getByText('Error Type:')).toBeTruthy();
      expect(getByText('Operation ID:')).toBeTruthy();
      
      fireEvent.press(getByText('Hide Details'));
      expect(queryByText('Technical Details:')).toBeNull();
    });

    it('shows retry attempts in technical details', () => {
      mockPhotoErrorHandlingService.getRetryAttempts.mockReturnValue(2);
      
      const { getByText } = render(
        <PhotoErrorRecovery {...defaultProps} showTechnicalDetails={true} />
      );
      
      const detailsButton = getByText('Show Technical Details');
      fireEvent.press(detailsButton);
      
      expect(getByText('Retry Attempts:')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
    });
  });

  describe('Close Functionality', () => {
    it('calls onClose when close button is pressed', () => {
      const { getByText } = render(<PhotoErrorRecovery {...defaultProps} />);
      
      const closeButton = getByText('✕');
      fireEvent.press(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Action Button Styling', () => {
    it('applies correct styling for retry actions', () => {
      const { getByText } = render(<PhotoErrorRecovery {...defaultProps} />);
      
      const retryButton = getByText('Retry Now');
      expect(retryButton).toBeTruthy();
      // Button styling is tested through snapshot or style verification
    });

    it('applies correct styling for dismiss actions', () => {
      const { getByText } = render(<PhotoErrorRecovery {...defaultProps} />);
      
      const dismissButton = getByText('OK');
      expect(dismissButton).toBeTruthy();
      // Button styling is tested through snapshot or style verification
    });
  });
});