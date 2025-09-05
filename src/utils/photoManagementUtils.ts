/**
 * Photo Management Utilities
 * Comprehensive photo processing, compression, resizing, and metadata utilities
 */

import { Image } from 'react-native';
import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

export interface PhotoDimensions {
  width: number;
  height: number;
}

export interface PhotoMetadata {
  originalSize: number;
  compressedSize: number;
  dimensions: PhotoDimensions;
  format: string;
  quality: number;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  exif?: Record<string, any>;
}

export interface CompressionOptions {
  quality: number; // 0.1 to 1.0
  maxWidth?: number;
  maxHeight?: number;
  format?: 'JPEG' | 'PNG' | 'WEBP';
  maintainAspectRatio?: boolean;
}

export interface ThumbnailOptions {
  width: number;
  height: number;
  quality?: number;
  format?: 'JPEG' | 'PNG' | 'WEBP';
}

export interface BatchOperationResult {
  success: string[];
  failed: Array<{ uri: string; error: string }>;
  totalProcessed: number;
  totalSize: number;
  compressionRatio: number;
}

/**
 * Default compression settings for different use cases
 */
export const COMPRESSION_PRESETS = {
  thumbnail: {
    quality: 0.6,
    maxWidth: 150,
    maxHeight: 150,
    format: 'JPEG' as const,
  },
  preview: {
    quality: 0.7,
    maxWidth: 400,
    maxHeight: 400,
    format: 'JPEG' as const,
  },
  standard: {
    quality: 0.8,
    maxWidth: 1024,
    maxHeight: 1024,
    format: 'JPEG' as const,
  },
  highQuality: {
    quality: 0.9,
    maxWidth: 2048,
    maxHeight: 2048,
    format: 'JPEG' as const,
  },
} as const;

/**
 * Get image dimensions from URI
 */
export const getImageDimensions = (uri: string): Promise<PhotoDimensions> => {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(new Error(`Failed to get image dimensions: ${error.message}`))
    );
  });
};

/**
 * Get file size in bytes
 */
export const getFileSize = async (uri: string): Promise<number> => {
  try {
    const path = uri.replace('file://', '');
    const stat = await RNFS.stat(path);
    return stat.size;
  } catch (error) {
    console.error('Failed to get file size:', error);
    return 0;
  }
};

/**
 * Extract comprehensive metadata from photo
 */
export const extractPhotoMetadata = async (uri: string): Promise<PhotoMetadata> => {
  try {
    const [dimensions, fileSize] = await Promise.all([
      getImageDimensions(uri),
      getFileSize(uri),
    ]);

    const format = uri.split('.').pop()?.toUpperCase() || 'JPEG';
    
    return {
      originalSize: fileSize,
      compressedSize: fileSize,
      dimensions,
      format,
      quality: 1.0,
      timestamp: new Date().toISOString(),
      // Location and EXIF would require additional native modules
      // location: undefined,
      // exif: undefined,
    };
  } catch (error) {
    throw new Error(`Failed to extract photo metadata: ${error.message}`);
  }
};

/**
 * Compress and resize image with specified options
 */
export const compressImage = async (
  uri: string,
  options: CompressionOptions = COMPRESSION_PRESETS.standard
): Promise<{ uri: string; metadata: PhotoMetadata }> => {
  try {
    const originalMetadata = await extractPhotoMetadata(uri);
    
    // Calculate target dimensions
    let { maxWidth = 1024, maxHeight = 1024 } = options;
    
    if (options.maintainAspectRatio !== false) {
      const aspectRatio = originalMetadata.dimensions.width / originalMetadata.dimensions.height;
      
      if (aspectRatio > 1) {
        // Landscape
        maxHeight = Math.round(maxWidth / aspectRatio);
      } else {
        // Portrait
        maxWidth = Math.round(maxHeight * aspectRatio);
      }
    }

    // Compress using react-native-image-resizer
    const result = await ImageResizer.createResizedImage(
      uri,
      maxWidth,
      maxHeight,
      options.format || 'JPEG',
      Math.round((options.quality || 0.8) * 100), // Convert to 0-100 scale
      0, // rotation
      undefined, // outputPath
      false, // keepMeta
      {
        mode: 'contain',
        onlyScaleDown: true,
      }
    );

    // Get compressed file metadata
    const compressedSize = await getFileSize(result.uri);
    const compressedDimensions = await getImageDimensions(result.uri);

    const metadata: PhotoMetadata = {
      ...originalMetadata,
      compressedSize,
      dimensions: compressedDimensions,
      quality: options.quality || 0.8,
      format: options.format || 'JPEG',
    };

    return {
      uri: result.uri,
      metadata,
    };
  } catch (error) {
    throw new Error(`Failed to compress image: ${error.message}`);
  }
};

/**
 * Generate thumbnail from image
 */
export const generateThumbnail = async (
  uri: string,
  options: ThumbnailOptions = { width: 150, height: 150, quality: 0.6 }
): Promise<{ uri: string; metadata: PhotoMetadata }> => {
  try {
    const compressionOptions: CompressionOptions = {
      quality: options.quality || 0.6,
      maxWidth: options.width,
      maxHeight: options.height,
      format: options.format || 'JPEG',
      maintainAspectRatio: true,
    };

    return await compressImage(uri, compressionOptions);
  } catch (error) {
    throw new Error(`Failed to generate thumbnail: ${error.message}`);
  }
};

/**
 * Batch compress multiple images
 */
export const batchCompressImages = async (
  uris: string[],
  options: CompressionOptions = COMPRESSION_PRESETS.standard,
  onProgress?: (completed: number, total: number) => void
): Promise<BatchOperationResult> => {
  const result: BatchOperationResult = {
    success: [],
    failed: [],
    totalProcessed: 0,
    totalSize: 0,
    compressionRatio: 0,
  };

  let originalTotalSize = 0;
  let compressedTotalSize = 0;

  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    
    try {
      const originalSize = await getFileSize(uri);
      originalTotalSize += originalSize;

      const compressed = await compressImage(uri, options);
      compressedTotalSize += compressed.metadata.compressedSize;

      result.success.push(compressed.uri);
      result.totalProcessed++;

      onProgress?.(i + 1, uris.length);
    } catch (error) {
      result.failed.push({
        uri,
        error: error.message,
      });
    }
  }

  result.totalSize = compressedTotalSize;
  result.compressionRatio = originalTotalSize > 0 ? compressedTotalSize / originalTotalSize : 1;

  return result;
};

/**
 * Batch generate thumbnails
 */
export const batchGenerateThumbnails = async (
  uris: string[],
  options: ThumbnailOptions = { width: 150, height: 150 },
  onProgress?: (completed: number, total: number) => void
): Promise<BatchOperationResult> => {
  const compressionOptions: CompressionOptions = {
    quality: options.quality || 0.6,
    maxWidth: options.width,
    maxHeight: options.height,
    format: options.format || 'JPEG',
  };

  return await batchCompressImages(uris, compressionOptions, onProgress);
};

/**
 * Calculate optimal compression settings based on image size and target
 */
export const calculateOptimalCompression = (
  originalDimensions: PhotoDimensions,
  originalSize: number,
  targetSizeKB?: number
): CompressionOptions => {
  const { width, height } = originalDimensions;
  const aspectRatio = width / height;
  
  // Start with standard preset
  let options = { ...COMPRESSION_PRESETS.standard };

  // Adjust based on original size
  if (originalSize > 5 * 1024 * 1024) { // > 5MB
    options.quality = 0.7;
    options.maxWidth = 1024;
    options.maxHeight = 1024;
  } else if (originalSize > 2 * 1024 * 1024) { // > 2MB
    options.quality = 0.75;
    options.maxWidth = 1280;
    options.maxHeight = 1280;
  }

  // Adjust for very large images
  if (width > 3000 || height > 3000) {
    options.maxWidth = 1024;
    options.maxHeight = 1024;
    options.quality = 0.7;
  }

  // Target size optimization (rough estimation)
  if (targetSizeKB) {
    const targetBytes = targetSizeKB * 1024;
    const compressionRatio = targetBytes / originalSize;
    
    if (compressionRatio < 0.3) {
      options.quality = Math.max(0.5, options.quality * 0.8);
      options.maxWidth = Math.min(options.maxWidth || 1024, 800);
      options.maxHeight = Math.min(options.maxHeight || 1024, 800);
    } else if (compressionRatio < 0.6) {
      options.quality = Math.max(0.6, options.quality * 0.9);
    }
  }

  return options;
};

/**
 * Validate image format and size
 */
export const validateImage = async (uri: string): Promise<{
  isValid: boolean;
  errors: string[];
  metadata?: PhotoMetadata;
}> => {
  const errors: string[] = [];
  
  try {
    const metadata = await extractPhotoMetadata(uri);
    
    // Check file size (max 10MB)
    if (metadata.originalSize > 10 * 1024 * 1024) {
      errors.push('Image size exceeds 10MB limit');
    }
    
    // Check dimensions (max 4000x4000)
    if (metadata.dimensions.width > 4000 || metadata.dimensions.height > 4000) {
      errors.push('Image dimensions exceed 4000x4000 limit');
    }
    
    // Check minimum dimensions (min 50x50)
    if (metadata.dimensions.width < 50 || metadata.dimensions.height < 50) {
      errors.push('Image dimensions below 50x50 minimum');
    }
    
    // Check format
    const supportedFormats = ['JPEG', 'JPG', 'PNG', 'WEBP'];
    if (!supportedFormats.includes(metadata.format.toUpperCase())) {
      errors.push(`Unsupported format: ${metadata.format}. Supported: ${supportedFormats.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      metadata: errors.length === 0 ? metadata : undefined,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Failed to validate image: ${error.message}`],
    };
  }
};

/**
 * Clean up temporary compressed images
 */
export const cleanupTempImages = async (uris: string[]): Promise<void> => {
  for (const uri of uris) {
    try {
      const path = uri.replace('file://', '');
      const exists = await RNFS.exists(path);
      
      if (exists) {
        await RNFS.unlink(path);
      }
    } catch (error) {
      console.warn(`Failed to cleanup temp image: ${uri}`, error);
    }
  }
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Calculate compression ratio as percentage
 */
export const calculateCompressionRatio = (originalSize: number, compressedSize: number): number => {
  if (originalSize === 0) return 0;
  return Math.round(((originalSize - compressedSize) / originalSize) * 100);
};

/**
 * Get optimal thumbnail size based on container dimensions
 */
export const getOptimalThumbnailSize = (
  containerWidth: number,
  containerHeight: number,
  columns: number = 3,
  padding: number = 8
): ThumbnailOptions => {
  const availableWidth = containerWidth - (padding * (columns + 1));
  const thumbnailSize = Math.floor(availableWidth / columns);
  
  return {
    width: thumbnailSize,
    height: thumbnailSize,
    quality: 0.6,
    format: 'JPEG',
  };
};

/**
 * Photo management utility class for easier usage
 */
export class PhotoManager {
  private static instance: PhotoManager;
  
  static getInstance(): PhotoManager {
    if (!PhotoManager.instance) {
      PhotoManager.instance = new PhotoManager();
    }
    return PhotoManager.instance;
  }

  async processPhoto(
    uri: string,
    preset: keyof typeof COMPRESSION_PRESETS = 'standard'
  ): Promise<{ uri: string; metadata: PhotoMetadata; thumbnail: string }> {
    // Validate image first
    const validation = await validateImage(uri);
    if (!validation.isValid) {
      throw new Error(`Invalid image: ${validation.errors.join(', ')}`);
    }

    // Compress main image
    const compressed = await compressImage(uri, COMPRESSION_PRESETS[preset]);
    
    // Generate thumbnail
    const thumbnail = await generateThumbnail(uri, COMPRESSION_PRESETS.thumbnail);

    return {
      uri: compressed.uri,
      metadata: compressed.metadata,
      thumbnail: thumbnail.uri,
    };
  }

  async batchProcess(
    uris: string[],
    preset: keyof typeof COMPRESSION_PRESETS = 'standard',
    onProgress?: (completed: number, total: number) => void
  ): Promise<Array<{ uri: string; metadata: PhotoMetadata; thumbnail: string }>> {
    const results: Array<{ uri: string; metadata: PhotoMetadata; thumbnail: string }> = [];
    
    for (let i = 0; i < uris.length; i++) {
      try {
        const result = await this.processPhoto(uris[i], preset);
        results.push(result);
        onProgress?.(i + 1, uris.length);
      } catch (error) {
        console.error(`Failed to process photo ${uris[i]}:`, error);
        // Continue with other photos
      }
    }

    return results;
  }

  formatMetadata(metadata: PhotoMetadata): Record<string, string> {
    return {
      'File Size': formatFileSize(metadata.compressedSize),
      'Dimensions': `${metadata.dimensions.width} × ${metadata.dimensions.height}`,
      'Format': metadata.format,
      'Quality': `${Math.round(metadata.quality * 100)}%`,
      'Compression': metadata.originalSize !== metadata.compressedSize 
        ? `${calculateCompressionRatio(metadata.originalSize, metadata.compressedSize)}% smaller`
        : 'None',
      'Created': new Date(metadata.timestamp).toLocaleString(),
    };
  }
}

// Export singleton instance
export const photoManager = PhotoManager.getInstance();