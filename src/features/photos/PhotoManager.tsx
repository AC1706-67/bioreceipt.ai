/**
 * Photo Manager Component
 * Initializes and manages photo system lifecycle
 */

import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { usePhotoStore, initializePhotoStore } from './store';
import { initializePhotoManagement, processUploadQueue, cleanupTempFiles } from './utils';

interface PhotoManagerProps {
  children: React.ReactNode;
}

export const PhotoManager: React.FC<PhotoManagerProps> = ({ children }) => {
  const { processQueue, isUploading } = usePhotoStore();

  useEffect(() => {
    // Initialize photo management system
    const initialize = async () => {
      try {
        await initializePhotoManagement();
        await initializePhotoStore();
        
        // Process any pending uploads
        setTimeout(() => {
          processUploadQueue();
        }, 2000);
        
        console.log('Photo management system ready');
      } catch (error) {
        console.error('Failed to initialize photo management:', error);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App became active - process upload queue
        if (!isUploading) {
          setTimeout(() => {
            processUploadQueue();
          }, 1000);
        }
      } else if (nextAppState === 'background') {
        // App going to background - cleanup temp files
        setTimeout(() => {
          cleanupTempFiles();
        }, 5000);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isUploading]);

  return <>{children}</>;
};

export default PhotoManager;