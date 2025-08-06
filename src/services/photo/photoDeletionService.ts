/**
 * Photo Deletion Service
 * Handles photo deletion from storage and database with error handling and undo functionality
 */

import { supabaseHelpers } from '../../config/supabase';
import { Alert } from 'react-native';

export interface PhotoDeletionResult {
  success: boolean;
  error?: string;
  undoData?: {
    photoId: string;
    photoUrl: string;
    metadata: any;
  };
}

export interface PhotoDeletionOptions {
  showConfirmation?: boolean;
  enableUndo?: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onUndo?: () => void;
}

class PhotoDeletionService {
  private deletedPhotos: Map<string, any> = new Map();
  private undoTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly UNDO_TIMEOUT = 10000; // 10 seconds

  /**
   * Delete a single photo with confirmation and undo functionality
   */
  async deletePhoto(
    photoId: string,
    options: PhotoDeletionOptions = {}
  ): Promise<PhotoDeletionResult> {
    const {
      showConfirmation = true,
      enableUndo = true,
      onSuccess,
      onError,
      onUndo,
    } = options;

    try {
      // Show confirmation dialog if requested
      if (showConfirmation) {
        const confirmed = await this.showDeleteConfirmation();
        if (!confirmed) {
          return { success: false, error: 'User cancelled deletion' };
        }
      }

      // Get photo data before deletion for undo functionality
      let undoData;
      if (enableUndo) {
        try {
          undoData = await this.getPhotoData(photoId);
        } catch (error) {
          console.warn('Could not retrieve photo data for undo:', error);
        }
      }

      // Perform the deletion
      await supabaseHelpers.deleteIntakeMedia(photoId);

      // Store undo data if available
      if (enableUndo && undoData) {
        this.storeUndoData(photoId, undoData);
        this.scheduleUndoCleanup(photoId);
      }

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      return {
        success: true,
        undoData: enableUndo ? undoData : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Call error callback
      if (onError) {
        onError(errorMessage);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Delete multiple photos with batch processing
   */
  async deleteMultiplePhotos(
    photoIds: string[],
    options: PhotoDeletionOptions = {}
  ): Promise<PhotoDeletionResult[]> {
    const {
      showConfirmation = true,
      enableUndo = true,
      onSuccess,
      onError,
    } = options;

    try {
      // Show confirmation dialog if requested
      if (showConfirmation) {
        const confirmed = await this.showBatchDeleteConfirmation(photoIds.length);
        if (!confirmed) {
          return photoIds.map(() => ({ success: false, error: 'User cancelled deletion' }));
        }
      }

      // Process deletions in parallel
      const deletionPromises = photoIds.map(photoId =>
        this.deletePhoto(photoId, {
          ...options,
          showConfirmation: false, // Already confirmed above
        })
      );

      const results = await Promise.all(deletionPromises);

      // Check if all deletions were successful
      const allSuccessful = results.every(result => result.success);
      
      if (allSuccessful && onSuccess) {
        onSuccess();
      } else if (!allSuccessful && onError) {
        const failedCount = results.filter(result => !result.success).length;
        onError(`Failed to delete ${failedCount} of ${photoIds.length} photos`);
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (onError) {
        onError(errorMessage);
      }

      return photoIds.map(() => ({ success: false, error: errorMessage }));
    }
  }

  /**
   * Undo a photo deletion if within the undo timeout
   */
  async undoPhotoDeletion(photoId: string): Promise<boolean> {
    const undoData = this.deletedPhotos.get(photoId);
    
    if (!undoData) {
      console.warn('No undo data found for photo:', photoId);
      return false;
    }

    try {
      // Clear the undo timeout
      const timeout = this.undoTimeouts.get(photoId);
      if (timeout) {
        clearTimeout(timeout);
        this.undoTimeouts.delete(photoId);
      }

      // Restore the photo (this would need to be implemented based on your storage solution)
      await this.restorePhoto(photoId, undoData);

      // Clean up undo data
      this.deletedPhotos.delete(photoId);

      return true;
    } catch (error) {
      console.error('Failed to undo photo deletion:', error);
      return false;
    }
  }

  /**
   * Check if a photo can be undone
   */
  canUndoPhotoDeletion(photoId: string): boolean {
    return this.deletedPhotos.has(photoId);
  }

  /**
   * Get all photos that can be undone
   */
  getUndoablePhotos(): string[] {
    return Array.from(this.deletedPhotos.keys());
  }

  /**
   * Clear all undo data (useful for cleanup)
   */
  clearUndoData(): void {
    // Clear all timeouts
    this.undoTimeouts.forEach(timeout => clearTimeout(timeout));
    this.undoTimeouts.clear();
    
    // Clear undo data
    this.deletedPhotos.clear();
  }

  /**
   * Show confirmation dialog for single photo deletion
   */
  private showDeleteConfirmation(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Delete Photo',
        'Are you sure you want to delete this photo? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });
  }

  /**
   * Show confirmation dialog for batch photo deletion
   */
  private showBatchDeleteConfirmation(count: number): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Delete Photos',
        `Are you sure you want to delete ${count} photo${count > 1 ? 's' : ''}? This action cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Delete All',
            style: 'destructive',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });
  }

  /**
   * Get photo data for undo functionality
   */
  private async getPhotoData(photoId: string): Promise<any> {
    // This would need to be implemented based on your data structure
    // For now, we'll return a placeholder
    return {
      id: photoId,
      timestamp: new Date().toISOString(),
      // Add other relevant photo data
    };
  }

  /**
   * Store undo data for a deleted photo
   */
  private storeUndoData(photoId: string, undoData: any): void {
    this.deletedPhotos.set(photoId, {
      ...undoData,
      deletedAt: new Date().toISOString(),
    });
  }

  /**
   * Schedule cleanup of undo data after timeout
   */
  private scheduleUndoCleanup(photoId: string): void {
    const timeout = setTimeout(() => {
      this.deletedPhotos.delete(photoId);
      this.undoTimeouts.delete(photoId);
    }, this.UNDO_TIMEOUT);

    this.undoTimeouts.set(photoId, timeout);
  }

  /**
   * Restore a deleted photo (placeholder implementation)
   */
  private async restorePhoto(photoId: string, undoData: any): Promise<void> {
    // This would need to be implemented based on your storage solution
    // For now, this is a placeholder that would need actual restoration logic
    console.log('Restoring photo:', photoId, undoData);
    
    // In a real implementation, you would:
    // 1. Re-upload the photo to storage
    // 2. Restore the database record
    // 3. Update any related UI state
    
    throw new Error('Photo restoration not implemented - photos cannot be recovered once deleted');
  }

  /**
   * Show undo notification with action
   */
  showUndoNotification(
    photoId: string,
    onUndo: () => void,
    onTimeout: () => void
  ): void {
    // This would integrate with your toast/notification system
    // For now, we'll use a simple alert
    Alert.alert(
      'Photo Deleted',
      'Photo has been deleted. You have 10 seconds to undo this action.',
      [
        {
          text: 'Undo',
          onPress: () => {
            this.undoPhotoDeletion(photoId).then(success => {
              if (success) {
                onUndo();
              }
            });
          },
        },
        {
          text: 'OK',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );

    // Auto-dismiss after timeout
    setTimeout(() => {
      onTimeout();
    }, this.UNDO_TIMEOUT);
  }
}

// Export singleton instance
export const photoDeletionService = new PhotoDeletionService();
export default photoDeletionService;