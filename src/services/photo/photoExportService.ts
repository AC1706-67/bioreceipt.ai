/**
 * Photo Export and Sharing Service
 * Handles photo export, sharing, and batch operations
 */

import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Platform, Alert } from 'react-native';
import { PhotoMetadata } from '../../utils/photoManagementUtils';

export interface ExportOptions {
  format?: 'original' | 'compressed' | 'thumbnail';
  includeMetadata?: boolean;
  watermark?: {
    text: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number;
  };
  quality?: number;
}

export interface ShareOptions {
  title?: string;
  message?: string;
  subject?: string;
  excludedActivityTypes?: string[];
}

export interface BatchExportResult {
  success: Array<{
    originalUri: string;
    exportedUri: string;
    metadata: PhotoMetadata;
  }>;
  failed: Array<{
    originalUri: string;
    error: string;
  }>;
  totalSize: number;
  exportPath: string;
}

export interface PhotoExportData {
  uri: string;
  metadata: PhotoMetadata;
  intakeId?: string;
  timestamp?: string;
  notes?: string;
}

/**
 * Photo Export and Sharing Service
 */
export class PhotoExportService {
  private static instance: PhotoExportService;
  private readonly exportDir: string;

  private constructor() {
    this.exportDir = `${RNFS.DocumentDirectoryPath}/exports`;
  }

  static getInstance(): PhotoExportService {
    if (!PhotoExportService.instance) {
      PhotoExportService.instance = new PhotoExportService();
    }
    return PhotoExportService.instance;
  }

  /**
   * Initialize export directory
   */
  private async initializeExportDir(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.exportDir);
      if (!exists) {
        await RNFS.mkdir(this.exportDir);
      }
    } catch (error) {
      throw new Error(`Failed to initialize export directory: ${error.message}`);
    }
  }

  /**
   * Export single photo with options
   */
  async exportPhoto(
    photoData: PhotoExportData,
    options: ExportOptions = {}
  ): Promise<string> {
    try {
      await this.initializeExportDir();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = photoData.uri.split('.').pop() || 'jpg';
      const filename = `photo_${photoData.intakeId || 'export'}_${timestamp}.${extension}`;
      const exportPath = `${this.exportDir}/${filename}`;

      // Copy photo to export directory
      const sourcePath = photoData.uri.replace('file://', '');
      await RNFS.copyFile(sourcePath, exportPath);

      // Add metadata file if requested
      if (options.includeMetadata) {
        const metadataPath = `${this.exportDir}/${filename}.json`;
        const metadataContent = {
          ...photoData.metadata,
          intakeId: photoData.intakeId,
          timestamp: photoData.timestamp,
          notes: photoData.notes,
          exportedAt: new Date().toISOString(),
        };
        
        await RNFS.writeFile(metadataPath, JSON.stringify(metadataContent, null, 2));
      }

      return Platform.OS === 'android' ? `file://${exportPath}` : exportPath;
    } catch (error) {
      throw new Error(`Failed to export photo: ${error.message}`);
    }
  }

  /**
   * Export multiple photos as a batch
   */
  async batchExportPhotos(
    photos: PhotoExportData[],
    options: ExportOptions = {},
    onProgress?: (completed: number, total: number) => void
  ): Promise<BatchExportResult> {
    try {
      await this.initializeExportDir();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const batchDir = `${this.exportDir}/batch_${timestamp}`;
      await RNFS.mkdir(batchDir);

      const result: BatchExportResult = {
        success: [],
        failed: [],
        totalSize: 0,
        exportPath: batchDir,
      };

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        
        try {
          const extension = photo.uri.split('.').pop() || 'jpg';
          const filename = `photo_${i + 1}_${photo.intakeId || 'export'}.${extension}`;
          const exportPath = `${batchDir}/${filename}`;

          // Copy photo
          const sourcePath = photo.uri.replace('file://', '');
          await RNFS.copyFile(sourcePath, exportPath);

          // Get file size
          const stat = await RNFS.stat(exportPath);
          result.totalSize += stat.size;

          result.success.push({
            originalUri: photo.uri,
            exportedUri: Platform.OS === 'android' ? `file://${exportPath}` : exportPath,
            metadata: photo.metadata,
          });

          onProgress?.(i + 1, photos.length);
        } catch (error) {
          result.failed.push({
            originalUri: photo.uri,
            error: error.message,
          });
        }
      }

      // Create batch metadata file
      if (options.includeMetadata) {
        const batchMetadata = {
          exportedAt: new Date().toISOString(),
          totalPhotos: photos.length,
          successfulExports: result.success.length,
          failedExports: result.failed.length,
          totalSize: result.totalSize,
          photos: result.success.map((item, index) => ({
            filename: `photo_${index + 1}_${photos[index].intakeId || 'export'}.${photos[index].uri.split('.').pop()}`,
            ...photos[index],
          })),
        };

        const metadataPath = `${batchDir}/batch_metadata.json`;
        await RNFS.writeFile(metadataPath, JSON.stringify(batchMetadata, null, 2));
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to batch export photos: ${error.message}`);
    }
  }

  /**
   * Share single photo
   */
  async sharePhoto(
    photoUri: string,
    options: ShareOptions = {}
  ): Promise<void> {
    try {
      const shareOptions = {
        title: options.title || 'Share Photo',
        message: options.message || 'Sharing photo from BioReceipt',
        subject: options.subject || 'BioReceipt Photo',
        url: photoUri,
        type: 'image/*',
        excludedActivityTypes: options.excludedActivityTypes || [],
      };

      await Share.open(shareOptions);
    } catch (error) {
      if (error.message !== 'User did not share') {
        throw new Error(`Failed to share photo: ${error.message}`);
      }
    }
  }

  /**
   * Share multiple photos
   */
  async shareMultiplePhotos(
    photoUris: string[],
    options: ShareOptions = {}
  ): Promise<void> {
    try {
      if (photoUris.length === 0) {
        throw new Error('No photos to share');
      }

      if (photoUris.length === 1) {
        return this.sharePhoto(photoUris[0], options);
      }

      // For multiple photos, create a temporary zip or share individually
      if (Platform.OS === 'ios') {
        // iOS supports sharing multiple images
        const shareOptions = {
          title: options.title || 'Share Photos',
          message: options.message || `Sharing ${photoUris.length} photos from BioReceipt`,
          subject: options.subject || 'BioReceipt Photos',
          urls: photoUris,
          type: 'image/*',
          excludedActivityTypes: options.excludedActivityTypes || [],
        };

        await Share.open(shareOptions);
      } else {
        // Android: Share one by one or create a batch export
        Alert.alert(
          'Share Multiple Photos',
          `Share ${photoUris.length} photos individually?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Share All',
              onPress: async () => {
                for (const uri of photoUris) {
                  await this.sharePhoto(uri, options);
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      if (error.message !== 'User did not share') {
        throw new Error(`Failed to share multiple photos: ${error.message}`);
      }
    }
  }

  /**
   * Export photos with intake data as a report
   */
  async exportIntakeReport(
    intakeId: string,
    photos: PhotoExportData[],
    intakeData: {
      substance: string;
      quantity: string;
      unit: string;
      timestamp: string;
      notes?: string;
    }
  ): Promise<string> {
    try {
      await this.initializeExportDir();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportDir = `${this.exportDir}/intake_report_${intakeId}_${timestamp}`;
      await RNFS.mkdir(reportDir);

      // Export photos
      const exportedPhotos: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const extension = photo.uri.split('.').pop() || 'jpg';
        const filename = `photo_${i + 1}.${extension}`;
        const exportPath = `${reportDir}/${filename}`;

        const sourcePath = photo.uri.replace('file://', '');
        await RNFS.copyFile(sourcePath, exportPath);
        exportedPhotos.push(filename);
      }

      // Create intake report
      const report = {
        intakeId,
        substance: intakeData.substance,
        quantity: intakeData.quantity,
        unit: intakeData.unit,
        timestamp: intakeData.timestamp,
        notes: intakeData.notes,
        photos: exportedPhotos,
        photoCount: photos.length,
        exportedAt: new Date().toISOString(),
        exportedBy: 'BioReceipt App',
      };

      const reportPath = `${reportDir}/intake_report.json`;
      await RNFS.writeFile(reportPath, JSON.stringify(report, null, 2));

      // Create human-readable report
      const readableReport = `
BioReceipt Intake Report
========================

Intake ID: ${intakeId}
Substance: ${intakeData.substance}
Quantity: ${intakeData.quantity} ${intakeData.unit}
Timestamp: ${new Date(intakeData.timestamp).toLocaleString()}
${intakeData.notes ? `Notes: ${intakeData.notes}` : ''}

Photos: ${photos.length} attached
${exportedPhotos.map((filename, index) => `  ${index + 1}. ${filename}`).join('\n')}

Exported: ${new Date().toLocaleString()}
Generated by BioReceipt App
      `.trim();

      const readableReportPath = `${reportDir}/intake_report.txt`;
      await RNFS.writeFile(readableReportPath, readableReport);

      return Platform.OS === 'android' ? `file://${reportDir}` : reportDir;
    } catch (error) {
      throw new Error(`Failed to export intake report: ${error.message}`);
    }
  }

  /**
   * Clean up old export files
   */
  async cleanupOldExports(maxAgeHours: number = 24): Promise<number> {
    try {
      const exists = await RNFS.exists(this.exportDir);
      if (!exists) {
        return 0;
      }

      const files = await RNFS.readDir(this.exportDir);
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const file of files) {
        try {
          const stat = await RNFS.stat(file.path);
          const fileTime = new Date(stat.mtime).getTime();

          if (fileTime < cutoffTime) {
            if (file.isDirectory()) {
              await RNFS.unlink(file.path);
            } else {
              await RNFS.unlink(file.path);
            }
            cleanedCount++;
          }
        } catch (error) {
          console.warn(`Failed to clean up export file: ${file.path}`, error);
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup old exports:', error);
      return 0;
    }
  }

  /**
   * Get export directory size and file count
   */
  async getExportStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile?: string;
    newestFile?: string;
  }> {
    try {
      const exists = await RNFS.exists(this.exportDir);
      if (!exists) {
        return { totalFiles: 0, totalSize: 0 };
      }

      const files = await RNFS.readDir(this.exportDir);
      let totalSize = 0;
      let oldestTime = Date.now();
      let newestTime = 0;
      let oldestFile = '';
      let newestFile = '';

      for (const file of files) {
        try {
          const stat = await RNFS.stat(file.path);
          totalSize += stat.size;

          const fileTime = new Date(stat.mtime).getTime();
          if (fileTime < oldestTime) {
            oldestTime = fileTime;
            oldestFile = file.name;
          }
          if (fileTime > newestTime) {
            newestTime = fileTime;
            newestFile = file.name;
          }
        } catch (error) {
          console.warn(`Failed to get stats for file: ${file.path}`, error);
        }
      }

      return {
        totalFiles: files.length,
        totalSize,
        oldestFile: oldestFile || undefined,
        newestFile: newestFile || undefined,
      };
    } catch (error) {
      console.error('Failed to get export stats:', error);
      return { totalFiles: 0, totalSize: 0 };
    }
  }

  /**
   * Create a shareable link for a photo (if using cloud storage)
   */
  async createShareableLink(
    photoUri: string,
    expirationHours: number = 24
  ): Promise<string> {
    // This would integrate with your cloud storage service (Supabase, AWS S3, etc.)
    // For now, return the local URI
    return photoUri;
  }
}

// Export singleton instance
export const photoExportService = PhotoExportService.getInstance();