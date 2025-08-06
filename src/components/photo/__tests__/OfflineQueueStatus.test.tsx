/**
 * Tests for OfflineQueueStatus component
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { OfflineQueueStatus } from '../OfflineQueueStatus';
import { useOfflinePhotoQueue } from '../../../hooks/useOfflinePhotoQueue';

// Mock the hook
jest.mock('../../../hooks/useOfflinePhotoQueue');
const mockUseOfflinePhotoQueue = useOfflinePhotoQueue as jest.MockedFunction<typeof useOfflinePhotoQueue>;

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('OfflineQueueStatus', () => {
  const mockHookReturn = {
    queue: [
      {
        id: 'photo1',
        localUri: 'file://photo1.jpg',
        intakeId: 'intake1',
        metadata: {
          fileName: 'photo1.jpg',
          fileSize: 1024000,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T10:00:00Z',
        },
        uploadAttempts: 0,
        queuedAt: '2024-01-01T10:00:00Z',
        priority: 'normal' as const,
        thumbnailGenerated: false,
        uploadProgress: 0,
      },
      {
        id: 'photo2',
        localUri: 'file://photo2.jpg',
        intakeId: 'intake2',
        metadata: {
          fileName: 'photo2.jpg',
          fileSize: 2048000,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T11:00:00Z',
        },
        uploadAttempts: 3,
        queuedAt: '2024-01-01T11:00:00Z',
        priority: 'high' as const,
        thumbnailGenerated: false,
        uploadProgress: 0,
        error: 'Upload failed',
      },
    ],
    stats: {
      totalQueued: 2,
      uploading: 1,
      failed: 1,
      completed: 0,
      totalSize: 3072000,
      averageUploadTime: 5000,
      estimatedTimeRemaining: 10000,
      networkStatus: 'online' as const,
      batteryOptimized: true,
      compressionEnabled: false,
    },
    isProcessing: true,
    isPaused: false,
    currentUploads: [
      {
        photoId: 'photo1',
        progress: 50,
        startTime: Date.now() - 5000,
      },
    ],
    failedPhotos: [
      {
        id: 'photo2',
        localUri: 'file://photo2.jpg',
        intakeId: 'intake2',
        metadata: {
          fileName: 'photo2.jpg',
          fileSize: 2048000,
          mimeType: 'image/jpeg',
          captureDate: '2024-01-01T11:00:00Z',
        },
        uploadAttempts: 3,
        queuedAt: '2024-01-01T11:00:00Z',
        priority: 'high' as const,
        thumbnailGenerated: false,
        uploadProgress: 0,
        error: 'Upload failed',
      },
    ],
    configuration: {
      maxRetries: 3,
      retryDelay: 5000,
      batchSize: 3,
      compressionQuality: 0.8,
      enableBatteryOptimization: true,
      enableWifiOnly: false,
      maxQueueSize: 100,
      autoCleanupDays: 7,
      priorityUploadEnabled: true,
    },
    addToQueue: jest.fn(),
    removeFromQueue: jest.fn(),
    retryPhoto: jest.fn(),
    retryAllFailed: jest.fn(),
    clearQueue: jest.fn(),
    pauseQueue: jest.fn(),
    resumeQueue: jest.fn(),
    updateConfiguration: jest.fn(),
    getPhotoById: jest.fn(),
    getUploadProgress: jest.fn(),
    getEstimatedTimeRemaining: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOfflinePhotoQueue.mockReturnValue(mockHookReturn);
  });

  describe('Compact Mode', () => {
    it('should render compact status correctly', () => {
      const { getByText, getByRole } = render(
        <OfflineQueueStatus compact={true} />
      );

      expect(getByText('Uploading 1/2')).toBeTruthy();
      expect(getByRole('button')).toBeTruthy();
    });

    it('should show different status text based on queue state', () => {
      // Test failed state
      mockUseOfflinePhotoQueue.mockReturnValue({
        ...mockHookReturn,
        stats: { ...mockHookReturn.stats, failed: 2, uploading: 0 },
        isProcessing: false,
      });

      const { getByText, rerender } = render(
        <OfflineQueueStatus compact={true} />
      );

      expect(getByText('2 failed')).toBeTruthy();

      // Test queued state
      mockUseOfflinePhotoQueue.mockReturnValue({
        ...mockHookReturn,
        stats: { ...mockHookReturn.stats, failed: 0, uploading: 0, totalQueued: 3 },
        isProcessing: false,
      });

      rerender(<OfflineQueueStatus compact={true} />);
      expect(getByText('3 queued')).toBeTruthy();

      // Test completed state
      mockUseOfflinePhotoQueue.mockReturnValue({
        ...mockHookReturn,
        stats: { ...mockHookReturn.stats, failed: 0, uploading: 0, totalQueued: 0 },
        isProcessing: false,
      });

      rerender(<OfflineQueueStatus compact={true} />);
      expect(getByText('All uploaded')).toBeTruthy();
    });

    it('should not render when stats are null', () => {
      mockUseOfflinePhotoQueue.mockReturnValue({
        ...mockHookReturn,
        stats: null,
      });

      const { queryByRole } = render(
        <OfflineQueueStatus compact={true} />
      );

      expect(queryByRole('button')).toBeNull();
    });
  });

  describe('Full Modal Mode', () => {
    it('should render modal with queue statistics', () => {
      const { getByText } = render(
        <OfflineQueueStatus visible={true} />
      );

      expect(getByText('Upload Queue')).toBeTruthy();
      expect(getByText('2')).toBeTruthy(); // Total queued
      expect(getByText('1')).toBeTruthy(); // Uploading
      expect(getByText('1')).toBeTruthy(); // Failed
      expect(getByText('3.0 MB')).toBeTruthy(); // Total size
    });

    it('should show estimated time remaining', () => {
      const { getByText } = render(
        <OfflineQueueStatus visible={true} />
      );

      expect(getByText('Estimated time remaining: 10s')).toBeTruthy();
    });

    it('should render photo items with correct information', () => {
      mockHookReturn.getUploadProgress.mockImplementation((id) => {
        return id === 'photo1' ? 50 : 0;
      });

      const { getByText } = render(
        <OfflineQueueStatus visible={true} />
      );

      expect(getByText('photo1.jpg')).toBeTruthy();
      expect(getByText('1.0 MB')).toBeTruthy();
      expect(getByText('photo2.jpg')).toBeTruthy();
      expect(getByText('2.0 MB')).toBeTruthy();
      expect(getByText('Upload failed')).toBeTruthy();
    });

    it('should show progress for uploading photos', () => {
      mockHookReturn.getUploadProgress.mockReturnValue(75);

      const { getByText } = render(
        <OfflineQueueStatus visible={true} />
      );

      expect(getByText('75%')).toBeTruthy();
    });

    it('should show retry button for failed photos', () => {
      const { getByText } = render(
        <OfflineQueueStatus visible={true} />
      );

      expect(getByText('Retry')).toBeTruthy();
    });

    it('should handle pause/resume functionality', () => {
      const { getByText, rerender } = render(
        <OfflineQueueStatus visible={true} />
      );

      const pauseButton = getByText('Pause');
      fireEvent.press(pauseButton);

      expect(mockHookReturn.pauseQueue).toHaveBeenCalled();

      // Test resume button
      mockUseOfflinePhotoQueue.mockReturnValue({
        ...mockHookReturn,
        isPaused: true,
      });

      rerender(<OfflineQueueStatus visible={true} />);

      const resumeButton = getByText('Resume');
      fireEvent.press(resumeButton);

      expect(mockHookReturn.resumeQueue).toHaveBeenCalled();
    });

    it('should show retry all button when there are failed photos', () => {
      const { getByText } = render(
        <OfflineQueueStatus visible={true} />
      );

      const retryAllButton = getByText('Retry All');
      fireEvent.press(retryAllButton);

      expect(mockHookReturn.retryAllFailed).toHaveBeenCalled();
    });

    it('should handle photo retry', async () => {
      const { getByText } = render(
        <OfflineQueueStatus visible={true} />
      );

      const retryButton = getByText('Retry');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(mockHookReturn.retryPhoto).toHaveBeenCalledWith('photo2');
      });
    });

    it('should handle photo removal with confirmation', async () => {
      const { getAllByText } = render(
        <OfflineQueueStatus visible={true} />
      );

      const removeButtons = getAllByText('✕');
      fireEvent.press(removeButtons[0]);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Remove Photo',
        'Are you sure you want to remove this photo from the upload queue?',
        expect.any(Array)
      );
    });

    it('should handle clear queue with confirmation', () => {
      const { getByText } = render(
        <OfflineQueueStatus visible={true} />
      );

      const clearButton = getByText('Clear All');
      fireEvent.press(clearButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Clear Queue',
        'Are you sure you want to clear all photos from the upload queue?',
        expect.any(Array)
      );
    });

    it('should show empty state when queue is empty', () => {
      mockUseOfflinePhotoQueue.mockReturnValue({
        ...mockHookReturn,
        queue: [],
      });

      const { getByText } = render(
        <OfflineQueueStatus visible={true} />
      );

      expect(getByText('No photos in queue')).toBeTruthy();
    });

    it('should handle close modal', () => {
      const onClose = jest.fn();
      const { getByText } = render(
        <OfflineQueueStatus visible={true} onClose={onClose} />
      );

      const closeButton = getByText('✕');
      fireEvent.press(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('should not render when not visible', () => {
      const { queryByText } = render(
        <OfflineQueueStatus visible={false} />
      );

      expect(queryByText('Upload Queue')).toBeNull();
    });
  });

  describe('Utility Functions', () => {
    it('should format file sizes correctly', () => {
      const { getByText } = render(
        <OfflineQueueStatus visible={true} />
      );

      // Should show formatted file sizes
      expect(getByText('1.0 MB')).toBeTruthy();
      expect(getByText('2.0 MB')).toBeTruthy();
      expect(getByText('3.0 MB')).toBeTruthy(); // Total size
    });

    it('should format time correctly', () => {
      // Test different time formats
      mockUseOfflinePhotoQueue.mockReturnValue({
        ...mockHookReturn,
        stats: {
          ...mockHookReturn.stats,
          estimatedTimeRemaining: 90000, // 1.5 minutes
        },
      });

      const { getByText, rerender } = render(
        <OfflineQueueStatus visible={true} />
      );

      expect(getByText('Estimated time remaining: 2m')).toBeTruthy();

      // Test hours
      mockUseOfflinePhotoQueue.mockReturnValue({
        ...mockHookReturn,
        stats: {
          ...mockHookReturn.stats,
          estimatedTimeRemaining: 3700000, // ~1 hour
        },
      });

      rerender(<OfflineQueueStatus visible={true} />);
      expect(getByText('Estimated time remaining: 1h')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle retry photo error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockHookReturn.retryPhoto.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(
        <OfflineQueueStatus visible={true} />
      );

      const retryButton = getByText('Retry');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to retry photo upload');
      });

      consoleError.mockRestore();
    });

    it('should handle retry all failed error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockHookReturn.retryAllFailed.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(
        <OfflineQueueStatus visible={true} />
      );

      const retryAllButton = getByText('Retry All');
      fireEvent.press(retryAllButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to retry failed uploads');
      });

      consoleError.mockRestore();
    });
  });
});