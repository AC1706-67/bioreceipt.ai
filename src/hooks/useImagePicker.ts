/**
 * useImagePicker Hook
 * Handles camera permissions, image capture, upload, and database insertion
 */

import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabaseClient';

interface UseImagePickerResult {
  signedUrl: string | null;
  error: string | null;
  isLoading: boolean;
  pickImage: () => Promise<void>;
  insertRow: (intakeId: string) => Promise<void>;
}

interface PendingUpload {
  fileUrl: string;
  fileName: string;
}

export const useImagePicker = (): UseImagePickerResult => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);

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
          base64: true,
        }
      );

      if (!manipulatedImage.base64) {
        setError('Failed to process image');
        return;
      }

      // Generate unique filename
      const fileName = generateFileName();
      const filePath = `${fileName}`;

      // Convert base64 to ArrayBuffer
      const arrayBuffer = decode(manipulatedImage.base64);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('intake-photos')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setError('Failed to upload image');
        return;
      }

      // Get signed URL with 60-second expiry for preview
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('intake-photos')
        .createSignedUrl(uploadData.path, 60);

      if (signedUrlError) {
        console.error('Signed URL error:', signedUrlError);
        setError('Failed to generate image preview');
        return;
      }

      // Store the permanent URL and filename for later database insertion
      const { data: publicUrlData } = supabase.storage
        .from('intake-photos')
        .getPublicUrl(uploadData.path);

      setPendingUpload({
        fileUrl: publicUrlData.publicUrl,
        fileName: uploadData.path,
      });

      setSignedUrl(signedUrlData.signedUrl);
    } catch (err) {
      console.error('Image picker error:', err);
      setError('Failed to capture or upload image');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const insertRow = useCallback(async (intakeId: string) => {
    if (!pendingUpload) {
      setError('No image to associate with intake');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Insert row into intake_media table
      const { error: insertError } = await supabase
        .from('intake_media')
        .insert({
          intake_id: intakeId,
          url: pendingUpload.fileUrl,
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
        setError('Failed to save image to intake');
        return;
      }

      // Clear pending upload after successful insertion
      setPendingUpload(null);
    } catch (err) {
      console.error('Insert row error:', err);
      setError('Failed to save image to intake');
    } finally {
      setIsLoading(false);
    }
  }, [pendingUpload]);

  return {
    signedUrl,
    error,
    isLoading,
    pickImage,
    insertRow,
  };
};