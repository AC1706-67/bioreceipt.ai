/**
 * Photo Uploader Mock for Testing
 * Provides controllable upload behavior for testing success/failure scenarios
 */

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

class MockUploader {
  private uploadResults: Map<string, UploadResult> = new Map();
  private uploadDelay = 100; // Default delay in ms
  private uploadCalls: Array<{ photoId: string; timestamp: number }> = [];

  // Mock the upload function
  uploadPhoto = jest.fn(async (photoId: string): Promise<string> => {
    this.uploadCalls.push({ photoId, timestamp: Date.now() });
    
    // Add delay to simulate real upload
    await new Promise(resolve => setTimeout(resolve, this.uploadDelay));
    
    const result = this.uploadResults.get(photoId);
    
    if (result?.success === false) {
      throw new Error(result.error || 'Upload failed');
    }
    
    return result?.url || `https://example.com/photos/${photoId}.jpg`;
  });

  // Test utilities
  setUploadResult(photoId: string, result: UploadResult) {
    this.uploadResults.set(photoId, result);
  }

  setUploadDelay(delay: number) {
    this.uploadDelay = delay;
  }

  makeUploadFail(photoId: string, error = 'Network error') {
    this.setUploadResult(photoId, { success: false, error });
  }

  makeUploadSucceed(photoId: string, url?: string) {
    this.setUploadResult(photoId, { 
      success: true, 
      url: url || `https://example.com/photos/${photoId}.jpg` 
    });
  }

  getUploadCalls() {
    return [...this.uploadCalls];
  }

  getUploadCallsForPhoto(photoId: string) {
    return this.uploadCalls.filter(call => call.photoId === photoId);
  }

  reset() {
    this.uploadResults.clear();
    this.uploadCalls = [];
    this.uploadDelay = 100;
    jest.clearAllMocks();
  }
}

export const mockUploader = new MockUploader();

// Mock the actual upload function
jest.mock('../features/photos/utils', () => ({
  ...jest.requireActual('../features/photos/utils'),
  uploadPhoto: mockUploader.uploadPhoto,
}));

export default mockUploader;