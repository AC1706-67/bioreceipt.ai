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
import { BioPulseTheme } from '../../constants/bioPulseTheme';
import PhotoPreview from './PhotoPreview';
import PhotoFullScreen from './PhotoFullScreen';
import { OfflineQueueStatus } from './OfflineQueueStatus';

export interface Photo {
  id: string;
  url: string;
  thumbnailUrl?: string;
  metadata?: {
    captureDate?: string;
    fileSize?: string;
    dimensions?: string;
    fileName?: string;
  };
}

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
    const padding = BioPulseTheme.spacing.lg * 2; // Container padding
    const spacing = BioPulseTheme.spacing.sm * (columns - 1); // Spacing between items
    return Math.floor((screenWidth - padding - spacing) / columns);
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

  const renderPhoto = useCallback(({ item, index }: { item: Photo; index: number }) => {
    const isSelected = selectedPhotos.has(item.id);
    const isLastItem = hasMorePhotos && index === displayPhotos.length - 1;
    const isLoaded = !enableLazyLoading || loadedPhotos.has(item.id);
    
    return (
      <View style={[styles.photoContainer, { width: photoSize, height: photoSize }]}>
        {isLoaded ? (
          <PhotoPreview
            photoUrl={item.thumbnailUrl || item.url}
            onPress={() => handlePhotoPress(item)}
            onLongPress={() => handlePhotoLongPress(item)}
            onDelete={showControls && !isMultiSelectMode ? () => handleDeletePhoto(item.id) : undefined}
            showControls={showControls && !isMultiSelectMode}
            size={photoSize}
            metadata={item.metadata}
            style={[
              isSelected && styles.selectedPhoto,
              { marginRight: (index + 1) % columns === 0 ? 0 : BioPulseTheme.spacing.sm }
            ]}
          />
        ) : (
          <View style={[styles.photoPlaceholder, { width: photoSize, height: photoSize }]}>
            <ActivityIndicator size="small" color={BioPulseTheme.colors.primary} />
          </View>
        )}
        {isMultiSelectMode && (
          <View style={[styles.selectionOverlay, isSelected && styles.selectedOverlay]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
        {isLastItem && (
          <View style={styles.morePhotosOverlay}>
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
          <ActivityIndicator size="small" color={BioPulseTheme.colors.primary} />
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
    length: photoSize + BioPulseTheme.spacing.md,
    offset: (photoSize + BioPulseTheme.spacing.md) * Math.floor(index / columns),
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
          maxToRenderPerBatch={enableLazyLoading ? 6 : 10}
          windowSize={enableLazyLoading ? 5 : 10}
          initialNumToRender={enableLazyLoading ? 6 : 6}
          ListFooterComponent={renderFooter}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={onLoadMore && hasMore ? onLoadMore : undefined}
          onEndReachedThreshold={lazyLoadThreshold}
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
    paddingHorizontal: BioPulseTheme.spacing.lg,
    paddingVertical: BioPulseTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BioPulseTheme.colors.border,
  },
  photoCount: {
    fontSize: 16,
    fontWeight: '600',
    color: BioPulseTheme.colors.textPrimary,
  },
  multiSelectControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  multiSelectButton: {
    paddingHorizontal: BioPulseTheme.spacing.md,
    paddingVertical: BioPulseTheme.spacing.sm,
    borderRadius: BioPulseTheme.borderRadius.sm,
    marginLeft: BioPulseTheme.spacing.sm,
  },
  multiSelectButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: BioPulseTheme.colors.primary,
  },
  gridContainer: {
    padding: BioPulseTheme.spacing.lg,
    paddingBottom: BioPulseTheme.spacing.xl,
  },
  photoContainer: {
    marginBottom: BioPulseTheme.spacing.md,
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
    borderRadius: BioPulseTheme.borderRadius.md,
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
    backgroundColor: BioPulseTheme.colors.error,
  },
  deleteButtonText: {
    color: 'white',
  },
  addButton: {
    backgroundColor: BioPulseTheme.colors.surface,
    borderRadius: BioPulseTheme.borderRadius.md,
    borderWidth: 2,
    borderColor: BioPulseTheme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: BioPulseTheme.spacing.md,
  },
  addButtonIcon: {
    fontSize: 32,
    color: BioPulseTheme.colors.textSecondary,
    marginBottom: BioPulseTheme.spacing.xs,
  },
  addButtonText: {
    fontSize: 12,
    color: BioPulseTheme.colors.textSecondary,
    fontWeight: '500',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: BioPulseTheme.spacing.xl,
    paddingVertical: BioPulseTheme.spacing.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: BioPulseTheme.spacing.lg,
    opacity: 0.5,
  },
  emptyMessage: {
    fontSize: 16,
    color: BioPulseTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: BioPulseTheme.spacing.xl,
  },
  emptyAddButton: {
    backgroundColor: BioPulseTheme.colors.primary,
    paddingHorizontal: BioPulseTheme.spacing.lg,
    paddingVertical: BioPulseTheme.spacing.md,
    borderRadius: BioPulseTheme.borderRadius.md,
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
    paddingVertical: BioPulseTheme.spacing.lg,
  },
  loadingText: {
    marginLeft: BioPulseTheme.spacing.sm,
    fontSize: 14,
    color: BioPulseTheme.colors.textSecondary,
  },
  photoPlaceholder: {
    backgroundColor: BioPulseTheme.colors.surface,
    borderRadius: BioPulseTheme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: BioPulseTheme.spacing.md,
    borderWidth: 1,
    borderColor: BioPulseTheme.colors.border,
  },
  swipeIndicator: {
    position: 'absolute',
    bottom: BioPulseTheme.spacing.md,
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
    paddingHorizontal: BioPulseTheme.spacing.md,
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
});

export default PhotoGallery;
export type { Photo, PhotoGalleryProps };