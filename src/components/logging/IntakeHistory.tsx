/**
 * Intake History - MVP Intake History Component
 * Accessible history display with edit/delete functionality and photo integration
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';
import { supabaseHelpers } from '../../config/supabase';
import { getPhotosByIntakes, IntakePhoto } from '../../features/photos/selectors';
import PhotoGalleryModal from '../../features/photos/PhotoGalleryModal';

// IntakePhoto interface is now imported from selectors

interface IntakeHistoryItem {
  id: string;
  substance_id: string;
  quantity: number;
  unit: string;
  timestamp: string;
  notes?: string;
  photos?: IntakePhoto[];
  substances: {
    name: string;
    category: string;
    default_unit: string;
  };
}

interface Props {
  userId?: string;
  refreshTrigger?: number;
  limit?: number;
  showActions?: boolean;
}

const IntakeHistory: React.FC<Props> = ({
  userId,
  refreshTrigger = 0,
  limit = 10,
  showActions = true,
}) => {
  const [history, setHistory] = useState<IntakeHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIntakeId, setSelectedIntakeId] = useState<string | null>(null);
  const [photosByIntake, setPhotosByIntake] = useState<Record<string, IntakePhoto[]>>({});
  const [photoLoadingStates, setPhotoLoadingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (userId) {
      loadHistory();
    }
  }, [userId, refreshTrigger]);

  // Load photos when history changes
  useEffect(() => {
    if (history.length > 0) {
      loadPhotosForIntakes();
    }
  }, [history]);

  const loadHistory = async (isRefresh = false) => {
    if (!userId) return;

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const historyData = await supabaseHelpers.getIntakeHistory(userId, limit);
      setHistory(historyData || []);
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert('Error', 'Failed to load intake history');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadPhotosForIntakes = useCallback(async () => {
    if (history.length === 0) return;

    try {
      const intakeIds = history.map(item => item.id);
      const photos = await getPhotosByIntakes(intakeIds);
      setPhotosByIntake(photos);
    } catch (error) {
      console.error('Error loading photos for intakes:', error);
    }
  }, [history]);

  const handleRefresh = () => {
    loadHistory(true);
  };

  const handleDeleteIntake = (item: IntakeHistoryItem) => {
    Alert.alert(
      'Delete Intake',
      `Are you sure you want to delete this ${item.substances.name} intake?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabaseHelpers.deleteIntake(item.id);
              setHistory(prev => prev.filter(h => h.id !== item.id));
            } catch (error) {
              console.error('Error deleting intake:', error);
              Alert.alert('Error', 'Failed to delete intake');
            }
          },
        },
      ]
    );
  };

  const handlePhotoDelete = async (photoId: string) => {
    try {
      // Set loading state
      setPhotoLoadingStates(prev => ({ ...prev, [photoId]: true }));

      // Delete photo from storage and database
      await supabaseHelpers.deleteIntakeMedia(photoId);
      
      // Update local photo state
      setPhotosByIntake(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(intakeId => {
          updated[intakeId] = updated[intakeId].filter(photo => photo.id !== photoId);
        });
        return updated;
      });

      // Clear loading state
      setPhotoLoadingStates(prev => {
        const newState = { ...prev };
        delete newState[photoId];
        return newState;
      });
    } catch (error) {
      console.error('Error deleting photo:', error);
      Alert.alert('Error', 'Failed to delete photo');
      
      // Clear loading state on error
      setPhotoLoadingStates(prev => {
        const newState = { ...prev };
        delete newState[photoId];
        return newState;
      });
    }
  };

  const handleOpenPhotoGallery = useCallback((intakeId: string) => {
    setSelectedIntakeId(intakeId);
  }, []);

  const handleClosePhotoModal = useCallback(() => {
    setSelectedIntakeId(null);
  }, []);

  // Calculate thumbnail size and max photos to show
  const thumbnailSize = 64; // 64dp as specified
  const maxPhotosInStrip = 3; // Show max 3 thumbnails as specified

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes}m ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      alcohol: BioReceiptTheme.colors.warning,
      caffeine: BioReceiptTheme.colors.info,
      supplements: BioReceiptTheme.colors.success,
      medications: BioReceiptTheme.colors.error,
      food: BioReceiptTheme.colors.primary,
      recreational: BioReceiptTheme.colors.secondary,
      other: BioReceiptTheme.colors.textTertiary,
    };
    return colors[category] || BioReceiptTheme.colors.textTertiary;
  };

  // Memoized photo thumbnail component for performance
  const PhotoThumbnail = React.memo<{
    photo: IntakePhoto;
    index: number;
    totalPhotos: number;
    intakeId: string;
    isLast: boolean;
  }>(({ photo, index, totalPhotos, intakeId, isLast }) => (
    <TouchableOpacity
      style={[
        styles.photoThumbnail,
        { marginRight: isLast ? 0 : 8 }
      ]}
      onPress={() => handleOpenPhotoGallery(intakeId)}
      accessibilityRole="button"
      accessibilityLabel={`Photo ${index + 1} of ${totalPhotos} for intake`}
      accessibilityHint="Opens full photo gallery"
    >
      <Image
        source={{ uri: photo.thumbnail_url || photo.url }}
        style={styles.thumbnailImage}
        resizeMode="cover"
      />
      {photoLoadingStates[photo.id] && (
        <View style={styles.thumbnailLoading}>
          <ActivityIndicator size="small" color="white" />
        </View>
      )}
    </TouchableOpacity>
  ));

  // Render photo strip with thumbnails and count badge
  const renderPhotoStrip = useCallback((intakeId: string) => {
    const photos = photosByIntake[intakeId] || [];
    
    if (photos.length === 0) {
      return (
        <TouchableOpacity
          style={styles.addPhotosChip}
          onPress={() => {/* TODO: Add photo functionality */}}
          accessibilityRole="button"
          accessibilityLabel="Add photos to this intake"
        >
          <Text style={styles.addPhotosText}>Add photos</Text>
        </TouchableOpacity>
      );
    }

    const displayPhotos = photos.slice(0, maxPhotosInStrip);
    const remainingCount = photos.length - maxPhotosInStrip;

    return (
      <View style={styles.photoStripContainer}>
        <FlatList
          data={displayPhotos}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(photo) => photo.id}
          removeClippedSubviews={true}
          windowSize={5}
          renderItem={({ item: photo, index }) => (
            <PhotoThumbnail
              photo={photo}
              index={index}
              totalPhotos={photos.length}
              intakeId={intakeId}
              isLast={index === displayPhotos.length - 1}
            />
          )}
        />
        {remainingCount > 0 && (
          <TouchableOpacity
            style={styles.morePhotosButton}
            onPress={() => handleOpenPhotoGallery(intakeId)}
            accessibilityRole="button"
            accessibilityLabel={`View all ${photos.length} photos for this intake`}
          >
            <Text style={styles.morePhotosButtonText}>+{remainingCount}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [photosByIntake, photoLoadingStates, handleOpenPhotoGallery]);

  const renderHistoryItem = ({ item }: { item: IntakeHistoryItem }) => (
    <View style={styles.historyItem}>
      <View style={styles.itemHeader}>
        <View style={styles.substanceInfo}>
          <View style={styles.substanceNameRow}>
            <View 
              style={[
                styles.categoryIndicator, 
                { backgroundColor: getCategoryColor(item.substances.category) }
              ]} 
            />
            <Text style={styles.substanceName}>{item.substances.name}</Text>
          </View>
          <Text style={styles.categoryText}>{item.substances.category}</Text>
        </View>
        <View style={styles.quantityInfo}>
          <Text style={styles.quantityText}>
            {item.quantity} {item.unit}
          </Text>
          <Text style={styles.timestampText}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
      </View>

      {item.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      )}

      {/* Photo Strip Section */}
      <View style={styles.photosContainer}>
        {renderPhotoStrip(item.id)}
      </View>

      {showActions && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteIntake(item)}
            accessible={true}
            accessibilityLabel={`Delete ${item.substances.name} intake`}
            accessibilityHint="Remove this intake from your history"
            accessibilityRole="button"
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Intakes Yet</Text>
      <Text style={styles.emptyStateText}>
        Start logging your substance intake to see your history here
      </Text>
    </View>
  );

  if (isLoading && history.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={BioReceiptTheme.colors.primary}
            colors={[BioReceiptTheme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          history.length === 0 && styles.listContentEmpty
        ]}
        accessible={true}
        accessibilityLabel="Intake history list"
        accessibilityHint="Swipe down to refresh your intake history"
        testID="intake-history-list"
      />

      {/* Photo Gallery Modal */}
      {selectedIntakeId && (
        <PhotoGalleryModal
          intakeId={selectedIntakeId}
          visible={true}
          onClose={handleClosePhotoModal}
          onPhotoDelete={showActions ? handlePhotoDelete : undefined}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: BioReceiptTheme.spacing.lg,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: BioReceiptTheme.spacing.xl,
  },
  loadingText: {
    fontSize: BioReceiptTheme.typography.fontSize.base,
    color: BioReceiptTheme.colors.textSecondary,
  },
  historyItem: {
    backgroundColor: BioReceiptTheme.colors.surface,
    borderRadius: BioReceiptTheme.borderRadius.lg,
    padding: BioReceiptTheme.spacing.md,
    marginBottom: BioReceiptTheme.spacing.md,
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  substanceInfo: {
    flex: 1,
    marginRight: BioReceiptTheme.spacing.md,
  },
  substanceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: BioReceiptTheme.spacing.xs,
  },
  categoryIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: BioReceiptTheme.spacing.sm,
  },
  substanceName: {
    fontSize: BioReceiptTheme.typography.fontSize.base,
    fontWeight: '600',
    color: BioReceiptTheme.colors.textPrimary,
    flex: 1,
  },
  categoryText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textSecondary,
    marginLeft: BioReceiptTheme.spacing.lg, // Align with substance name
  },
  quantityInfo: {
    alignItems: 'flex-end',
  },
  quantityText: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    fontWeight: '600',
    color: BioReceiptTheme.colors.primary,
    marginBottom: BioReceiptTheme.spacing.xs,
  },
  timestampText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textTertiary,
  },
  notesContainer: {
    marginTop: BioReceiptTheme.spacing.sm,
    paddingTop: BioReceiptTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: BioReceiptTheme.colors.border,
  },
  notesText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: BioReceiptTheme.spacing.sm,
    paddingTop: BioReceiptTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: BioReceiptTheme.colors.border,
  },
  deleteButton: {
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.sm,
    borderRadius: BioReceiptTheme.borderRadius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    minHeight: 32,
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.error,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: BioReceiptTheme.spacing.xl * 2,
    paddingHorizontal: BioReceiptTheme.spacing.lg,
  },
  emptyStateTitle: {
    fontSize: BioReceiptTheme.typography.fontSize.xl,
    fontWeight: '600',
    color: BioReceiptTheme.colors.textSecondary,
    marginBottom: BioReceiptTheme.spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: BioReceiptTheme.typography.fontSize.base,
    color: BioReceiptTheme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
  photosContainer: {
    marginTop: BioReceiptTheme.spacing.sm,
    paddingTop: BioReceiptTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: BioReceiptTheme.colors.border,
  },
  photoStripContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoThumbnail: {
    width: 64,
    height: 64,
    borderRadius: BioReceiptTheme.borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosButton: {
    width: 64,
    height: 64,
    borderRadius: BioReceiptTheme.borderRadius.xl,
    backgroundColor: BioReceiptTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  morePhotosButtonText: {
    color: 'white',
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    fontWeight: '600',
  },
  addPhotosChip: {
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.sm,
    backgroundColor: BioReceiptTheme.colors.surface,
    borderRadius: BioReceiptTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
    borderStyle: 'dashed',
  },
  addPhotosText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textSecondary,
    fontWeight: '500',
  },

});

export default IntakeHistory;