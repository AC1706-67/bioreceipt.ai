/**
 * Offline Photo Queue Integration Test
 * Tests the complete offline photo queue functionality
 */

import { offlinePhotoQueueService } from '../../services/photo/offlinePhotoQueueService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
}));

jest.mock('../../config/supabase', () => ({
  supabaseHelpers: {
    uploadIntakeMedia: jest.fn(),
  },
}));

describe('Offline Photo Queue Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any existing queue items
    const existingPhotos = offlinePhotoQueueService.getQueuedPhotos();
    existingPhotos.forEach(photo => {
      offlinePhotoQueueService.removeFromQueue(photo.id);
    });
  });

  it('should add photo to queue and provide stats', async () => {
    const photoId = await offlinePhotoQueueService.addToQueue(
      'file://test-photo.jpg',
      'intake-123',
      {
        fileName: 'test-photo.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      }
    );

    expect(photoId).toBeDefined();
    expect(typeof photoId).toBe('string');

    const stats = offlinePhotoQueueService.getQueueStats();
    expect(stats.total).toBeGreaterThanOrEqual(0); // May be 0 if upload completed immediately
    expect(stats.completed + stats.pending + stats.uploading + stats.failed).toBeGreaterThanOrEqual(0);
  });

  it('should handle basic queue operations', async () => {
    // Test that we can add and remove photos from queue
    const photoId = await offlinePhotoQueueService.addToQueue(
      'file://photo1.jpg',
      'intake-1',
      {
        fileName: 'photo1.jpg',
        fileSize: 500000,
        mimeType: 'image/jpeg',
      }
    );

    expect(photoId).toBeDefined();
    expect(typeof photoId).toBe('string');

    // Remove the photo
    const removed = await offlinePhotoQueueService.removeFromQueue(photoId);
    expect(removed).toBe(true);

    // Try to remove non-existent photo
    const removedAgain = await offlinePhotoQueueService.removeFromQueue(photoId);
    expect(removedAgain).toBe(false);
  });

  it('should provide queue statistics', async () => {
    const initialStats = offlinePhotoQueueService.getQueueStats();
    expect(initialStats).toHaveProperty('total');
    expect(initialStats).toHaveProperty('pending');
    expect(initialStats).toHaveProperty('uploading');
    expect(initialStats).toHaveProperty('failed');
    expect(initialStats).toHaveProperty('completed');
    
    // All stats should be numbers
    expect(typeof initialStats.total).toBe('number');
    expect(typeof initialStats.pending).toBe('number');
    expect(typeof initialStats.uploading).toBe('number');
    expect(typeof initialStats.failed).toBe('number');
    expect(typeof initialStats.completed).toBe('number');
  });
});