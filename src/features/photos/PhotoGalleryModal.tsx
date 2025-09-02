/**
 * PhotoGalleryModal - Full-screen photo gallery for intake photos
 * Swipe navigation, pinch zoom, and photo management
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';
import PhotoGallery, { Photo } from '../../components/photo/PhotoGallery';
import { getPhotosByIntake, IntakePhoto } from './selectors';

interface PhotoGalleryModalProps {
  intakeId: string;
  visible: boolean;
  onClose: () => void;
  onPhotoDelete?: (photoId: string) => void;
  initialPhotoIndex?: number;
}

const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({
  intakeId,
  visible,
  onClose,
  onPhotoDelete,
  initialPhotoIndex = 0,
}) => {
  const [photos, setPhotos] = useState<IntakePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(initialPhotoIndex);

  // Calculate responsive columns based on screen size
  const screenWidth = Dimensions.get('window').width;
  const columns = useMemo(() => {
    if (screenWidth < 400) return 2; // Small screens
    if (screenWidth < 600) return 3; // Medium screens
    return 4; // Large screens
  }, [screenWidth]);

  // Load photos when modal opens
  useEffect(() => {
    if (visible && intakeId) {
      loadPhotos();
    }
  }, [visible, intakeId]);

  // Reset current index when photos change
  useEffect(() => {
    if (photos.length > 0 && initialPhotoIndex < photos.length) {
      setCurrentIndex(initialPhotoIndex);
    } else {
      setCurrentIndex(0);
    }
  }, [photos, initialPhotoIndex]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const photoData = await getPhotosByIntake(intakeId);
      setPhotos(photoData);
    } catch (err) {
      console.error('Error loading photos:', err);
      setError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = useCallback((photo: Photo) => {
    const index = photos.findIndex(p => p.id === photo.id);
    if (index !== -1) {
      setCurrentIndex(index);
    }
  }, [photos]);

  const handlePhotoDelete = useCallback(async (photoId: string) => {
    try {
      // Call parent delete handler if provided
      if (onPhotoDelete) {
        onPhotoDelete(photoId);
      }
      
      // Update local state
      setPhotos(prev => prev.filter(photo => photo.id !== photoId));
      
      // Adjust current index if needed
      setCurrentIndex(prev => {
        const newLength = photos.length - 1;
        if (newLength === 0) {
          // No photos left, close modal
          onClose();
          return 0;
        }
        // If we deleted the current photo, move to previous or stay at same index
        return prev >= newLength ? newLength - 1 : prev;
      });
    } catch (error) {
      console.error('Error deleting photo:', error);
      Alert.alert('Error', 'Failed to delete photo');
    }
  }, [onPhotoDelete, photos.length, onClose]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleRetry = useCallback(() => {
    loadPhotos();
  }, [intakeId]);

  // Convert IntakePhoto to Photo format for PhotoGallery
  const galleryPhotos: Photo[] = useMemo(() => {
    return photos.map(photo => ({
      id: photo.id,
      url: photo.url,
      thumbnailUrl: photo.thumbnail_url,
      metadata: {
        captureDate: photo.created_at,
        fileSize: photo.file_size ? `${(photo.file_size / 1024 / 1024).toFixed(1)} MB` : undefined,
        dimensions: photo.dimensions ? `${photo.dimensions.width}x${photo.dimensions.height}` : undefined,
        fileName: `intake_photo_${photo.id}.jpg`,
      },
    }));
  }, [photos]);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={BioReceiptTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>📷</Text>
          <Text style={styles.errorTitle}>Failed to Load Photos</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry loading photos"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (photos.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyTitle}>No Photos</Text>
          <Text style={styles.emptyMessage}>This intake doesn't have any photos yet.</Text>
        </View>
      );
    }

    return (
      <PhotoGallery
        photos={galleryPhotos}
        onPhotoSelect={handlePhotoSelect}
        onPhotoDelete={onPhotoDelete ? handlePhotoDelete : undefined}
        columns={columns}
        showControls={true}
        enableSwipeNavigation={true}
        enableLazyLoading={true}
        showOfflineQueue={false}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Intake Photos</Text>
              {photos.length > 0 && (
                <Text style={styles.subtitle}>
                  {photos.length} photo{photos.length !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close photo gallery"
              accessibilityHint="Returns to intake history"
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {renderContent()}
        </View>

        {/* Photo Navigation Indicator */}
        {photos.length > 1 && (
          <View style={styles.navigationIndicator}>
            <Text style={styles.navigationText}>
              {currentIndex + 1} of {photos.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BioReceiptTheme.colors.background,
  },
  header: {
    paddingTop: StatusBar.currentHeight || 44, // Account for status bar
    backgroundColor: BioReceiptTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: BioReceiptTheme.colors.border,
    shadowColor: BioReceiptTheme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: BioReceiptTheme.typography.fontSize.xl,
    fontWeight: '600',
    color: BioReceiptTheme.colors.textPrimary,
    marginBottom: BioReceiptTheme.spacing.xs,
  },
  subtitle: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textSecondary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BioReceiptTheme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: BioReceiptTheme.spacing.md,
  },
  closeButtonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: BioReceiptTheme.spacing.xl,
  },
  loadingText: {
    fontSize: BioReceiptTheme.typography.fontSize.base,
    color: BioReceiptTheme.colors.textSecondary,
    marginTop: BioReceiptTheme.spacing.md,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: BioReceiptTheme.spacing.lg,
    opacity: 0.5,
  },
  errorTitle: {
    fontSize: BioReceiptTheme.typography.fontSize.xl,
    fontWeight: '600',
    color: BioReceiptTheme.colors.textPrimary,
    marginBottom: BioReceiptTheme.spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: BioReceiptTheme.typography.fontSize.base,
    color: BioReceiptTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: BioReceiptTheme.spacing.xl,
  },
  retryButton: {
    backgroundColor: BioReceiptTheme.colors.primary,
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.md,
    borderRadius: BioReceiptTheme.borderRadius.md,
  },
  retryButtonText: {
    color: 'white',
    fontSize: BioReceiptTheme.typography.fontSize.base,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: BioReceiptTheme.spacing.lg,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: BioReceiptTheme.typography.fontSize.xl,
    fontWeight: '600',
    color: BioReceiptTheme.colors.textSecondary,
    marginBottom: BioReceiptTheme.spacing.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: BioReceiptTheme.typography.fontSize.base,
    color: BioReceiptTheme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 24,
  },
  navigationIndicator: {
    position: 'absolute',
    bottom: BioReceiptTheme.spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  navigationText: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.sm,
    borderRadius: BioReceiptTheme.borderRadius.md,
    overflow: 'hidden',
  },
});

export default PhotoGalleryModal;