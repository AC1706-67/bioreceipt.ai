/**
 * Photo Metadata Extraction Service
 * Comprehensive metadata extraction, EXIF data, and photo analysis
 */

import { Image } from 'react-native';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

export interface ExtendedPhotoMetadata {
  // Basic metadata
  fileSize: number;
  dimensions: {
    width: number;
    height: number;
  };
  format: string;
  mimeType: string;
  
  // File system metadata
  fileName: string;
  filePath: string;
  createdAt: string;
  modifiedAt: string;
  
  // Image properties
  aspectRatio: number;
  orientation: 'portrait' | 'landscape' | 'square';
  colorDepth?: number;
  hasAlpha?: boolean;
  
  // Quality assessment
  estimatedQuality: number;
  compressionLevel: 'low' | 'medium' | 'high' | 'lossless';
  
  // EXIF data (when available)
  exif?: {
    camera?: {
      make?: string;
      model?: string;
      software?: string;
    };
    settings?: {
      iso?: number;
      aperture?: string;
      shutterSpeed?: string;
      focalLength?: string;
      flash?: boolean;
    };
    location?: {
      latitude?: number;
      longitude?: number;
      altitude?: number;
    };
    timestamp?: string;
  };
  
  // Analysis results
  analysis?: {
    brightness: number;
    contrast: number;
    sharpness: number;
    colorfulness: number;
    dominantColors: string[];
    hasText: boolean;
    hasFaces: boolean;
    isBlurry: boolean;
    isOverexposed: boolean;
    isUnderexposed: boolean;
  };
  
  // Processing history
  processingHistory?: Array<{
    operation: string;
    timestamp: string;
    parameters: Record<string, any>;
  }>;
}

export interface MetadataExtractionOptions {
  includeExif?: boolean;
  includeAnalysis?: boolean;
  includeColorAnalysis?: boolean;
  includeFaceDetection?: boolean;
  includeTextDetection?: boolean;
}

/**
 * Photo Metadata Service
 */
export class PhotoMetadataService {
  private static instance: PhotoMetadataService;

  private constructor() {}

  static getInstance(): PhotoMetadataService {
    if (!PhotoMetadataService.instance) {
      PhotoMetadataService.instance = new PhotoMetadataService();
    }
    return PhotoMetadataService.instance;
  }

  /**
   * Extract comprehensive metadata from photo
   */
  async extractMetadata(
    uri: string,
    options: MetadataExtractionOptions = {}
  ): Promise<ExtendedPhotoMetadata> {
    try {
      // Get basic file information
      const basicMetadata = await this.getBasicMetadata(uri);
      
      // Get image dimensions
      const dimensions = await this.getImageDimensions(uri);
      
      // Calculate derived properties
      const aspectRatio = dimensions.width / dimensions.height;
      const orientation = this.determineOrientation(dimensions);
      
      // Estimate quality and compression
      const qualityInfo = await this.estimateQuality(uri, basicMetadata.fileSize, dimensions);
      
      let metadata: ExtendedPhotoMetadata = {
        ...basicMetadata,
        dimensions,
        aspectRatio,
        orientation,
        ...qualityInfo,
      };

      // Add EXIF data if requested
      if (options.includeExif) {
        metadata.exif = await this.extractExifData(uri);
      }

      // Add image analysis if requested
      if (options.includeAnalysis) {
        metadata.analysis = await this.analyzeImage(uri, options);
      }

      return metadata;
    } catch (error) {
      throw new Error(`Failed to extract metadata: ${error.message}`);
    }
  }

  /**
   * Get basic file metadata
   */
  private async getBasicMetadata(uri: string): Promise<Partial<ExtendedPhotoMetadata>> {
    try {
      const path = uri.replace('file://', '');
      const stat = await RNFS.stat(path);
      
      const fileName = path.split('/').pop() || 'unknown';
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      
      // Determine format and MIME type
      const formatMap: Record<string, { format: string; mimeType: string }> = {
        jpg: { format: 'JPEG', mimeType: 'image/jpeg' },
        jpeg: { format: 'JPEG', mimeType: 'image/jpeg' },
        png: { format: 'PNG', mimeType: 'image/png' },
        webp: { format: 'WEBP', mimeType: 'image/webp' },
        gif: { format: 'GIF', mimeType: 'image/gif' },
        bmp: { format: 'BMP', mimeType: 'image/bmp' },
      };
      
      const formatInfo = formatMap[extension] || { format: 'UNKNOWN', mimeType: 'application/octet-stream' };

      return {
        fileSize: stat.size,
        fileName,
        filePath: path,
        createdAt: stat.ctime.toISOString(),
        modifiedAt: stat.mtime.toISOString(),
        format: formatInfo.format,
        mimeType: formatInfo.mimeType,
      };
    } catch (error) {
      throw new Error(`Failed to get basic metadata: ${error.message}`);
    }
  }

  /**
   * Get image dimensions
   */
  private getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        (error) => reject(new Error(`Failed to get image dimensions: ${error.message}`))
      );
    });
  }

  /**
   * Determine image orientation
   */
  private determineOrientation(dimensions: { width: number; height: number }): 'portrait' | 'landscape' | 'square' {
    const { width, height } = dimensions;
    const ratio = width / height;
    
    if (Math.abs(ratio - 1) < 0.1) {
      return 'square';
    } else if (width > height) {
      return 'landscape';
    } else {
      return 'portrait';
    }
  }

  /**
   * Estimate image quality and compression level
   */
  private async estimateQuality(
    uri: string,
    fileSize: number,
    dimensions: { width: number; height: number }
  ): Promise<{
    estimatedQuality: number;
    compressionLevel: 'low' | 'medium' | 'high' | 'lossless';
  }> {
    try {
      const { width, height } = dimensions;
      const totalPixels = width * height;
      
      // Estimate bytes per pixel
      const bytesPerPixel = fileSize / totalPixels;
      
      // Rough quality estimation based on bytes per pixel
      let estimatedQuality: number;
      let compressionLevel: 'low' | 'medium' | 'high' | 'lossless';
      
      if (bytesPerPixel > 2.5) {
        estimatedQuality = 0.95;
        compressionLevel = 'lossless';
      } else if (bytesPerPixel > 1.5) {
        estimatedQuality = 0.85;
        compressionLevel = 'low';
      } else if (bytesPerPixel > 0.8) {
        estimatedQuality = 0.7;
        compressionLevel = 'medium';
      } else {
        estimatedQuality = 0.5;
        compressionLevel = 'high';
      }

      return {
        estimatedQuality,
        compressionLevel,
      };
    } catch (error) {
      return {
        estimatedQuality: 0.8,
        compressionLevel: 'medium',
      };
    }
  }

  /**
   * Extract EXIF data (placeholder - would require native module)
   */
  private async extractExifData(uri: string): Promise<ExtendedPhotoMetadata['exif']> {
    // This would require a native module like react-native-exif
    // For now, return placeholder data
    return {
      camera: {
        make: 'Unknown',
        model: 'Unknown',
      },
      settings: {
        iso: undefined,
        aperture: undefined,
        shutterSpeed: undefined,
        focalLength: undefined,
        flash: false,
      },
      location: undefined,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Analyze image properties (placeholder - would require image processing library)
   */
  private async analyzeImage(
    uri: string,
    options: MetadataExtractionOptions
  ): Promise<ExtendedPhotoMetadata['analysis']> {
    // This would require image processing libraries like OpenCV or TensorFlow
    // For now, return placeholder analysis
    return {
      brightness: 0.5,
      contrast: 0.5,
      sharpness: 0.7,
      colorfulness: 0.6,
      dominantColors: ['#FFFFFF', '#000000'],
      hasText: false,
      hasFaces: false,
      isBlurry: false,
      isOverexposed: false,
      isUnderexposed: false,
    };
  }

  /**
   * Compare two photos for similarity
   */
  async comparePhotos(uri1: string, uri2: string): Promise<{
    similarity: number;
    differences: string[];
    recommendation: 'identical' | 'similar' | 'different';
  }> {
    try {
      const [metadata1, metadata2] = await Promise.all([
        this.extractMetadata(uri1),
        this.extractMetadata(uri2),
      ]);

      const differences: string[] = [];
      let similarity = 1.0;

      // Compare dimensions
      if (metadata1.dimensions.width !== metadata2.dimensions.width ||
          metadata1.dimensions.height !== metadata2.dimensions.height) {
        differences.push('Different dimensions');
        similarity -= 0.2;
      }

      // Compare file sizes
      const sizeDifference = Math.abs(metadata1.fileSize - metadata2.fileSize) / Math.max(metadata1.fileSize, metadata2.fileSize);
      if (sizeDifference > 0.1) {
        differences.push('Different file sizes');
        similarity -= sizeDifference * 0.3;
      }

      // Compare formats
      if (metadata1.format !== metadata2.format) {
        differences.push('Different formats');
        similarity -= 0.1;
      }

      // Compare quality
      const qualityDifference = Math.abs(metadata1.estimatedQuality - metadata2.estimatedQuality);
      if (qualityDifference > 0.1) {
        differences.push('Different quality levels');
        similarity -= qualityDifference * 0.2;
      }

      similarity = Math.max(0, similarity);

      let recommendation: 'identical' | 'similar' | 'different';
      if (similarity > 0.95) {
        recommendation = 'identical';
      } else if (similarity > 0.7) {
        recommendation = 'similar';
      } else {
        recommendation = 'different';
      }

      return {
        similarity,
        differences,
        recommendation,
      };
    } catch (error) {
      throw new Error(`Failed to compare photos: ${error.message}`);
    }
  }

  /**
   * Detect duplicate photos in a collection
   */
  async detectDuplicates(uris: string[]): Promise<Array<{
    group: string[];
    similarity: number;
    recommendation: string;
  }>> {
    const duplicateGroups: Array<{
      group: string[];
      similarity: number;
      recommendation: string;
    }> = [];

    // Compare each photo with every other photo
    for (let i = 0; i < uris.length; i++) {
      for (let j = i + 1; j < uris.length; j++) {
        try {
          const comparison = await this.comparePhotos(uris[i], uris[j]);
          
          if (comparison.similarity > 0.8) {
            // Check if either photo is already in a group
            let existingGroup = duplicateGroups.find(group => 
              group.group.includes(uris[i]) || group.group.includes(uris[j])
            );

            if (existingGroup) {
              // Add to existing group
              if (!existingGroup.group.includes(uris[i])) {
                existingGroup.group.push(uris[i]);
              }
              if (!existingGroup.group.includes(uris[j])) {
                existingGroup.group.push(uris[j]);
              }
              // Update similarity to average
              existingGroup.similarity = (existingGroup.similarity + comparison.similarity) / 2;
            } else {
              // Create new group
              duplicateGroups.push({
                group: [uris[i], uris[j]],
                similarity: comparison.similarity,
                recommendation: comparison.recommendation === 'identical' 
                  ? 'Consider keeping only one copy'
                  : 'Review for potential duplicates',
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to compare photos ${i} and ${j}:`, error);
        }
      }
    }

    return duplicateGroups;
  }

  /**
   * Generate metadata summary for display
   */
  formatMetadataForDisplay(metadata: ExtendedPhotoMetadata): Record<string, string> {
    const formatFileSize = (bytes: number): string => {
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = bytes;
      let unitIndex = 0;
      
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }
      
      return `${size.toFixed(1)} ${units[unitIndex]}`;
    };

    return {
      'File Name': metadata.fileName,
      'File Size': formatFileSize(metadata.fileSize),
      'Dimensions': `${metadata.dimensions.width} × ${metadata.dimensions.height}`,
      'Aspect Ratio': `${metadata.aspectRatio.toFixed(2)}:1`,
      'Orientation': metadata.orientation,
      'Format': metadata.format,
      'MIME Type': metadata.mimeType,
      'Estimated Quality': `${Math.round(metadata.estimatedQuality * 100)}%`,
      'Compression': metadata.compressionLevel,
      'Created': new Date(metadata.createdAt).toLocaleString(),
      'Modified': new Date(metadata.modifiedAt).toLocaleString(),
    };
  }

  /**
   * Validate photo metadata for compliance
   */
  validateMetadata(metadata: ExtendedPhotoMetadata): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check file size limits
    if (metadata.fileSize > 10 * 1024 * 1024) { // 10MB
      errors.push('File size exceeds 10MB limit');
    } else if (metadata.fileSize > 5 * 1024 * 1024) { // 5MB
      warnings.push('Large file size may affect performance');
    }

    // Check dimensions
    if (metadata.dimensions.width > 4000 || metadata.dimensions.height > 4000) {
      warnings.push('Very high resolution may not be necessary');
    }

    if (metadata.dimensions.width < 100 || metadata.dimensions.height < 100) {
      warnings.push('Low resolution may affect image quality');
    }

    // Check quality
    if (metadata.estimatedQuality < 0.5) {
      warnings.push('Low image quality detected');
    }

    // Check format
    const supportedFormats = ['JPEG', 'PNG', 'WEBP'];
    if (!supportedFormats.includes(metadata.format)) {
      errors.push(`Unsupported format: ${metadata.format}`);
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }
}

// Export singleton instance
export const photoMetadataService = PhotoMetadataService.getInstance();