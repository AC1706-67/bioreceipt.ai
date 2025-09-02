/**
 * Tests for CameraPermissionHandler component
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import CameraPermissionHandler, { PermissionType, PermissionStatus } from '../CameraPermissionHandler';
import { photoErrorHandlingService } from '../../../services/photo/photoErrorHandlingService';
import { photoToastService } from '../../../services/photo/photoToastService';

// Mock dependencies
jest.mock('../../../services/photo/photoErrorHandlingService');
jest.mock('../../../services/photo/photoToastService');
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openSettings: jest.fn(),
}));

const mockPhotoErrorHandlingService = photoErrorHandlingService as jest.Mocked<typeof photoErrorHandlingService>;
const mockPhotoToastService = photoToastService as jest.Mocked<typeof photoToastService>;
const mockLinking = Linking as jest.Mocked<typeof Linking>;

describe('CameraPermissionHandler', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onPermissionGranted: jest.fn(),
    onPermissionDenied: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly when visible', () => {
      const { getByText } = render(<CameraPermissionHandler {...defaultProps} />);
      
      expect(getByText('Camera Permission Required')).toBeTruthy();
      expect(getByText('We need camera permission to take photos of your intake. This helps you visually document what you consume.')).toBeTruthy();
    });

    it('does not render when not visible', () => {
      const { queryByText } = render(
        <CameraPermissionHandler {...defaultProps} visible={false} />
      );
      
      expect(queryByText('Camera Permission Required')).toBeNull();
    });

    it('renders custom title and message when provided', () => {
      const { getByText } = render(
        <CameraPermissionHandler
          {...defaultProps}
          title="Custom Title"
          message="Custom message"
        />
      );
      
      expect(getByText('Custom Title')).toBeTruthy();
      expect(getByText('Custom message')).toBeTruthy();
    });

    it('renders storage permission content for storage type', () => {
      const { getByText } = render(
        <CameraPermissionHandler
          {...defaultProps}
          permissionType={PermissionType.STORAGE}
        />
      );
      
      expect(getByText('Storage Permission Required')).toBeTruthy();
      expect(getByText('We need storage permission to save your photos. This ensures your intake photos are safely stored on your device.')).toBeTruthy();
    });

    it('renders both permissions content for both type', () => {
      const { getByText } = render(
        <CameraPermissionHandler
          {...defaultProps}
          permissionType={PermissionType.BOTH}
        />
      );
      
      expect(getByText('Permissions Required')).toBeTruthy();
      expect(getByText('We need camera and storage permissions to take and save photos of your intake. This helps you visually document what you consume.')).toBeTruthy();
    });
  });

  describe('Permission Handling', () => {
    it('requests camera permission when grant button is pressed', async () => {
      mockPhotoErrorHandlingService.handleCameraPermission.mockResolvedValue(true);
      
      const { getByText } = render(<CameraPermissionHandler {...defaultProps} />);
      
      const grantButton = getByText('Grant Permission');
      fireEvent.press(grantButton);
      
      await waitFor(() => {
        expect(mockPhotoErrorHandlingService.handleCameraPermission).toHaveBeenCalled();
      });
    });

    it('requests storage permission for storage type', async () => {
      mockPhotoErrorHandlingService.handleStoragePermission.mockResolvedValue(true);
      
      const { getByText } = render(
        <CameraPermissionHandler
          {...defaultProps}
          permissionType={PermissionType.STORAGE}
        />
      );
      
      const grantButton = getByText('Grant Permission');
      fireEvent.press(grantButton);
      
      await waitFor(() => {
        expect(mockPhotoErrorHandlingService.handleStoragePermission).toHaveBeenCalled();
      });
    });

    it('requests both permissions for both type', async () => {
      mockPhotoErrorHandlingService.handleCameraPermission.mockResolvedValue(true);
      mockPhotoErrorHandlingService.handleStoragePermission.mockResolvedValue(true);
      
      const { getByText } = render(
        <CameraPermissionHandler
          {...defaultProps}
          permissionType={PermissionType.BOTH}
        />
      );
      
      const grantButton = getByText('Grant Permission');
      fireEvent.press(grantButton);
      
      await waitFor(() => {
        expect(mockPhotoErrorHandlingService.handleCameraPermission).toHaveBeenCalled();
        expect(mockPhotoErrorHandlingService.handleStoragePermission).toHaveBeenCalled();
      });
    });

    it('calls onPermissionGranted when permission is granted', async () => {
      mockPhotoErrorHandlingService.handleCameraPermission.mockResolvedValue(true);
      
      const { getByText } = render(<CameraPermissionHandler {...defaultProps} />);
      
      const grantButton = getByText('Grant Permission');
      fireEvent.press(grantButton);
      
      await waitFor(() => {
        expect(defaultProps.onPermissionGranted).toHaveBeenCalled();
        expect(defaultProps.onClose).toHaveBeenCalled();
        expect(mockPhotoToastService.showSuccess).toHaveBeenCalledWith('Permission granted successfully!');
      });
    });

    it('calls onPermissionDenied when permission is denied', async () => {
      mockPhotoErrorHandlingService.handleCameraPermission.mockResolvedValue(false);
      
      const { getByText } = render(<CameraPermissionHandler {...defaultProps} />);
      
      const grantButton = getByText('Grant Permission');
      fireEvent.press(grantButton);
      
      await waitFor(() => {
        expect(defaultProps.onPermissionDenied).toHaveBeenCalled();
      });
    });

    it('handles permission request errors', async () => {
      const error = new Error('Permission request failed');
      mockPhotoErrorHandlingService.handleCameraPermission.mockRejectedValue(error);
      
      const { getByText } = render(<CameraPermissionHandler {...defaultProps} />);
      
      const grantButton = getByText('Grant Permission');
      fireEvent.press(grantButton);
      
      await waitFor(() => {
        expect(defaultProps.onPermissionDenied).toHaveBeenCalled();
      });
    });
  });

  describe('Settings Integration', () => {
    it('opens app settings when settings button is pressed', async () => {
      mockLinking.openSettings.mockResolvedValue();
      
      const { getByText } = render(<CameraPermissionHandler {...defaultProps} />);
      
      // First deny permission to show settings button
      mockPhotoErrorHandlingService.handleCameraPermission.mockResolvedValue(false);
      const grantButton = getByText('Grant Permission');
      fireEvent.press(grantButton);
      
      await waitFor(() => {
        const settingsButton = getByText('Open Settings');
        fireEvent.press(settingsButton);
      });
      
      expect(mockLinking.openSettings).toHaveBeenCalled();
      expect(mockPhotoToastService.showInfo).toHaveBeenCalledWith('Please enable the required permissions and return to the app.');
    });

    it('shows alert when settings cannot be opened', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockLinking.openSettings.mockRejectedValue(new Error('Settings unavailable'));
      
      const { getByText } = render(<CameraPermissionHandler {...defaultProps} />);
      
      // First deny permission to show settings button
      mockPhotoErrorHandlingService.handleCameraPermission.mockResolvedValue(false);
      const grantButton = getByText('Grant Permission');
      fireEvent.press(grantButton);
      
      await waitFor(() => {
        const settingsButton = getByText('Open Settings');
        fireEvent.press(settingsButton);
      });
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Settings Unavailable',
          'Unable to open settings automatically. Please go to your device settings > Apps > BioReceipt > Permissions and enable the required permissions.',
          [{ text: 'OK' }]
        );
      });
    });
  });

  describe('Alternative Actions', () => {
    it('shows gallery option when showAlternatives is true', () => {
      const { getByText } = render(
        <CameraPermissionHandler
          {...defaultProps}
          showAlternatives={true}
          onUseGallery={jest.fn()}
        />
      );
      
      expect(getByText('Choose from Gallery Instead')).toBeTruthy();
    });

    it('does not show gallery option when showAlternatives is false', () => {
      const { queryByText } = render(
        <CameraPermissionHandler
          {...defaultProps}
          showAlternatives={false}
        />
      );
      
      expect(queryByText('Choose from Gallery Instead')).toBeNull();
    });

    it('calls onUseGallery when gallery button is pressed', () => {
      const onUseGallery = jest.fn();
      const { getByText } = render(
        <CameraPermissionHandler
          {...defaultProps}
          showAlternatives={true}
          onUseGallery={onUseGallery}
        />
      );
      
      const galleryButton = getByText('Choose from Gallery Instead');
      fireEvent.press(galleryButton);
      
      expect(onUseGallery).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Help Functionality', () => {
    it('toggles help details when help button is pressed', () => {
      const { getByText, queryByText } = render(<CameraPermissionHandler {...defaultProps} />);
      
      const helpButton = getByText('Need Help?');
      fireEvent.press(helpButton);
      
      expect(getByText('Hide Help')).toBeTruthy();
      expect(getByText('How to enable permissions:')).toBeTruthy();
      
      fireEvent.press(getByText('Hide Help'));
      expect(queryByText('How to enable permissions:')).toBeNull();
    });
  });

  describe('Close Functionality', () => {
    it('calls onClose when close button is pressed', () => {
      const { getByText } = render(<CameraPermissionHandler {...defaultProps} />);
      
      const closeButton = getByText('✕');
      fireEvent.press(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onClose when skip button is pressed', () => {
      const { getByText } = render(<CameraPermissionHandler {...defaultProps} />);
      
      const skipButton = getByText('Skip for Now');
      fireEvent.press(skipButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('disables button and shows loading text during permission request', async () => {
      let resolvePermission: (value: boolean) => void;
      const permissionPromise = new Promise<boolean>((resolve) => {
        resolvePermission = resolve;
      });
      mockPhotoErrorHandlingService.handleCameraPermission.mockReturnValue(permissionPromise);
      
      const { getByText } = render(<CameraPermissionHandler {...defaultProps} />);
      
      const grantButton = getByText('Grant Permission');
      fireEvent.press(grantButton);
      
      // Should show loading state
      expect(getByText('Requesting...')).toBeTruthy();
      
      // Resolve the permission request
      resolvePermission!(true);
      
      await waitFor(() => {
        expect(defaultProps.onPermissionGranted).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility labels', () => {
      const { getByLabelText } = render(<CameraPermissionHandler {...defaultProps} />);
      
      expect(getByLabelText('Close')).toBeTruthy();
    });
  });
});
