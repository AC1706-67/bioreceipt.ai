/**
 * PhotoFullScreen Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PhotoFullScreen from '../PhotoFullScreen';

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('PhotoFullScreen', () => {
  const mockPhotoUrl = 'https://example.com/photo.jpg';
  const mockOnClose = jest.fn();
  const mockOnDelete = jest.fn();
  const mockMetadata = {
    captureDate: '2024-01-15 10:30 AM',
    fileSize: '2.5 MB',
    dimensions: '1920x1080',
    location: 'New York, NY',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly when visible', () => {
      const { getByTestId } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
        />
      );

      expect(getByTestId('photo-fullscreen-close')).toBeTruthy();
    });

    it('does not render when not visible', () => {
      const { queryByTestId } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={false}
          onClose={mockOnClose}
        />
      );

      expect(queryByTestId('photo-fullscreen-close')).toBeNull();
    });

    it('renders delete button when onDelete is provided', () => {
      const { getByTestId } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      expect(getByTestId('photo-fullscreen-delete')).toBeTruthy();
    });

    it('renders info button when metadata is provided', () => {
      const { getByTestId } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
          metadata={mockMetadata}
        />
      );

      expect(getByTestId('photo-fullscreen-info')).toBeTruthy();
    });

    it('does not render delete button when onDelete is not provided', () => {
      const { queryByTestId } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
        />
      );

      expect(queryByTestId('photo-fullscreen-delete')).toBeNull();
    });
  });

  describe('Image Loading', () => {
    it('shows loading indicator initially', () => {
      const { getByTestId } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
        />
      );

      expect(getByTestId('photo-fullscreen-loading')).toBeTruthy();
    });

    it('hides loading indicator when image loads', async () => {
      const { getByTestId, queryByTestId } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
        />
      );

      const image = getByTestId('photo-fullscreen-image');
      fireEvent(image, 'onLoad');

      await waitFor(() => {
        expect(queryByTestId('photo-fullscreen-loading')).toBeNull();
      });
    });

    it('shows error state when image fails to load', async () => {
      const { getByTestId, queryByTestId, getByText } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
        />
      );

      const image = getByTestId('photo-fullscreen-image');
      fireEvent(image, 'onError');

      await waitFor(() => {
        expect(queryByTestId('photo-fullscreen-loading')).toBeNull();
        expect(getByText('Failed to load photo')).toBeTruthy();
        expect(getByTestId('photo-fullscreen-retry')).toBeTruthy();
      });
    });

    it('allows retry when image fails to load', async () => {
      const { getByTestId, queryByTestId } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Simulate image error
      const image = getByTestId('photo-fullscreen-image');
      fireEvent(image, 'onError');

      await waitFor(() => {
        expect(getByTestId('photo-fullscreen-retry')).toBeTruthy();
      });

      // Tap retry button
      fireEvent.press(getByTestId('photo-fullscreen-retry'));

      // Should show loading again
      expect(getByTestId('photo-fullscreen-loading')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('calls onClose when close button is pressed', () => {
      const { getByTestId } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
        />
      );

      fireEvent.press(getByTestId('photo-fullscreen-close'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('shows delete confirmation when delete button is pressed', () => {
      const { getByTestId } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.press(getByTestId('photo-fullscreen-delete'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Photo',
        'Are you sure you want to delete this photo? This action cannot be undone.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Delete' }),
        ]),
        expect.objectContaining({ cancelable: true })
      );
    });

    it('calls onDelete and onClose when deletion is confirmed', () => {
      const { getByTestId } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.press(getByTestId('photo-fullscreen-delete'));

      // Get the delete button from the alert and simulate press
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const deleteButton = alertCall[2].find((button: any) => button.text === 'Delete');
      deleteButton.onPress();

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('toggles metadata display when info button is pressed', () => {
      const { getByTestId, queryByText } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
          metadata={mockMetadata}
        />
      );

      // Initially metadata should not be visible
      expect(queryByText('Photo Details')).toBeNull();

      // Press info button to show metadata
      fireEvent.press(getByTestId('photo-fullscreen-info'));
      expect(queryByText('Photo Details')).toBeTruthy();
      expect(queryByText('Captured: 2024-01-15 10:30 AM')).toBeTruthy();

      // Press info button again to hide metadata
      fireEvent.press(getByTestId('photo-fullscreen-info'));
      expect(queryByText('Photo Details')).toBeNull();
    });
  });

  describe('Metadata Display', () => {
    it('displays all metadata fields when provided', () => {
      const { getByTestId, getByText } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
          metadata={mockMetadata}
        />
      );

      // Show metadata
      fireEvent.press(getByTestId('photo-fullscreen-info'));

      expect(getByText('Photo Details')).toBeTruthy();
      expect(getByText('Captured: 2024-01-15 10:30 AM')).toBeTruthy();
      expect(getByText('Size: 2.5 MB')).toBeTruthy();
      expect(getByText('Dimensions: 1920x1080')).toBeTruthy();
      expect(getByText('Location: New York, NY')).toBeTruthy();
    });

    it('displays metadata without location when not provided', () => {
      const metadataWithoutLocation = {
        captureDate: '2024-01-15 10:30 AM',
        fileSize: '2.5 MB',
        dimensions: '1920x1080',
      };

      const { getByTestId, getByText, queryByText } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
          metadata={metadataWithoutLocation}
        />
      );

      // Show metadata
      fireEvent.press(getByTestId('photo-fullscreen-info'));

      expect(getByText('Photo Details')).toBeTruthy();
      expect(getByText('Captured: 2024-01-15 10:30 AM')).toBeTruthy();
      expect(getByText('Size: 2.5 MB')).toBeTruthy();
      expect(getByText('Dimensions: 1920x1080')).toBeTruthy();
      expect(queryByText(/Location:/)).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility properties for close button', () => {
      const { getByTestId } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
        />
      );

      const closeButton = getByTestId('photo-fullscreen-close');
      expect(closeButton.props.accessible).toBe(true);
      expect(closeButton.props.accessibilityLabel).toBe('Close photo');
      expect(closeButton.props.accessibilityRole).toBe('button');
    });

    it('has correct accessibility properties for delete button', () => {
      const { getByTestId } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = getByTestId('photo-fullscreen-delete');
      expect(deleteButton.props.accessible).toBe(true);
      expect(deleteButton.props.accessibilityLabel).toBe('Delete photo');
      expect(deleteButton.props.accessibilityRole).toBe('button');
    });

    it('has correct accessibility properties for info button', () => {
      const { getByTestId } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
          metadata={mockMetadata}
        />
      );

      const infoButton = getByTestId('photo-fullscreen-info');
      expect(infoButton.props.accessible).toBe(true);
      expect(infoButton.props.accessibilityLabel).toBe('Show photo details');
      expect(infoButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('Modal Behavior', () => {
    it('handles modal close request', () => {
      const { getByTestId } = render(
        <PhotoFullScreen
          photoUrl={mockPhotoUrl}
          visible={true}
          onClose={mockOnClose}
        />
      );

      // Simulate modal onRequestClose
      const modal = getByTestId('photo-fullscreen-close').parent?.parent?.parent;
      if (modal && modal.props.onRequestClose) {
        modal.props.onRequestClose();
      }

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});