/**
 * Intake History - MVP Intake History Component
 * Accessible history display with edit/delete functionality
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { BioPulseTheme } from '../../constants/bioPulseTheme';
import { supabaseHelpers } from '../../config/supabase';
import PhotoGallery, { Photo } from '../photo/PhotoGallery';

interface IntakePhoto {
  id: string;
  intake_id: string;
  url: string;
  thumbnail_url?: string;
  created_at: string;
  file_size?: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

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
  const [selectedIntakeForPhotos, setSelectedIntakeForPhotos] = useState<IntakeHistoryItem | null>(null);
  const [photoLoadingStates, setPhotoLoadingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (userId) {
      loadHistory();
    }
  }, [userId, refreshTrigger]);

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

  const handlePhotoSelect = (photo: Photo) => {
    // Photo selection is handled by PhotoGallery's full-screen modal
    console.log('Photo selected:', photo.id);
  };

  const handlePhotoDelete = async (photoId: string) => {
    try {
      // Set loading state
      setPhotoLoadingStates(prev => ({ ...prev, [photoId]: true }));

      // Delete photo from storage and database
      await supabaseHelpers.deleteIntakeMedia(photoId);
      
      // Update local state
      setHistory(prev => prev.map(item => ({
        ...item,
        photos: item.photos?.filter(photo => photo.id !== photoId) || []
      })));

      // Update selected intake for photos modal if open
      if (selectedIntakeForPhotos) {
        setSelectedIntakeForPhotos(prev => prev ? {
          ...prev,
          photos: prev.photos?.filter(photo => photo.id !== photoId) || []
        } : null);
      }

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

  const handleViewAllPhotos = (intake: IntakeHistoryItem) => {
    setSelectedIntakeForPhotos(intake);
  };

  const handleClosePhotoModal = () => {
    setSelectedIntakeForPhotos(null);
  };

  // Calculate responsive columns based on screen size
  const photoColumns = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    if (screenWidth < 400) return 3; // Small screens
    if (screenWidth < 600) return 4; // Medium screens
    return 5; // Large screens
  }, []);

  const modalPhotoColumns = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    if (screenWidth < 400) return 2; // Small screens
    if (screenWidth < 600) return 3; // Medium screens
    return 4; // Large screens
  }, []);

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
      alcohol: BioPulseTheme.colors.warning,
      caffeine: BioPulseTheme.colors.info,
      supplements: BioPulseTheme.colors.success,
      medications: BioPulseTheme.colors.error,
      food: BioPulseTheme.colors.primary,
      recreational: BioPulseTheme.colors.secondary,
      other: BioPulseTheme.colors.textTertiary,
    };
    return colors[category] || BioPulseTheme.colors.textTertiary;
  };

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

      {/* Photo Gallery Section */}
      {item.photos && item.photos.length > 0 && (
        <View style={styles.photosContainer}>
          <View style={styles.photoHeader}>
            <Text style={styles.photoCountText}>
              {item.photos.length} photo{item.photos.length !== 1 ? 's' : ''}
            </Text>
            {item.photos.length > photoColumns && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => handleViewAllPhotos(item)}
                accessibilityRole="button"
                accessibilityLabel={`View all ${item.photos.length} photos for ${item.substances.name} intake`}
                accessibilityHint="Opens full photo gallery"
              >
                <Text style={styles.viewAllText}>+{item.photos.length - photoColumns}</Text>
              </TouchableOpacity>
            )}
          </View>
          <PhotoGallery
            photos={item.photos.map(photo => ({
              id: photo.id,
              url: photo.url,
              thumbnailUrl: photo.thumbnail_url,
              metadata: {
                captureDate: photo.created_at,
                fileSize: photo.file_size ? `${(photo.file_size / 1024 / 1024).toFixed(1)} MB` : undefined,
                dimensions: photo.dimensions ? `${photo.dimensions.width}x${photo.dimensions.height}` : undefined,
                fileName: `intake_photo_${photo.id}.jpg`,
              },
            }))}
            onPhotoSelect={handlePhotoSelect}
            onPhotoDelete={showActions ? handlePhotoDelete : undefined}
            columns={photoColumns}
            showControls={showActions}
            emptyMessage="No photos for this intake"
            maxPhotosToShow={photoColumns} // Show max photos based on screen size
            enableLazyLoading={false} // Disable lazy loading for history cards
            loading={Object.values(photoLoadingStates).some(loading => loading)}
          />
        </View>
      )}

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
            tintColor={BioPulseTheme.colors.primary}
            colors={[BioPulseTheme.colors.primary]}
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

      {/* Full Photo Gallery Modal */}
      {selectedIntakeForPhotos && selectedIntakeForPhotos.photos && (
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalContainer}>
            <View style={styles.photoModalHeader}>
              <View style={styles.photoModalTitleContainer}>
                <Text style={styles.photoModalTitle}>
                  {selectedIntakeForPhotos.substances.name} Photos
                </Text>
                <Text style={styles.photoModalSubtitle}>
                  {formatTimestamp(selectedIntakeForPhotos.timestamp)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.photoModalCloseButton}
                onPress={handleClosePhotoModal}
                accessibilityRole="button"
                accessibilityLabel="Close photo gallery"
              >
                <Text style={styles.photoModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.photoModalContent}>
              <PhotoGallery
                photos={selectedIntakeForPhotos.photos.map(photo => ({
                  id: photo.id,
                  url: photo.url,
                  thumbnailUrl: photo.thumbnail_url,
                  metadata: {
                    captureDate: photo.created_at,
                    fileSize: photo.file_size ? `${(photo.file_size / 1024 / 1024).toFixed(1)} MB` : undefined,
                    dimensions: photo.dimensions ? `${photo.dimensions.width}x${photo.dimensions.height}` : undefined,
                    fileName: `intake_photo_${photo.id}.jpg`,
                  },
                }))}
                onPhotoSelect={handlePhotoSelect}
                onPhotoDelete={showActions ? handlePhotoDelete : undefined}
                columns={modalPhotoColumns}
                showControls={showActions}
                emptyMessage="No photos for this intake"
                enableLazyLoading={true}
                enableSwipeNavigation={true}
                loading={Object.values(photoLoadingStates).some(loading => loading)}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: BioPulseTheme.spacing.lg,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: BioPulseTheme.spacing.xl,
  },
  loadingText: {
    fontSize: BioPulseTheme.typography.fontSize.base,
    color: BioPulseTheme.colors.textSecondary,
  },
  historyItem: {
    backgroundColor: BioPulseTheme.colors.surface,
    borderRadius: BioPulseTheme.borderRadius.lg,
    padding: BioPulseTheme.spacing.md,
    marginBottom: BioPulseTheme.spacing.md,
    borderWidth: 1,
    borderColor: BioPulseTheme.colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  substanceInfo: {
    flex: 1,
    marginRight: BioPulseTheme.spacing.md,
  },
  substanceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: BioPulseTheme.spacing.xs,
  },
  categoryIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: BioPulseTheme.spacing.sm,
  },
  substanceName: {
    fontSize: BioPulseTheme.typography.fontSize.base,
    fontWeight: '600',
    color: BioPulseTheme.colors.textPrimary,
    flex: 1,
  },
  categoryText: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.textSecondary,
    marginLeft: BioPulseTheme.spacing.lg, // Align with substance name
  },
  quantityInfo: {
    alignItems: 'flex-end',
  },
  quantityText: {
    fontSize: BioPulseTheme.typography.fontSize.lg,
    fontWeight: '600',
    color: BioPulseTheme.colors.primary,
    marginBottom: BioPulseTheme.spacing.xs,
  },
  timestampText: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.textTertiary,
  },
  notesContainer: {
    marginTop: BioPulseTheme.spacing.sm,
    paddingTop: BioPulseTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: BioPulseTheme.colors.border,
  },
  notesText: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: BioPulseTheme.spacing.sm,
    paddingTop: BioPulseTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: BioPulseTheme.colors.border,
  },
  deleteButton: {
    paddingHorizontal: BioPulseTheme.spacing.md,
    paddingVertical: BioPulseTheme.spacing.sm,
    borderRadius: BioPulseTheme.borderRadius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    minHeight: 32,
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.error,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: BioPulseTheme.spacing.xl * 2,
    paddingHorizontal: BioPulseTheme.spacing.lg,
  },
  emptyStateTitle: {
    fontSize: BioPulseTheme.typography.fontSize.xl,
    fontWeight: '600',
    color: BioPulseTheme.colors.textSecondary,
    marginBottom: BioPulseTheme.spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: BioPulseTheme.typography.fontSize.base,
    color: BioPulseTheme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
  photosContainer: {
    marginTop: BioPulseTheme.spacing.sm,
    paddingTop: BioPulseTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: BioPulseTheme.colors.border,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: BioPulseTheme.spacing.sm,
  },
  photoCountText: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.textSecondary,
    fontWeight: '500',
  },
  viewAllButton: {
    paddingHorizontal: BioPulseTheme.spacing.sm,
    paddingVertical: BioPulseTheme.spacing.xs,
    backgroundColor: BioPulseTheme.colors.primary,
    borderRadius: BioPulseTheme.borderRadius.sm,
  },
  viewAllText: {
    fontSize: BioPulseTheme.typography.fontSize.xs,
    color: 'white',
    fontWeight: '500',
  },
  photoModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    paddingHorizontal: BioPulseTheme.spacing.md,
    paddingVertical: BioPulseTheme.spacing.lg,
  },
  photoModalContainer: {
    width: '100%',
    height: '100%',
    maxWidth: 600, // Limit width on larger screens
    backgroundColor: BioPulseTheme.colors.background,
    borderRadius: BioPulseTheme.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: BioPulseTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: BioPulseTheme.colors.border,
    backgroundColor: BioPulseTheme.colors.surface,
  },
  photoModalTitleContainer: {
    flex: 1,
  },
  photoModalTitle: {
    fontSize: BioPulseTheme.typography.fontSize.lg,
    fontWeight: '600',
    color: BioPulseTheme.colors.textPrimary,
    marginBottom: BioPulseTheme.spacing.xs,
  },
  photoModalSubtitle: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.textSecondary,
  },
  photoModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BioPulseTheme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: BioPulseTheme.spacing.md,
  },
  photoModalCloseText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  photoModalContent: {
    flex: 1,
    backgroundColor: BioPulseTheme.colors.background,
  },
});

export default IntakeHistory;