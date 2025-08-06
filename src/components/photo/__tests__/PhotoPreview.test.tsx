/**
 * PhotoPreview Component Tests
 * Tests thumbnail display, full-screen navigation, and delete functionality
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PhotoPreview from '../PhotoPreview';

// Mock Alert
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('PhotoPreview', () => {
  const defaultProps = {
    photoUrl: 'https://example.com/photo.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders photo preview with image', () => {
      const { getByLabelText } = render(<PhotoPreview {...defaultProps} />);
      
      const image = getByLabelText('Photo preview');
      expect(image).toBeTruthy();
    });

    it('shows loading indicator initially', () => {
      const { getByTestId } = render(<PhotoPreview {...defaultProps} />);
      
      // ActivityIndicator should be present initially
      expect(() => getByTestId('activity-indicator')).not.toThrow();
    });

    it('applies custom size correctly', () => {
      const customSize = 120;
      const { getByLabelText } = render(
        <PhotoPreview {...defaultProps} size={customSize} />
      );
      
      const image = getByLabelText('Photo preview');
      expect(image.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: customSize,
            height: customSize,
          }),
        ])
      );
    });
  });

  describe('Image Loading States', () => {
    it('hides loading indicator after image loads', async () => {
      const { getByLabelText, queryByTestId } = render(
        <PhotoPreview {...defaultProps} />
      );
      
      const image = getByLabelText('Photo preview');
      fireEvent(image, 'onLoad');
      
      await waitFor(() => {
        expect(queryByTestId('activity-indicator')).toBeNull();
      });
    });

    it('shows error state when image fails to load', async () => {
      const { getByLabelText, getByText } = render(
        <PhotoPreview {...defaultProps} />
      );
      
      const image = getByLabelText('Photo preview');
      fireEvent(image, 'onError');
      
      await waitFor(() => {
        expect(getByText('Failed to load')).toBeTruthy();
        expect(getByText('📷')).toBeTruthy();
      });
    });

    it('disables touch when in error state', async () => {
      const onFullScreen = jest.fn();
      const { getByLabelText } = render(
        <PhotoPreview {...defaultProps} onFullScreen={onFullScreen} />
      );
      
      const image = getByLabelText('Photo preview');
      fireEvent(image, 'onError');
      
      const touchable = getByLabelText('Photo preview');
      fireEvent.press(touchable);
      
      expect(onFullScreen).not.toHaveBeenCalled();
    });
  });

  describe('Full Screen Navigation', () => {
    it('calls onFullScreen when tapped', () => {
      const onFullScreen = jest.fn();
      const { getByLabelText } = render(
        <PhotoPreview {...defaultProps} onFullScreen={onFullScreen} />
      );
      
      const touchable = getByLabelText('Photo preview');
      fireEvent.press(touchable);
      
      expect(onFullScreen).toHaveBeenCalledTimes(1);
    });

    it('does not call onFullScreen when not provided', () => {
      const { getByLabelText } = render(<PhotoPreview {...defaultProps} />);
      
      const touchable = getByLabelText('Photo preview');
      // Should not throw error when onFullScreen is not provided
      expect(() => fireEvent.press(touchable)).not.toThrow();
    });

    it('has correct accessibility properties for full screen', () => {
      const { getByLabelText } = render(
        <PhotoPreview {...defaultProps} onFullScreen={jest.fn()} />
      );
      
      const touchable = getByLabelText('Photo preview');
      expect(touchable.props.accessibilityHint).toBe('Tap to view full size photo');
      expect(touchable.props.accessibilityRole).toBe('button');
    });
  });

  describe('Delete Functionality', () => {
    it('shows delete button when onDelete is provided and showControls is true', () => {
      const onDelete = jest.fn();
      const { getByLabelText } = render(
        <PhotoPreview {...defaultProps} onDelete={onDelete} showControls={true} />
      );
      
      const deleteButton = getByLabelText('Delete photo');
      expect(deleteButton).toBeTruthy();
    });

    it('hides delete button when showControls is false', () => {
      const onDelete = jest.fn();
      const { queryByLabelText } = render(
        <PhotoPreview {...defaultProps} onDelete={onDelete} showControls={false} />
      );
      
      const deleteButton = queryByLabelText('Delete photo');
      expect(deleteButton).toBeNull();
    });

    it('hides delete button when onDelete is not provided', () => {
      const { queryByLabelText } = render(
        <PhotoPreview {...defaultProps} showControls={true} />
      );
      
      const deleteButton = queryByLabelText('Delete photo');
      expect(deleteButton).toBeNull();
    });

    it('shows confirmation dialog when delete button is pressed', () => {
      const onDelete = jest.fn();
      const { getByLabelText } = render(
        <PhotoPreview {...defaultProps} onDelete={onDelete} />
      );
      
      const deleteButton = getByLabelText('Delete photo');
      fireEvent.press(deleteButton);
      
      expect(mockAlert).toHaveBeenCalledWith(
        'Delete Photo',
        'Are you sure you want to delete this photo? This action cannot be undone.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Delete', style: 'destructive' }),
        ]),
        { cancelable: true }
      );
    });

    it('calls onDelete when deletion is confirmed', () => {
      const onDelete = jest.fn();
      const { getByLabelText } = render(
        <PhotoPreview {...defaultProps} onDelete={onDelete} />
      );
      
      const deleteButton = getByLabelText('Delete photo');
      fireEvent.press(deleteButton);
      
      // Simulate pressing the Delete button in the alert
      const alertCall = mockAlert.mock.calls[0];
      const deleteAction = alertCall[2].find((action: any) => action.text === 'Delete');
      deleteAction.onPress();
      
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('does not call onDelete when deletion is cancelled', () => {
      const onDelete = jest.fn();
      const { getByLabelText } = render(
        <PhotoPreview {...defaultProps} onDelete={onDelete} />
      );
      
      const deleteButton = getByLabelText('Delete photo');
      fireEvent.press(deleteButton);
      
      // Simulate pressing the Cancel button in the alert
      const alertCall = mockAlert.mock.calls[0];
      const cancelAction = alertCall[2].find((action: any) => action.text === 'Cancel');
      if (cancelAction.onPress) {
        cancelAction.onPress();
      }
      
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('hides delete button in error state', async () => {
      const onDelete = jest.fn();
      const { getByLabelText, queryByLabelText } = render(
        <PhotoPreview {...defaultProps} onDelete={onDelete} />
      );
      
      const image = getByLabelText('Photo preview');
      fireEvent(image, 'onError');
      
      await waitFor(() => {
        const deleteButton = queryByLabelText('Delete photo');
        expect(deleteButton).toBeNull();
      });
    });
  });

  describe('Metadata Display', () => {
    const metadata = {
      captureDate: '2024-01-15T10:30:00Z',
      fileSize: '2.5 MB',
      dimensions: '1024x768',
    };

    it('displays metadata when provided', async () => {
      const { getByLabelText, getByText } = render(
        <PhotoPreview {...defaultProps} metadata={metadata} />
      );
      
      // Simulate image load to show metadata
      const image = getByLabelText('Photo preview');
      fireEvent(image, 'onLoad');
      
      await waitFor(() => {
        expect(getByText('1/15/2024')).toBeTruthy(); // Date formatted
        expect(getByText('2.5 MB')).toBeTruthy();
        expect(getByText('1024x768')).toBeTruthy();
      });
    });

    it('includes capture date in accessibility label', () => {
      const { getByLabelText } = render(
        <PhotoPreview {...defaultProps} metadata={metadata} />
      );
      
      const touchable = getByLabelText('Photo preview from 2024-01-15T10:30:00Z');
      expect(touchable).toBeTruthy();
    });

    it('hides metadata during loading', () => {
      const { queryByText } = render(
        <PhotoPreview {...defaultProps} metadata={metadata} />
      );
      
      // Metadata should not be visible during loading
      expect(queryByText('2.5 MB')).toBeNull();
    });

    it('hides metadata in error state', async () => {
      const { getByLabelText, queryByText } = render(
        <PhotoPreview {...defaultProps} metadata={metadata} />
      );
      
      const image = getByLabelText('Photo preview');
      fireEvent(image, 'onError');
      
      await waitFor(() => {
        expect(queryByText('2.5 MB')).toBeNull();
      });
    });

    it('handles partial metadata gracefully', async () => {
      const partialMetadata = { fileSize: '1.2 MB' };
      const { getByLabelText, getByText, queryByText } = render(
        <PhotoPreview {...defaultProps} metadata={partialMetadata} />
      );
      
      const image = getByLabelText('Photo preview');
      fireEvent(image, 'onLoad');
      
      await waitFor(() => {
        expect(getByText('1.2 MB')).toBeTruthy();
        expect(queryByText('1024x768')).toBeNull();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility labels', () => {
      const { getByLabelText } = render(<PhotoPreview {...defaultProps} />);
      
      const image = getByLabelText('Photo preview');
      expect(image).toBeTruthy();
    });

    it('has proper accessibility role for touchable elements', () => {
      const onDelete = jest.fn();
      const { getByLabelText } = render(
        <PhotoPreview {...defaultProps} onDelete={onDelete} />
      );
      
      const touchable = getByLabelText('Photo preview');
      const deleteButton = getByLabelText('Delete photo');
      
      expect(touchable.props.accessibilityRole).toBe('button');
      expect(deleteButton.props.accessibilityRole).toBe('button');
    });

    it('has descriptive accessibility hints', () => {
      const onDelete = jest.fn();
      const { getByLabelText } = render(
        <PhotoPreview {...defaultProps} onDelete={onDelete} onFullScreen={jest.fn()} />
      );
      
      const touchable = getByLabelText('Photo preview');
      const deleteButton = getByLabelText('Delete photo');
      
      expect(touchable.props.accessibilityHint).toBe('Tap to view full size photo');
      expect(deleteButton.props.accessibilityHint).toBe('Removes this photo permanently');
    });
  });
});