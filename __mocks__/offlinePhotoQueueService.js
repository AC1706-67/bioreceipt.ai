const offlinePhotoQueueService = {
  getQueuedPhotos: jest.fn(() => []),
  getQueueStats: jest.fn(() => ({ pending: 0, failed: 0, completed: 0 })),
  getPhotosByStatus: jest.fn(() => []),
  enqueue: jest.fn(),
  flush: jest.fn().mockResolvedValue(undefined),
  isOnline: jest.fn().mockReturnValue(true),
  subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
};

export { offlinePhotoQueueService };
export default offlinePhotoQueueService;