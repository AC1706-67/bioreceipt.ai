/**
 * Photo Types - Type definitions for photo attachment system
 */

export interface IntakePhoto {
  id: string;
  intake_id: string;
  url: string;
  thumbnail_url?: string;
  created_at: string;
  file_size?: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface PhotoMetadata {
  captureDate: string;
  fileSize: string;
  dimensions: string;
  location?: string;
}

export interface PhotoUploadProgress {
  id: string;
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
  error?: string;
}