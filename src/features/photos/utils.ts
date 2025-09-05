/**
 * Photo Management Utilities
 * File operations, upload management, and photo processing
 */

import * as RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { supabase } from '../../config/supabase';
import { usePhotoStore } from './store';
import { Photo, DEFAULT_PHOTO_CONFIG } from './types';
import { mapPhotoError, logPhotoError, PhotoError } from '../../lib/errors/photoErrors';

// Photo storage directory
const PHOTO_DIR = `${RNFS.DocumentDirectoryPath}/photos`;

/**
 * Get safe photo save path
 */
export async function getPhotoSavePath(fileName: string): Promise<string> {
  const base = RNFS.DocumentDirectoryPath;
  return `${base}/${fileName}`;
}

/**
 * Save base64 data to file
 */
export async function saveBase64ToFile(base64Data: string, fileName: string): Promise<string> {
  const path = await getPhotoSavePath(fileName);
  await RNFS.writeFile(path, base64Data, 'base64');
  return path;
}

/**
 * Initialize photo storage directory
 */
export const initializePhotoStorage = async (): Promise<void> => {
  try {
    const exists = await RNFS.exists(PHOTO_DIR);
    if (!exists) {
      await RNFS.mkdir(PHOTO_DIR);
      console.log('Created photo storage directory:', PHOTO_DIR);
    }
  } catch (error) {
    console.error('Failed to initialize photo storage:', error);
    throw error;
  }
};

/**
 * Save a temporary photo to persistent local storage
 * @param tempUri - Temporary URI from camera/picker (file://...)
 * @param intakeId - Associated intake ID for organization
 * @returns Persistent local URI
 */
export const saveLocal = async (tempUri: string, intakeId?: string): Promise<string> => {
  try {
    await initializePhotoStorage();

    // Generate unique filename
    const timestamp = Date.now();
    const extension = tempUri.split('.').pop() || 'jpg';
    const filename = `${intakeId || 'photo'}_${timestamp}.${extension}`;
    const destPath = `${PHOTO_DIR}/${filename}`;

    // Copy from temp location to persistent storage
    await RNFS.copyFile(tempUri, destPath);

    // Verify the file was copied
    const exists = await RNFS.exists(destPath);
    if (!exists) {
      throw new Error('Failed to save photo to persistent storage');
    }

    const uriLocal = Platform.OS === 'android' ? `file://${destPath}` : destPath;
    console.log('Photo saved locally:', uriLocal);

    return uriLocal;
  } catch (error) {
    const photoError = mapPhotoError(error, {
      intakeId,
      operation: 'save_local',
    });
    logPhotoError(photoError);
    console.error('Failed to save photo locally:', photoError.message);
    throw photoError;
  }
};

/**
 * Get file info for a local photo
 */
export const getPhotoInfo = async (uriLocal: string): Promise<{
  size: number;
  exists: boolean;
  path: string;
}> => {
  try {
    const path = uriLocal.replace('file://', '');
    const exists = await RNFS.exists(path);
    
    if (!exists) {
      return { size: 0, exists: false, path };
    }

    const stat = await RNFS.stat(path);
    return {
      size: stat.size,
      exists: true,
      path,
    };
  } catch (error) {
    console.error('Failed to get photo info:', error);
    return { size: 0, exists: false, path: uriLocal };
  }
};

/**
 * Delete a local photo file
 */
export const deleteLocal = async (uriLocal: string): Promise<void> => {
  try {
    const path = uriLocal.replace('file://', '');
    const exists = await RNFS.exists(path);
    
    if (exists) {
      await RNFS.unlink(path);
      console.log('Deleted local photo:', path);
    }
  } catch (error) {
    console.error('Failed to delete local photo:', error);
    // Don't throw - file might already be deleted
  }
};

/**
 * Enqueue a photo for upload
 */
export const enqueueUpload = (photoId: string): void => {
  const store = usePhotoStore.getState();
  const photo = store.getById(photoId);
  
  if (!photo) {
    console.error('Photo not found for upload:', photoId);
    return;
  }

  if (photo.status === 'uploaded') {
    console.log('Photo already uploaded:', photoId);
    return;
  }

  store.enqueue(photoId);
  console.log('Photo enqueued for upload:', photoId);
};

/**
 * Upload a photo to Supabase storage
 */
export const uploadPhoto = async (photoId: string): Promise<string> => {
  const store = usePhotoStore.getState();
  const photo = store.getById(photoId);
  
  if (!photo) {
    throw new Error('Photo not found');
  }

  if (photo.status === 'uploaded' && photo.uriRemote) {
    return photo.uriRemote;
  }

  try {
    store.setUploading(photoId);
    store.incrementUploadAttempts(photoId);

    // Get file info
    const fileInfo = await getPhotoInfo(photo.uriLocal);
    if (!fileInfo.exists) {
      throw new Error('Local photo file not found');
    }

    // Generate unique filename for storage
    const timestamp = Date.now();
    const extension = photo.uriLocal.split('.').pop() || 'jpg';
    const storageFileName = `intake_photos/${photo.intakeId}/${photoId}_${timestamp}.${extension}`;

    // Read file as base64 for upload
    const fileData = await RNFS.readFile(fileInfo.path, 'base64');
    const fileBuffer = Buffer.from(fileData, 'base64');

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('intake-media')
      .upload(storageFileName, fileBuffer, {
        contentType: photo.metadata?.mimeType || 'image/jpeg',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('intake-media')
      .getPublicUrl(data.path);

    const uriRemote = urlData.publicUrl;

    // Update store with success
    store.setUploaded(photoId, uriRemote);

    console.log('Photo uploaded successfully:', photoId, uriRemote);
    return uriRemote;

  } catch (error) {
    const photoError = mapPhotoError(error, {
      photoId,
      intakeId: photo.intakeId,
      operation: 'upload',
    });
    logPhotoError(photoError);
    store.setError(photoId, photoError.userMessage);
    console.error('Photo upload failed:', photoId, photoError.message);
    throw photoError;
  }
};

/**
 * Mark a photo as uploaded (for external upload processes)
 */
export const markUploaded = (photoId: string, uriRemote: string): void => {
  const store = usePhotoStore.getState();
  store.setUploaded(photoId, uriRemote);
  console.log('Photo marked as uploaded:', photoId, uriRemote);
};

/**
 * Get photos by intake ID
 */
export const listByIntake = (intakeId: string): Photo[] => {
  const store = usePhotoStore.getState();
  return store.getByIntake(intakeId);
};

/**
 * Process upload queue
 */
export const processUploadQueue = async (): Promise<void> => {
  const store = usePhotoStore.getState();
  const queuedPhotos = store.getQueuedPhotos();

  if (queuedPhotos.length === 0) {
    console.log('No photos in upload queue');
    return;
  }

  console.log(`Processing ${queuedPhotos.length} photos in upload queue`);

  for (const photo of queuedPhotos) {
    try {
      // Check if we've exceeded retry limit
      if ((photo.uploadAttempts || 0) >= DEFAULT_PHOTO_CONFIG.maxRetries) {
        store.setError(photo.id, 'Max upload attempts exceeded');
        continue;
      }

      await uploadPhoto(photo.id);
      
      // Add delay between uploads to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Failed to upload photo in queue:', photo.id, error);
      // Error is already handled in uploadPhoto
    }
  }
};

/**
 * Purge orphaned photos (photos without valid intake references)
 */
export const purgeOrphans = async (validIntakeIds: string[]): Promise<number> => {
  const store = usePhotoStore.getState();
  const allPhotos = Object.values(store.photos);
  const validIds = new Set(validIntakeIds);
  
  let purgedCount = 0;
  const orphanedPhotos = allPhotos.filter(photo => !validIds.has(photo.intakeId));

  // Delete local files for orphaned photos
  for (const photo of orphanedPhotos) {
    try {
      await deleteLocal(photo.uriLocal);
      purgedCount++;
    } catch (error) {
      console.error('Failed to delete orphaned photo file:', photo.id, error);
    }
  }

  // Update store to remove orphaned photos
  store.purgeOrphans(validIntakeIds);

  console.log(`Purged ${purgedCount} orphaned photos`);
  return purgedCount;
};

/**
 * Clean up temporary files and failed uploads
 */
export const cleanupTempFiles = async (): Promise<void> => {
  try {
    const store = usePhotoStore.getState();
    const errorPhotos = store.getByStatus('error');
    
    // Clean up photos that have failed too many times
    for (const photo of errorPhotos) {
      if ((photo.uploadAttempts || 0) >= DEFAULT_PHOTO_CONFIG.maxRetries) {
        const daysSinceLastAttempt = photo.lastUploadAttempt 
          ? (Date.now() - new Date(photo.lastUploadAttempt).getTime()) / (1000 * 60 * 60 * 24)
          : 999;
        
        // Delete files older than 7 days
        if (daysSinceLastAttempt > 7) {
          await deleteLocal(photo.uriLocal);
          store.remove(photo.id);
          console.log('Cleaned up old failed photo:', photo.id);
        }
      }
    }
  } catch (error) {
    console.error('Failed to cleanup temp files:', error);
  }
};

/**
 * Get storage usage statistics
 */
export const getStorageStats = async (): Promise<{
  totalFiles: number;
  totalSize: number;
  byStatus: Record<string, { count: number; size: number }>;
}> => {
  try {
    const store = usePhotoStore.getState();
    const allPhotos = Object.values(store.photos);
    
    let totalSize = 0;
    const byStatus: Record<string, { count: number; size: number }> = {};
    
    for (const photo of allPhotos) {
      const info = await getPhotoInfo(photo.uriLocal);
      totalSize += info.size;
      
      if (!byStatus[photo.status]) {
        byStatus[photo.status] = { count: 0, size: 0 };
      }
      
      byStatus[photo.status].count++;
      byStatus[photo.status].size += info.size;
    }
    
    return {
      totalFiles: allPhotos.length,
      totalSize,
      byStatus,
    };
  } catch (error) {
    console.error('Failed to get storage stats:', error);
    return {
      totalFiles: 0,
      totalSize: 0,
      byStatus: {},
    };
  }
};

/**
 * Retry failed uploads
 */
export const retryFailedUploads = async (): Promise<void> => {
  const store = usePhotoStore.getState();
  store.retryFailed();
  
  // Process the queue
  setTimeout(() => {
    processUploadQueue();
  }, 1000);
};

/**
 * Initialize photo management system
 */
export const initializePhotoManagement = async (): Promise<void> => {
  try {
    await initializePhotoStorage();
    
    // Clean up old temp files on startup
    setTimeout(() => {
      cleanupTempFiles();
    }, 5000);
    
    console.log('Photo management system initialized');
  } catch (error) {
    console.error('Failed to initialize photo management:', error);
    throw error;
  }
};