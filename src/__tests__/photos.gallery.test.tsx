/**
 * Photo Attachment Flow Tests - Gallery
 * Tests photo gallery modal interactions, swiping, and queue management
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import PhotoGallery from '../components/photo/PhotoGallery';
import { usePhotoManager } from '../features/photos/usePhotoManager';
import { usePhotoUploadQueue } from '../hooks/usePhotoUploadQueue';
import { Photo } from '../features/photos/types';
import { mockNetInfo } from '../__mocks__/netinfo';
import { mockUploader } from '../__mocks__/uploader';

// Mock dependencies
jest.mock('../features/photos/usePhotoManager');
jest.mock('../hooks/usePhotoUploadQueue');
jest.mock('@react-native-community/netinfo', () => mockNetInfo);

const mockUsePhotoManager = usePhotoManager as jest.MockedFunction<typeof usePhotoManager>;
const mockUsePhotoUploadQueue = usePhotoUploadQueue as jest.MockedFunction<typeof usePhotoUploadQueue>;

describe('PhotoGallery Integration Tests', () => {
  let mockPhotoManager: any;
  let mockQueueManager: any;

  beforeEach(() => {
    mockPhotoManager = {
      getPhotosByIntake: jest.fn(),
      uploadPhotoById: jest.fn(),
      removePhoto: jest.fn(),
      getPhotosByStatus: jest.fn(),
    };

    mockQueueManager = {
      status: {
        isProcessing: false,
        isOnline: true,
        queuedCount: 0,
        errorCount: 0,
        totalPending: 0,
      },
      triggerProcessing: jest.fn(),
      clearRetry: jest.fn(),
      isActive: false,
      hasErrors: false,
      isOnline: true,
    };

    mockUsePhotoManager.mockReturnValue(mockPhotoManager);
    mockUsePhotoUploadQueue.mockReturnValue(mockQueueManager);

    // Reset mocks
    mockNetInfo.reset();
    mockUploader.reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockPhotos = (count: number, intakeId = '123'): Photo[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `photo${i + 1}`,
      intakeId,
      uriLocal: `file://photo${i + 1}.jpg`,
      uriRemote: `https://example.com/photo${i + 1}.jpg`,
      status: 'uploaded' as const,
      createdAt: new Date(Date.now() + i * 1000).toISOString(),
    }));
  };

  describe('Gallery Rendering and Navigation', () => {
    it('renders photo gallery with correct photo count', () => {
      const photos = createMockPhotos(5);
      
      const { getByTestId, getAllByTestId } = render(
        <PhotoGallery photos={photos} />
      );

      // Check photo count
      const photoItems = getAllByTestId(/photo-item-/);
      expect(photoItems).toHaveLength(5);

      // Check photo grid
      const photoGrid = getByTestId('photo-grid');
      expect(photoGrid).toBeTruthy();
    });

    it('shows swipe navigation when multiple photos exist', () => {
      const photos = createMockPhotos(3);
      
      const { getByTestId, queryByTestId } = render(
        <PhotoGallery photos={photos} enableSwipeNavigation={true} />
      );

      // Navigation should be available
      expect(queryByTestId('swipe-navigation')).toBeTruthy();
      expect(queryByTestId('prev-photo-button')).toBeTruthy();
      expect(queryByTestId('next-photo-button')).toBeTruthy();
    });

    it('navigates to next image when swiping left', async () => {
      const photos = createMockPhotos(3);
      
      const { getByTestId } = render(
        <PhotoGallery photos={photos} enableSwipeNavigation={true} />
      );

      const photoGrid = getByTestId('photo-grid');
      
      // Simulate swipe left gesture
      fireEvent(photoGrid, 'onGestureEvent', {
        nativeEvent: {
          translationX: -100, // Swipe left
          state: 5, // State.END
        },
      });

      await waitFor(() => {
        const currentPhotoIndicator = getByTestId('current-photo-index');
        expect(currentPhotoIndicator.props.children).toBe('2 of 3');
      });
    });

    it('navigates to previous image when swiping right', async () => {
      const photos = createMockPhotos(3);
      
      const { getByTestId } = render(
        <PhotoGallery photos={photos} enableSwipeNavigation={true} />
      );

      const photoGrid = getByTestId('photo-grid');
      
      // First navigate to second photo
      fireEvent(photoGrid, 'onGestureEvent', {
        nativeEvent: {
          translationX: -100,
          state: 5,
        },
      });

      await waitFor(() => {
        const currentPhotoIndicator = getByTestId('current-photo-index');
        expect(currentPhotoIndicator.props.children).toBe('2 of 3');
      });

      // Then swipe right to go back
      fireEvent(photoGrid, 'onGestureEvent', {
        nativeEvent: {
          translationX: 100, // Swipe right
          state: 5,
        },
      });

      await waitFor(() => {
        const currentPhotoIndicator = getByTestId('current-photo-index');
        expect(currentPhotoIndicator.props.children).toBe('1 of 3');
      });
    });

    it('does not navigate beyond boundaries', async () => {
      const photos = createMockPhotos(2);
      
      const { getByTestId } = render(
        <PhotoGallery photos={photos} enableSwipeNavigation={true} />
      );

      const photoGrid = getByTestId('photo-grid');
      
      // Try to swipe right when already at first photo
      fireEvent(photoGrid, 'onGestureEvent', {
        nativeEvent: {
          translationX: 100,
          state: 5,
        },
      });

      await waitFor(() => {
        const currentPhotoIndicator = getByTestId('current-photo-index');
        expect(currentPhotoIndicator.props.children).toBe('1 of 2');
      });

      // Navigate to last photo
      fireEvent(photoGrid, 'onGestureEvent', {
        nativeEvent: {
          translationX: -100,
          state: 5,
        },
      });

      await waitFor(() => {
        const currentPhotoIndicator = getByTestId('current-photo-index');
        expect(currentPhotoIndicator.props.children).toBe('2 of 2');
      });

      // Try to swipe left when already at last photo
      fireEvent(photoGrid, 'onGestureEvent', {
        nativeEvent: {
          translationX: -100,
          state: 5,
        },
      });

      await waitFor(() => {
        const currentPhotoIndicator = getByTestId('current-photo-index');
        expect(currentPhotoIndicator.props.children).toBe('2 of 2');
      });
    });
  });

  describe('Error State and Retry Functionality', () => {
    it('shows retry button when photo status is error', () => {
      const photos: Photo[] = [
        {
          id: 'photo1',
          intakeId: '123',
          uriLocal: 'file://photo1.jpg',
          status: 'error',
          createdAt: '2024-01-15T10:01:00Z',
          error: 'Upload failed',
          uploadAttempts: 1,
        },
      ];

      const { getByTestId } = render(
        <PhotoGallery photos={photos} />
      );

      // Check error overlay and retry button
      expect(getByTestId('error-overlay-photo1')).toBeTruthy();
      expect(getByTestId('retry-button-photo1')).toBeTruthy();
    });

    it('triggers enqueue and calls uploader when retry is pressed', async () => {
      const photos: Photo[] = [
        {
          id: 'photo1',
          intakeId: '123',
          uriLocal: 'file://photo1.jpg',
          status: 'error',
          createdAt: '2024-01-15T10:01:00Z',
          error: 'Upload failed',
          uploadAttempts: 1,
        },
      ];

      mockPhotoManager.uploadPhotoById.mockResolvedValue('https://example.com/photo1.jpg');

      const { getByTestId } = render(
        <PhotoGallery photos={photos} />
      );

      const retryButton = getByTestId('retry-button-photo1');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(mockPhotoManager.uploadPhotoById).toHaveBeenCalledWith('photo1');
      });
    });

    it('handles retry failure gracefully', async () => {
      const photos: Photo[] = [
        {
          id: 'photo1',
          intakeId: '123',
          uriLocal: 'file://photo1.jpg',
          status: 'error',
          createdAt: '2024-01-15T10:01:00Z',
          error: 'Upload failed',
          uploadAttempts: 1,
        },
      ];

      mockPhotoManager.uploadPhotoById.mockRejectedValue(new Error('Still failing'));

      const { getByTestId } = render(
        <PhotoGallery photos={photos} />
      );

      const retryButton = getByTestId('retry-button-photo1');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(mockPhotoManager.uploadPhotoById).toHaveBeenCalledWith('photo1');
      });

      // Error overlay should still be visible
      expect(getByTestId('error-overlay-photo1')).toBeTruthy();
    });
  });

  describe('Upload Progress Display', () => {
    it('shows upload progress for uploading photos', () => {
      const photos: Photo[] = [
        {
          id: 'photo1',
          intakeId: '123',
          uriLocal: 'file://photo1.jpg',
          status: 'uploading',
          createdAt: '2024-01-15T10:01:00Z',
          uploadProgress: 65,
        },
      ];

      const { getByTestId } = render(
        <PhotoGallery photos={photos} />
      );

      // Check upload overlay and progress
      expect(getByTestId('upload-overlay-photo1')).toBeTruthy();
      expect(getByTestId('upload-progress-photo1')).toBeTruthy();
      
      const progressText = getByTestId('upload-progress-text-photo1');
      expect(progressText.props.children).toBe('65%');
    });

    it('shows indeterminate progress when no progress value', () => {
      const photos: Photo[] = [
        {
          id: 'photo1',
          intakeId: '123',
          uriLocal: 'file://photo1.jpg',
          status: 'uploading',
          createdAt: '2024-01-15T10:01:00Z',
        },
      ];

      const { getByTestId } = render(
        <PhotoGallery photos={photos} />
      );

      const progressText = getByTestId('upload-progress-text-photo1');
      expect(progressText.props.children).toBe('Uploading...');
    });
  });

  describe('Queue Management Integration', () => {
    it('shows queue status when photos are pending', () => {
      mockQueueManager.status.queuedCount = 2;
      mockQueueManager.status.totalPending = 2;
      mockQueueManager.isActive = true;

      const photos = createMockPhotos(3);

      const { getByTestId } = render(
        <PhotoGallery photos={photos} showOfflineQueue={true} />
      );

      expect(getByTestId('offline-queue-status')).toBeTruthy();
    });

    it('hides queue status when all photos uploaded and online', () => {
      mockQueueManager.status.queuedCount = 0;
      mockQueueManager.status.totalPending = 0;
      mockQueueManager.isActive = false;
      mockQueueManager.isOnline = true;

      const photos = createMockPhotos(3);

      const { queryByTestId } = render(
        <PhotoGallery photos={photos} showOfflineQueue={true} />
      );

      expect(queryByTestId('offline-queue-status')).toBeFalsy();
    });

    it('shows offline status when network is disconnected', () => {
      mockQueueManager.isOnline = false;

      const photos = createMockPhotos(3);

      const { getByTestId } = render(
        <PhotoGallery photos={photos} showOfflineQueue={true} />
      );

      const queueStatus = getByTestId('offline-queue-status');
      expect(queueStatus).toBeTruthy();
      
      const statusText = getByTestId('queue-status-text');
      expect(statusText.props.children).toBe('Offline');
    });
  });

  describe('Network State Integration', () => {
    it('resumes queue processing on online event', async () => {
      // Start offline
      mockNetInfo.goOffline();
      mockQueueManager.isOnline = false;
      mockQueueManager.status.queuedCount = 2;

      const photos: Photo[] = [
        {
          id: 'photo1',
          intakeId: '123',
          uriLocal: 'file://photo1.jpg',
          status: 'queued',
          createdAt: '2024-01-15T10:01:00Z',
        },
        {
          id: 'photo2',
          intakeId: '123',
          uriLocal: 'file://photo2.jpg',
          status: 'queued',
          createdAt: '2024-01-15T10:02:00Z',
        },
      ];

      render(<PhotoGallery photos={photos} showOfflineQueue={true} />);

      // Simulate going online
      act(() => {
        mockNetInfo.goOnline();
        mockQueueManager.isOnline = true;
        mockQueueManager.status.isProcessing = true;
      });

      await waitFor(() => {
        expect(mockQueueManager.triggerProcessing).toHaveBeenCalled();
      });
    });

    it('shows correct status during network transitions', async () => {
      mockQueueManager.status.queuedCount = 1;
      mockQueueManager.isActive = true;

      const photos: Photo[] = [
        {
          id: 'photo1',
          intakeId: '123',
          uriLocal: 'file://photo1.jpg',
          status: 'queued',
          createdAt: '2024-01-15T10:01:00Z',
        },
      ];

      const { getByTestId, rerender } = render(
        <PhotoGallery photos={photos} showOfflineQueue={true} />
      );

      // Initially online with queued photos
      let statusText = getByTestId('queue-status-text');
      expect(statusText.props.children).toBe('1 queued');

      // Go offline
      mockQueueManager.isOnline = false;
      rerender(<PhotoGallery photos={photos} showOfflineQueue={true} />);

      statusText = getByTestId('queue-status-text');
      expect(statusText.props.children).toBe('Offline');

      // Come back online and start processing
      mockQueueManager.isOnline = true;
      mockQueueManager.status.isProcessing = true;
      rerender(<PhotoGallery photos={photos} showOfflineQueue={true} />);

      statusText = getByTestId('queue-status-text');
      expect(statusText.props.children).toBe('Uploading...');
    });
  });

  describe('Accessibility Features', () => {
    it('provides proper accessibility labels for gallery navigation', () => {
      const photos = createMockPhotos(3);
      
      const { getByLabelText } = render(
        <PhotoGallery photos={photos} enableSwipeNavigation={true} />
      );

      expect(getByLabelText('Photo gallery with 3 photos')).toBeTruthy();
      expect(getByLabelText('Previous photo')).toBeTruthy();
      expect(getByLabelText('Next photo')).toBeTruthy();
    });

    it('provides accessibility labels for photo states', () => {
      const photos: Photo[] = [
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

      const { getByLabelText } = render(
        <PhotoGallery photos={photos} />
      );

      expect(getByLabelText('Photo uploaded successfully')).toBeTruthy();
      expect(getByLabelText('Photo upload failed, retry available')).toBeTruthy();
      expect(getByLabelText('Retry upload')).toBeTruthy();
    });
  });

  describe('Performance Optimizations', () => {
    it('implements lazy loading for large photo sets', () => {
      const photos = createMockPhotos(20);
      
      const { getAllByTestId } = render(
        <PhotoGallery photos={photos} enableLazyLoading={true} />
      );

      // Should only render initial batch
      const renderedPhotos = getAllByTestId(/photo-item-/);
      expect(renderedPhotos.length).toBeLessThanOrEqual(6); // Initial batch size
    });

    it('loads more photos on scroll', async () => {
      const photos = createMockPhotos(20);
      
      const { getByTestId, getAllByTestId } = render(
        <PhotoGallery photos={photos} enableLazyLoading={true} />
      );

      const photoGrid = getByTestId('photo-grid');
      
      // Simulate scroll to bottom
      fireEvent.scroll(photoGrid, {
        nativeEvent: {
          contentOffset: { y: 1000 },
          contentSize: { height: 1200 },
          layoutMeasurement: { height: 800 },
        },
      });

      await waitFor(() => {
        const renderedPhotos = getAllByTestId(/photo-item-/);
        expect(renderedPhotos.length).toBeGreaterThan(6);
      });
    });
  });
});