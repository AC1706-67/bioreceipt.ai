/**
 * Photo Export Service Tests
 * Tests for photo export, sharing, and batch operations
 */

import {
  PhotoExportService,
  photoExportService,
  ExportOptions,
  ShareOptions,
  PhotoExportData,
} from '../photoExportService';

// Mock dependencies
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  exists: jest.fn(),
  mkdir: jest.fn(),
  copyFile: jest.fn(),
  writeFile: jest.fn(),
  readDir: jest.fn(),
  stat: jest.fn(),
  unlink: jest.fn(),
}));

jest.mock('react-native-share', () => ({
  open: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Alert: {
    alert: jest.fn(),
  },
}));

import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Alert } from 'react-native';

const mockRNFS = RNFS as jest.Mocked<typeof RNFS>;
const mockShare = Share as jest.Mocked<typeof Share>;
const mockAlert = Alert as jest.Mocked<typeof Alert>;

describe('PhotoExportService', () => {
  let exportService: PhotoExportService;

  beforeEach(() => {
    jest.clearAllMocks();
    exportService = PhotoExportService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PhotoExportService.getInstance();
      const instance2 = PhotoExportService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(photoExportService);
    });
  });

  describe('exportPhoto', () => {
    const mockPhotoData: PhotoExportData = {
      uri: 'file:///photos/test.jpg',
      metadata: {
        originalSize: 1024000,
        compressedSize: 1024000,
        dimensions: { width: 1920, height: 1080 },
        format: 'JPEG',
        quality: 0.8,
        timestamp: '2023-01-01T12:00:00.000Z',
      },
      intakeId: 'intake-123',
      timestamp: '2023-01-01T12:00:00.000Z',
      notes: 'Test photo',
    };

    it('should export photo successfully', async () => {
      mockRNFS.exists.mockResolvedValue(false);
      mockRNFS.mkdir.mockResolvedValue(undefined);
      mockRNFS.copyFile.mockResolvedValue(undefined);

      const result = await exportService.exportPhoto(mockPhotoData);
      
      expect(mockRNFS.mkdir).toHaveBeenCalledWith('/mock/documents/exports');
      expect(mockRNFS.copyFile).toHaveBeenCalledWith(
        '/photos/test.jpg',
        expect.stringMatching(/\/mock\/documents\/exports\/photo_intake-123_.*\.jpg/)
      );
      expect(result).toMatch(/photo_intake-123_.*\.jpg/);
    });

    it('should export photo with metadata', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.copyFile.mockResolvedValue(undefined);
      mockRNFS.writeFile.mockResolvedValue(undefined);

      const options: ExportOptions = { includeMetadata: true };
      
      await exportService.exportPhoto(mockPhotoData, options);
      
      expect(mockRNFS.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/\.json$/),
        expect.stringContaining('"intakeId":"intake-123"')
      );
    });

    it('should handle export errors', async () => {
      mockRNFS.exists.mockResolvedValue(false);
      mockRNFS.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(exportService.exportPhoto(mockPhotoData))
        .rejects.toThrow('Failed to export photo');
    });
  });

  describe('batchExportPhotos', () => {
    const mockPhotos: PhotoExportData[] = [
      {
        uri: 'file:///photos/test1.jpg',
        metadata: {
          originalSize: 1024000,
          compressedSize: 1024000,
          dimensions: { width: 1920, height: 1080 },
          format: 'JPEG',
          quality: 0.8,
          timestamp: '2023-01-01T12:00:00.000Z',
        },
        intakeId: 'intake-1',
      },
      {
        uri: 'file:///photos/test2.jpg',
        metadata: {
          originalSize: 2048000,
          compressedSize: 2048000,
          dimensions: { width: 2048, height: 1536 },
          format: 'JPEG',
          quality: 0.9,
          timestamp: '2023-01-01T13:00:00.000Z',
        },
        intakeId: 'intake-2',
      },
    ];

    it('should batch export photos successfully', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.mkdir.mockResolvedValue(undefined);
      mockRNFS.copyFile.mockResolvedValue(undefined);
      mockRNFS.stat
        .mockResolvedValueOnce({ size: 1024000 } as any)
        .mockResolvedValueOnce({ size: 2048000 } as any);

      const onProgress = jest.fn();
      const result = await exportService.batchExportPhotos(mockPhotos, {}, onProgress);
      
      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.totalSize).toBe(3072000);
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenLastCalledWith(2, 2);
    });

    it('should handle partial failures in batch export', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.mkdir.mockResolvedValue(undefined);
      mockRNFS.copyFile
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('File not found'));
      mockRNFS.stat.mockResolvedValue({ size: 1024000 } as any);

      const result = await exportService.batchExportPhotos(mockPhotos);
      
      expect(result.success).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].originalUri).toBe('file:///photos/test2.jpg');
      expect(result.failed[0].error).toBe('File not found');
    });

    it('should create batch metadata when requested', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.mkdir.mockResolvedValue(undefined);
      mockRNFS.copyFile.mockResolvedValue(undefined);
      mockRNFS.writeFile.mockResolvedValue(undefined);
      mockRNFS.stat.mockResolvedValue({ size: 1024000 } as any);

      const options: ExportOptions = { includeMetadata: true };
      
      await exportService.batchExportPhotos(mockPhotos, options);
      
      expect(mockRNFS.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/batch_metadata\.json$/),
        expect.stringContaining('"totalPhotos":2')
      );
    });
  });

  describe('sharePhoto', () => {
    it('should share photo successfully', async () => {
      mockShare.open.mockResolvedValue({ success: true, message: 'Shared' });

      await exportService.sharePhoto('file:///photos/test.jpg');
      
      expect(mockShare.open).toHaveBeenCalledWith({
        title: 'Share Photo',
        message: 'Sharing photo from BioReceipt',
        subject: 'BioReceipt Photo',
        url: 'file:///photos/test.jpg',
        type: 'image/*',
        excludedActivityTypes: [],
      });
    });

    it('should share photo with custom options', async () => {
      mockShare.open.mockResolvedValue({ success: true, message: 'Shared' });

      const options: ShareOptions = {
        title: 'Custom Title',
        message: 'Custom message',
        subject: 'Custom Subject',
        excludedActivityTypes: ['com.apple.UIKit.activity.Mail'],
      };

      await exportService.sharePhoto('file:///photos/test.jpg', options);
      
      expect(mockShare.open).toHaveBeenCalledWith({
        title: 'Custom Title',
        message: 'Custom message',
        subject: 'Custom Subject',
        url: 'file:///photos/test.jpg',
        type: 'image/*',
        excludedActivityTypes: ['com.apple.UIKit.activity.Mail'],
      });
    });

    it('should handle user cancellation gracefully', async () => {
      mockShare.open.mockRejectedValue(new Error('User did not share'));

      // Should not throw
      await expect(exportService.sharePhoto('file:///photos/test.jpg'))
        .resolves.toBeUndefined();
    });

    it('should handle share errors', async () => {
      mockShare.open.mockRejectedValue(new Error('Share failed'));

      await expect(exportService.sharePhoto('file:///photos/test.jpg'))
        .rejects.toThrow('Failed to share photo');
    });
  });

  describe('shareMultiplePhotos', () => {
    const photoUris = [
      'file:///photos/test1.jpg',
      'file:///photos/test2.jpg',
      'file:///photos/test3.jpg',
    ];

    it('should share single photo when only one provided', async () => {
      mockShare.open.mockResolvedValue({ success: true, message: 'Shared' });

      await exportService.shareMultiplePhotos(['file:///photos/test.jpg']);
      
      expect(mockShare.open).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'file:///photos/test.jpg',
        })
      );
    });

    it('should share multiple photos on iOS', async () => {
      mockShare.open.mockResolvedValue({ success: true, message: 'Shared' });

      await exportService.shareMultiplePhotos(photoUris);
      
      expect(mockShare.open).toHaveBeenCalledWith({
        title: 'Share Photos',
        message: 'Sharing 3 photos from BioReceipt',
        subject: 'BioReceipt Photos',
        urls: photoUris,
        type: 'image/*',
        excludedActivityTypes: [],
      });
    });

    it('should handle empty photo array', async () => {
      await expect(exportService.shareMultiplePhotos([]))
        .rejects.toThrow('No photos to share');
    });
  });

  describe('exportIntakeReport', () => {
    const mockIntakeData = {
      substance: 'Vitamin D',
      quantity: '1000',
      unit: 'IU',
      timestamp: '2023-01-01T12:00:00.000Z',
      notes: 'Morning dose',
    };

    const mockPhotos: PhotoExportData[] = [
      {
        uri: 'file:///photos/vitamin.jpg',
        metadata: {
          originalSize: 1024000,
          compressedSize: 1024000,
          dimensions: { width: 1920, height: 1080 },
          format: 'JPEG',
          quality: 0.8,
          timestamp: '2023-01-01T12:00:00.000Z',
        },
      },
    ];

    it('should export intake report successfully', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.mkdir.mockResolvedValue(undefined);
      mockRNFS.copyFile.mockResolvedValue(undefined);
      mockRNFS.writeFile.mockResolvedValue(undefined);

      const result = await exportService.exportIntakeReport(
        'intake-123',
        mockPhotos,
        mockIntakeData
      );
      
      expect(mockRNFS.mkdir).toHaveBeenCalledWith(
        expect.stringMatching(/intake_report_intake-123_/)
      );
      expect(mockRNFS.copyFile).toHaveBeenCalledWith(
        '/photos/vitamin.jpg',
        expect.stringMatching(/photo_1\.jpg$/)
      );
      expect(mockRNFS.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/intake_report\.json$/),
        expect.stringContaining('"substance":"Vitamin D"')
      );
      expect(mockRNFS.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/intake_report\.txt$/),
        expect.stringContaining('Vitamin D')
      );
      expect(result).toMatch(/intake_report_intake-123_/);
    });

    it('should handle report export errors', async () => {
      mockRNFS.exists.mockResolvedValue(false);
      mockRNFS.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(exportService.exportIntakeReport('intake-123', mockPhotos, mockIntakeData))
        .rejects.toThrow('Failed to export intake report');
    });
  });

  describe('cleanupOldExports', () => {
    it('should clean up old export files', async () => {
      const oldTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
      const newTime = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago

      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readDir.mockResolvedValue([
        { name: 'old_file.jpg', path: '/exports/old_file.jpg', isDirectory: () => false, isFile: () => true, size: 1000, mtime: oldTime, ctime: oldTime },
        { name: 'new_file.jpg', path: '/exports/new_file.jpg', isDirectory: () => false, isFile: () => true, size: 2000, mtime: newTime, ctime: newTime },
      ] as any);
      
      mockRNFS.stat
        .mockResolvedValueOnce({ mtime: oldTime } as any)
        .mockResolvedValueOnce({ mtime: newTime } as any);
      
      mockRNFS.unlink.mockResolvedValue(undefined);

      const cleanedCount = await exportService.cleanupOldExports(24);
      
      expect(cleanedCount).toBe(1);
      expect(mockRNFS.unlink).toHaveBeenCalledWith('/exports/old_file.jpg');
      expect(mockRNFS.unlink).not.toHaveBeenCalledWith('/exports/new_file.jpg');
    });

    it('should handle cleanup errors gracefully', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readDir.mockResolvedValue([
        { name: 'file.jpg', path: '/exports/file.jpg', isDirectory: () => false, isFile: () => true, size: 1000, mtime: new Date(), ctime: new Date() },
      ] as any);
      
      mockRNFS.stat.mockRejectedValue(new Error('Permission denied'));

      const cleanedCount = await exportService.cleanupOldExports();
      
      expect(cleanedCount).toBe(0);
    });

    it('should return 0 when export directory does not exist', async () => {
      mockRNFS.exists.mockResolvedValue(false);

      const cleanedCount = await exportService.cleanupOldExports();
      
      expect(cleanedCount).toBe(0);
      expect(mockRNFS.readDir).not.toHaveBeenCalled();
    });
  });

  describe('getExportStats', () => {
    it('should return export statistics', async () => {
      const oldTime = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const newTime = new Date(Date.now() - 12 * 60 * 60 * 1000);

      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readDir.mockResolvedValue([
        { name: 'old_file.jpg', path: '/exports/old_file.jpg', isDirectory: () => false, isFile: () => true, size: 1000, mtime: oldTime, ctime: oldTime },
        { name: 'new_file.jpg', path: '/exports/new_file.jpg', isDirectory: () => false, isFile: () => true, size: 2000, mtime: newTime, ctime: newTime },
      ] as any);
      
      mockRNFS.stat
        .mockResolvedValueOnce({ size: 1000000, mtime: oldTime } as any)
        .mockResolvedValueOnce({ size: 2000000, mtime: newTime } as any);

      const stats = await exportService.getExportStats();
      
      expect(stats.totalFiles).toBe(2);
      expect(stats.totalSize).toBe(3000000);
      expect(stats.oldestFile).toBe('old_file.jpg');
      expect(stats.newestFile).toBe('new_file.jpg');
    });

    it('should return empty stats when directory does not exist', async () => {
      mockRNFS.exists.mockResolvedValue(false);

      const stats = await exportService.getExportStats();
      
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.oldestFile).toBeUndefined();
      expect(stats.newestFile).toBeUndefined();
    });

    it('should handle stat errors gracefully', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readDir.mockResolvedValue([
        { name: 'file.jpg', path: '/exports/file.jpg', isDirectory: () => false, isFile: () => true, size: 1000, mtime: new Date(), ctime: new Date() },
      ] as any);
      
      mockRNFS.stat.mockRejectedValue(new Error('Permission denied'));

      const stats = await exportService.getExportStats();
      
      expect(stats.totalFiles).toBe(1);
      expect(stats.totalSize).toBe(0); // Size couldn't be determined
    });
  });

  describe('createShareableLink', () => {
    it('should return the photo URI as shareable link', async () => {
      const uri = 'file:///photos/test.jpg';
      
      const shareableLink = await exportService.createShareableLink(uri);
      
      expect(shareableLink).toBe(uri);
    });

    it('should accept expiration parameter', async () => {
      const uri = 'file:///photos/test.jpg';
      
      const shareableLink = await exportService.createShareableLink(uri, 48);
      
      expect(shareableLink).toBe(uri);
    });
  });
});