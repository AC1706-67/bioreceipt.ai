/**
 * Photo Management Types
 * Single source of truth for photo state management
 */

export type PhotoStatus = 'local' | 'queued' | 'uploading' | 'uploaded' | 'error';

export type Photo = {
  id: string;
  intakeId: string;
  uriLocal: string;     // file://... path to local file
  uriRemote?: string;   // https://... URL to remote file
  status: PhotoStatus;
  createdAt: string;
  error?: string;
  
  // Optional metadata
  metadata?: {
    fileName?: string;
    fileSize?: number;
    dimensions?: {
      width: number;
      height: number;
    };
    mimeType?: string;
  };
  
  // Upload tracking
  uploadProgress?: number; // 0-100
  uploadAttempts?: number;
  lastUploadAttempt?: string;
  nextRetryAt?: string; // ISO string for when to retry failed uploads
};

export type PhotoState = {
  photos: Record<string, Photo>;
  uploadQueue: string[]; // Array of photo IDs in upload queue
  isUploading: boolean;
  lastSync: string | null;
};

export type PhotoActions = {
  // Core photo management
  addLocal: (intakeId: string, uriLocal: string, metadata?: Photo['metadata']) => string;
  remove: (id: string) => void;
  
  // Upload lifecycle
  enqueue: (id: string) => void;
  setUploading: (id: string) => void;
  setUploaded: (id: string, uriRemote: string) => void;
  setError: (id: string, message: string) => void;
  
  // Progress tracking
  setUploadProgress: (id: string, progress: number) => void;
  incrementUploadAttempts: (id: string) => void;
  
  // Selectors
  getByIntake: (intakeId: string) => Photo[];
  getById: (id: string) => Photo | undefined;
  getByStatus: (status: PhotoStatus) => Photo[];
  getQueuedPhotos: () => Photo[];
  
  // Utility actions
  clearQueue: () => void;
  retryFailed: () => void;
  purgeOrphans: (validIntakeIds: string[]) => void;
  
  // Persistence
  hydrate: () => Promise<void>;
  persist: () => Promise<void>;
  
  // Debug
  getStats: () => {
    total: number;
    byStatus: Record<PhotoStatus, number>;
    queueLength: number;
    orphaned: number;
  };
};

export type PhotoStore = PhotoState & PhotoActions;

// Event types for photo operations
export type PhotoEvent = 
  | { type: 'PHOTO_ADDED'; payload: { id: string; photo: Photo } }
  | { type: 'PHOTO_REMOVED'; payload: { id: string } }
  | { type: 'PHOTO_ENQUEUED'; payload: { id: string } }
  | { type: 'PHOTO_UPLOAD_STARTED'; payload: { id: string } }
  | { type: 'PHOTO_UPLOAD_PROGRESS'; payload: { id: string; progress: number } }
  | { type: 'PHOTO_UPLOADED'; payload: { id: string; uriRemote: string } }
  | { type: 'PHOTO_UPLOAD_FAILED'; payload: { id: string; error: string } }
  | { type: 'QUEUE_CLEARED'; payload: {} }
  | { type: 'ORPHANS_PURGED'; payload: { count: number } };

// Configuration for photo management
export type PhotoConfig = {
  maxRetries: number;
  retryDelay: number;
  maxQueueSize: number;
  persistenceKey: string;
  autoUpload: boolean;
  compressionQuality: number;
  maxDimensions: {
    width: number;
    height: number;
  };
};

export const DEFAULT_PHOTO_CONFIG: PhotoConfig = {
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  maxQueueSize: 50,
  persistenceKey: 'photos_v1',
  autoUpload: true,
  compressionQuality: 0.8,
  maxDimensions: {
    width: 1024,
    height: 1024,
  },
};