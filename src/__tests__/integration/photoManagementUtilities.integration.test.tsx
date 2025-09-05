/**
 * Photo Management Utilities Integration Tests
 * Tests the complete photo management workflow including compression, metadata, and export
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import {
  photoManager,
  compressImage,
  generateThumbnail,
  batchCompressImages,
  validateImage,
  COMPRESSION_PRESETS,
} from '../../utils/photoManagementUtils';
import { photoExportService } from '../../services/photo/photoExportService';
import { photoMetadataService } from '../../services/photo/photoMetadataService';

// Mock dependencies
jest.mock('react-native', () => ({
  Image: {
    getSize: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('react-native-image-resizer', () => ({
  createResizedImage: jest.fn(),
}));

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

import { Image } from 'react-native';
import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

const mockImage = Image as jest.Mocked<typeof Image>;
const mockImageResizer = ImageResizer as jest.Mocked<typeof ImageResizer>;
const mockRNFS = RNFS as jest.Mocked<typeof RNFS>;
const mockShare = Share as jest.Mocked<typeof Share>;

// Test component that uses photo management utilities
const PhotoManagementTestComponent: React.FC<{
  photoUri: string;
  onProcessed?: (result: any) => void;
  onError?: (error: Error) => void;
}> = ({ photoUri, onProcessed, onError }) => {
  React.useEffect(() => {
    const processPhoto = async () => {
      try {
        const result = await photoManager.processPhoto(photoUri, 'standard');
        onProcessed?.(result);
      } catch (error) {
        onError?.(error as Error);
      }
    };

    processPhoto();
  }, [photoUri, onProcessed, onError]);

  return null;
};

describe('Photo Management Utilities Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockRNFS.exists.mockResolvedValue(true);
    mockRNFS.mkdir.mockResolvedValue(undefined);
    mockRNFS.copyFile.mockResolvedValue(undefined);
    mockRNFS.writeFile.mockResolvedValue(undefined);
    mockShare.open.mockResolvedValue({ success: true, message: 'Shared' });
  });

  describe('Complete Photo Processing Workflow', () => {
    it('should process photo from capture to export', async () => {
      // Mock original photo
      const originalUri = 'file:///camera/captured_photo.jpg';
      
      // Mock image dimensions and file stats
      mockImage.getSize
        .mockImplementationOnce((uri, success) => success(3000, 2000)) // Original
        .mockImplementationOnce((uri, success) => success(1024, 683))  // Compressed
        .mockImplementationOnce((uri, success) => success(150, 100));  // Thumbnail
      
      mockRNFS.stat
        .mockResolvedValueOnce({
          size: 4000000, // 4MB original
          isFile: () => true,
          isDirectory: () => false,
          mtime: new Date('2023-01-01T12:00:00.000Z'),
          ctime: new Date('2023-01-01T11:00:00.000Z'),
          mode: 0,
          originalFilepath: '/camera/captured_photo.jpg',
        })
        .mockResolvedValueOnce({ size: 800000 } as any)  // Compressed
        .mockResolvedValueOnce({ size: 15000 } as any);  // Thumbnail

      mockImageResizer.createResizedImage
        .mockResolvedValueOnce({
          uri: 'file:///processed/compressed_photo.jpg',
          path: '/processed/compressed_photo.jpg',
          name: 'compressed_photo.jpg',
          size: 800000,
          width: 1024,
          height: 683,
        })
        .mockResolvedValueOnce({
          uri: 'file:///processed/thumbnail_photo.jpg',
          path: '/processed/thumbnail_photo.jpg',
          name: 'thumbnail_photo.jpg',
          size: 15000,
          width: 150,
          height: 100,
        });

      // Step 1: Process photo (compress + thumbnail)
      const processedPhoto = await photoManager.processPhoto(originalUri, 'standard');
      
      expect(processedPhoto.uri).toBe('file:///processed/compressed_photo.jpg');
      expect(processedPhoto.thumbnail).toBe('file:///processed/thumbnail_photo.jpg');
      expect(processedPhoto.metadata.compressedSize).toBe(800000);
      expect(processedPhoto.metadata.dimensions).toEqual({ width: 1024, height: 683 });

      // Step 2: Extract comprehensive metadata
      const metadata = await photoMetadataService.extractMetadata(processedPhoto.uri);
      
      expect(metadata.fileSize).toBe(800000);
      expect(metadata.format).toBe('JPG');
      expect(metadata.orientation).toBe('landscape');
      expect(metadata.aspectRatio).toBeCloseTo(1.5, 1);

      // Step 3: Validate processed photo
      const validation = await validateImage(processedPhoto.uri);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Step 4: Export photo
      const exportedUri = await photoExportService.exportPhoto({
        uri: processedPhoto.uri,
        metadata: processedPhoto.metadata,
        intakeId: 'intake-123',
        timestamp: '2023-01-01T12:00:00.000Z',
        notes: 'Test photo export',
      });
      
      expect(exportedUri).toMatch(/photo_intake-123_.*\.jpg/);
      expect(mockRNFS.copyFile).toHaveBeenCalled();

      // Step 5: Share photo
      await photoExportService.sharePhoto(exportedUri, {
        title: 'BioReceipt Photo',
        message: 'Sharing processed photo',
      });
      
      expect(mockShare.open).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'BioReceipt Photo',
          url: exportedUri,
        })
      );
    });

    it('should handle batch photo processing workflow', async () => {
      const photoUris = [
        'file:///photos/photo1.jpg',
        'file:///photos/photo2.jpg',
        'file:///photos/photo3.jpg',
      ];

      // Mock successful processing for all photos
      mockImage.getSize.mockImplementation((uri, success) => {
        success(2000, 1500);
      });
      
      mockRNFS.stat.mockImplementation(() => Promise.resolve({
        size: 2000000,
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
        ctime: new Date(),
        mode: 0,
        originalFilepath: '/photos/photo.jpg',
      }));

      mockImageResizer.createResizedImage.mockImplementation((uri) => 
        Promise.resolve({
          uri: uri.replace('photos', 'processed'),
          path: uri.replace('photos', 'processed').replace('file://', ''),
          name: 'processed.jpg',
          size: 500000,
          width: 1024,
          height: 768,
        })
      );

      // Step 1: Batch compress photos
      const onProgress = jest.fn();
      const compressionResult = await batchCompressImages(
        photoUris,
        COMPRESSION_PRESETS.standard,
        onProgress
      );
      
      expect(compressionResult.success).toHaveLength(3);
      expect(compressionResult.failed).toHaveLength(0);
      expect(compressionResult.totalProcessed).toBe(3);
      expect(onProgress).toHaveBeenCalledTimes(3);

      // Step 2: Batch export photos
      const photoExportData = compressionResult.success.map((uri, index) => ({
        uri,
        metadata: {
          originalSize: 2000000,
          compressedSize: 500000,
          dimensions: { width: 1024, height: 768 },
          format: 'JPEG',
          quality: 0.8,
          timestamp: new Date().toISOString(),
        },
        intakeId: `intake-${index + 1}`,
      }));

      const batchExportResult = await photoExportService.batchExportPhotos(
        photoExportData,
        { includeMetadata: true }
      );
      
      expect(batchExportResult.success).toHaveLength(3);
      expect(batchExportResult.failed).toHaveLength(0);
      expect(mockRNFS.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/batch_metadata\.json$/),
        expect.stringContaining('"totalPhotos":3')
      );

      // Step 3: Share batch export
      const exportedUris = batchExportResult.success.map(item => item.exportedUri);
      await photoExportService.shareMultiplePhotos(exportedUris, {
        title: 'BioReceipt Photo Collection',
      });
      
      expect(mockShare.open).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'BioReceipt Photo Collection',
          urls: exportedUris,
        })
      );
    });
  });

  describe('Photo Quality Optimization Workflow', () => {
    it('should optimize photos based on size and quality requirements', async () => {
      const largePhotoUri = 'file:///photos/large_photo.jpg';
      
      // Mock large, high-resolution photo
      mockImage.getSize
        .mockImplementationOnce((uri, success) => success(4000, 3000)) // Original
        .mockImplementationOnce((uri, success) => success(1024, 768));  // Optimized
      
      mockRNFS.stat
        .mockResolvedValueOnce({
          size: 8000000, // 8MB
          isFile: () => true,
          isDirectory: () => false,
          mtime: new Date(),
          ctime: new Date(),
          mode: 0,
          originalFilepath: '/photos/large_photo.jpg',
        })
        .mockResolvedValueOnce({ size: 400000 } as any); // Optimized

      mockImageResizer.createResizedImage.mockResolvedValue({
        uri: 'file:///optimized/photo.jpg',
        path: '/optimized/photo.jpg',
        name: 'photo.jpg',
        size: 400000,
        width: 1024,
        height: 768,
      });

      // Step 1: Validate original photo
      const originalValidation = await validateImage(largePhotoUri);
      expect(originalValidation.warnings).toContain('Large file size may affect performance');

      // Step 2: Compress with aggressive settings for large photos
      const compressedPhoto = await compressImage(largePhotoUri, {
        quality: 0.7,
        maxWidth: 1024,
        maxHeight: 1024,
        format: 'JPEG',
      });
      
      expect(compressedPhoto.metadata.compressedSize).toBe(400000);
      expect(compressedPhoto.metadata.quality).toBe(0.7);

      // Step 3: Validate optimized photo
      const optimizedValidation = await validateImage(compressedPhoto.uri);
      expect(optimizedValidation.isValid).toBe(true);
      expect(optimizedValidation.warnings).toHaveLength(0);

      // Step 4: Generate thumbnail
      const thumbnail = await generateThumbnail(compressedPhoto.uri);
      expect(thumbnail.metadata.dimensions.width).toBeLessThanOrEqual(150);
      expect(thumbnail.metadata.dimensions.height).toBeLessThanOrEqual(150);
    });
  });

  describe('Photo Metadata Analysis Workflow', () => {
    it('should perform comprehensive metadata analysis and comparison', async () => {
      const photo1Uri = 'file:///photos/photo1.jpg';
      const photo2Uri = 'file:///photos/photo2.jpg';
      
      // Mock similar photos with slight differences
      mockImage.getSize
        .mockImplementationOnce((uri, success) => success(1920, 1080)) // Photo 1
        .mockImplementationOnce((uri, success) => success(1920, 1080)) // Photo 2
        .mockImplementationOnce((uri, success) => success(1920, 1080)) // Photo 1 (comparison)
        .mockImplementationOnce((uri, success) => success(1920, 1080)); // Photo 2 (comparison)
      
      mockRNFS.stat
        .mockResolvedValueOnce({
          size: 1500000,
          isFile: () => true,
          isDirectory: () => false,
          mtime: new Date('2023-01-01T12:00:00.000Z'),
          ctime: new Date('2023-01-01T11:00:00.000Z'),
          mode: 0,
          originalFilepath: '/photos/photo1.jpg',
        })
        .mockResolvedValueOnce({
          size: 1600000, // Slightly different size
          isFile: () => true,
          isDirectory: () => false,
          mtime: new Date('2023-01-01T13:00:00.000Z'),
          ctime: new Date('2023-01-01T12:00:00.000Z'),
          mode: 0,
          originalFilepath: '/photos/photo2.jpg',
        })
        .mockResolvedValueOnce({ size: 1500000 } as any) // For comparison
        .mockResolvedValueOnce({ size: 1600000 } as any); // For comparison

      // Step 1: Extract metadata for both photos
      const metadata1 = await photoMetadataService.extractMetadata(photo1Uri);
      const metadata2 = await photoMetadataService.extractMetadata(photo2Uri);
      
      expect(metadata1.fileSize).toBe(1500000);
      expect(metadata2.fileSize).toBe(1600000);
      expect(metadata1.dimensions).toEqual(metadata2.dimensions);

      // Step 2: Compare photos for similarity
      const comparison = await photoMetadataService.comparePhotos(photo1Uri, photo2Uri);
      
      expect(comparison.similarity).toBeGreaterThan(0.8);
      expect(comparison.recommendation).toBe('similar');
      expect(comparison.differences).toContain('Different file sizes');

      // Step 3: Format metadata for display
      const formattedMetadata1 = photoMetadataService.formatMetadataForDisplay(metadata1);
      const formattedMetadata2 = photoMetadataService.formatMetadataForDisplay(metadata2);
      
      expect(formattedMetadata1['File Size']).toBe('1.4 MB');
      expect(formattedMetadata2['File Size']).toBe('1.5 MB');
      expect(formattedMetadata1['Dimensions']).toBe('1920 × 1080');

      // Step 4: Validate metadata
      const validation1 = photoMetadataService.validateMetadata(metadata1);
      const validation2 = photoMetadataService.validateMetadata(metadata2);
      
      expect(validation1.isValid).toBe(true);
      expect(validation2.isValid).toBe(true);
    });

    it('should detect duplicate photos in a collection', async () => {
      const photoUris = [
        'file:///photos/original.jpg',
        'file:///photos/duplicate1.jpg',
        'file:///photos/different.jpg',
        'file:///photos/duplicate2.jpg',
      ];

      // Mock photos where original, duplicate1, and duplicate2 are similar
      // but different.jpg is unique
      mockImage.getSize.mockImplementation((uri, success) => {
        if (uri.includes('different')) {
          success(1280, 720); // Different dimensions
        } else {
          success(1920, 1080); // Same dimensions for duplicates
        }
      });
      
      mockRNFS.stat.mockImplementation((path) => {
        if (path.includes('different')) {
          return Promise.resolve({ size: 800000 } as any);
        } else {
          return Promise.resolve({ size: 1500000 } as any); // Same size for duplicates
        }
      });

      const duplicates = await photoMetadataService.detectDuplicates(photoUris);
      
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].group).toHaveLength(3);
      expect(duplicates[0].group).toContain('file:///photos/original.jpg');
      expect(duplicates[0].group).toContain('file:///photos/duplicate1.jpg');
      expect(duplicates[0].group).toContain('file:///photos/duplicate2.jpg');
      expect(duplicates[0].similarity).toBeGreaterThan(0.8);
    });
  });

  describe('Photo Export and Sharing Workflow', () => {
    it('should create comprehensive intake reports with photos', async () => {
      const intakeId = 'intake-456';
      const photos = [
        {
          uri: 'file:///photos/vitamin_bottle.jpg',
          metadata: {
            originalSize: 1200000,
            compressedSize: 1200000,
            dimensions: { width: 1600, height: 1200 },
            format: 'JPEG',
            quality: 0.8,
            timestamp: '2023-01-01T12:00:00.000Z',
          },
        },
        {
          uri: 'file:///photos/vitamin_label.jpg',
          metadata: {
            originalSize: 800000,
            compressedSize: 800000,
            dimensions: { width: 1200, height: 900 },
            format: 'JPEG',
            quality: 0.8,
            timestamp: '2023-01-01T12:01:00.000Z',
          },
        },
      ];

      const intakeData = {
        substance: 'Vitamin D3',
        quantity: '2000',
        unit: 'IU',
        timestamp: '2023-01-01T12:00:00.000Z',
        notes: 'Morning supplement with breakfast',
      };

      // Step 1: Export intake report with photos
      const reportPath = await photoExportService.exportIntakeReport(
        intakeId,
        photos,
        intakeData
      );
      
      expect(reportPath).toMatch(/intake_report_intake-456_/);
      expect(mockRNFS.mkdir).toHaveBeenCalledWith(
        expect.stringMatching(/intake_report_intake-456_/)
      );
      
      // Verify photos were copied
      expect(mockRNFS.copyFile).toHaveBeenCalledTimes(2);
      expect(mockRNFS.copyFile).toHaveBeenCalledWith(
        '/photos/vitamin_bottle.jpg',
        expect.stringMatching(/photo_1\.jpg$/)
      );
      expect(mockRNFS.copyFile).toHaveBeenCalledWith(
        '/photos/vitamin_label.jpg',
        expect.stringMatching(/photo_2\.jpg$/)
      );

      // Verify JSON report was created
      expect(mockRNFS.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/intake_report\.json$/),
        expect.stringContaining('"substance":"Vitamin D3"')
      );

      // Verify human-readable report was created
      expect(mockRNFS.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/intake_report\.txt$/),
        expect.stringContaining('Vitamin D3')
      );

      // Step 2: Share the report
      await photoExportService.sharePhoto(reportPath, {
        title: 'BioReceipt Intake Report',
        message: 'Complete intake documentation with photos',
      });
      
      expect(mockShare.open).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'BioReceipt Intake Report',
          url: reportPath,
        })
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle photo processing errors gracefully', async () => {
      const invalidUri = 'file:///invalid/photo.jpg';
      
      mockImage.getSize.mockImplementation((uri, success, error) => {
        error(new Error('Invalid image format'));
      });

      const onError = jest.fn();
      
      render(
        <PhotoManagementTestComponent
          photoUri={invalidUri}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Invalid image'),
          })
        );
      });
    });

    it('should handle export failures and provide fallbacks', async () => {
      const photoData = {
        uri: 'file:///photos/test.jpg',
        metadata: {
          originalSize: 1000000,
          compressedSize: 1000000,
          dimensions: { width: 1920, height: 1080 },
          format: 'JPEG',
          quality: 0.8,
          timestamp: '2023-01-01T12:00:00.000Z',
        },
        intakeId: 'intake-789',
      };

      // Mock export failure
      mockRNFS.copyFile.mockRejectedValue(new Error('Disk full'));

      await expect(photoExportService.exportPhoto(photoData))
        .rejects.toThrow('Failed to export photo');

      // Verify error was handled appropriately
      expect(mockRNFS.copyFile).toHaveBeenCalled();
    });

    it('should handle batch processing with partial failures', async () => {
      const photoUris = [
        'file:///photos/good1.jpg',
        'file:///photos/invalid.jpg',
        'file:///photos/good2.jpg',
      ];

      // Mock partial success
      mockImage.getSize
        .mockImplementationOnce((uri, success) => success(1920, 1080)) // good1
        .mockImplementationOnce((uri, success, error) => error(new Error('Invalid'))) // invalid
        .mockImplementationOnce((uri, success) => success(1920, 1080)); // good2
      
      mockRNFS.stat.mockResolvedValue({ size: 1000000 } as any);
      mockImageResizer.createResizedImage.mockResolvedValue({
        uri: 'file:///processed/photo.jpg',
        path: '/processed/photo.jpg',
        name: 'photo.jpg',
        size: 500000,
        width: 1024,
        height: 768,
      });

      const result = await batchCompressImages(photoUris);
      
      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].uri).toBe('file:///photos/invalid.jpg');
      expect(result.totalProcessed).toBe(2);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large batch operations efficiently', async () => {
      const largePhotoSet = Array.from({ length: 50 }, (_, i) => 
        `file:///photos/photo_${i}.jpg`
      );

      // Mock successful processing for all photos
      mockImage.getSize.mockImplementation((uri, success) => {
        success(1920, 1080);
      });
      
      mockRNFS.stat.mockImplementation(() => Promise.resolve({
        size: 1000000,
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
        ctime: new Date(),
        mode: 0,
        originalFilepath: '/photos/photo.jpg',
      }));

      mockImageResizer.createResizedImage.mockImplementation(() => 
        Promise.resolve({
          uri: 'file:///processed/photo.jpg',
          path: '/processed/photo.jpg',
          name: 'photo.jpg',
          size: 400000,
          width: 1024,
          height: 768,
        })
      );

      const startTime = Date.now();
      const onProgress = jest.fn();
      
      const result = await batchCompressImages(
        largePhotoSet,
        COMPRESSION_PRESETS.standard,
        onProgress
      );
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result.success).toHaveLength(50);
      expect(result.failed).toHaveLength(0);
      expect(onProgress).toHaveBeenCalledTimes(50);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});