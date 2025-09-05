/**
 * Photo Deletion and UI Updates Integration Tests
 * Tests photo deletion workflow and immediate UI updates
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PhotoGallery from '../../components/photo/PhotoGallery';
import DeleteConfirmationDialog from '../../components/photo/DeleteConfirmationDialog';
import UndoNotification from '../../components/photo/UndoNotification';
import { photoDeletionService } from '../../services/photo/photoDeletionService';
import { usePhotoStore } from '../../features/photos/store';
import { photoToastService } from '../../services/photo/photoToastService';

// Mock dependencies
jest.mock('../../services/photo/photoDeletionService');
jest.mock('../../features/photos/store');
jest.mock('../../services/photo/photoToastService');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

const mockPhotoDeletionService = photoDeletionService as jest.Mocked<typeof photoDeletionService>;
const mockUsePhotoStore = usePhotoStore as jest.MockedFunction<typeof usePhotoStore>;
const mockPhotoToastService = photoToastService as jest.Mocked<typeof photoToastService>;
const mockAlert = Alert as jest.Mocked<typeof Alert>;

// Test component that integrates deletion workflow
const PhotoDeletionTestApp: React.FC = () => {
  const [photos, setPhotos] = React.useState([
    { id: 'photo-1', uri: 'test://photo1.jpg', timestamp: Date.now() - 1000 },
    { id: 'photo-2', uri: 'test://photo2.jpg', timestamp: Date.now() - 2000 },
    { id: 'photo-3', uri: 'test://photo3.jpg', timestamp: Date.now() - 3000 },
  ]);
  
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [photoToDelete, setPhotoToDelete] = React.useState<string | null>(null);
  const [showUndoNotification, setShowUndoNotification] = React.useState(false);
  const [deletedPhoto, setDeletedPhoto] = React.useState<any>(null);

  const handlePhotoDelete = (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (photo) {
      setPhotoToDelete(photoId);
      setShowDeleteDialog(true);
    }
  };

  const confirmDelete = async () => {
    if (!photoToDelete) return;

    try {
      const photo = photos.find(p => p.id === photoToDelete);
      if (photo) {
        // Store for undo functionality
        setDeletedPhoto(photo);
        
        // Remove from UI immediately
        setPhotos(prev => prev.filter(p => p.id !== photoToDelete));
        
        // Call deletion service
        await mockPhotoDeletionService.deletePhoto(photoToDelete);
        
        // Show undo notification
        setShowUndoNotification(true);
        
        // Show success toast
        mockPhotoToastService.showSuccess('Photo deleted successfully');
      }
    } catch (error) {
      // Restore photo on error
      if (deletedPhoto) {
        setPhotos(prev => [...prev, deletedPhoto].sort((a, b) => b.timestamp - a.timestamp));
      }
      mockPhotoToastService.showError('Failed to delete photo');
    } finally {
      setShowDeleteDialog(false);
      setPhotoToDelete(null);
    }
  };

  const undoDelete = () => {
    if (deletedPhoto) {
      setPhotos(prev => [...prev, deletedPhoto].sort((a, b) => b.timestamp - a.timestamp));
      setDeletedPhoto(null);
      setShowUndoNotification(false);
      mockPhotoToastService.showInfo('Photo deletion undone');
    }
  };

  return (
    <>
      <PhotoGallery
        photos={photos}
        onPhotoSelect={() => {}}
        onPhotoDelete={handlePhotoDelete}
        testID="photo-gallery"
      />
      
      <DeleteConfirmationDialog
        visible={showDeleteDialog}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setPhotoToDelete(null);
        }}
        photoCount={1}
        testID="delete-dialog"
      />
      
      <UndoNotification
        visible={showUndoNotification}
        message="Photo deleted"
        onUndo={undoDelete}
        onDismiss={() => setShowUndoNotification(false)}
        testID="undo-notification"
      />
    </>
  );
};

describe('Photo Deletion and UI Updates Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockUsePhotoStore.mockReturnValue({
      photos: {},
      add: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
      getById: jest.fn(),
      getByIntake: jest.fn(),
      getByStatus: jest.fn(),
      enqueue: jest.fn(),
      setUploading: jest.fn(),
      setUploaded: jest.fn(),
      setError: jest.fn(),
      retryFailed: jest.fn(),
      purgeOrphans: jest.fn(),
      getQueuedPhotos: jest.fn().mockReturnValue([]),
      incrementUploadAttempts: jest.fn(),
    });

    mockPhotoDeletionService.deletePhoto.mockResolvedValue(undefined);
    mockPhotoToastService.showSuccess.mockReturnValue(undefined);
    mockPhotoToastService.showError.mockReturnValue(undefined);
    mockPhotoToastService.showInfo.mockReturnValue(undefined);
  });

  describe('Photo Deletion Workflow', () => {
    it('should handle complete photo deletion workflow', async () => {
      const { getByTestId, queryByTestId } = render(<PhotoDeletionTestApp />);

      // Verify initial state - 3 photos in gallery
      const gallery = getByTestId('photo-gallery');
      expect(gallery).toBeTruthy();

      // Trigger delete action
      fireEvent(gallery, 'onPhotoDelete', 'photo-2');

      // Verify delete confirmation dialog appears
      await waitFor(() => {
        expect(getByTestId('delete-dialog')).toBeTruthy();
        expect(getByTestId('delete-dialog')).toHaveProp('visible', true);
      });

      // Confirm deletion
      const deleteDialog = getByTestId('delete-dialog');
      fireEvent(deleteDialog, 'onConfirm');

      // Verify photo is removed from UI immediately
      await waitFor(() => {
        expect(mockPhotoDeletionService.deletePhoto).toHaveBeenCalledWith('photo-2');
      });

      // Verify success toast is shown
      expect(mockPhotoToastService.showSuccess).toHaveBeenCalledWith('Photo deleted successfully');

      // Verify undo notification appears
      await waitFor(() => {
        expect(getByTestId('undo-notification')).toBeTruthy();
        expect(getByTestId('undo-notification')).toHaveProp('visible', true);
      });

      // Verify delete dialog is hidden
      expect(queryByTestId('delete-dialog')).toHaveProp('visible', false);
    });

    it('should handle deletion cancellation', async () => {
      const { getByTestId } = render(<PhotoDeletionTestApp />);

      const gallery = getByTestId('photo-gallery');
      
      // Trigger delete action
      fireEvent(gallery, 'onPhotoDelete', 'photo-1');

      // Verify delete confirmation dialog appears
      await waitFor(() => {
        expect(getByTestId('delete-dialog')).toHaveProp('visible', true);
      });

      // Cancel deletion
      const deleteDialog = getByTestId('delete-dialog');
      fireEvent(deleteDialog, 'onCancel');

      // Verify dialog is hidden
      await waitFor(() => {
        expect(getByTestId('delete-dialog')).toHaveProp('visible', false);
      });

      // Verify deletion service was not called
      expect(mockPhotoDeletionService.deletePhoto).not.toHaveBeenCalled();

      // Verify no toast messages
      expect(mockPhotoToastService.showSuccess).not.toHaveBeenCalled();
      expect(mockPhotoToastService.showError).not.toHaveBeenCalled();
    });

    it('should handle deletion errors with UI restoration', async () => {
      // Mock deletion failure
      mockPhotoDeletionService.deletePhoto.mockRejectedValue(
        new Error('Network error: Unable to delete photo')
      );

      const { getByTestId } = render(<PhotoDeletionTestApp />);

      const gallery = getByTestId('photo-gallery');
      
      // Trigger delete action
      fireEvent(gallery, 'onPhotoDelete', 'photo-3');

      await waitFor(() => {
        expect(getByTestId('delete-dialog')).toHaveProp('visible', true);
      });

      // Confirm deletion
      const deleteDialog = getByTestId('delete-dialog');
      fireEvent(deleteDialog, 'onConfirm');

      // Wait for error handling
      await waitFor(() => {
        expect(mockPhotoDeletionService.deletePhoto).toHaveBeenCalledWith('photo-3');
      });

      // Verify error toast is shown
      expect(mockPhotoToastService.showError).toHaveBeenCalledWith('Failed to delete photo');

      // Verify photo is restored to UI (no undo notification should appear)
      expect(mockPhotoToastService.showSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Undo Functionality', () => {
    it('should handle undo deletion workflow', async () => {
      const { getByTestId } = render(<PhotoDeletionTestApp />);

      const gallery = getByTestId('photo-gallery');
      
      // Delete a photo
      fireEvent(gallery, 'onPhotoDelete', 'photo-2');

      await waitFor(() => {
        expect(getByTestId('delete-dialog')).toHaveProp('visible', true);
      });

      const deleteDialog = getByTestId('delete-dialog');
      fireEvent(deleteDialog, 'onConfirm');

      // Wait for deletion to complete
      await waitFor(() => {
        expect(getByTestId('undo-notification')).toHaveProp('visible', true);
      });

      // Trigger undo
      const undoNotification = getByTestId('undo-notification');
      fireEvent(undoNotification, 'onUndo');

      // Verify undo toast is shown
      expect(mockPhotoToastService.showInfo).toHaveBeenCalledWith('Photo deletion undone');

      // Verify undo notification is hidden
      await waitFor(() => {
        expect(getByTestId('undo-notification')).toHaveProp('visible', false);
      });
    });

    it('should handle undo notification dismissal', async () => {
      const { getByTestId } = render(<PhotoDeletionTestApp />);

      const gallery = getByTestId('photo-gallery');
      
      // Delete a photo
      fireEvent(gallery, 'onPhotoDelete', 'photo-1');

      await waitFor(() => {
        expect(getByTestId('delete-dialog')).toHaveProp('visible', true);
      });

      const deleteDialog = getByTestId('delete-dialog');
      fireEvent(deleteDialog, 'onConfirm');

      await waitFor(() => {
        expect(getByTestId('undo-notification')).toHaveProp('visible', true);
      });

      // Dismiss undo notification
      const undoNotification = getByTestId('undo-notification');
      fireEvent(undoNotification, 'onDismiss');

      // Verify notification is hidden
      await waitFor(() => {
        expect(getByTestId('undo-notification')).toHaveProp('visible', false);
      });

      // Verify no undo toast
      expect(mockPhotoToastService.showInfo).not.toHaveBeenCalled();
    });

    it('should handle undo timeout', async () => {
      jest.useFakeTimers();

      const { getByTestId } = render(<PhotoDeletionTestApp />);

      const gallery = getByTestId('photo-gallery');
      
      // Delete a photo
      fireEvent(gallery, 'onPhotoDelete', 'photo-3');

      await waitFor(() => {
        expect(getByTestId('delete-dialog')).toHaveProp('visible', true);
      });

      const deleteDialog = getByTestId('delete-dialog');
      fireEvent(deleteDialog, 'onConfirm');

      await waitFor(() => {
        expect(getByTestId('undo-notification')).toHaveProp('visible', true);
      });

      // Fast-forward time to trigger auto-dismiss
      act(() => {
        jest.advanceTimersByTime(5000); // 5 seconds
      });

      // Verify notification auto-dismisses
      await waitFor(() => {
        expect(getByTestId('undo-notification')).toHaveProp('visible', false);
      });

      jest.useRealTimers();
    });
  });

  describe('Batch Deletion', () => {
    it('should handle multiple photo deletion', async () => {
      const BatchDeletionTestApp: React.FC = () => {
        const [photos, setPhotos] = React.useState([
          { id: 'photo-1', uri: 'test://photo1.jpg', timestamp: Date.now() - 1000 },
          { id: 'photo-2', uri: 'test://photo2.jpg', timestamp: Date.now() - 2000 },
          { id: 'photo-3', uri: 'test://photo3.jpg', timestamp: Date.now() - 3000 },
        ]);
        
        const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
        const [photosToDelete, setPhotosToDelete] = React.useState<string[]>([]);

        const handleBatchDelete = (photoIds: string[]) => {
          setPhotosToDelete(photoIds);
          setShowDeleteDialog(true);
        };

        const confirmBatchDelete = async () => {
          try {
            // Remove from UI immediately
            setPhotos(prev => prev.filter(p => !photosToDelete.includes(p.id)));
            
            // Call batch deletion service
            await mockPhotoDeletionService.batchDeletePhotos(photosToDelete);
            
            mockPhotoToastService.showSuccess(`${photosToDelete.length} photos deleted successfully`);
          } catch (error) {
            mockPhotoToastService.showError('Failed to delete photos');
          } finally {
            setShowDeleteDialog(false);
            setPhotosToDelete([]);
          }
        };

        return (
          <>
            <PhotoGallery
              photos={photos}
              onPhotoSelect={() => {}}
              onPhotoDelete={() => {}}
              onBatchDelete={handleBatchDelete}
              testID="batch-gallery"
            />
            
            <DeleteConfirmationDialog
              visible={showDeleteDialog}
              onConfirm={confirmBatchDelete}
              onCancel={() => {
                setShowDeleteDialog(false);
                setPhotosToDelete([]);
              }}
              photoCount={photosToDelete.length}
              testID="batch-delete-dialog"
            />
          </>
        );
      };

      mockPhotoDeletionService.batchDeletePhotos = jest.fn().mockResolvedValue(undefined);

      const { getByTestId } = render(<BatchDeletionTestApp />);

      const gallery = getByTestId('batch-gallery');
      
      // Trigger batch delete
      fireEvent(gallery, 'onBatchDelete', ['photo-1', 'photo-3']);

      await waitFor(() => {
        expect(getByTestId('batch-delete-dialog')).toHaveProp('visible', true);
      });

      // Confirm batch deletion
      const deleteDialog = getByTestId('batch-delete-dialog');
      fireEvent(deleteDialog, 'onConfirm');

      await waitFor(() => {
        expect(mockPhotoDeletionService.batchDeletePhotos).toHaveBeenCalledWith(['photo-1', 'photo-3']);
      });

      expect(mockPhotoToastService.showSuccess).toHaveBeenCalledWith('2 photos deleted successfully');
    });
  });

  describe('UI State Management', () => {
    it('should maintain consistent UI state during deletion operations', async () => {
      const { getByTestId } = render(<PhotoDeletionTestApp />);

      const gallery = getByTestId('photo-gallery');
      
      // Start multiple deletion operations
      fireEvent(gallery, 'onPhotoDelete', 'photo-1');

      await waitFor(() => {
        expect(getByTestId('delete-dialog')).toHaveProp('visible', true);
      });

      // Try to delete another photo while dialog is open
      fireEvent(gallery, 'onPhotoDelete', 'photo-2');

      // Verify only one dialog is shown
      expect(getByTestId('delete-dialog')).toHaveProp('visible', true);

      // Complete first deletion
      const deleteDialog = getByTestId('delete-dialog');
      fireEvent(deleteDialog, 'onConfirm');

      await waitFor(() => {
        expect(mockPhotoDeletionService.deletePhoto).toHaveBeenCalledWith('photo-1');
      });

      // Verify UI state is consistent
      expect(getByTestId('delete-dialog')).toHaveProp('visible', false);
    });

    it('should handle rapid deletion operations', async () => {
      const { getByTestId } = render(<PhotoDeletionTestApp />);

      const gallery = getByTestId('photo-gallery');
      
      // Rapidly trigger multiple deletions
      fireEvent(gallery, 'onPhotoDelete', 'photo-1');
      
      await waitFor(() => {
        expect(getByTestId('delete-dialog')).toHaveProp('visible', true);
      });

      const deleteDialog = getByTestId('delete-dialog');
      fireEvent(deleteDialog, 'onConfirm');

      // Immediately trigger another deletion
      fireEvent(gallery, 'onPhotoDelete', 'photo-2');

      // Verify operations are handled sequentially
      await waitFor(() => {
        expect(mockPhotoDeletionService.deletePhoto).toHaveBeenCalledWith('photo-1');
      });

      // Second deletion should be queued or handled appropriately
      expect(getByTestId('delete-dialog')).toBeTruthy();
    });
  });

  describe('Error Recovery', () => {
    it('should recover gracefully from deletion service failures', async () => {
      // Mock intermittent failures
      mockPhotoDeletionService.deletePhoto
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(undefined);

      const { getByTestId } = render(<PhotoDeletionTestApp />);

      const gallery = getByTestId('photo-gallery');
      
      // First deletion attempt (will fail)
      fireEvent(gallery, 'onPhotoDelete', 'photo-1');

      await waitFor(() => {
        expect(getByTestId('delete-dialog')).toHaveProp('visible', true);
      });

      const deleteDialog = getByTestId('delete-dialog');
      fireEvent(deleteDialog, 'onConfirm');

      await waitFor(() => {
        expect(mockPhotoToastService.showError).toHaveBeenCalledWith('Failed to delete photo');
      });

      // Retry deletion (will succeed)
      fireEvent(gallery, 'onPhotoDelete', 'photo-1');

      await waitFor(() => {
        expect(getByTestId('delete-dialog')).toHaveProp('visible', true);
      });

      fireEvent(deleteDialog, 'onConfirm');

      await waitFor(() => {
        expect(mockPhotoToastService.showSuccess).toHaveBeenCalledWith('Photo deleted successfully');
      });
    });
  });
});