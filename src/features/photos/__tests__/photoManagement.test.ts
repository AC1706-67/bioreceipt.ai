/**
 * Photo Management Tests
 * Test the core photo management functionality
 */

import { usePhotoStore } from '../store';
import { Photo, PhotoStatus } from '../types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock RNFS
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  exists: jest.fn(() => Promise.resolve(true)),
  mkdir: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  stat: jest.fn(() => Promise.resolve({ size: 1024 })),
  unlink: jest.fn(() => Promise.resolve()),
  readFile: jest.fn(() => Promise.resolve('mock-base64-data')),
}));

// Mock Supabase
jest.mock('../../config/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: jest.fn(() => Promise.resolve({ 
          data: { path: 'mock-path' }, 
          error: null 
        })),
        getPublicUrl: jest.fn(() => ({ 
          data: { publicUrl: 'https://mock-url.com/photo.jpg' } 
        })),
      }),
    },
  },
}));

describe('Photo Management', () => {
  beforeEach(() => {
    // Reset store state
    usePhotoStore.setState({
      photos: {},
      uploadQueue: [],
      isUploading: false,
      lastSync: null,
    });
  });

  describe('Photo Store', () => {
    it('should add a local photo', () => {
      const store = usePhotoStore.getState();
      const photoId = store.addLocal('intake-1', 'file:///path/to/photo.jpg');

      expect(photoId).toBeDefined();
      expect(photoId).toMatch(/^photo_/);

      const photo = store.getById(photoId);
      expect(photo).toBeDefined();
      expect(photo?.intakeId).toBe('intake-1');
      expect(photo?.uriLocal).toBe('file:///path/to/photo.jpg');
      expect(photo?.status).toBe('local');
    });

    it('should enqueue a photo for upload', () => {
      const store = usePhotoStore.getState();
      const photoId = store.addLocal('intake-1', 'file:///path/to/photo.jpg');
      
      store.enqueue(photoId);

      const photo = store.getById(photoId);
      expect(photo?.status).toBe('queued');
      expect(store.uploadQueue).toContain(photoId);
    });

    it('should mark photo as uploading', () => {
      const store = usePhotoStore.getState();
      const photoId = store.addLocal('intake-1', 'file:///path/to/photo.jpg');
      
      store.setUploading(photoId);

      const photo = store.getById(photoId);
      expect(photo?.status).toBe('uploading');
      expect(store.isUploading).toBe(true);
    });

    it('should mark photo as uploaded', () => {
      const store = usePhotoStore.getState();
      const photoId = store.addLocal('intake-1', 'file:///path/to/photo.jpg');
      store.enqueue(photoId);
      
      store.setUploaded(photoId, 'https://example.com/photo.jpg');

      const photo = store.getById(photoId);
      expect(photo?.status).toBe('uploaded');
      expect(photo?.uriRemote).toBe('https://example.com/photo.jpg');
      expect(store.uploadQueue).not.toContain(photoId);
    });

    it('should handle upload errors', () => {
      const store = usePhotoStore.getState();
      const photoId = store.addLocal('intake-1', 'file:///path/to/photo.jpg');
      store.enqueue(photoId);
      
      store.setError(photoId, 'Upload failed');

      const photo = store.getById(photoId);
      expect(photo?.status).toBe('error');
      expect(photo?.error).toBe('Upload failed');
      expect(store.uploadQueue).not.toContain(photoId);
    });

    it('should remove photos', () => {
      const store = usePhotoStore.getState();
      const photoId = store.addLocal('intake-1', 'file:///path/to/photo.jpg');
      
      store.remove(photoId);

      const photo = store.getById(photoId);
      expect(photo).toBeUndefined();
    });

    it('should get photos by intake', () => {
      const store = usePhotoStore.getState();
      const photoId1 = store.addLocal('intake-1', 'file:///path/to/photo1.jpg');
      const photoId2 = store.addLocal('intake-1', 'file:///path/to/photo2.jpg');
      const photoId3 = store.addLocal('intake-2', 'file:///path/to/photo3.jpg');

      const intake1Photos = store.getByIntake('intake-1');
      const intake2Photos = store.getByIntake('intake-2');

      expect(intake1Photos).toHaveLength(2);
      expect(intake2Photos).toHaveLength(1);
      expect(intake1Photos.map(p => p.id)).toContain(photoId1);
      expect(intake1Photos.map(p => p.id)).toContain(photoId2);
      expect(intake2Photos.map(p => p.id)).toContain(photoId3);
    });

    it('should get photos by status', () => {
      const store = usePhotoStore.getState();
      const photoId1 = store.addLocal('intake-1', 'file:///path/to/photo1.jpg');
      const photoId2 = store.addLocal('intake-1', 'file:///path/to/photo2.jpg');
      
      store.enqueue(photoId1);
      store.setUploaded(photoId2, 'https://example.com/photo2.jpg');

      const localPhotos = store.getByStatus('local');
      const queuedPhotos = store.getByStatus('queued');
      const uploadedPhotos = store.getByStatus('uploaded');

      expect(localPhotos).toHaveLength(0);
      expect(queuedPhotos).toHaveLength(1);
      expect(uploadedPhotos).toHaveLength(1);
      expect(queuedPhotos[0].id).toBe(photoId1);
      expect(uploadedPhotos[0].id).toBe(photoId2);
    });

    it('should clear upload queue', () => {
      const store = usePhotoStore.getState();
      const photoId1 = store.addLocal('intake-1', 'file:///path/to/photo1.jpg');
      const photoId2 = store.addLocal('intake-1', 'file:///path/to/photo2.jpg');
      
      store.enqueue(photoId1);
      store.enqueue(photoId2);
      
      expect(store.uploadQueue).toHaveLength(2);
      
      store.clearQueue();
      
      expect(store.uploadQueue).toHaveLength(0);
      expect(store.getById(photoId1)?.status).toBe('local');
      expect(store.getById(photoId2)?.status).toBe('local');
    });

    it('should purge orphaned photos', () => {
      const store = usePhotoStore.getState();
      const photoId1 = store.addLocal('intake-1', 'file:///path/to/photo1.jpg');
      const photoId2 = store.addLocal('intake-2', 'file:///path/to/photo2.jpg');
      const photoId3 = store.addLocal('intake-3', 'file:///path/to/photo3.jpg');

      // Only intake-1 and intake-2 are valid
      store.purgeOrphans(['intake-1', 'intake-2']);

      expect(store.getById(photoId1)).toBeDefined();
      expect(store.getById(photoId2)).toBeDefined();
      expect(store.getById(photoId3)).toBeUndefined();
    });

    it('should provide stats', () => {
      const store = usePhotoStore.getState();
      const photoId1 = store.addLocal('intake-1', 'file:///path/to/photo1.jpg');
      const photoId2 = store.addLocal('intake-1', 'file:///path/to/photo2.jpg');
      const photoId3 = store.addLocal('intake-2', 'file:///path/to/photo3.jpg');

      store.enqueue(photoId1);
      store.setUploaded(photoId2, 'https://example.com/photo2.jpg');
      store.setError(photoId3, 'Upload failed');

      const stats = store.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byStatus.local).toBe(0);
      expect(stats.byStatus.queued).toBe(1);
      expect(stats.byStatus.uploaded).toBe(1);
      expect(stats.byStatus.error).toBe(1);
      expect(stats.queueLength).toBe(1);
    });
  });

  describe('Photo Selectors', () => {
    it('should track upload progress', () => {
      const store = usePhotoStore.getState();
      const photoId = store.addLocal('intake-1', 'file:///path/to/photo.jpg');
      
      store.setUploadProgress(photoId, 50);
      
      const photo = store.getById(photoId);
      expect(photo?.uploadProgress).toBe(50);
    });

    it('should increment upload attempts', () => {
      const store = usePhotoStore.getState();
      const photoId = store.addLocal('intake-1', 'file:///path/to/photo.jpg');
      
      store.incrementUploadAttempts(photoId);
      store.incrementUploadAttempts(photoId);
      
      const photo = store.getById(photoId);
      expect(photo?.uploadAttempts).toBe(2);
    });

    it('should get queued photos in order', () => {
      const store = usePhotoStore.getState();
      
      // Add photos with different timestamps
      const photoId1 = store.addLocal('intake-1', 'file:///path/to/photo1.jpg');
      setTimeout(() => {
        const photoId2 = store.addLocal('intake-1', 'file:///path/to/photo2.jpg');
        
        store.enqueue(photoId2);
        store.enqueue(photoId1);
        
        const queuedPhotos = store.getQueuedPhotos();
        expect(queuedPhotos).toHaveLength(2);
        // Should be ordered by creation time
        expect(queuedPhotos[0].id).toBe(photoId1);
        expect(queuedPhotos[1].id).toBe(photoId2);
      }, 10);
    });
  });
});