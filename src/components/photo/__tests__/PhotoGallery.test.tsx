/**
 * PhotoGallery Component Tests
 * Tests grid layout, photo management, and user interactions
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PhotoGallery, { Photo } from '../PhotoGallery';

// Mock dependencies
jest.mock('../PhotoPreview', () => {
  const MockPhotoPreview = ({ onPress, onLongPress, onDelete, photoUrl }: any) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity 
        testID={`photo-preview-${photoUrl}`} 
        onPress={onPress}
        onLongPress={onLongPress}
      >
        <Text>Photo Preview</Text>
        {onDelete && (
          <TouchableOpacity testID={`delete-${photoUrl}`} onPress={onDelete}>
            <Text>Delete</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };
  return MockPhotoPreview;
});

jest.mock('../PhotoFullScreen', () => {
  const MockPhotoFullScreen = ({ visible, onClose, photoUrl, onDelete }: any) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    if (!visible) return null;
    return (
      <View testID="photo-fullscreen">
        <Text>Full Screen: {photoUrl}</Text>
        <TouchableOpacity testID="fullscreen-close" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
        {onDelete && (
          <TouchableOpacity testID="fullscreen-delete" onPress={onDelete}>
            <Text>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
  return MockPhotoFullScreen;
});

// Mock Alert
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
    },
  };
});

const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('PhotoGallery', () => {
  const mockPhotos: Photo[] = [
    {
      id: '1',
      url: 'https://example.com/photo1.jpg',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      metadata: {
        captureDate: '2024-01-15T10:30:00Z',
        fileSize: '2.5 MB',
        dimensions: '1024x768',
        fileName: 'photo1.jpg',
      },
    },
    {
      id: '2',
      url: 'https://example.com/photo2.jpg',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      metadata: {
        captureDate: '2024-01-16T14:20:00Z',
        fileSize: '1.8 MB',
        dimensions: '800x600',
        fileName: 'photo2.jpg',
      },
    },
    {
      id: '3',
      url: 'https://example.com/photo3.jpg',
      thumbnailUrl: 'https://example.com/thumb3.jpg',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders empty state when no photos provided', () => {
      const { getByText } = render(<PhotoGallery photos={[]} />);
      
      expect(getByText('📷')).toBeTruthy();
      expect(getByText('No photos available')).toBeTruthy();
    });

    it('renders custom empty message', () => {
      const customMessage = 'Add some photos to get started!';
      const { getByText } = render(
        <PhotoGallery photos={[]} emptyMessage={customMessage} />
      );
      
      expect(getByText(customMessage)).toBeTruthy();
    });

    it('renders photos in grid layout', () => {
      const { getByTestId } = render(<PhotoGallery photos={mockPhotos} />);
      
      expect(getByTestId('photo-preview-https://example.com/thumb1.jpg')).toBeTruthy();
      expect(getByTestId('photo-preview-https://example.com/thumb2.jpg')).toBeTruthy();
      expect(getByTestId('photo-preview-https://example.com/thumb3.jpg')).toBeTruthy();
    });

    it('displays photo count in header', () => {
      const { getByText } = render(<PhotoGallery photos={mockPhotos} />);
      
      expect(getByText('3 photos')).toBeTruthy();
    });

    it('displays singular photo count for one photo', () => {
      const { getByText } = render(<PhotoGallery photos={[mockPhotos[0]]} />);
      
      expect(getByText('1 photo')).toBeTruthy();
    });

    it('shows limited photos when maxPhotosToShow is set', () => {
      const { getByText, queryByTestId } = render(
        <PhotoGallery photos={mockPhotos} maxPhotosToShow={2} />
      );
      
      expect(getByText('3 photos (showing 2)')).toBeTruthy();
      expect(queryByTestId('photo-preview-https://example.com/thumb3.jpg')).toBeNull();
    });
  });

  describe('Photo Interactions', () => {
    it('calls onPhotoSelect when photo is pressed', () => {
      const onPhotoSelect = jest.fn();
      const { getByTestId } = render(
        <PhotoGallery photos={mockPhotos} onPhotoSelect={onPhotoSelect} />
      );
      
      const photoPreview = getByTestId('photo-preview-https://example.com/thumb1.jpg');
      fireEvent.press(photoPreview);
      
      expect(onPhotoSelect).toHaveBeenCalledWith(mockPhotos[0]);
    });

    it('opens full screen when no onPhotoSelect provided', () => {
      const { getByTestId } = render(<PhotoGallery photos={mockPhotos} />);
      
      const photoPreview = getByTestId('photo-preview-https://example.com/thumb1.jpg');
      fireEvent.press(photoPreview);
      
      expect(getByTestId('photo-fullscreen')).toBeTruthy();
    });

    it('closes full screen when close button is pressed', () => {
      const { getByTestId, queryByTestId } = render(<PhotoGallery photos={mockPhotos} />);
      
      // Open full screen
      const photoPreview = getByTestId('photo-preview-https://example.com/thumb1.jpg');
      fireEvent.press(photoPreview);
      
      // Close full screen
      const closeButton = getByTestId('fullscreen-close');
      fireEvent.press(closeButton);
      
      expect(queryByTestId('photo-fullscreen')).toBeNull();
    });
  });

  describe('Photo Deletion', () => {
    it('shows delete confirmation dialog when delete is pressed', () => {
      const onPhotoDelete = jest.fn();
      const { getByTestId } = render(
        <PhotoGallery photos={mockPhotos} onPhotoDelete={onPhotoDelete} />
      );
      
      const deleteButton = getByTestId('delete-https://example.com/thumb1.jpg');
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

    it('calls onPhotoDelete when deletion is confirmed', () => {
      const onPhotoDelete = jest.fn();
      const { getByTestId } = render(
        <PhotoGallery photos={mockPhotos} onPhotoDelete={onPhotoDelete} />
      );
      
      const deleteButton = getByTestId('delete-https://example.com/thumb1.jpg');
      fireEvent.press(deleteButton);
      
      // Simulate pressing the Delete button in the alert
      const alertCall = mockAlert.mock.calls[0];
      const deleteAction = alertCall[2].find((action: any) => action.text === 'Delete');
      deleteAction.onPress();
      
      expect(onPhotoDelete).toHaveBeenCalledWith('1');
    });

    it('does not call onPhotoDelete when deletion is cancelled', () => {
      const onPhotoDelete = jest.fn();
      const { getByTestId } = render(
        <PhotoGallery photos={mockPhotos} onPhotoDelete={onPhotoDelete} />
      );
      
      const deleteButton = getByTestId('delete-https://example.com/thumb1.jpg');
      fireEvent.press(deleteButton);
      
      // Simulate pressing the Cancel button in the alert
      const alertCall = mockAlert.mock.calls[0];
      const cancelAction = alertCall[2].find((action: any) => action.text === 'Cancel');
      if (cancelAction.onPress) {
        cancelAction.onPress();
      }
      
      expect(onPhotoDelete).not.toHaveBeenCalled();
    });

    it('handles deletion from full screen view', () => {
      const onPhotoDelete = jest.fn();
      const { getByTestId } = render(
        <PhotoGallery photos={mockPhotos} onPhotoDelete={onPhotoDelete} />
      );
      
      // Open full screen
      const photoPreview = getByTestId('photo-preview-https://example.com/thumb1.jpg');
      fireEvent.press(photoPreview);
      
      // Delete from full screen
      const fullScreenDelete = getByTestId('fullscreen-delete');
      fireEvent.press(fullScreenDelete);
      
      // Confirm deletion
      const alertCall = mockAlert.mock.calls[0];
      const deleteAction = alertCall[2].find((action: any) => action.text === 'Delete');
      deleteAction.onPress();
      
      expect(onPhotoDelete).toHaveBeenCalledWith('1');
    });

    it('hides delete buttons when showControls is false', () => {
      const { queryByTestId } = render(
        <PhotoGallery photos={mockPhotos} showControls={false} />
      );
      
      expect(queryByTestId('delete-https://example.com/thumb1.jpg')).toBeNull();
    });
  });

  describe('Multi-Select Mode', () => {
    it('enters multi-select mode on long press when enabled', () => {
      const { getByTestId, getByText } = render(
        <PhotoGallery photos={mockPhotos} enableMultiSelect={true} />
      );
      
      const photoPreview = getByTestId('photo-preview-https://example.com/thumb1.jpg');
      fireEvent(photoPreview, 'onLongPress');
      
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('does not enter multi-select mode when disabled', () => {
      const { getByTestId, queryByText } = render(
        <PhotoGallery photos={mockPhotos} enableMultiSelect={false} />
      );
      
      const photoPreview = getByTestId('photo-preview-https://example.com/thumb1.jpg');
      fireEvent(photoPreview, 'onLongPress');
      
      expect(queryByText('Cancel')).toBeNull();
    });

    it('exits multi-select mode when cancel is pressed', () => {
      const { getByTestId, getByText, queryByText } = render(
        <PhotoGallery photos={mockPhotos} enableMultiSelect={true} />
      );
      
      // Enter multi-select mode
      const photoPreview = getByTestId('photo-preview-https://example.com/thumb1.jpg');
      fireEvent(photoPreview, 'onLongPress');
      
      // Exit multi-select mode
      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);
      
      expect(queryByText('Cancel')).toBeNull();
    });

    it('shows delete button for selected photos', () => {
      const { getByTestId, getByText } = render(
        <PhotoGallery photos={mockPhotos} enableMultiSelect={true} onPhotoDelete={jest.fn()} />
      );
      
      // Enter multi-select mode
      const photoPreview = getByTestId('photo-preview-https://example.com/thumb1.jpg');
      fireEvent(photoPreview, 'onLongPress');
      
      expect(getByText('Delete (1)')).toBeTruthy();
    });

    it('deletes multiple selected photos', () => {
      const onPhotoDelete = jest.fn();
      const { getByTestId, getByText } = render(
        <PhotoGallery photos={mockPhotos} enableMultiSelect={true} onPhotoDelete={onPhotoDelete} />
      );
      
      // Enter multi-select mode and select first photo
      const photoPreview1 = getByTestId('photo-preview-https://example.com/thumb1.jpg');
      fireEvent(photoPreview1, 'onLongPress');
      
      // Select second photo
      const photoPreview2 = getByTestId('photo-preview-https://example.com/thumb2.jpg');
      fireEvent.press(photoPreview2);
      
      // Delete selected photos
      const deleteButton = getByText('Delete (2)');
      fireEvent.press(deleteButton);
      
      // Confirm deletion
      const alertCall = mockAlert.mock.calls[0];
      const deleteAction = alertCall[2].find((action: any) => action.text === 'Delete');
      deleteAction.onPress();
      
      expect(onPhotoDelete).toHaveBeenCalledWith('1');
      expect(onPhotoDelete).toHaveBeenCalledWith('2');
    });
  });

  describe('Add Photo Button', () => {
    it('shows add button when enabled', () => {
      const onAddPhoto = jest.fn();
      const { getByLabelText } = render(
        <PhotoGallery photos={mockPhotos} showAddButton={true} onAddPhoto={onAddPhoto} />
      );
      
      expect(getByLabelText('Add photo')).toBeTruthy();
    });

    it('calls onAddPhoto when add button is pressed', () => {
      const onAddPhoto = jest.fn();
      const { getByLabelText } = render(
        <PhotoGallery photos={mockPhotos} showAddButton={true} onAddPhoto={onAddPhoto} />
      );
      
      const addButton = getByLabelText('Add photo');
      fireEvent.press(addButton);
      
      expect(onAddPhoto).toHaveBeenCalledTimes(1);
    });

    it('shows add button in empty state', () => {
      const onAddPhoto = jest.fn();
      const { getByLabelText } = render(
        <PhotoGallery photos={[]} showAddButton={true} onAddPhoto={onAddPhoto} />
      );
      
      expect(getByLabelText('Add first photo')).toBeTruthy();
    });

    it('hides add button in multi-select mode', () => {
      const onAddPhoto = jest.fn();
      const { getByTestId, queryByLabelText } = render(
        <PhotoGallery 
          photos={mockPhotos} 
          showAddButton={true} 
          onAddPhoto={onAddPhoto}
          enableMultiSelect={true}
        />
      );
      
      // Enter multi-select mode
      const photoPreview = getByTestId('photo-preview-https://example.com/thumb1.jpg');
      fireEvent(photoPreview, 'onLongPress');
      
      expect(queryByLabelText('Add photo')).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading is true', () => {
      const { getByText } = render(
        <PhotoGallery photos={mockPhotos} loading={true} />
      );
      
      expect(getByText('Loading photos...')).toBeTruthy();
    });

    it('hides loading indicator when loading is false', () => {
      const { queryByText } = render(
        <PhotoGallery photos={mockPhotos} loading={false} />
      );
      
      expect(queryByText('Loading photos...')).toBeNull();
    });
  });

  describe('Performance Optimizations', () => {
    it('implements FlatList performance props', () => {
      const { container } = render(<PhotoGallery photos={mockPhotos} />);
      
      const flatList = container.findByType('FlatList' as any);
      expect(flatList.props.removeClippedSubviews).toBe(true);
      expect(flatList.props.maxToRenderPerBatch).toBe(10);
      expect(flatList.props.windowSize).toBe(10);
      expect(flatList.props.initialNumToRender).toBe(6);
    });

    it('provides getItemLayout for better performance', () => {
      const { container } = render(<PhotoGallery photos={mockPhotos} />);
      
      const flatList = container.findByType('FlatList' as any);
      expect(flatList.props.getItemLayout).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility labels for buttons', () => {
      const onAddPhoto = jest.fn();
      const { getByLabelText } = render(
        <PhotoGallery photos={mockPhotos} showAddButton={true} onAddPhoto={onAddPhoto} />
      );
      
      expect(getByLabelText('Add photo')).toBeTruthy();
    });

    it('provides accessibility labels for multi-select controls', () => {
      const { getByTestId, getByLabelText } = render(
        <PhotoGallery photos={mockPhotos} enableMultiSelect={true} onPhotoDelete={jest.fn()} />
      );
      
      // Enter multi-select mode
      const photoPreview = getByTestId('photo-preview-https://example.com/thumb1.jpg');
      fireEvent(photoPreview, 'onLongPress');
      
      expect(getByLabelText('Exit selection mode')).toBeTruthy();
      expect(getByLabelText('Delete 1 selected photos')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty photos array gracefully', () => {
      const { getByText } = render(<PhotoGallery photos={[]} />);
      
      expect(getByText('No photos available')).toBeTruthy();
    });

    it('handles photos without thumbnails', () => {
      const photosWithoutThumbnails = mockPhotos.map(photo => ({
        ...photo,
        thumbnailUrl: undefined,
      }));
      
      const { getByTestId } = render(<PhotoGallery photos={photosWithoutThumbnails} />);
      
      expect(getByTestId('photo-preview-https://example.com/photo1.jpg')).toBeTruthy();
    });

    it('handles photos without metadata', () => {
      const photosWithoutMetadata = mockPhotos.map(photo => ({
        id: photo.id,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
      }));
      
      const { getByTestId } = render(<PhotoGallery photos={photosWithoutMetadata} />);
      
      expect(getByTestId('photo-preview-https://example.com/thumb1.jpg')).toBeTruthy();
    });

    it('handles single photo correctly', () => {
      const singlePhoto = [mockPhotos[0]];
      const { getByText } = render(<PhotoGallery photos={singlePhoto} />);
      
      expect(getByText('1 photo')).toBeTruthy();
    });
  });
});