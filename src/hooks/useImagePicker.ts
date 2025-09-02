/**
 * useImagePicker Hook
 * Handles camera permissions, image capture, upload, and database insertion
 * Now integrated with offline photo queue for reliable uploads
 */

import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../config/supabase';
import { offlinePhotoQueueService } from '../services/photo/offlinePhotoQueueService';
import { useNetworkStatus } from './useNetworkStatus';

interface UseImagePickerResult {
  signedUrl: string | null;
  error: string | null;
  isLoading: boolean;
  pickImage: () => Promise<void>;
  insertRow: (intakeId: string) => Promise<void>;
  isQueued: boolean;
  queuedPhotoId: string | null;
}

interface PendingUpload {
  localUri: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export const useImagePicker = (): UseImagePickerResult => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [isQueued, setIsQueued] = useState(false);
  const [queuedPhotoId, setQueuedPhotoId] = useState<string | null>(null);
  
  const { isConnected } = useNetworkStatus();

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setError('Camera permission is required to take photos');
        return false;
      }
      return true;
    } catch (err) {
      setError('Failed to request camera permissions');
      return false;
    }
  };

  const generateFileName = (): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}_${random}.jpg`;
  };

  const pickImage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSignedUrl(null);

    try {
      // Request camera permissions
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) {
        setError('Failed to capture image');
        return;
      }

      // Downsample image to ensure quality 0.6
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1024 } }], // Resize to max width 1024px
        {
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Generate unique filename
      const fileName = generateFileName();
      
      // Get file size (approximate from manipulated image)
      const fileSize = asset.fileSize || 1024000; // Default to 1MB if not available

      // Store pending upload info
      setPendingUpload({
        localUri: manipulatedImage.uri,
        fileName,
        fileSize,
        mimeType: 'image/jpeg',
      });

      // If online, try immediate upload, otherwise queue for later
      if (isConnected) {
        try {
          await uploadImageDirectly(manipulatedImage.uri, fileName, fileSize);
        } catch (uploadError) {
          console.log('Direct upload failed, queuing for retry:', uploadError);
          // Queue for offline upload on failure
          await queuePhotoForUpload(manipulatedImage.uri, fileName, fileSize);
        }
      } else {
        // Queue for upload when connection is restored
        await queuePhotoForUpload(manipulatedImage.uri, fileName, fileSize);
      }

      // Set local preview URL
      setSignedUrl(manipulatedImage.uri);
    } catch (err) {
      console.error('Image picker error:', err);
      setError('Failed to capture or upload image');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadImageDirectly = async (localUri: string, fileName: string, fileSize: number): Promise<string> => {
    // Read file as base64 for upload
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      localUri,
      [],
      {
        compress: 0.6,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    if (!manipulatedImage.base64) {
      throw new Error('Failed to process image for upload');
    }

    // Convert base64 to ArrayBuffer
    const arrayBuffer = decode(manipulatedImage.base64);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('intake-photos')
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('intake-photos')
      .getPublicUrl(uploadData.path);

    return publicUrlData.publicUrl;
  };

  const queuePhotoForUpload = async (localUri: string, fileName: string, fileSize: number): Promise<void> => {
    try {
      // This will be set when insertRow is called with an intakeId
      const tempIntakeId = 'temp_' + Date.now();
      
      const photoId = await offlinePhotoQueueService.addToQueue(
        localUri,
        tempIntakeId,
        {
          fileName,
          fileSize,
          mimeType: 'image/jpeg',
        },
        (progress) => {
          console.log(`Upload progress for ${fileName}: ${progress.progress}%`);
        }
      );

      setQueuedPhotoId(photoId);
      setIsQueued(true);
      console.log(`Photo queued for upload: ${photoId}`);
    } catch (error) {
      console.error('Failed to queue photo for upload:', error);
      setError('Failed to queue photo for upload');
    }
  };

  const insertRow = useCallback(async (intakeId: string) => {
    if (!pendingUpload && !queuedPhotoId) {
      setError('No image to associate with intake');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (isQueued && queuedPhotoId) {
        // Update the queued photo with the correct intake ID
        const queuedPhotos = offlinePhotoQueueService.getQueuedPhotos();
        const photo = queuedPhotos.find(p => p.id === queuedPhotoId);
        
        if (photo) {
          // Remove old entry and add new one with correct intake ID
          await offlinePhotoQueueService.removeFromQueue(queuedPhotoId);
          
          const newPhotoId = await offlinePhotoQueueService.addToQueue(
            photo.localUri,
            intakeId,
            photo.metadata,
            (progress) => {
              console.log(`Upload progress: ${progress.progress}%`);
            }
          );
          
          setQueuedPhotoId(newPhotoId);
          console.log(`Updated queued photo with intake ID: ${intakeId}`);
        }
      } else if (pendingUpload) {
        // Direct upload case - insert into database immediately
        try {
          const publicUrl = await uploadImageDirectly(
            pendingUpload.localUri,
            pendingUpload.fileName,
            pendingUpload.fileSize
          );

          const { error: insertError } = await supabase
            .from('intake_media')
            .insert({
              intake_id: intakeId,
              url: publicUrl,
            });

          if (insertError) {
            console.error('Database insert error:', insertError);
            // If database insert fails, queue the photo for retry
            await queuePhotoForUpload(pendingUpload.localUri, pendingUpload.fileName, pendingUpload.fileSize);
            setError('Upload succeeded but failed to save to database. Photo queued for retry.');
            return;
          }

          console.log('Photo uploaded and saved successfully');
        } catch (uploadError) {
          console.error('Upload failed during insertRow:', uploadError);
          // Queue for retry
          await queuePhotoForUpload(pendingUpload.localUri, pendingUpload.fileName, pendingUpload.fileSize);
          setError('Upload failed. Photo queued for retry when connection is restored.');
          return;
        }
      }

      // Clear pending upload after successful processing
      setPendingUpload(null);
    } catch (err) {
      console.error('Insert row error:', err);
      setError('Failed to save image to intake');
    } finally {
      setIsLoading(false);
    }
  }, [pendingUpload, queuedPhotoId, isQueued]);

  return {
    signedUrl,
    error,
    isLoading,
    pickImage,
    insertRow,
    isQueued,
    queuedPhotoId,
  };
};