/**
 * Photo Management Utilities Tests
 * Comprehensive tests for photo processing, compression, and metadata utilities
 */

import {
  getImageDimensions,
  getFileSize,
  extractPhotoMetadata,
  compressImage,
  generateThumbnail,
  batchCompressImages,
  batchGenerateThumbnails,
  calculateOptimalCompression,
  validateImage,
  cleanupTempImages,
  formatFileSize,
  calculateCompressionRatio,
  getOptimalThumbnailSize,
  PhotoManager,
  photoManager,
  COMPRESSION_PRESETS,
} from '../photoManagementUtils';

// Mock dependencies
jest.mock('react-native', () => ({
  Image: {
    getSize: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('react-native-image-resizer', () => ({
  createResizedImage: jest.fn(),
}));

jest.mock('react-native-fs', () => ({
  stat: jest.fn(),
  exists: jest.fn(),
  unlink: jest.fn(),
}));

import { Image } from 'react-native';
import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';

const mockImage = Image as jest.Mocked<typeof Image>;
const mockImageResizer = ImageResizer as jest.Mocked<typeof ImageResizer>;
const mockRNFS = RNFS as jest.Mocked<typeof RNFS>;

describe('Photo Management Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getImageDimensions', () => {
    it('should return image dimensions successfully', async () => {
      mockImage.getSize.mockImplementation((uri, success) => {
        success(1024, 768);
      });

      const dimensions = await getImageDimensions('test://image.jpg');
      
      expect(dimensions).toEqual({ width: 1024, height: 768 });
      expect(mockImage.getSize).toHaveBeenCalledWith(
        'test://image.jpg',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should handle image dimension errors', async () => {
      mockImage.getSize.mockImplementation((uri, success, error) => {
        error(new Error('Failed to load image'));
      });

      await expect(getImageDimensions('invalid://image.jpg'))
        .rejects.toThrow('Failed to get image dimensions');
    });
  });

  describe('getFileSize', () => {
    it('should return file size successfully', async () => {
      mockRNFS.stat.mockResolvedValue({
        size: 1024000,
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
        ctime: new Date(),
        mode: 0,
        originalFilepath: '/path/to/file',
      });

      const size = await getFileSize('file:///path/to/image.jpg');
      
      expect(size).toBe(1024000);
      expect(mockRNFS.stat).toHaveBeenCalledWith('/path/to/image.jpg');
    });

    it('should handle file stat errors', async () => {
      mockRNFS.stat.mockRejectedValue(new Error('File not found'));

      const size = await getFileSize('file:///nonexistent.jpg');
      
      expect(size).toBe(0);
    });
  });

  describe('extractPhotoMetadata', () => {
    it('should extract complete photo metadata', async () => {
      mockImage.getSize.mockImplementation((uri, success) => {
        success(1920, 1080);
      });
      
      mockRNFS.stat.mockResolvedValue({
        size: 2048000,
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
        ctime: new Date(),
        mode: 0,
        originalFilepath: '/path/to/file',
      });

      const metadata = await extractPhotoMetadata('file:///path/to/image.jpg');
      
      expect(metadata).toMatchObject({
        originalSize: 2048000,
        compressedSize: 2048000,
        dimensions: { width: 1920, height: 1080 },
        format: 'JPG',
        quality: 1.0,
      });
      expect(metadata.timestamp).toBeDefined();
    });

    it('should handle metadata extraction errors', async () => {
      mockImage.getSize.mockImplementation((uri, success, error) => {
        error(new Error('Invalid image'));
      });

      await expect(extractPhotoMetadata('invalid://image.jpg'))
        .rejects.toThrow('Failed to extract photo metadata');
    });
  });

  describe('compressImage', () => {
    it('should compress image with default options', async () => {
      // Mock original metadata
      mockImage.getSize
        .mockImplementationOnce((uri, success) => success(2048, 1536)) // Original
        .mockImplementationOnce((uri, success) => success(1024, 768)); // Compressed
      
      mockRNFS.stat
        .mockResolvedValueOnce({
          size: 3000000,
          isFile: () => true,
          isDirectory: () => false,
          mtime: new Date(),
          ctime: new Date(),
          mode: 0,
          originalFilepath: '/path/to/file',
        })
        .mockResolvedValueOnce({
          size: 800000,
          isFile: () => true,
          isDirectory: () => false,
          mtime: new Date(),
          ctime: new Date(),
          mode: 0,
          originalFilepath: '/path/to/compressed',
        });

      mockImageResizer.createResizedImage.mockResolvedValue({
        uri: 'file:///compressed/image.jpg',
        path: '/compressed/image.jpg',
        name: 'image.jpg',
        size: 800000,
        width: 1024,
        height: 768,
      });

      const result = await compressImage('file:///original/image.jpg');
      
      expect(result.uri).toBe('file:///compressed/image.jpg');
      expect(result.metadata.compressedSize).toBe(800000);
      expect(result.metadata.dimensions).toEqual({ width: 1024, height: 768 });
      expect(mockImageResizer.createResizedImage).toHaveBeenCalledWith(
        'file:///original/image.jpg',
        1024,
        768,
        'JPEG',
        80,
        0,
        undefined,
        false,
        { mode: 'contain', onlyScaleDown: true }
      );
    });

    it('should compress image with custom options', async () => {
      mockImage.getSize
        .mockImplementationOnce((uri, success) => success(1600, 1200))
        .mockImplementationOnce((uri, success) => success(800, 600));
      
      mockRNFS.stat
        .mockResolvedValueOnce({ size: 2000000 } as any)
        .mockResolvedValueOnce({ size: 400000 } as any);

      mockImageResizer.createResizedImage.mockResolvedValue({
        uri: 'file:///compressed/image.png',
        path: '/compressed/image.png',
        name: 'image.png',
        size: 400000,
        width: 800,
        height: 600,
      });

      const options = {
        quality: 0.9,
        maxWidth: 800,
        maxHeight: 600,
        format: 'PNG' as const,
      };

      const result = await compressImage('file:///original/image.jpg', options);
      
      expect(result.metadata.quality).toBe(0.9);
      expect(result.metadata.format).toBe('PNG');
      expect(mockImageResizer.createResizedImage).toHaveBeenCalledWith(
        'file:///original/image.jpg',
        800,
        600,
        'PNG',
        90,
        0,
        undefined,
        false,
        { mode: 'contain', onlyScaleDown: true }
      );
    });

    it('should handle compression errors', async () => {
      mockImage.getSize.mockImplementation((uri, success, error) => {
        error(new Error('Invalid image'));
      });

      await expect(compressImage('invalid://image.jpg'))
        .rejects.toThrow('Failed to compress image');
    });
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail with default options', async () => {
      mockImage.getSize
        .mockImplementationOnce((uri, success) => success(1024, 768))
        .mockImplementationOnce((uri, success) => success(150, 113));
      
      mockRNFS.stat
        .mockResolvedValueOnce({ size: 1000000 } as any)
        .mockResolvedValueOnce({ size: 15000 } as any);

      mockImageResizer.createResizedImage.mockResolvedValue({
        uri: 'file:///thumbnail/image.jpg',
        path: '/thumbnail/image.jpg',
        name: 'image.jpg',
        size: 15000,
        width: 150,
        height: 113,
      });

      const result = await generateThumbnail('file:///original/image.jpg');
      
      expect(result.uri).toBe('file:///thumbnail/image.jpg');
      expect(result.metadata.dimensions.width).toBe(150);
      expect(result.metadata.dimensions.height).toBe(113);
    });

    it('should generate thumbnail with custom options', async () => {
      mockImage.getSize
        .mockImplementationOnce((uri, success) => success(2000, 1500))
        .mockImplementationOnce((uri, success) => success(200, 150));
      
      mockRNFS.stat
        .mockResolvedValueOnce({ size: 3000000 } as any)
        .mockResolvedValueOnce({ size: 25000 } as any);

      mockImageResizer.createResizedImage.mockResolvedValue({
        uri: 'file:///thumbnail/image.jpg',
        path: '/thumbnail/image.jpg',
        name: 'image.jpg',
        size: 25000,
        width: 200,
        height: 150,
      });

      const options = { width: 200, height: 150, quality: 0.7 };
      const result = await generateThumbnail('file:///original/image.jpg', options);
      
      expect(result.metadata.quality).toBe(0.7);
    });
  });

  describe('batchCompressImages', () => {
    it('should compress multiple images successfully', async () => {
      const uris = [
        'file:///image1.jpg',
        'file:///image2.jpg',
        'file:///image3.jpg',
      ];

      // Mock successful compression for all images
      mockImage.getSize
        .mockImplementation((uri, success) => success(1024, 768));
      
      mockRNFS.stat
        .mockImplementation(() => Promise.resolve({ size: 500000 } as any));

      mockImageResizer.createResizedImage
        .mockImplementation((uri) => Promise.resolve({
          uri: uri.replace('image', 'compressed'),
          path: uri.replace('image', 'compressed').replace('file://', ''),
          name: 'compressed.jpg',
          size: 200000,
          width: 800,
          height: 600,
        }));

      const onProgress = jest.fn();
      const result = await batchCompressImages(uris, COMPRESSION_PRESETS.standard, onProgress);
      
      expect(result.success).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.totalProcessed).toBe(3);
      expect(result.compressionRatio).toBeLessThan(1);
      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenLastCalledWith(3, 3);
    });

    it('should handle partial failures in batch compression', async () => {
      const uris = [
        'file:///image1.jpg',
        'file:///invalid.jpg',
        'file:///image3.jpg',
      ];

      mockImage.getSize
        .mockImplementationOnce((uri, success) => success(1024, 768))
        .mockImplementationOnce((uri, success, error) => error(new Error('Invalid')))
        .mockImplementationOnce((uri, success) => success(1024, 768));
      
      mockRNFS.stat
        .mockImplementation(() => Promise.resolve({ size: 500000 } as any));

      mockImageResizer.createResizedImage
        .mockImplementation((uri) => Promise.resolve({
          uri: uri.replace('image', 'compressed'),
          path: uri.replace('image', 'compressed').replace('file://', ''),
          name: 'compressed.jpg',
          size: 200000,
          width: 800,
          height: 600,
        }));

      const result = await batchCompressImages(uris);
      
      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].uri).toBe('file:///invalid.jpg');
      expect(result.totalProcessed).toBe(2);
    });
  });

  describe('calculateOptimalCompression', () => {
    it('should calculate optimal compression for large images', () => {
      const dimensions = { width: 4000, height: 3000 };
      const fileSize = 8 * 1024 * 1024; // 8MB

      const options = calculateOptimalCompression(dimensions, fileSize);
      
      expect(options.quality).toBe(0.7);
      expect(options.maxWidth).toBe(1024);
      expect(options.maxHeight).toBe(1024);
    });

    it('should calculate optimal compression for medium images', () => {
      const dimensions = { width: 2000, height: 1500 };
      const fileSize = 3 * 1024 * 1024; // 3MB

      const options = calculateOptimalCompression(dimensions, fileSize);
      
      expect(options.quality).toBe(0.75);
      expect(options.maxWidth).toBe(1280);
      expect(options.maxHeight).toBe(1280);
    });

    it('should calculate optimal compression with target size', () => {
      const dimensions = { width: 2000, height: 1500 };
      const fileSize = 4 * 1024 * 1024; // 4MB
      const targetSizeKB = 500; // 500KB

      const options = calculateOptimalCompression(dimensions, fileSize, targetSizeKB);
      
      expect(options.quality).toBeLessThan(0.8);
      expect(options.maxWidth).toBeLessThanOrEqual(800);
    });
  });

  describe('validateImage', () => {
    it('should validate a good image', async () => {
      mockImage.getSize.mockImplementation((uri, success) => {
        success(1024, 768);
      });
      
      mockRNFS.stat.mockResolvedValue({
        size: 2 * 1024 * 1024, // 2MB
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
        ctime: new Date(),
        mode: 0,
        originalFilepath: '/path/to/file',
      });

      const result = await validateImage('file:///good/image.jpg');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata).toBeDefined();
    });

    it('should detect oversized images', async () => {
      mockImage.getSize.mockImplementation((uri, success) => {
        success(1024, 768);
      });
      
      mockRNFS.stat.mockResolvedValue({
        size: 15 * 1024 * 1024, // 15MB
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
        ctime: new Date(),
        mode: 0,
        originalFilepath: '/path/to/file',
      });

      const result = await validateImage('file:///large/image.jpg');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Image size exceeds 10MB limit');
    });

    it('should detect oversized dimensions', async () => {
      mockImage.getSize.mockImplementation((uri, success) => {
        success(5000, 4000);
      });
      
      mockRNFS.stat.mockResolvedValue({
        size: 2 * 1024 * 1024,
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
        ctime: new Date(),
        mode: 0,
        originalFilepath: '/path/to/file',
      });

      const result = await validateImage('file:///huge/image.jpg');
      
      expect(result.isValid).toBe(true); // Still valid, just a warning
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toContain('Image dimensions exceed 4000x4000 limit');
    });

    it('should detect undersized images', async () => {
      mockImage.getSize.mockImplementation((uri, success) => {
        success(30, 40);
      });
      
      mockRNFS.stat.mockResolvedValue({
        size: 5000,
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
        ctime: new Date(),
        mode: 0,
        originalFilepath: '/path/to/file',
      });

      const result = await validateImage('file:///tiny/image.jpg');
      
      expect(result.isValid).toBe(true); // Still valid, just a warning
      expect(result.warnings).toContain('Image dimensions below 50x50 minimum');
    });
  });

  describe('cleanupTempImages', () => {
    it('should clean up existing temporary images', async () => {
      const uris = [
        'file:///temp/image1.jpg',
        'file:///temp/image2.jpg',
      ];

      mockRNFS.exists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      
      mockRNFS.unlink
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      await cleanupTempImages(uris);
      
      expect(mockRNFS.exists).toHaveBeenCalledTimes(2);
      expect(mockRNFS.unlink).toHaveBeenCalledTimes(2);
      expect(mockRNFS.unlink).toHaveBeenCalledWith('/temp/image1.jpg');
      expect(mockRNFS.unlink).toHaveBeenCalledWith('/temp/image2.jpg');
    });

    it('should handle cleanup errors gracefully', async () => {
      const uris = ['file:///temp/image1.jpg'];

      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.unlink.mockRejectedValue(new Error('Permission denied'));

      // Should not throw
      await expect(cleanupTempImages(uris)).resolves.toBeUndefined();
    });
  });

  describe('Utility Functions', () => {
    describe('formatFileSize', () => {
      it('should format file sizes correctly', () => {
        expect(formatFileSize(0)).toBe('0 B');
        expect(formatFileSize(512)).toBe('512.0 B');
        expect(formatFileSize(1024)).toBe('1.0 KB');
        expect(formatFileSize(1536)).toBe('1.5 KB');
        expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
        expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
        expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
      });
    });

    describe('calculateCompressionRatio', () => {
      it('should calculate compression ratio correctly', () => {
        expect(calculateCompressionRatio(1000, 500)).toBe(50);
        expect(calculateCompressionRatio(1000, 750)).toBe(25);
        expect(calculateCompressionRatio(1000, 1000)).toBe(0);
        expect(calculateCompressionRatio(0, 500)).toBe(0);
      });
    });

    describe('getOptimalThumbnailSize', () => {
      it('should calculate optimal thumbnail size', () => {
        const result = getOptimalThumbnailSize(375, 667, 3, 8);
        
        expect(result.width).toBe(Math.floor((375 - 32) / 3));
        expect(result.height).toBe(Math.floor((375 - 32) / 3));
        expect(result.quality).toBe(0.6);
        expect(result.format).toBe('JPEG');
      });
    });
  });

  describe('PhotoManager Class', () => {
    it('should be a singleton', () => {
      const instance1 = PhotoManager.getInstance();
      const instance2 = PhotoManager.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(photoManager);
    });

    it('should process photo with preset', async () => {
      // Mock all the required functions
      mockImage.getSize
        .mockImplementationOnce((uri, success) => success(2000, 1500)) // Original
        .mockImplementationOnce((uri, success) => success(1024, 768))  // Compressed
        .mockImplementationOnce((uri, success) => success(150, 113));  // Thumbnail
      
      mockRNFS.stat
        .mockResolvedValueOnce({ size: 3000000 } as any) // Original
        .mockResolvedValueOnce({ size: 800000 } as any)  // Compressed
        .mockResolvedValueOnce({ size: 15000 } as any);  // Thumbnail

      mockImageResizer.createResizedImage
        .mockResolvedValueOnce({
          uri: 'file:///compressed/image.jpg',
          path: '/compressed/image.jpg',
          name: 'image.jpg',
          size: 800000,
          width: 1024,
          height: 768,
        })
        .mockResolvedValueOnce({
          uri: 'file:///thumbnail/image.jpg',
          path: '/thumbnail/image.jpg',
          name: 'thumbnail.jpg',
          size: 15000,
          width: 150,
          height: 113,
        });

      const result = await photoManager.processPhoto('file:///original/image.jpg', 'standard');
      
      expect(result.uri).toBe('file:///compressed/image.jpg');
      expect(result.thumbnail).toBe('file:///thumbnail/image.jpg');
      expect(result.metadata).toBeDefined();
    });

    it('should format metadata for display', () => {
      const metadata = {
        originalSize: 2048000,
        compressedSize: 1024000,
        dimensions: { width: 1920, height: 1080 },
        format: 'JPEG',
        quality: 0.8,
        timestamp: '2023-01-01T12:00:00.000Z',
      };

      const formatted = photoManager.formatMetadata(metadata);
      
      expect(formatted['File Size']).toBe('1.0 MB');
      expect(formatted['Dimensions']).toBe('1920 × 1080');
      expect(formatted['Quality']).toBe('80%');
      expect(formatted['Compression']).toBe('50% smaller');
    });
  });

  describe('COMPRESSION_PRESETS', () => {
    it('should have all required presets', () => {
      expect(COMPRESSION_PRESETS.thumbnail).toBeDefined();
      expect(COMPRESSION_PRESETS.preview).toBeDefined();
      expect(COMPRESSION_PRESETS.standard).toBeDefined();
      expect(COMPRESSION_PRESETS.highQuality).toBeDefined();
    });

    it('should have correct thumbnail preset', () => {
      const preset = COMPRESSION_PRESETS.thumbnail;
      
      expect(preset.quality).toBe(0.6);
      expect(preset.maxWidth).toBe(150);
      expect(preset.maxHeight).toBe(150);
      expect(preset.format).toBe('JPEG');
    });

    it('should have correct high quality preset', () => {
      const preset = COMPRESSION_PRESETS.highQuality;
      
      expect(preset.quality).toBe(0.9);
      expect(preset.maxWidth).toBe(2048);
      expect(preset.maxHeight).toBe(2048);
      expect(preset.format).toBe('JPEG');
    });
  });
});