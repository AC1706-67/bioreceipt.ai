/**
 * Photo Metadata Service Tests
 * Tests for comprehensive metadata extraction and analysis
 */

import {
  PhotoMetadataService,
  photoMetadataService,
  ExtendedPhotoMetadata,
  MetadataExtractionOptions,
} from '../photoMetadataService';

// Mock dependencies
jest.mock('react-native', () => ({
  Image: {
    getSize: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('react-native-fs', () => ({
  stat: jest.fn(),
}));

import { Image } from 'react-native';
import RNFS from 'react-native-fs';

const mockImage = Image as jest.Mocked<typeof Image>;
const mockRNFS = RNFS as jest.Mocked<typeof RNFS>;

describe('PhotoMetadataService', () => {
  let metadataService: PhotoMetadataService;

  beforeEach(() => {
    jest.clearAllMocks();
    metadataService = PhotoMetadataService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PhotoMetadataService.getInstance();
      const instance2 = PhotoMetadataService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(photoMetadataService);
    });
  });

  describe('extractMetadata', () => {
    const mockStatResult = {
      size: 2048000,
      isFile: () => true,
      isDirectory: () => false,
      mtime: new Date('2023-01-01T12:00:00.000Z'),
      ctime: new Date('2023-01-01T11:00:00.000Z'),
      mode: 0,
      originalFilepath: '/path/to/image.jpg',
    };

    beforeEach(() => {
      mockRNFS.stat.mockResolvedValue(mockStatResult);
      mockImage.getSize.mockImplementation((uri, success) => {
        success(1920, 1080);
      });
    });

    it('should extract basic metadata successfully', async () => {
      const metadata = await metadataService.extractMetadata('file:///path/to/image.jpg');
      
      expect(metadata).toMatchObject({
        fileSize: 2048000,
        dimensions: { width: 1920, height: 1080 },
        fileName: 'image.jpg',
        format: 'JPEG',
        mimeType: 'image/jpeg',
        aspectRatio: expect.closeTo(1.78, 2),
        orientation: 'landscape',
        estimatedQuality: expect.any(Number),
        compressionLevel: expect.any(String),
      });
      
      expect(metadata.createdAt).toBe('2023-01-01T11:00:00.000Z');
      expect(metadata.modifiedAt).toBe('2023-01-01T12:00:00.000Z');
    });

    it('should extract metadata with EXIF data when requested', async () => {
      const options: MetadataExtractionOptions = { includeExif: true };
      
      const metadata = await metadataService.extractMetadata('file:///path/to/image.jpg', options);
      
      expect(metadata.exif).toBeDefined();
      expect(metadata.exif?.camera).toBeDefined();
      expect(metadata.exif?.settings).toBeDefined();
    });

    it('should extract metadata with analysis when requested', async () => {
      const options: MetadataExtractionOptions = { includeAnalysis: true };
      
      const metadata = await metadataService.extractMetadata('file:///path/to/image.jpg', options);
      
      expect(metadata.analysis).toBeDefined();
      expect(metadata.analysis?.brightness).toBeDefined();
      expect(metadata.analysis?.contrast).toBeDefined();
      expect(metadata.analysis?.dominantColors).toBeDefined();
    });

    it('should handle different image formats', async () => {
      const formats = [
        { uri: 'file:///image.png', expected: { format: 'PNG', mimeType: 'image/png' } },
        { uri: 'file:///image.webp', expected: { format: 'WEBP', mimeType: 'image/webp' } },
        { uri: 'file:///image.gif', expected: { format: 'GIF', mimeType: 'image/gif' } },
        { uri: 'file:///image.bmp', expected: { format: 'BMP', mimeType: 'image/bmp' } },
      ];

      for (const { uri, expected } of formats) {
        const metadata = await metadataService.extractMetadata(uri);
        expect(metadata.format).toBe(expected.format);
        expect(metadata.mimeType).toBe(expected.mimeType);
      }
    });

    it('should determine orientation correctly', async () => {
      // Portrait
      mockImage.getSize.mockImplementationOnce((uri, success) => success(1080, 1920));
      let metadata = await metadataService.extractMetadata('file:///portrait.jpg');
      expect(metadata.orientation).toBe('portrait');

      // Landscape
      mockImage.getSize.mockImplementationOnce((uri, success) => success(1920, 1080));
      metadata = await metadataService.extractMetadata('file:///landscape.jpg');
      expect(metadata.orientation).toBe('landscape');

      // Square
      mockImage.getSize.mockImplementationOnce((uri, success) => success(1080, 1080));
      metadata = await metadataService.extractMetadata('file:///square.jpg');
      expect(metadata.orientation).toBe('square');
    });

    it('should estimate quality based on file size and dimensions', async () => {
      // High quality (large file size per pixel)
      mockRNFS.stat.mockResolvedValueOnce({ ...mockStatResult, size: 5000000 });
      mockImage.getSize.mockImplementationOnce((uri, success) => success(1920, 1080));
      
      let metadata = await metadataService.extractMetadata('file:///high-quality.jpg');
      expect(metadata.estimatedQuality).toBeGreaterThan(0.8);
      expect(metadata.compressionLevel).toBe('lossless');

      // Low quality (small file size per pixel)
      mockRNFS.stat.mockResolvedValueOnce({ ...mockStatResult, size: 500000 });
      mockImage.getSize.mockImplementationOnce((uri, success) => success(1920, 1080));
      
      metadata = await metadataService.extractMetadata('file:///low-quality.jpg');
      expect(metadata.estimatedQuality).toBeLessThan(0.8);
      expect(metadata.compressionLevel).toBe('high');
    });

    it('should handle metadata extraction errors', async () => {
      mockRNFS.stat.mockRejectedValue(new Error('File not found'));

      await expect(metadataService.extractMetadata('file:///nonexistent.jpg'))
        .rejects.toThrow('Failed to extract metadata');
    });

    it('should handle image dimension errors', async () => {
      mockImage.getSize.mockImplementation((uri, success, error) => {
        error(new Error('Invalid image'));
      });

      await expect(metadataService.extractMetadata('file:///invalid.jpg'))
        .rejects.toThrow('Failed to extract metadata');
    });
  });

  describe('comparePhotos', () => {
    beforeEach(() => {
      mockRNFS.stat.mockResolvedValue({
        size: 1024000,
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
        ctime: new Date(),
        mode: 0,
        originalFilepath: '/path/to/file',
      });
    });

    it('should identify identical photos', async () => {
      // Same dimensions, size, format, quality
      mockImage.getSize.mockImplementation((uri, success) => {
        success(1920, 1080);
      });

      const comparison = await metadataService.comparePhotos(
        'file:///photo1.jpg',
        'file:///photo2.jpg'
      );
      
      expect(comparison.similarity).toBeGreaterThan(0.95);
      expect(comparison.recommendation).toBe('identical');
      expect(comparison.differences).toHaveLength(0);
    });

    it('should detect different dimensions', async () => {
      mockImage.getSize
        .mockImplementationOnce((uri, success) => success(1920, 1080))
        .mockImplementationOnce((uri, success) => success(1280, 720));

      const comparison = await metadataService.comparePhotos(
        'file:///photo1.jpg',
        'file:///photo2.jpg'
      );
      
      expect(comparison.similarity).toBeLessThan(0.95);
      expect(comparison.differences).toContain('Different dimensions');
    });

    it('should detect different file sizes', async () => {
      mockImage.getSize.mockImplementation((uri, success) => success(1920, 1080));
      
      mockRNFS.stat
        .mockResolvedValueOnce({ size: 1000000 } as any)
        .mockResolvedValueOnce({ size: 2000000 } as any);

      const comparison = await metadataService.comparePhotos(
        'file:///photo1.jpg',
        'file:///photo2.jpg'
      );
      
      expect(comparison.differences).toContain('Different file sizes');
    });

    it('should detect different formats', async () => {
      mockImage.getSize.mockImplementation((uri, success) => success(1920, 1080));

      const comparison = await metadataService.comparePhotos(
        'file:///photo1.jpg',
        'file:///photo2.png'
      );
      
      expect(comparison.differences).toContain('Different formats');
    });

    it('should handle comparison errors', async () => {
      mockImage.getSize.mockImplementation((uri, success, error) => {
        error(new Error('Invalid image'));
      });

      await expect(metadataService.comparePhotos('file:///photo1.jpg', 'file:///photo2.jpg'))
        .rejects.toThrow('Failed to compare photos');
    });
  });

  describe('detectDuplicates', () => {
    beforeEach(() => {
      mockRNFS.stat.mockResolvedValue({
        size: 1024000,
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
        ctime: new Date(),
        mode: 0,
        originalFilepath: '/path/to/file',
      });
    });

    it('should detect duplicate groups', async () => {
      const uris = [
        'file:///photo1.jpg',
        'file:///photo2.jpg',
        'file:///photo3.jpg',
        'file:///photo4.jpg',
      ];

      // Mock identical photos (1,2) and (3,4)
      mockImage.getSize.mockImplementation((uri, success) => {
        if (uri.includes('photo1') || uri.includes('photo2')) {
          success(1920, 1080);
        } else {
          success(1280, 720);
        }
      });

      const duplicates = await metadataService.detectDuplicates(uris);
      
      expect(duplicates).toHaveLength(2);
      expect(duplicates[0].group).toContain('file:///photo1.jpg');
      expect(duplicates[0].group).toContain('file:///photo2.jpg');
      expect(duplicates[1].group).toContain('file:///photo3.jpg');
      expect(duplicates[1].group).toContain('file:///photo4.jpg');
    });

    it('should handle no duplicates', async () => {
      const uris = [
        'file:///photo1.jpg',
        'file:///photo2.jpg',
      ];

      // Mock different photos
      mockImage.getSize
        .mockImplementationOnce((uri, success) => success(1920, 1080))
        .mockImplementationOnce((uri, success) => success(1280, 720));

      mockRNFS.stat
        .mockResolvedValueOnce({ size: 1000000 } as any)
        .mockResolvedValueOnce({ size: 2000000 } as any);

      const duplicates = await metadataService.detectDuplicates(uris);
      
      expect(duplicates).toHaveLength(0);
    });

    it('should handle comparison errors gracefully', async () => {
      const uris = [
        'file:///photo1.jpg',
        'file:///invalid.jpg',
      ];

      mockImage.getSize
        .mockImplementationOnce((uri, success) => success(1920, 1080))
        .mockImplementationOnce((uri, success, error) => error(new Error('Invalid')));

      // Should not throw, just skip the invalid comparison
      const duplicates = await metadataService.detectDuplicates(uris);
      
      expect(duplicates).toHaveLength(0);
    });
  });

  describe('formatMetadataForDisplay', () => {
    it('should format metadata for display', () => {
      const metadata: ExtendedPhotoMetadata = {
        fileSize: 2048000,
        dimensions: { width: 1920, height: 1080 },
        format: 'JPEG',
        mimeType: 'image/jpeg',
        fileName: 'test-image.jpg',
        filePath: '/path/to/test-image.jpg',
        createdAt: '2023-01-01T11:00:00.000Z',
        modifiedAt: '2023-01-01T12:00:00.000Z',
        aspectRatio: 1.7777777777777777,
        orientation: 'landscape',
        estimatedQuality: 0.85,
        compressionLevel: 'medium',
      };

      const formatted = metadataService.formatMetadataForDisplay(metadata);
      
      expect(formatted['File Name']).toBe('test-image.jpg');
      expect(formatted['File Size']).toBe('2.0 MB');
      expect(formatted['Dimensions']).toBe('1920 × 1080');
      expect(formatted['Aspect Ratio']).toBe('1.78:1');
      expect(formatted['Orientation']).toBe('landscape');
      expect(formatted['Format']).toBe('JPEG');
      expect(formatted['MIME Type']).toBe('image/jpeg');
      expect(formatted['Estimated Quality']).toBe('85%');
      expect(formatted['Compression']).toBe('medium');
      expect(formatted['Created']).toContain('2023');
      expect(formatted['Modified']).toContain('2023');
    });

    it('should format file sizes correctly', () => {
      const testCases = [
        { size: 512, expected: '512.0 B' },
        { size: 1536, expected: '1.5 KB' },
        { size: 2048000, expected: '2.0 MB' },
        { size: 1073741824, expected: '1.0 GB' },
      ];

      testCases.forEach(({ size, expected }) => {
        const metadata: ExtendedPhotoMetadata = {
          fileSize: size,
          dimensions: { width: 100, height: 100 },
          format: 'JPEG',
          mimeType: 'image/jpeg',
          fileName: 'test.jpg',
          filePath: '/test.jpg',
          createdAt: '2023-01-01T00:00:00.000Z',
          modifiedAt: '2023-01-01T00:00:00.000Z',
          aspectRatio: 1,
          orientation: 'square',
          estimatedQuality: 0.8,
          compressionLevel: 'medium',
        };

        const formatted = metadataService.formatMetadataForDisplay(metadata);
        expect(formatted['File Size']).toBe(expected);
      });
    });
  });

  describe('validateMetadata', () => {
    const createMetadata = (overrides: Partial<ExtendedPhotoMetadata> = {}): ExtendedPhotoMetadata => ({
      fileSize: 2048000,
      dimensions: { width: 1920, height: 1080 },
      format: 'JPEG',
      mimeType: 'image/jpeg',
      fileName: 'test.jpg',
      filePath: '/test.jpg',
      createdAt: '2023-01-01T00:00:00.000Z',
      modifiedAt: '2023-01-01T00:00:00.000Z',
      aspectRatio: 1.78,
      orientation: 'landscape',
      estimatedQuality: 0.8,
      compressionLevel: 'medium',
      ...overrides,
    });

    it('should validate good metadata', () => {
      const metadata = createMetadata();
      
      const validation = metadataService.validateMetadata(metadata);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should detect oversized files', () => {
      const metadata = createMetadata({ fileSize: 15 * 1024 * 1024 }); // 15MB
      
      const validation = metadataService.validateMetadata(metadata);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('File size exceeds 10MB limit');
    });

    it('should warn about large files', () => {
      const metadata = createMetadata({ fileSize: 7 * 1024 * 1024 }); // 7MB
      
      const validation = metadataService.validateMetadata(metadata);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Large file size may affect performance');
    });

    it('should warn about high resolution', () => {
      const metadata = createMetadata({ dimensions: { width: 5000, height: 4000 } });
      
      const validation = metadataService.validateMetadata(metadata);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Very high resolution may not be necessary');
    });

    it('should warn about low resolution', () => {
      const metadata = createMetadata({ dimensions: { width: 50, height: 30 } });
      
      const validation = metadataService.validateMetadata(metadata);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Low resolution may affect image quality');
    });

    it('should warn about low quality', () => {
      const metadata = createMetadata({ estimatedQuality: 0.3 });
      
      const validation = metadataService.validateMetadata(metadata);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Low image quality detected');
    });

    it('should detect unsupported formats', () => {
      const metadata = createMetadata({ format: 'TIFF' });
      
      const validation = metadataService.validateMetadata(metadata);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Unsupported format: TIFF');
    });

    it('should handle multiple issues', () => {
      const metadata = createMetadata({
        fileSize: 15 * 1024 * 1024, // Too large
        dimensions: { width: 50, height: 30 }, // Too small
        estimatedQuality: 0.3, // Low quality
        format: 'TIFF', // Unsupported
      });
      
      const validation = metadataService.validateMetadata(metadata);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });
});