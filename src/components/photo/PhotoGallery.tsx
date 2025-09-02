/**
 * PhotoGallery Component - Grid Layout for Multiple Photos
 * Displays photo collections with lazy loading, selection, and navigation
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';
import PhotoPreview from './PhotoPreview';
import PhotoFullScreen from './PhotoFullScreen';
import { OfflineQueueStatus } from './OfflineQueueStatus';
import { Photo } from '../../features/photos/types';
import { usePhotoManager } from '../../features/photos/usePhotoManager';

export interface PhotoGalleryProps {
  photos: Photo[];
  onPhotoSelect?: (photo: Photo) => void;
  onPhotoDelete?: (photoId: string) => void;
  columns?: number;
  showControls?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  maxPhotosToShow?: number;
  enableMultiSelect?: boolean;
  showAddButton?: boolean;
  onAddPhoto?: () => void;
  enableSwipeNavigation?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  enableLazyLoading?: boolean;
  lazyLoadThreshold?: number;
  showOfflineQueue?: boolean;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  onPhotoSelect,
  onPhotoDelete,
  columns = 3,
  showControls = true,
  loading = false,
  emptyMessage = "No photos available",
  maxPhotosToShow,
  enableMultiSelect = false,
  showAddButton = false,
  onAddPhoto,
  enableSwipeNavigation = false,
  onLoadMore,
  hasMore = false,
  refreshing = false,
  onRefresh,
  enableLazyLoading = true,
  lazyLoadThreshold = 0.5,
  showOfflineQueue = true,
}) => {
  const { uploadPhotoById } = usePhotoManager();
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [fullScreenPhoto, setFullScreenPhoto] = useState<Photo | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loadedPhotos, setLoadedPhotos] = useState<Set<string>>(new Set());
  
  const flatListRef = useRef<FlatList>(null);
  const swipeGestureRef = useRef<PanGestureHandler>(null);

  // Calculate photo size based on screen width and columns
  const screenWidth = Dimensions.get('window').width;
  const photoSize = useMemo(() => {
    const padding = BioReceiptTheme.spacing.lg * 2; // Container padding
    const spacing = BioReceiptTheme.spacing.sm * (columns - 1); // Spacing between items
    const calculatedSize = Math.floor((screenWidth - padding - spacing) / columns);
    // Ensure minimum touch target of 48dp
    return Math.max(calculatedSize, 48);
  }, [screenWidth, columns]);

  // Display photos (limited by maxPhotosToShow if specified)
  const displayPhotos = useMemo(() => {
    return maxPhotosToShow ? photos.slice(0, maxPhotosToShow) : photos;
  }, [photos, maxPhotosToShow]);

  const hasMorePhotos = maxPhotosToShow && photos.length > maxPhotosToShow;
  const remainingCount = hasMorePhotos ? photos.length - maxPhotosToShow : 0;

  // Lazy loading effect
  useEffect(() => {
    if (enableLazyLoading) {
      // Initially load first batch of photos
      const initialBatch = displayPhotos.slice(0, 6);
      const initialIds = new Set(initialBatch.map(photo => photo.id));
      setLoadedPhotos(initialIds);
    } else {
      // Load all photos if lazy loading is disabled
      setLoadedPhotos(new Set(displayPhotos.map(photo => photo.id)));
    }
  }, [displayPhotos, enableLazyLoading]);

  // Swipe navigation handlers
  const handleSwipeGesture = useCallback((event: any) => {
    if (!enableSwipeNavigation || photos.length <= 1) return;

    const { translationX, state } = event.nativeEvent;
    
    if (state === State.END) {
      const threshold = 50;
      
      if (translationX > threshold && currentPhotoIndex > 0) {
        // Swipe right - previous photo
        setCurrentPhotoIndex(currentPhotoIndex - 1);
      } else if (translationX < -threshold && currentPhotoIndex < photos.length - 1) {
        // Swipe left - next photo
        setCurrentPhotoIndex(currentPhotoIndex + 1);
      }
    }
  }, [enableSwipeNavigation, photos.length, currentPhotoIndex]);

  // Load more photos for lazy loading
  const loadMorePhotos = useCallback(() => {
    if (!enableLazyLoading) return;

    const currentlyLoaded = Array.from(loadedPhotos);
    const nextBatch = displayPhotos.slice(currentlyLoaded.length, currentlyLoaded.length + 6);
    const newIds = new Set([...loadedPhotos, ...nextBatch.map(photo => photo.id)]);
    setLoadedPhotos(newIds);
  }, [enableLazyLoading, loadedPhotos, displayPhotos]);

  // Handle scroll to load more
  const handleScroll = useCallback((event: any) => {
    if (!enableLazyLoading && !onLoadMore) return;

    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const paddingToBottom = 20;
    
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - paddingToBottom) {
      if (enableLazyLoading && loadedPhotos.size < displayPhotos.length) {
        loadMorePhotos();
      } else if (onLoadMore && hasMore && !loading) {
        onLoadMore();
      }
    }
  }, [enableLazyLoading, onLoadMore, hasMore, loading, loadedPhotos.size, displayPhotos.length, loadMorePhotos]);

  const handlePhotoPress = useCallback((photo: Photo) => {
    if (isMultiSelectMode) {
      const newSelected = new Set(selectedPhotos);
      if (newSelected.has(photo.id)) {
        newSelected.delete(photo.id);
      } else {
        newSelected.add(photo.id);
      }
      setSelectedPhotos(newSelected);
    } else {
      if (onPhotoSelect) {
        onPhotoSelect(photo);
      } else {
        setFullScreenPhoto(photo);
      }
    }
  }, [isMultiSelectMode, selectedPhotos, onPhotoSelect]);

  const handlePhotoLongPress = useCallback((photo: Photo) => {
    if (enableMultiSelect && !isMultiSelectMode) {
      setIsMultiSelectMode(true);
      setSelectedPhotos(new Set([photo.id]));
    }
  }, [enableMultiSelect, isMultiSelectMode]);

  const handleDeletePhoto = useCallback((photoId: string) => {
    if (!onPhotoDelete) return;

    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onPhotoDelete(photoId),
        },
      ],
      { cancelable: true }
    );
  }, [onPhotoDelete]);

  const handleDeleteSelected = useCallback(() => {
    if (!onPhotoDelete || selectedPhotos.size === 0) return;

    Alert.alert(
      'Delete Photos',
      `Are you sure you want to delete ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? 's' : ''}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            selectedPhotos.forEach(photoId => onPhotoDelete(photoId));
            setSelectedPhotos(new Set());
            setIsMultiSelectMode(false);
          },
        },
      ],
      { cancelable: true }
    );
  }, [onPhotoDelete, selectedPhotos]);

  const exitMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(false);
    setSelectedPhotos(new Set());
  }, []);

  const handleRetryUpload = useCallback(async (photoId: string) => {
    try {
      await uploadPhotoById(photoId);
    } catch (error) {
      console.error('Retry upload failed:', error);
    }
  }, [uploadPhotoById]);

  const renderPhoto = useCallback(({ item, index }: { item: Photo; index: number }) => {
    const isSelected = selectedPhotos.has(item.id);
    const isLastItem = hasMorePhotos && index === displayPhotos.length - 1;
    const isLoaded = !enableLazyLoading || loadedPhotos.has(item.id);
    const hasError = item.status === 'error';
    const isUploading = item.status === 'uploading';
    
    // Accessibility labels
    const photoNumber = index + 1;
    const totalPhotos = displayPhotos.length;
    const statusText = hasError ? 'upload failed' : isUploading ? 'uploading' : 'uploaded';
    const accessibilityLabel = `Photo ${photoNumber} of ${totalPhotos}, ${statusText}${isSelected ? ', selected' : ''}`;
    const accessibilityHint = isMultiSelectMode 
      ? 'Double tap to select or deselect' 
      : 'Double tap to view full size, long press to select multiple photos';
    
    return (
      <View 
        style={[styles.photoContainer, { width: photoSize, height: photoSize }]}
        accessible={true}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ selected: isSelected }}
      >
        {isLoaded ? (
          <View style={{ position: 'relative' }}>
            <PhotoPreview
              photoUrl={item.uriRemote || item.uriLocal}
              onPress={() => handlePhotoPress(item)}
              onLongPress={() => handlePhotoLongPress(item)}
              onDelete={showControls && !isMultiSelectMode ? () => handleDeletePhoto(item.id) : undefined}
              showControls={showControls && !isMultiSelectMode}
              size={photoSize}
              metadata={item.metadata}
              style={[
                isSelected && styles.selectedPhoto,
                { marginRight: (index + 1) % columns === 0 ? 0 : BioReceiptTheme.spacing.sm }
              ]}
            />
            
            {/* Upload progress overlay */}
            {isUploading && (
              <View 
                style={styles.uploadOverlay}
                accessible={true}
                accessibilityLabel={`Uploading photo, ${item.uploadProgress ? Math.round(item.uploadProgress) + ' percent complete' : 'in progress'}`}
              >
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.uploadText}>
                  {item.uploadProgress ? `${Math.round(item.uploadProgress)}%` : 'Uploading...'}
                </Text>
              </View>
            )}
            
            {/* Error overlay with retry button */}
            {hasError && (
              <View 
                style={styles.errorOverlay}
                accessible={true}
                accessibilityLabel="Photo upload failed"
              >
                <View style={styles.errorContent}>
                  <Text style={styles.errorIcon} accessibilityLabel="Warning">⚠️</Text>
                  <Text style={styles.errorText}>Upload failed</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => handleRetryUpload(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Retry uploading photo ${photoNumber}`}
                    accessibilityHint="Double tap to retry the failed upload"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View 
            style={[styles.photoPlaceholder, { width: photoSize, height: photoSize }]}
            accessible={true}
            accessibilityLabel={`Loading photo ${photoNumber}`}
          >
            <ActivityIndicator size="small" color={BioReceiptTheme.colors.primary} />
          </View>
        )}
        {isMultiSelectMode && (
          <View 
            style={[styles.selectionOverlay, isSelected && styles.selectedOverlay]}
            accessible={false}
            importantForAccessibility="no"
          >
            {isSelected && <Text style={styles.checkmark} accessibilityLabel="Selected">✓</Text>}
          </View>
        )}
        {isLastItem && (
          <View 
            style={styles.morePhotosOverlay}
            accessible={true}
            accessibilityLabel={`${remainingCount} more photos available`}
            accessibilityRole="text"
          >
            <Text style={styles.morePhotosText}>+{remainingCount}</Text>
          </View>
        )}
      </View>
    );
  }, [
    photoSize,
    selectedPhotos,
    columns,
    showControls,
    isMultiSelectMode,
    hasMorePhotos,
    displayPhotos.length,
    remainingCount,
    enableLazyLoading,
    loadedPhotos,
    handlePhotoPress,
    handlePhotoLongPress,
    handleDeletePhoto,
    handleRetryUpload,
  ]);

  const renderAddButton = useCallback(() => {
    if (!showAddButton || !onAddPhoto) return null;

    return (
      <TouchableOpacity
        style={[styles.addButton, { width: photoSize, height: photoSize }]}
        onPress={onAddPhoto}
        accessibilityRole="button"
        accessibilityLabel="Add photo"
      >
        <Text style={styles.addButtonIcon}>+</Text>
        <Text style={styles.addButtonText}>Add Photo</Text>
      </TouchableOpacity>
    );
  }, [showAddButton, onAddPhoto, photoSize]);

  const renderHeader = useCallback(() => {
    if (photos.length === 0) return null;

    return (
      <View style={styles.header}>
        <Text style={styles.photoCount}>
          {photos.length} photo{photos.length !== 1 ? 's' : ''}
          {maxPhotosToShow && photos.length > maxPhotosToShow && ` (showing ${maxPhotosToShow})`}
        </Text>
        {isMultiSelectMode && (
          <View style={styles.multiSelectControls}>
            <TouchableOpacity
              style={styles.multiSelectButton}
              onPress={exitMultiSelectMode}
              accessibilityRole="button"
              accessibilityLabel="Exit selection mode"
            >
              <Text style={styles.multiSelectButtonText}>Cancel</Text>
            </TouchableOpacity>
            {selectedPhotos.size > 0 && (
              <TouchableOpacity
                style={[styles.multiSelectButton, styles.deleteButton]}
                onPress={handleDeleteSelected}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${selectedPhotos.size} selected photos`}
              >
                <Text style={[styles.multiSelectButtonText, styles.deleteButtonText]}>
                  Delete ({selectedPhotos.size})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }, [
    photos.length,
    maxPhotosToShow,
    isMultiSelectMode,
    selectedPhotos.size,
    exitMultiSelectMode,
    handleDeleteSelected,
  ]);

  const renderEmptyState = useCallback(() => {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📷</Text>
        <Text style={styles.emptyMessage}>{emptyMessage}</Text>
        {showAddButton && onAddPhoto && (
          <TouchableOpacity
            style={styles.emptyAddButton}
            onPress={onAddPhoto}
            accessibilityRole="button"
            accessibilityLabel="Add first photo"
          >
            <Text style={styles.emptyAddButtonText}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [emptyMessage, showAddButton, onAddPhoto]);

  const renderFooter = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={BioReceiptTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      );
    }
    return null;
  }, [loading]);

  // Prepare data for FlatList
  const flatListData = useMemo(() => {
    const data = [...displayPhotos];
    if (showAddButton && onAddPhoto && !isMultiSelectMode) {
      data.push({ id: 'add-button', url: '', isAddButton: true } as any);
    }
    return data;
  }, [displayPhotos, showAddButton, onAddPhoto, isMultiSelectMode]);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    if (item.isAddButton) {
      return renderAddButton();
    }
    return renderPhoto({ item, index });
  }, [renderPhoto, renderAddButton]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: photoSize + BioReceiptTheme.spacing.md,
    offset: (photoSize + BioReceiptTheme.spacing.md) * Math.floor(index / columns),
    index,
  }), [photoSize, columns]);

  if (photos.length === 0 && !loading) {
    return renderEmptyState();
  }

  return (
    <View style={styles.container}>
      {showOfflineQueue && <OfflineQueueStatus compact={true} />}
      {renderHeader()}
      <PanGestureHandler
        ref={swipeGestureRef}
        onGestureEvent={handleSwipeGesture}
        onHandlerStateChange={handleSwipeGesture}
        enabled={enableSwipeNavigation}
      >
        <FlatList
          ref={flatListRef}
          data={flatListData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          initialNumToRender={24}
          maxToRenderPerBatch={24}
          windowSize={7}
          ListFooterComponent={renderFooter}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={onLoadMore && hasMore ? onLoadMore : undefined}
          onEndReachedThreshold={lazyLoadThreshold}
          // Performance optimizations
          updateCellsBatchingPeriod={50}
          legacyImplementation={false}
          disableVirtualization={false}
        />
      </PanGestureHandler>

      {/* Full Screen Photo Modal */}
      {fullScreenPhoto && (
        <PhotoFullScreen
          photoUrl={fullScreenPhoto.url}
          visible={true}
          onClose={() => setFullScreenPhoto(null)}
          onDelete={showControls ? () => {
            handleDeletePhoto(fullScreenPhoto.id);
            setFullScreenPhoto(null);
          } : undefined}
          metadata={fullScreenPhoto.metadata}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BioReceiptTheme.colors.border,
  },
  photoCount: {
    fontSize: 16,
    fontWeight: '600',
    color: BioReceiptTheme.colors.textPrimary,
  },
  multiSelectControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  multiSelectButton: {
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.sm,
    borderRadius: BioReceiptTheme.borderRadius.sm,
    marginLeft: BioReceiptTheme.spacing.sm,
  },
  multiSelectButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: BioReceiptTheme.colors.primary,
  },
  gridContainer: {
    padding: BioReceiptTheme.spacing.lg,
    paddingBottom: BioReceiptTheme.spacing.xl,
  },
  photoContainer: {
    marginBottom: BioReceiptTheme.spacing.md,
    position: 'relative',
  },
  selectedPhoto: {
    opacity: 0.7,
  },

  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: BioReceiptTheme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedOverlay: {
    backgroundColor: 'rgba(0, 123, 255, 0.3)',
  },
  checkmark: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },

  morePhotosOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },

  deleteButton: {
    backgroundColor: BioReceiptTheme.colors.error,
  },
  deleteButtonText: {
    color: 'white',
  },
  addButton: {
    backgroundColor: BioReceiptTheme.colors.surface,
    borderRadius: BioReceiptTheme.borderRadius.md,
    borderWidth: 2,
    borderColor: BioReceiptTheme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: BioReceiptTheme.spacing.md,
  },
  addButtonIcon: {
    fontSize: 32,
    color: BioReceiptTheme.colors.textSecondary,
    marginBottom: BioReceiptTheme.spacing.xs,
  },
  addButtonText: {
    fontSize: 12,
    color: BioReceiptTheme.colors.textSecondary,
    fontWeight: '500',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: BioReceiptTheme.spacing.xl,
    paddingVertical: BioReceiptTheme.spacing.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: BioReceiptTheme.spacing.lg,
    opacity: 0.5,
  },
  emptyMessage: {
    fontSize: 16,
    color: BioReceiptTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: BioReceiptTheme.spacing.xl,
  },
  emptyAddButton: {
    backgroundColor: BioReceiptTheme.colors.primary,
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.md,
    borderRadius: BioReceiptTheme.borderRadius.md,
  },
  emptyAddButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: BioReceiptTheme.spacing.lg,
  },
  loadingText: {
    marginLeft: BioReceiptTheme.spacing.sm,
    fontSize: 14,
    color: BioReceiptTheme.colors.textSecondary,
  },
  photoPlaceholder: {
    backgroundColor: BioReceiptTheme.colors.surface,
    borderRadius: BioReceiptTheme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: BioReceiptTheme.spacing.md,
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
  },
  swipeIndicator: {
    position: 'absolute',
    bottom: BioReceiptTheme.spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  swipeDotActive: {
    backgroundColor: 'white',
  },
  navigationButtons: {
    position: 'absolute',
    top: '50%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: BioReceiptTheme.spacing.md,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BioReceiptTheme.borderRadius.md,
  },
  uploadText: {
    color: 'white',
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    marginTop: BioReceiptTheme.spacing.xs,
    fontWeight: '500',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BioReceiptTheme.borderRadius.md,
  },
  errorContent: {
    alignItems: 'center',
    padding: BioReceiptTheme.spacing.sm,
  },
  errorIcon: {
    fontSize: 20,
    marginBottom: BioReceiptTheme.spacing.xs,
  },
  errorText: {
    color: 'white',
    fontSize: BioReceiptTheme.typography.fontSize.xs,
    textAlign: 'center',
    marginBottom: BioReceiptTheme.spacing.sm,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.sm,
    borderRadius: BioReceiptTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 48, // Minimum touch target
    minHeight: 48, // Minimum touch target
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: BioReceiptTheme.typography.fontSize.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default PhotoGallery;
export type { PhotoGalleryProps };