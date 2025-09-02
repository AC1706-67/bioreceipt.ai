/**
 * Photo Upload Queue Hook
 * React hook for monitoring and controlling the photo upload queue
 */

import { useState, useEffect, useCallback } from 'react';
import { getPhotoUploadQueueStatus, triggerPhotoUploadQueue, clearPhotoRetry } from '../features/photos/queue';

interface QueueStatus {
  isProcessing: boolean;
  isOnline: boolean;
  processingPhotoId: string | null;
  queuedCount: number;
  errorCount: number;
  retryCount: number;
  totalPending: number;
}

export const usePhotoUploadQueue = () => {
  const [status, setStatus] = useState<QueueStatus>({
    isProcessing: false,
    isOnline: false,
    processingPhotoId: null,
    queuedCount: 0,
    errorCount: 0,
    retryCount: 0,
    totalPending: 0,
  });

  // Update status periodically
  useEffect(() => {
    const updateStatus = () => {
      const currentStatus = getPhotoUploadQueueStatus();
      setStatus(currentStatus);
    };

    // Initial update
    updateStatus();

    // Update every 2 seconds
    const interval = setInterval(updateStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  const triggerProcessing = useCallback(() => {
    triggerPhotoUploadQueue();
  }, []);

  const clearRetry = useCallback((photoId: string) => {
    clearPhotoRetry(photoId);
  }, []);

  return {
    status,
    triggerProcessing,
    clearRetry,
    
    // Convenience getters
    isActive: status.isProcessing || status.totalPending > 0,
    hasErrors: status.errorCount > 0,
    isOnline: status.isOnline,
  };
};