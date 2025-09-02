/**
 * Photo Attachment Flow Tests - IntakeHistory
 * Tests photo strip rendering and interaction in intake history
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import IntakeHistory from '../components/logging/IntakeHistory';
import { usePhotoManager } from '../features/photos/usePhotoManager';
import { Photo } from '../features/photos/types';

// Mock dependencies
jest.mock('../features/photos/usePhotoManager');
jest.mock('../features/photos/PhotoGalleryModal', () => {
  return function MockPhotoGalleryModal({ visible, onClose, photos }: any) {
    if (!visible) return null;
    return (
      <div testID="photo-gallery-modal">
        <div testID="modal-photo-count">{photos.length}</div>
        <button testID="close-modal" onPress={onClose}>Close</button>
      </div>
    );
  };
});

const mockUsePhotoManager = usePhotoManager as jest.MockedFunction<typeof usePhotoManager>;

// Mock store
const createMockStore = () => configureStore({
  reducer: {
    // Add minimal reducers for testing
    test: (state = {}) => state,
  },
});

describe('IntakeHistory Photo Integration', () => {
  let mockStore: ReturnType<typeof createMockStore>;
  let mockPhotoManager: any;

  beforeEach(() => {
    mockStore = createMockStore();
    
    mockPhotoManager = {
      getPhotosByIntake: jest.fn(),
      uploadPhotoById: jest.fn(),
      removePhoto: jest.fn(),
    };
    
    mockUsePhotoManager.mockReturnValue(mockPhotoManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderIntakeHistory = (props = {}) => {
    const defaultProps = {
      intakes: [
        {
          id: '123',
          substance: 'Caffeine',
          quantity: 100,
          unit: 'mg',
          timestamp: '2024-01-15T10:00:00Z',
          ...props,
        },
      ],
      onEditIntake: jest.fn(),
      onDeleteIntake: jest.fn(),
    };

    return render(
      <Provider store={mockStore}>
        <IntakeHistory {...defaultProps} />
      </Provider>
    );
  };

  describe('Photo Strip Rendering', () => {
    it('renders photo strip with correct count for intakeId=123', async () => {
      // Mock photos for intake 123
      const mockPhotos: Photo[] = [
        {
          id: 'photo1',
          intakeId: '123',
          uriLocal: 'file://photo1.jpg',
          status: 'uploaded',
          createdAt: '2024-01-15T10:01:00Z',
        },
        {
          id: 'photo2',
          intakeId: '123',
          uriLocal: 'file://photo2.jpg',
          status: 'uploaded',
          createdAt: '2024-01-15T10:02:00Z',
        },
        {
          id: 'photo3',
          intakeId: '123',
          uriLocal: 'file://photo3.jpg',
          status: 'queued',
          createdAt: '2024-01-15T10:03:00Z',
        },
      ];

      mockPhotoManager.getPhotosByIntake.mockReturnValue(mockPhotos);

      const { getByTestId, queryByTestId } = renderIntakeHistory();

      // Wait for component to render
      await waitFor(() => {
        expect(mockPhotoManager.getPhotosByIntake).toHaveBeenCalledWith('123');
      });

      // Check if photo strip is rendered
      const photoStrip = queryByTestId('photo-strip-123');
      expect(photoStrip).toBeTruthy();

      // Check photo count indicator
      const photoCount = queryByTestId('photo-count-123');
      expect(photoCount).toBeTruthy();
      expect(photoCount?.props.children).toBe('3 photos');

      // Check individual photo thumbnails
      const photo1 = queryByTestId('photo-thumbnail-photo1');
      const photo2 = queryByTestId('photo-thumbnail-photo2');
      const photo3 = queryByTestId('photo-thumbnail-photo3');
      
      expect(photo1).toBeTruthy();
      expect(photo2).toBeTruthy();
      expect(photo3).toBeTruthy();
    });

    it('does not render photo strip when no photos exist', async () => {
      mockPhotoManager.getPhotosByIntake.mockReturnValue([]);

      const { queryByTestId } = renderIntakeHistory();

      await waitFor(() => {
        expect(mockPhotoManager.getPhotosByIntake).toHaveBeenCalledWith('123');
      });

      // Photo strip should not be rendered
      const photoStrip = queryByTestId('photo-strip-123');
      expect(photoStrip).toBeFalsy();
    });

    it('shows correct status indicators for different photo states', async () => {
      const mockPhotos: Photo[] = [
        {
          id: 'photo1',
          intakeId: '123',
          uriLocal: 'file://photo1.jpg',
          status: 'uploaded',
          createdAt: '2024-01-15T10:01:00Z',
        },
        {
          id: 'photo2',
          intakeId: '123',
          uriLocal: 'file://photo2.jpg',
          status: 'uploading',
          createdAt: '2024-01-15T10:02:00Z',
          uploadProgress: 50,
        },
        {
          id: 'photo3',
          intakeId: '123',
          uriLocal: 'file://photo3.jpg',
          status: 'error',
          createdAt: '2024-01-15T10:03:00Z',
          error: 'Upload failed',
        },
      ];

      mockPhotoManager.getPhotosByIntake.mockReturnValue(mockPhotos);

      const { queryByTestId } = renderIntakeHistory();

      await waitFor(() => {
        expect(mockPhotoManager.getPhotosByIntake).toHaveBeenCalledWith('123');
      });

      // Check status indicators
      const uploadedIndicator = queryByTestId('photo-status-uploaded-photo1');
      const uploadingIndicator = queryByTestId('photo-status-uploading-photo2');
      const errorIndicator = queryByTestId('photo-status-error-photo3');

      expect(uploadedIndicator).toBeTruthy();
      expect(uploadingIndicator).toBeTruthy();
      expect(errorIndicator).toBeTruthy();

      // Check progress indicator for uploading photo
      const progressIndicator = queryByTestId('upload-progress-photo2');
      expect(progressIndicator).toBeTruthy();
    });
  });

  describe('Photo Strip Interaction', () => {
    it('opens PhotoGalleryModal when photo strip is tapped', async () => {
      const mockPhotos: Photo[] = [
        {
          id: 'photo1',
          intakeId: '123',
          uriLocal: 'file://photo1.jpg',
          status: 'uploaded',
          createdAt: '2024-01-15T10:01:00Z',
        },
        {
          id: 'photo2',
          intakeId: '123',
          uriLocal: 'file://photo2.jpg',
          status: 'uploaded',
          createdAt: '2024-01-15T10:02:00Z',
        },
      ];

      mockPhotoManager.getPhotosByIntake.mockReturnValue(mockPhotos);

      const { getByTestId, queryByTestId } = renderIntakeHistory();

      await waitFor(() => {
        expect(mockPhotoManager.getPhotosByIntake).toHaveBeenCalledWith('123');
      });

      // Modal should not be visible initially
      expect(queryByTestId('photo-gallery-modal')).toBeFalsy();

      // Tap on photo strip
      const photoStrip = getByTestId('photo-strip-123');
      fireEvent.press(photoStrip);

      // Modal should now be visible
      await waitFor(() => {
        expect(queryByTestId('photo-gallery-modal')).toBeTruthy();
      });

      // Check that modal receives correct photos
      const modalPhotoCount = queryByTestId('modal-photo-count');
      expect(modalPhotoCount?.props.children).toBe(2);
    });

    it('closes PhotoGalleryModal when close button is pressed', async () => {
      const mockPhotos: Photo[] = [
        {
          id: 'photo1',
          intakeId: '123',
          uriLocal: 'file://photo1.jpg',
          status: 'uploaded',
          createdAt: '2024-01-15T10:01:00Z',
        },
      ];

      mockPhotoManager.getPhotosByIntake.mockReturnValue(mockPhotos);

      const { getByTestId, queryByTestId } = renderIntakeHistory();

      await waitFor(() => {
        expect(mockPhotoManager.getPhotosByIntake).toHaveBeenCalledWith('123');
      });

      // Open modal
      const photoStrip = getByTestId('photo-strip-123');
      fireEvent.press(photoStrip);

      await waitFor(() => {
        expect(queryByTestId('photo-gallery-modal')).toBeTruthy();
      });

      // Close modal
      const closeButton = getByTestId('close-modal');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(queryByTestId('photo-gallery-modal')).toBeFalsy();
      });
    });
  });

  describe('Error State Handling', () => {
    it('shows retry button for photos with error status', async () => {
      const mockPhotos: Photo[] = [
        {
          id: 'photo1',
          intakeId: '123',
          uriLocal: 'file://photo1.jpg',
          status: 'error',
          createdAt: '2024-01-15T10:01:00Z',
          error: 'Network error',
          uploadAttempts: 1,
        },
      ];

      mockPhotoManager.getPhotosByIntake.mockReturnValue(mockPhotos);

      const { queryByTestId } = renderIntakeHistory();

      await waitFor(() => {
        expect(mockPhotoManager.getPhotosByIntake).toHaveBeenCalledWith('123');
      });

      // Check retry button is present
      const retryButton = queryByTestId('retry-button-photo1');
      expect(retryButton).toBeTruthy();
    });

    it('triggers enqueue and calls uploader when retry button is pressed', async () => {
      const mockPhotos: Photo[] = [
        {
          id: 'photo1',
          intakeId: '123',
          uriLocal: 'file://photo1.jpg',
          status: 'error',
          createdAt: '2024-01-15T10:01:00Z',
          error: 'Network error',
          uploadAttempts: 1,
        },
      ];

      mockPhotoManager.getPhotosByIntake.mockReturnValue(mockPhotos);
      mockPhotoManager.uploadPhotoById.mockResolvedValue('https://example.com/photo1.jpg');

      const { getByTestId } = renderIntakeHistory();

      await waitFor(() => {
        expect(mockPhotoManager.getPhotosByIntake).toHaveBeenCalledWith('123');
      });

      // Press retry button
      const retryButton = getByTestId('retry-button-photo1');
      fireEvent.press(retryButton);

      // Check that upload is triggered
      await waitFor(() => {
        expect(mockPhotoManager.uploadPhotoById).toHaveBeenCalledWith('photo1');
      });
    });

    it('handles retry failure gracefully', async () => {
      const mockPhotos: Photo[] = [
        {
          id: 'photo1',
          intakeId: '123',
          uriLocal: 'file://photo1.jpg',
          status: 'error',
          createdAt: '2024-01-15T10:01:00Z',
          error: 'Network error',
          uploadAttempts: 1,
        },
      ];

      mockPhotoManager.getPhotosByIntake.mockReturnValue(mockPhotos);
      mockPhotoManager.uploadPhotoById.mockRejectedValue(new Error('Still failing'));

      const { getByTestId, queryByTestId } = renderIntakeHistory();

      await waitFor(() => {
        expect(mockPhotoManager.getPhotosByIntake).toHaveBeenCalledWith('123');
      });

      // Press retry button
      const retryButton = getByTestId('retry-button-photo1');
      fireEvent.press(retryButton);

      // Check that upload was attempted
      await waitFor(() => {
        expect(mockPhotoManager.uploadPhotoById).toHaveBeenCalledWith('photo1');
      });

      // Retry button should still be present (photo still in error state)
      await waitFor(() => {
        expect(queryByTestId('retry-button-photo1')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility labels for photo elements', async () => {
      const mockPhotos: Photo[] = [
        {
          id: 'photo1',
          intakeId: '123',
          uriLocal: 'file://photo1.jpg',
          status: 'uploaded',
          createdAt: '2024-01-15T10:01:00Z',
        },
        {
          id: 'photo2',
          intakeId: '123',
          uriLocal: 'file://photo2.jpg',
          status: 'error',
          createdAt: '2024-01-15T10:02:00Z',
          error: 'Upload failed',
        },
      ];

      mockPhotoManager.getPhotosByIntake.mockReturnValue(mockPhotos);

      const { getByLabelText } = renderIntakeHistory();

      await waitFor(() => {
        expect(mockPhotoManager.getPhotosByIntake).toHaveBeenCalledWith('123');
      });

      // Check accessibility labels
      expect(getByLabelText('View 2 photos for this intake')).toBeTruthy();
      expect(getByLabelText('Photo 1 of 2, uploaded successfully')).toBeTruthy();
      expect(getByLabelText('Photo 2 of 2, upload failed')).toBeTruthy();
      expect(getByLabelText('Retry upload for photo 2')).toBeTruthy();
    });
  });
});