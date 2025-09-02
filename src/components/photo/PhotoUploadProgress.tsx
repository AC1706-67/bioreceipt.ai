/**
 * PhotoUploadProgress Component
 * Displays upload progress and queue status for offline photo uploads
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';
import offlinePhotoQueueService, { QueuedPhoto, UploadProgress, QueueStats } from '../../services/photo/offlinePhotoQueueService';

interface PhotoUploadProgressProps {
  visible: boolean;
  onClose: () => void;
  showQueueButton?: boolean;
}

const PhotoUploadProgress: React.FC<PhotoUploadProgressProps> = ({
  visible,
  onClose,
  showQueueButton = true,
}) => {
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    uploading: 0,
    failed: 0,
    completed: 0,
  });
  const [queuedPhotos, setQueuedPhotos] = useState<QueuedPhoto[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());

  useEffect(() => {
    if (visible) {
      loadQueueData();
      const interval = setInterval(loadQueueData, 1000); // Update every second
      return () => clearInterval(interval);
    }
  }, [visible]);

  const loadQueueData = () => {
    const stats = offlinePhotoQueueService.getQueueStats();
    const photos = offlinePhotoQueueService.getQueuedPhotos();
    
    setQueueStats(stats);
    setQueuedPhotos(photos);
  };

  const handleRetryFailed = async () => {
    try {
      await offlinePhotoQueueService.retryFailedUploads();
      loadQueueData();
    } catch (error) {
      Alert.alert('Error', 'Failed to retry uploads');
    }
  };

  const handleClearCompleted = async () => {
    try {
      const clearedCount = await offlinePhotoQueueService.clearCompleted();
      if (clearedCount > 0) {
        Alert.alert('Success', `Cleared ${clearedCount} completed uploads`);
        loadQueueData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to clear completed uploads');
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    Alert.alert(
      'Remove Upload',
      'Are you sure you want to remove this photo from the upload queue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await offlinePhotoQueueService.removeFromQueue(photoId);
              loadQueueData();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove photo from queue');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: QueuedPhoto['status']): string => {
    switch (status) {
      case 'pending':
        return BioReceiptTheme.colors.warning;
      case 'uploading':
        return BioReceiptTheme.colors.info;
      case 'completed':
        return BioReceiptTheme.colors.success;
      case 'failed':
        return BioReceiptTheme.colors.error;
      default:
        return BioReceiptTheme.colors.textSecondary;
    }
  };

  const getStatusText = (status: QueuedPhoto['status']): string => {
    switch (status) {
      case 'pending':
        return 'Waiting';
      case 'uploading':
        return 'Uploading';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const renderQueueItem = ({ item }: { item: QueuedPhoto }) => {
    const progress = uploadProgress.get(item.id);
    
    return (
      <View style={styles.queueItem}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              {item.metadata.fileName}
            </Text>
            <Text style={styles.fileSize}>
              {(item.metadata.fileSize / 1024 / 1024).toFixed(1)} MB
            </Text>
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        {item.status === 'uploading' && progress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progress.progress}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(progress.progress)}%
            </Text>
          </View>
        )}

        {item.status === 'failed' && item.error && (
          <Text style={styles.errorText} numberOfLines={2}>
            {item.error}
          </Text>
        )}

        {item.uploadAttempts > 0 && (
          <Text style={styles.attemptsText}>
            Attempts: {item.uploadAttempts}
          </Text>
        )}

        <View style={styles.itemActions}>
          {item.status === 'failed' && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => handleRetryFailed()}
              accessibilityRole="button"
              accessibilityLabel="Retry upload"
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemovePhoto(item.id)}
            accessibilityRole="button"
            accessibilityLabel="Remove from queue"
          >
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Photo Upload Queue</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{queueStats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: BioReceiptTheme.colors.warning }]}>
            {queueStats.pending}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: BioReceiptTheme.colors.info }]}>
            {queueStats.uploading}
          </Text>
          <Text style={styles.statLabel}>Uploading</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: BioReceiptTheme.colors.error }]}>
            {queueStats.failed}
          </Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: BioReceiptTheme.colors.success }]}>
            {queueStats.completed}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <View style={styles.headerActions}>
        {queueStats.failed > 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRetryFailed}
            accessibilityRole="button"
            accessibilityLabel="Retry all failed uploads"
          >
            <Text style={styles.actionButtonText}>Retry Failed</Text>
          </TouchableOpacity>
        )}
        
        {queueStats.completed > 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearCompleted}
            accessibilityRole="button"
            accessibilityLabel="Clear completed uploads"
          >
            <Text style={styles.actionButtonText}>Clear Completed</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📤</Text>
      <Text style={styles.emptyStateTitle}>No Photos in Queue</Text>
      <Text style={styles.emptyStateText}>
        Photos will appear here when they're waiting to upload or when you're offline
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close upload queue"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {queuedPhotos.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={queuedPhotos}
            renderItem={renderQueueItem}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
};

// Queue Status Badge Component
export const PhotoQueueBadge: React.FC<{
  onPress: () => void;
  style?: any;
}> = ({ onPress, style }) => {
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    uploading: 0,
    failed: 0,
    completed: 0,
  });

  useEffect(() => {
    const updateStats = () => {
      const stats = offlinePhotoQueueService.getQueueStats();
      setQueueStats(stats);
    };

    updateStats();
    const interval = setInterval(updateStats, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  if (queueStats.total === 0) {
    return null;
  }

  const hasActivity = queueStats.pending > 0 || queueStats.uploading > 0 || queueStats.failed > 0;

  return (
    <TouchableOpacity
      style={[styles.badge, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Photo upload queue: ${queueStats.total} photos`}
    >
      <View style={styles.badgeContent}>
        {queueStats.uploading > 0 && (
          <ActivityIndicator size="small" color="white" style={styles.badgeSpinner} />
        )}
        <Text style={styles.badgeText}>
          {queueStats.total}
        </Text>
        {queueStats.failed > 0 && (
          <View style={styles.errorBadge}>
            <Text style={styles.errorBadgeText}>!</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BioReceiptTheme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BioReceiptTheme.colors.border,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BioReceiptTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: BioReceiptTheme.colors.textSecondary,
    fontWeight: 'bold',
  },
  header: {
    padding: BioReceiptTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: BioReceiptTheme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: BioReceiptTheme.colors.textPrimary,
    marginBottom: BioReceiptTheme.spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: BioReceiptTheme.spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: BioReceiptTheme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: BioReceiptTheme.colors.textSecondary,
    marginTop: BioReceiptTheme.spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: BioReceiptTheme.spacing.md,
  },
  actionButton: {
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.sm,
    backgroundColor: BioReceiptTheme.colors.primary,
    borderRadius: BioReceiptTheme.borderRadius.md,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: BioReceiptTheme.spacing.xl,
  },
  queueItem: {
    backgroundColor: BioReceiptTheme.colors.surface,
    marginHorizontal: BioReceiptTheme.spacing.lg,
    marginVertical: BioReceiptTheme.spacing.sm,
    padding: BioReceiptTheme.spacing.md,
    borderRadius: BioReceiptTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: BioReceiptTheme.spacing.sm,
  },
  itemInfo: {
    flex: 1,
    marginRight: BioReceiptTheme.spacing.md,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: BioReceiptTheme.colors.textPrimary,
    marginBottom: BioReceiptTheme.spacing.xs,
  },
  fileSize: {
    fontSize: 12,
    color: BioReceiptTheme.colors.textSecondary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: BioReceiptTheme.spacing.xs,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: BioReceiptTheme.spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: BioReceiptTheme.colors.border,
    borderRadius: 2,
    marginRight: BioReceiptTheme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: BioReceiptTheme.colors.info,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: BioReceiptTheme.colors.textSecondary,
    minWidth: 35,
    textAlign: 'right',
  },
  errorText: {
    fontSize: 12,
    color: BioReceiptTheme.colors.error,
    marginBottom: BioReceiptTheme.spacing.sm,
    fontStyle: 'italic',
  },
  attemptsText: {
    fontSize: 11,
    color: BioReceiptTheme.colors.textTertiary,
    marginBottom: BioReceiptTheme.spacing.sm,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: BioReceiptTheme.spacing.sm,
  },
  retryButton: {
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.xs,
    backgroundColor: BioReceiptTheme.colors.warning,
    borderRadius: BioReceiptTheme.borderRadius.sm,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  removeButton: {
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.xs,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BioReceiptTheme.borderRadius.sm,
  },
  removeButtonText: {
    color: BioReceiptTheme.colors.error,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: BioReceiptTheme.spacing.xl,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: BioReceiptTheme.spacing.lg,
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: BioReceiptTheme.colors.textSecondary,
    marginBottom: BioReceiptTheme.spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: BioReceiptTheme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 24,
  },
  // Badge styles
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: BioReceiptTheme.colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeSpinner: {
    marginRight: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: BioReceiptTheme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
});

export default PhotoUploadProgress;