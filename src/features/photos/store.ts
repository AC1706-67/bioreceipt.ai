/**
 * Photo Store - Zustand-based state management for photos
 * Single source of truth with persistence and queue management
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Photo, PhotoState, PhotoActions, PhotoStore, PhotoStatus, DEFAULT_PHOTO_CONFIG } from './types';
import { mapPhotoError, logPhotoError, PhotoError } from '../../lib/errors/photoErrors';

// Generate unique ID for photos
const generatePhotoId = (): string => {
  return `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Initial state
const initialState: PhotoState = {
  photos: {},
  uploadQueue: [],
  isUploading: false,
  lastSync: null,
};

export const usePhotoStore = create<PhotoStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Core photo management
    addLocal: (intakeId: string, uriLocal: string, metadata?: Photo['metadata']) => {
      const id = generatePhotoId();
      const photo: Photo = {
        id,
        intakeId,
        uriLocal,
        status: 'local',
        createdAt: new Date().toISOString(),
        metadata,
        uploadProgress: 0,
        uploadAttempts: 0,
      };

      set((state) => ({
        photos: {
          ...state.photos,
          [id]: photo,
        },
      }));

      // Auto-enqueue if enabled
      if (DEFAULT_PHOTO_CONFIG.autoUpload) {
        get().enqueue(id);
      }

      // Persist changes
      get().persist();

      return id;
    },

    remove: (id: string) => {
      set((state) => {
        const newPhotos = { ...state.photos };
        delete newPhotos[id];

        return {
          photos: newPhotos,
          uploadQueue: state.uploadQueue.filter(queueId => queueId !== id),
        };
      });

      // Persist changes
      get().persist();
    },

    // Upload lifecycle
    enqueue: (id: string) => {
      const photo = get().photos[id];
      if (!photo || photo.status === 'uploaded') return;

      set((state) => {
        // Don't add if already in queue
        if (state.uploadQueue.includes(id)) return state;

        // Check queue size limit
        if (state.uploadQueue.length >= DEFAULT_PHOTO_CONFIG.maxQueueSize) {
          console.warn('Photo upload queue is full');
          return state;
        }

        return {
          photos: {
            ...state.photos,
            [id]: {
              ...photo,
              status: 'queued' as PhotoStatus,
            },
          },
          uploadQueue: [...state.uploadQueue, id],
        };
      });

      get().persist();
    },

    setUploading: (id: string) => {
      const photo = get().photos[id];
      if (!photo) return;

      set((state) => ({
        photos: {
          ...state.photos,
          [id]: {
            ...photo,
            status: 'uploading' as PhotoStatus,
            lastUploadAttempt: new Date().toISOString(),
          },
        },
        isUploading: true,
      }));

      get().persist();
    },

    setUploaded: (id: string, uriRemote: string) => {
      const photo = get().photos[id];
      if (!photo) return;

      set((state) => ({
        photos: {
          ...state.photos,
          [id]: {
            ...photo,
            status: 'uploaded' as PhotoStatus,
            uriRemote,
            uploadProgress: 100,
            error: undefined,
          },
        },
        uploadQueue: state.uploadQueue.filter(queueId => queueId !== id),
        isUploading: state.uploadQueue.length > 1, // Still uploading if more in queue
      }));

      get().persist();
    },

    setError: (id: string, message: string, originalError?: any) => {
      const photo = get().photos[id];
      if (!photo) return;

      // Map and log the error
      const photoError = mapPhotoError(originalError || new Error(message), {
        photoId: id,
        intakeId: photo.intakeId,
        operation: 'upload',
      });
      
      logPhotoError(photoError);

      set((state) => ({
        photos: {
          ...state.photos,
          [id]: {
            ...photo,
            status: 'error' as PhotoStatus,
            error: photoError.userMessage,
            uploadProgress: 0,
          },
        },
        uploadQueue: state.uploadQueue.filter(queueId => queueId !== id),
        isUploading: state.uploadQueue.length > 1,
      }));

      get().persist();
    },

    // Progress tracking
    setUploadProgress: (id: string, progress: number) => {
      const photo = get().photos[id];
      if (!photo) return;

      set((state) => ({
        photos: {
          ...state.photos,
          [id]: {
            ...photo,
            uploadProgress: Math.max(0, Math.min(100, progress)),
          },
        },
      }));
    },

    incrementUploadAttempts: (id: string) => {
      const photo = get().photos[id];
      if (!photo) return;

      set((state) => ({
        photos: {
          ...state.photos,
          [id]: {
            ...photo,
            uploadAttempts: (photo.uploadAttempts || 0) + 1,
          },
        },
      }));

      get().persist();
    },

    // Selectors
    getByIntake: (intakeId: string) => {
      const photos = get().photos;
      return Object.values(photos)
        .filter(photo => photo.intakeId === intakeId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },

    getById: (id: string) => {
      return get().photos[id];
    },

    getByStatus: (status: PhotoStatus) => {
      const photos = get().photos;
      return Object.values(photos)
        .filter(photo => photo.status === status)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },

    getQueuedPhotos: () => {
      const { photos, uploadQueue } = get();
      return uploadQueue
        .map(id => photos[id])
        .filter(Boolean)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },

    // Utility actions
    clearQueue: () => {
      set((state) => {
        const updatedPhotos = { ...state.photos };
        
        // Reset queued photos to local status
        state.uploadQueue.forEach(id => {
          if (updatedPhotos[id] && updatedPhotos[id].status === 'queued') {
            updatedPhotos[id] = {
              ...updatedPhotos[id],
              status: 'local' as PhotoStatus,
            };
          }
        });

        return {
          photos: updatedPhotos,
          uploadQueue: [],
          isUploading: false,
        };
      });

      get().persist();
    },

    retryFailed: () => {
      const failedPhotos = get().getByStatus('error');
      
      failedPhotos.forEach(photo => {
        if ((photo.uploadAttempts || 0) < DEFAULT_PHOTO_CONFIG.maxRetries) {
          get().enqueue(photo.id);
        }
      });
    },

    purgeOrphans: (validIntakeIds: string[]) => {
      const validIds = new Set(validIntakeIds);
      let purgedCount = 0;

      set((state) => {
        const newPhotos: Record<string, Photo> = {};
        
        Object.values(state.photos).forEach(photo => {
          if (validIds.has(photo.intakeId)) {
            newPhotos[photo.id] = photo;
          } else {
            purgedCount++;
          }
        });

        return {
          photos: newPhotos,
          uploadQueue: state.uploadQueue.filter(id => newPhotos[id]),
        };
      });

      if (purgedCount > 0) {
        console.log(`Purged ${purgedCount} orphaned photos`);
        get().persist();
      }
    },

    // Persistence
    hydrate: async () => {
      try {
        const stored = await AsyncStorage.getItem(DEFAULT_PHOTO_CONFIG.persistenceKey);
        if (stored) {
          const data: PhotoState = JSON.parse(stored);
          
          // Validate and clean up the data
          const cleanedPhotos: Record<string, Photo> = {};
          const cleanedQueue: string[] = [];

          Object.entries(data.photos || {}).forEach(([id, photo]) => {
            // Validate photo structure
            if (photo.id && photo.intakeId && photo.uriLocal && photo.status && photo.createdAt) {
              cleanedPhotos[id] = photo;
              
              // Rebuild queue from queued photos
              if (photo.status === 'queued') {
                cleanedQueue.push(id);
              }
            }
          });

          set({
            photos: cleanedPhotos,
            uploadQueue: cleanedQueue,
            isUploading: false, // Reset uploading state on hydration
            lastSync: data.lastSync || null,
          });

          console.log(`Hydrated ${Object.keys(cleanedPhotos).length} photos from storage`);
        }
      } catch (error) {
        console.error('Failed to hydrate photo store:', error);
      }
    },

    persist: async () => {
      try {
        const state = get();
        const dataToStore: PhotoState = {
          photos: state.photos,
          uploadQueue: state.uploadQueue,
          isUploading: state.isUploading,
          lastSync: new Date().toISOString(),
        };

        await AsyncStorage.setItem(
          DEFAULT_PHOTO_CONFIG.persistenceKey,
          JSON.stringify(dataToStore)
        );
      } catch (error) {
        console.error('Failed to persist photo store:', error);
      }
    },

    // Debug
    getStats: () => {
      const { photos, uploadQueue } = get();
      const photoArray = Object.values(photos);
      
      const byStatus: Record<PhotoStatus, number> = {
        local: 0,
        queued: 0,
        uploading: 0,
        uploaded: 0,
        error: 0,
      };

      photoArray.forEach(photo => {
        byStatus[photo.status]++;
      });

      return {
        total: photoArray.length,
        byStatus,
        queueLength: uploadQueue.length,
        orphaned: 0, // Would need intake IDs to calculate
      };
    },
  }))
);

// Initialize store on app start
export const initializePhotoStore = async () => {
  await usePhotoStore.getState().hydrate();
};

// Subscribe to changes and auto-persist
usePhotoStore.subscribe(
  (state) => state.photos,
  () => {
    // Debounce persistence to avoid too frequent writes
    const timeoutId = setTimeout(() => {
      usePhotoStore.getState().persist();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }
);

// Export selectors for convenience
export const photoSelectors = {
  getByIntake: (intakeId: string) => usePhotoStore.getState().getByIntake(intakeId),
  getById: (id: string) => usePhotoStore.getState().getById(id),
  getByStatus: (status: PhotoStatus) => usePhotoStore.getState().getByStatus(status),
  getQueuedPhotos: () => usePhotoStore.getState().getQueuedPhotos(),
  getStats: () => usePhotoStore.getState().getStats(),
};