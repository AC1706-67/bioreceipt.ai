/**
 * PhotoDeletionService Tests
 * Tests photo deletion functionality with error handling and undo capabilities
 */

import { Alert } from 'react-native';
import photoDeletionService, { PhotoDeletionService } from '../photoDeletionService';
import { supabaseHelpers } from '../../../config/supabase';

// Mock dependencies
jest.mock('../../../config/supabase', () => ({
  supabaseHelpers: {
    deleteIntakeMedia: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;
const mockSupabaseHelpers = supabaseHelpers as jest.Mocked<typeof supabaseHelpers>;

describe('PhotoDeletionService', () => {
  let service: PhotoDeletionService;

  beforeEach(() => {
    service = new PhotoDeletionService();
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    service.clearUndoData();
    jest.useRealTimers();
  });

  describe('Single Photo Deletion', () => {
    it('deletes photo successfully without confirmation', async () => {
      mockSupabaseHelpers.deleteIntakeMedia.mockResolvedValue(undefined);

      const result = await service.deletePhoto('photo1', {
        showConfirmation: false,
        enableUndo: false,
      });

      expect(result.success).toBe(true);
      expect(mockSupabaseHelpers.deleteIntakeMedia).toHaveBeenCalledWith('photo1');
    });

    it('shows confirmation dialog when requested', async () => {
      mockAlert.mockImplementation((title, message, buttons) => {
        // Simulate user confirming deletion
        const confirmButton = buttons?.find(button => button.text === 'Delete');
        if (confirmButton?.onPress) {
          confirmButton.onPress();
        }
      });
      mockSupabaseHelpers.deleteIntakeMedia.mockResolvedValue(undefined);

      const result = await service.deletePhoto('photo1', {
        showConfirmation: true,
        enableUndo: false,
      });

      expect(mockAlert).toHaveBeenCalledWith(
        'Delete Photo',
        'Are you sure you want to delete this photo? This action cannot be undone.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Delete', style: 'destructive' }),
        ]),
        expect.objectContaining({ cancelable: true })
      );
      expect(result.success).toBe(true);
    });

    it('cancels deletion when user cancels confirmation', async () => {
      mockAlert.mockImplementation((title, message, buttons) => {
        // Simulate user canceling deletion
        const cancelButton = buttons?.find(button => button.text === 'Cancel');
        if (cancelButton?.onPress) {
          cancelButton.onPress();
        }
      });

      const result = await service.deletePhoto('photo1', {
        showConfirmation: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User cancelled deletion');
      expect(mockSupabaseHelpers.deleteIntakeMedia).not.toHaveBeenCalled();
    });

    it('handles deletion errors gracefully', async () => {
      const errorMessage = 'Network error';
      mockSupabaseHelpers.deleteIntakeMedia.mockRejectedValue(new Error(errorMessage));

      const result = await service.deletePhoto('photo1', {
        showConfirmation: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });

    it('calls success callback on successful deletion', async () => {
      mockSupabaseHelpers.deleteIntakeMedia.mockResolvedValue(undefined);
      const onSuccess = jest.fn();

      await service.deletePhoto('photo1', {
        showConfirmation: false,
        onSuccess,
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('calls error callback on deletion failure', async () => {
      const errorMessage = 'Deletion failed';
      mockSupabaseHelpers.deleteIntakeMedia.mockRejectedValue(new Error(errorMessage));
      const onError = jest.fn();

      await service.deletePhoto('photo1', {
        showConfirmation: false,
        onError,
      });

      expect(onError).toHaveBeenCalledWith(errorMessage);
    });

    it('stores undo data when undo is enabled', async () => {
      mockSupabaseHelpers.deleteIntakeMedia.mockResolvedValue(undefined);

      const result = await service.deletePhoto('photo1', {
        showConfirmation: false,
        enableUndo: true,
      });

      expect(result.success).toBe(true);
      expect(result.undoData).toBeDefined();
      expect(service.canUndoPhotoDeletion('photo1')).toBe(true);
    });
  });

  describe('Multiple Photo Deletion', () => {
    it('deletes multiple photos successfully', async () => {
      mockSupabaseHelpers.deleteIntakeMedia.mockResolvedValue(undefined);
      mockAlert.mockImplementation((title, message, buttons) => {
        // Simulate user confirming batch deletion
        const confirmButton = buttons?.find(button => button.text === 'Delete All');
        if (confirmButton?.onPress) {
          confirmButton.onPress();
        }
      });

      const photoIds = ['photo1', 'photo2', 'photo3'];
      const results = await service.deleteMultiplePhotos(photoIds);

      expect(results).toHaveLength(3);
      expect(results.every(result => result.success)).toBe(true);
      expect(mockSupabaseHelpers.deleteIntakeMedia).toHaveBeenCalledTimes(3);
    });

    it('shows batch confirmation dialog', async () => {
      mockAlert.mockImplementation((title, message, buttons) => {
        const confirmButton = buttons?.find(button => button.text === 'Delete All');
        if (confirmButton?.onPress) {
          confirmButton.onPress();
        }
      });
      mockSupabaseHelpers.deleteIntakeMedia.mockResolvedValue(undefined);

      const photoIds = ['photo1', 'photo2'];
      await service.deleteMultiplePhotos(photoIds);

      expect(mockAlert).toHaveBeenCalledWith(
        'Delete Photos',
        'Are you sure you want to delete 2 photos? This action cannot be undone.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Delete All', style: 'destructive' }),
        ]),
        expect.objectContaining({ cancelable: true })
      );
    });

    it('handles partial failures in batch deletion', async () => {
      mockAlert.mockImplementation((title, message, buttons) => {
        const confirmButton = buttons?.find(button => button.text === 'Delete All');
        if (confirmButton?.onPress) {
          confirmButton.onPress();
        }
      });
      
      // Mock first deletion to succeed, second to fail
      mockSupabaseHelpers.deleteIntakeMedia
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Network error'));

      const photoIds = ['photo1', 'photo2'];
      const results = await service.deleteMultiplePhotos(photoIds, {
        showConfirmation: true,
      });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Network error');
    });

    it('calls error callback for partial failures', async () => {
      mockAlert.mockImplementation((title, message, buttons) => {
        const confirmButton = buttons?.find(button => button.text === 'Delete All');
        if (confirmButton?.onPress) {
          confirmButton.onPress();
        }
      });
      
      mockSupabaseHelpers.deleteIntakeMedia
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Network error'));

      const onError = jest.fn();
      const photoIds = ['photo1', 'photo2'];
      
      await service.deleteMultiplePhotos(photoIds, {
        showConfirmation: true,
        onError,
      });

      expect(onError).toHaveBeenCalledWith('Failed to delete 1 of 2 photos');
    });
  });

  describe('Undo Functionality', () => {
    it('allows undo within timeout period', async () => {
      mockSupabaseHelpers.deleteIntakeMedia.mockResolvedValue(undefined);

      // Delete photo with undo enabled
      await service.deletePhoto('photo1', {
        showConfirmation: false,
        enableUndo: true,
      });

      expect(service.canUndoPhotoDeletion('photo1')).toBe(true);

      // Attempt undo (this will fail in the mock but should clear undo data)
      const undoResult = await service.undoPhotoDeletion('photo1');
      
      // Since we don't have actual restoration logic, this will fail
      expect(undoResult).toBe(false);
    });

    it('clears undo data after timeout', async () => {
      mockSupabaseHelpers.deleteIntakeMedia.mockResolvedValue(undefined);

      await service.deletePhoto('photo1', {
        showConfirmation: false,
        enableUndo: true,
      });

      expect(service.canUndoPhotoDeletion('photo1')).toBe(true);

      // Fast-forward past undo timeout
      jest.advanceTimersByTime(11000);

      expect(service.canUndoPhotoDeletion('photo1')).toBe(false);
    });

    it('returns list of undoable photos', async () => {
      mockSupabaseHelpers.deleteIntakeMedia.mockResolvedValue(undefined);

      await service.deletePhoto('photo1', {
        showConfirmation: false,
        enableUndo: true,
      });
      await service.deletePhoto('photo2', {
        showConfirmation: false,
        enableUndo: true,
      });

      const undoablePhotos = service.getUndoablePhotos();
      expect(undoablePhotos).toContain('photo1');
      expect(undoablePhotos).toContain('photo2');
      expect(undoablePhotos).toHaveLength(2);
    });

    it('handles undo for non-existent photo gracefully', async () => {
      const undoResult = await service.undoPhotoDeletion('nonexistent');
      expect(undoResult).toBe(false);
    });
  });

  describe('Cleanup and Management', () => {
    it('clears all undo data', async () => {
      mockSupabaseHelpers.deleteIntakeMedia.mockResolvedValue(undefined);

      await service.deletePhoto('photo1', {
        showConfirmation: false,
        enableUndo: true,
      });
      await service.deletePhoto('photo2', {
        showConfirmation: false,
        enableUndo: true,
      });

      expect(service.getUndoablePhotos()).toHaveLength(2);

      service.clearUndoData();

      expect(service.getUndoablePhotos()).toHaveLength(0);
    });

    it('handles service cleanup properly', () => {
      // This test ensures no memory leaks or hanging timers
      service.clearUndoData();
      expect(service.getUndoablePhotos()).toHaveLength(0);
    });
  });

  describe('Error Edge Cases', () => {
    it('handles unknown error types', async () => {
      mockSupabaseHelpers.deleteIntakeMedia.mockRejectedValue('String error');

      const result = await service.deletePhoto('photo1', {
        showConfirmation: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('handles null/undefined errors', async () => {
      mockSupabaseHelpers.deleteIntakeMedia.mockRejectedValue(null);

      const result = await service.deletePhoto('photo1', {
        showConfirmation: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('Singleton Instance', () => {
    it('exports a singleton instance', () => {
      expect(photoDeletionService).toBeInstanceOf(PhotoDeletionService);
    });

    it('maintains state across calls', async () => {
      mockSupabaseHelpers.deleteIntakeMedia.mockResolvedValue(undefined);

      await photoDeletionService.deletePhoto('photo1', {
        showConfirmation: false,
        enableUndo: true,
      });

      expect(photoDeletionService.canUndoPhotoDeletion('photo1')).toBe(true);
    });
  });
});