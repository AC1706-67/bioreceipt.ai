/**
 * PhotoUploadProgress Component Tests
 * Tests upload progress display and queue management UI
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PhotoUploadProgress, { PhotoQueueBadge } from '../PhotoUploadProgress';
import offlinePhotoQueueService from '../../../services/photo/offlinePhotoQueueService';

// Mock dependencies
jest.mock('../../../services/photo/offlinePhotoQueueService', () => ({
  getQueueStats: jest.fn(),
  getQueuedPhotos: jest.fn(),
  retryFailedUploads: jest.fn(),
  clearCompleted: jest.fn(),
  removeFromQueue: jest.fn(),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

const mockOfflinePhotoQueueService = offlinePhotoQueueService as jest.Mocked<typeof offlinePhotoQueueService>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('PhotoUploadProgress', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
  };

  const mockQueueStats = {
    total: 5,
    pending: 2,
    uploading: 1,
    failed: 1,
    completed: 1,
  };

  const mockQueuedPhotos = [
    {
      id: 'photo1',
      localUri: 'file://photo1.jpg',
      intakeId: 'intake1',
      metadata: {
        fileName: 'photo1.jpg',
        fileSize: 2500000,
        mimeType: 'image/jpeg',
        captureDate: '2024-01-15T10:30:00Z',
      },
      uploadAttempts: 0,
      status: 'pending' as const,
      createdAt: '2024-01-15T10:30:00Z',
    },
    {
      id: 'photo2',
      localUri: 'file://photo2.jpg',
      intakeId: 'intake2',
      metadata: {
        fileName: 'photo2.jpg',
        fileSize: 1800000,
        mimeType: 'image/jpeg',
        captureDate: '2024-01-15T10:31:00Z',
      },
      uploadAttempts: 1,
      status: 'uploading' as const,
      createdAt: '2024-01-15T10:31:00Z',
    },
    {
      id: 'photo3',
      localUri: 'file://photo3.jpg',
      intakeId: 'intake3',
      metadata: {
        fileName: 'photo3.jpg',
        fileSize: 3200000,
        mimeType: 'image/jpeg',
        captureDate: '2024-01-15T10:32:00Z',
      },
      uploadAttempts: 2,
      status: 'failed' as const,
      error: 'Network timeout',
      createdAt: '2024-01-15T10:32:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockOfflinePhotoQueueService.getQueueStats.mockReturnValue(mockQueueStats);
    mockOfflinePhotoQueueService.getQueuedPhotos.mockReturnValue(mockQueuedPhotos);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders when visible is true', () => {
      const { getByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      expect(getByText('Photo Upload Queue')).toBeTruthy();
    });

    it('does not render when visible is false', () => {
      const { queryByText } = render(
        <PhotoUploadProgress {...defaultProps} visible={false} />
      );
      
      expect(queryByText('Photo Upload Queue')).toBeNull();
    });

    it('displays queue statistics correctly', () => {
      const { getByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      expect(getByText('5')).toBeTruthy(); // Total
      expect(getByText('2')).toBeTruthy(); // Pending
      expect(getByText('1')).toBeTruthy(); // Uploading, Failed, Completed
    });

    it('displays queue items', () => {
      const { getByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      expect(getByText('photo1.jpg')).toBeTruthy();
      expect(getByText('photo2.jpg')).toBeTruthy();
      expect(getByText('photo3.jpg')).toBeTruthy();
    });

    it('displays file sizes correctly', () => {
      const { getByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      expect(getByText('2.4 MB')).toBeTruthy(); // 2500000 bytes
      expect(getByText('1.7 MB')).toBeTruthy(); // 1800000 bytes
      expect(getByText('3.1 MB')).toBeTruthy(); // 3200000 bytes
    });
  });

  describe('Status Display', () => {
    it('displays correct status for each photo', () => {
      const { getByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      expect(getByText('Waiting')).toBeTruthy(); // pending
      expect(getByText('Uploading')).toBeTruthy(); // uploading
      expect(getByText('Failed')).toBeTruthy(); // failed
    });

    it('displays error messages for failed uploads', () => {
      const { getByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      expect(getByText('Network timeout')).toBeTruthy();
    });

    it('displays upload attempt count', () => {
      const { getByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      expect(getByText('Attempts: 1')).toBeTruthy();
      expect(getByText('Attempts: 2')).toBeTruthy();
    });
  });

  describe('Action Buttons', () => {
    it('shows retry button for failed uploads', () => {
      const { getByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      expect(getByText('Retry Failed')).toBeTruthy();
    });

    it('shows clear completed button when there are completed uploads', () => {
      const { getByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      expect(getByText('Clear Completed')).toBeTruthy();
    });

    it('calls retryFailedUploads when retry button is pressed', async () => {
      mockOfflinePhotoQueueService.retryFailedUploads.mockResolvedValue();
      
      const { getByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      const retryButton = getByText('Retry Failed');
      fireEvent.press(retryButton);
      
      await waitFor(() => {
        expect(mockOfflinePhotoQueueService.retryFailedUploads).toHaveBeenCalledTimes(1);
      });
    });

    it('calls clearCompleted when clear button is pressed', async () => {
      mockOfflinePhotoQueueService.clearCompleted.mockResolvedValue(1);
      
      const { getByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      const clearButton = getByText('Clear Completed');
      fireEvent.press(clearButton);
      
      await waitFor(() => {
        expect(mockOfflinePhotoQueueService.clearCompleted).toHaveBeenCalledTimes(1);
      });
    });

    it('shows success alert after clearing completed uploads', async () => {
      mockOfflinePhotoQueueService.clearCompleted.mockResolvedValue(3);
      
      const { getByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      const clearButton = getByText('Clear Completed');
      fireEvent.press(clearButton);
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Success', 'Cleared 3 completed uploads');
      });
    });

    it('handles retry failure gracefully', async () => {
      mockOfflinePhotoQueueService.retryFailedUploads.mockRejectedValue(new Error('Retry failed'));
      
      const { getByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      const retryButton = getByText('Retry Failed');
      fireEvent.press(retryButton);
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Error', 'Failed to retry uploads');
      });
    });
  });

  describe('Individual Photo Actions', () => {
    it('shows remove button for each photo', () => {
      const { getAllByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      const removeButtons = getAllByText('Remove');
      expect(removeButtons).toHaveLength(3); // One for each photo
    });

    it('shows retry button for failed photos', () => {
      const { getAllByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      const retryButtons = getAllByText('Retry');
      expect(retryButtons).toHaveLength(1); // Only for failed photo
    });

    it('shows confirmation dialog when removing photo', () => {
      const { getAllByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      const removeButtons = getAllByText('Remove');
      fireEvent.press(removeButtons[0]);
      
      expect(mockAlert).toHaveBeenCalledWith(
        'Remove Upload',
        'Are you sure you want to remove this photo from the upload queue?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Remove', style: 'destructive' }),
        ])
      );
    });

    it('removes photo when confirmed', async () => {
      mockOfflinePhotoQueueService.removeFromQueue.mockResolvedValue(true);
      
      const { getAllByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      const removeButtons = getAllByText('Remove');
      fireEvent.press(removeButtons[0]);
      
      // Simulate confirming removal
      const alertCall = mockAlert.mock.calls[0];
      const removeAction = alertCall[2].find((action: any) => action.text === 'Remove');
      await removeAction.onPress();
      
      expect(mockOfflinePhotoQueueService.removeFromQueue).toHaveBeenCalledWith('photo1');
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no photos in queue', () => {
      mockOfflinePhotoQueueService.getQueueStats.mockReturnValue({
        total: 0,
        pending: 0,
        uploading: 0,
        failed: 0,
        completed: 0,
      });
      mockOfflinePhotoQueueService.getQueuedPhotos.mockReturnValue([]);
      
      const { getByText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      expect(getByText('No Photos in Queue')).toBeTruthy();
      expect(getByText('Photos will appear here when they\'re waiting to upload or when you\'re offline')).toBeTruthy();
    });
  });

  describe('Modal Behavior', () => {
    it('calls onClose when close button is pressed', () => {
      const onClose = jest.fn();
      const { getByLabelText } = render(
        <PhotoUploadProgress {...defaultProps} onClose={onClose} />
      );
      
      const closeButton = getByLabelText('Close upload queue');
      fireEvent.press(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('sets correct modal properties', () => {
      const { container } = render(<PhotoUploadProgress {...defaultProps} />);
      
      const modal = container.findByType('Modal' as any);
      expect(modal.props.visible).toBe(true);
      expect(modal.props.animationType).toBe('slide');
      expect(modal.props.presentationStyle).toBe('pageSheet');
    });
  });

  describe('Auto-refresh', () => {
    it('updates queue data periodically when visible', () => {
      render(<PhotoUploadProgress {...defaultProps} />);
      
      // Initial call
      expect(mockOfflinePhotoQueueService.getQueueStats).toHaveBeenCalledTimes(1);
      expect(mockOfflinePhotoQueueService.getQueuedPhotos).toHaveBeenCalledTimes(1);
      
      // Fast-forward 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(mockOfflinePhotoQueueService.getQueueStats).toHaveBeenCalledTimes(2);
      expect(mockOfflinePhotoQueueService.getQueuedPhotos).toHaveBeenCalledTimes(2);
    });

    it('does not update when not visible', () => {
      render(<PhotoUploadProgress {...defaultProps} visible={false} />);
      
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(mockOfflinePhotoQueueService.getQueueStats).not.toHaveBeenCalled();
    });

    it('cleans up interval on unmount', () => {
      const { unmount } = render(<PhotoUploadProgress {...defaultProps} />);
      
      unmount();
      
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      // Should not continue calling after unmount
      expect(mockOfflinePhotoQueueService.getQueueStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility labels', () => {
      const { getByLabelText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      expect(getByLabelText('Close upload queue')).toBeTruthy();
      expect(getByLabelText('Retry all failed uploads')).toBeTruthy();
      expect(getByLabelText('Clear completed uploads')).toBeTruthy();
    });

    it('provides accessibility labels for individual actions', () => {
      const { getAllByLabelText } = render(<PhotoUploadProgress {...defaultProps} />);
      
      expect(getAllByLabelText('Remove from queue')).toHaveLength(3);
      expect(getAllByLabelText('Retry upload')).toHaveLength(1);
    });
  });
});

describe('PhotoQueueBadge', () => {
  const defaultProps = {
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders when there are photos in queue', () => {
      mockOfflinePhotoQueueService.getQueueStats.mockReturnValue({
        total: 3,
        pending: 1,
        uploading: 1,
        failed: 1,
        completed: 0,
      });
      
      const { getByText } = render(<PhotoQueueBadge {...defaultProps} />);
      
      expect(getByText('3')).toBeTruthy();
    });

    it('does not render when queue is empty', () => {
      mockOfflinePhotoQueueService.getQueueStats.mockReturnValue({
        total: 0,
        pending: 0,
        uploading: 0,
        failed: 0,
        completed: 0,
      });
      
      const { queryByText } = render(<PhotoQueueBadge {...defaultProps} />);
      
      expect(queryByText('0')).toBeNull();
    });

    it('shows activity indicator when uploading', () => {
      mockOfflinePhotoQueueService.getQueueStats.mockReturnValue({
        total: 2,
        pending: 0,
        uploading: 2,
        failed: 0,
        completed: 0,
      });
      
      const { container } = render(<PhotoQueueBadge {...defaultProps} />);
      
      const activityIndicator = container.findByType('ActivityIndicator' as any);
      expect(activityIndicator).toBeTruthy();
    });

    it('shows error indicator when there are failed uploads', () => {
      mockOfflinePhotoQueueService.getQueueStats.mockReturnValue({
        total: 2,
        pending: 0,
        uploading: 0,
        failed: 2,
        completed: 0,
      });
      
      const { getByText } = render(<PhotoQueueBadge {...defaultProps} />);
      
      expect(getByText('!')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('calls onPress when badge is pressed', () => {
      mockOfflinePhotoQueueService.getQueueStats.mockReturnValue({
        total: 1,
        pending: 1,
        uploading: 0,
        failed: 0,
        completed: 0,
      });
      
      const onPress = jest.fn();
      const { getByLabelText } = render(
        <PhotoQueueBadge {...defaultProps} onPress={onPress} />
      );
      
      const badge = getByLabelText('Photo upload queue: 1 photos');
      fireEvent.press(badge);
      
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Auto-refresh', () => {
    it('updates stats periodically', () => {
      mockOfflinePhotoQueueService.getQueueStats.mockReturnValue({
        total: 1,
        pending: 1,
        uploading: 0,
        failed: 0,
        completed: 0,
      });
      
      render(<PhotoQueueBadge {...defaultProps} />);
      
      // Initial call
      expect(mockOfflinePhotoQueueService.getQueueStats).toHaveBeenCalledTimes(1);
      
      // Fast-forward 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      
      expect(mockOfflinePhotoQueueService.getQueueStats).toHaveBeenCalledTimes(2);
    });

    it('cleans up interval on unmount', () => {
      mockOfflinePhotoQueueService.getQueueStats.mockReturnValue({
        total: 1,
        pending: 1,
        uploading: 0,
        failed: 0,
        completed: 0,
      });
      
      const { unmount } = render(<PhotoQueueBadge {...defaultProps} />);
      
      unmount();
      
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      // Should not continue calling after unmount
      expect(mockOfflinePhotoQueueService.getQueueStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility label', () => {
      mockOfflinePhotoQueueService.getQueueStats.mockReturnValue({
        total: 3,
        pending: 1,
        uploading: 1,
        failed: 1,
        completed: 0,
      });
      
      const { getByLabelText } = render(<PhotoQueueBadge {...defaultProps} />);
      
      expect(getByLabelText('Photo upload queue: 3 photos')).toBeTruthy();
    });

    it('sets proper accessibility role', () => {
      mockOfflinePhotoQueueService.getQueueStats.mockReturnValue({
        total: 1,
        pending: 1,
        uploading: 0,
        failed: 0,
        completed: 0,
      });
      
      const { getByLabelText } = render(<PhotoQueueBadge {...defaultProps} />);
      
      const badge = getByLabelText('Photo upload queue: 1 photos');
      expect(badge.props.accessibilityRole).toBe('button');
    });
  });
});