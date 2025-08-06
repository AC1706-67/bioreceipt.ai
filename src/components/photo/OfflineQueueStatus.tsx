/**
 * Offline Queue Status Component
 * Displays current status of the offline photo upload queue
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BioPulseTheme } from '../../constants/bioPulseTheme';
import { useOfflinePhotoQueue } from '../../hooks/useOfflinePhotoQueue';
import { QueuedPhoto } from '../../services/photo/offlinePhotoQueueService';

interface OfflineQueueStatusProps {
  visible?: boolean;
  onClose?: () => void;
  compact?: boolean;
}

export const OfflineQueueStatus: React.FC<OfflineQueueStatusProps> = ({
  visible = true,
  onClose,
  compact = false,
}) => {
  const {
    queue,
    stats,
    isProcessing,
    isPaused,
    currentUploads,
    failedPhotos,
    retryPhoto,
    retryAllFailed,
    removeFromQueue,
    clearQueue,
    pauseQueue,
    resumeQueue,
    getUploadProgress,
  } = useOfflinePhotoQueue();

  const [showDetails, setShowDetails] = useState(false);

  if (!stats || (!compact && !visible)) {
    return null;
  }

  const handleRetryPhoto = async (photoId: string) => {
    try {
      await retryPhoto(photoId);
    } catch (error) {
      Alert.alert('Error', 'Failed to retry photo upload');
    }
  };

  const handleRetryAll = async () => {
    try {
      await retryAllFailed();
    } catch (error) {
      Alert.alert('Error', 'Failed to retry failed uploads');
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo from the upload queue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromQueue(photoId);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove photo from queue');
            }
          },
        },
      ]
    );
  };

  const handleClearQueue = async () => {
    Alert.alert(
      'Clear Queue',
      'Are you sure you want to clear all photos from the upload queue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearQueue();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear queue');
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number): string => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  };

  const getStatusColor = (): string => {
    if (stats.failed > 0) return BioPulseTheme.colors.error;
    if (isProcessing) return BioPulseTheme.colors.primary;
    if (stats.totalQueued > 0) return BioPulseTheme.colors.warning;
    return BioPulseTheme.colors.success;
  };

  const getStatusText = (): string => {
    if (stats.failed > 0) return `${stats.failed} failed`;
    if (isProcessing) return `Uploading ${stats.uploading}/${stats.totalQueued}`;
    if (stats.totalQueued > 0) return `${stats.totalQueued} queued`;
    return 'All uploaded';
  };

  const renderPhotoItem = ({ item }: { item: QueuedPhoto }) => {
    const progress = getUploadProgress(item.id);
    const isUploading = currentUploads.some(u => u.photoId === item.id);
    const isFailed = item.uploadAttempts >= 3;

    return (
      <View style={styles.photoItem}>
        <View style={styles.photoInfo}>
          <Text style={styles.photoName} numberOfLines={1}>
            {item.metadata.fileName}
          </Text>
          <Text style={styles.photoSize}>
            {formatFileSize(item.metadata.fileSize)}
          </Text>
          {item.error && (
            <Text style={styles.errorText} numberOfLines={2}>
              {item.error}
            </Text>
          )}
        </View>
        
        <View style={styles.photoStatus}>
          {isUploading && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
              <Text style={styles.progressText}>{progress}%</Text>
            </View>
          )}
          
          {isFailed && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => handleRetryPhoto(item.id)}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemovePhoto(item.id)}
          >
            <Text style={styles.removeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { borderColor: getStatusColor() }]}
        onPress={() => setShowDetails(true)}
        accessibilityRole="button"
        accessibilityLabel={`Upload queue status: ${getStatusText()}`}
      >
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.compactText}>{getStatusText()}</Text>
        {isProcessing && <ActivityIndicator size="small" color={getStatusColor()} />}
      </TouchableOpacity>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Upload Queue</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalQueued}</Text>
            <Text style={styles.statLabel}>Queued</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.uploading}</Text>
            <Text style={styles.statLabel}>Uploading</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.failed}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatFileSize(stats.totalSize)}</Text>
            <Text style={styles.statLabel}>Total Size</Text>
          </View>
        </View>

        {stats.estimatedTimeRemaining > 0 && (
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              Estimated time remaining: {formatTime(stats.estimatedTimeRemaining)}
            </Text>
          </View>
        )}

        <View style={styles.controlsContainer}>
          {isPaused ? (
            <TouchableOpacity style={styles.controlButton} onPress={resumeQueue}>
              <Text style={styles.controlButtonText}>Resume</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.controlButton} onPress={pauseQueue}>
              <Text style={styles.controlButtonText}>Pause</Text>
            </TouchableOpacity>
          )}
          
          {failedPhotos.length > 0 && (
            <TouchableOpacity style={styles.controlButton} onPress={handleRetryAll}>
              <Text style={styles.controlButtonText}>Retry All</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.controlButton, styles.dangerButton]}
            onPress={handleClearQueue}
          >
            <Text style={[styles.controlButtonText, styles.dangerButtonText]}>Clear All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={queue}
          renderItem={renderPhotoItem}
          keyExtractor={(item) => item.id}
          style={styles.photoList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No photos in queue</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: BioPulseTheme.spacing.sm,
    paddingVertical: BioPulseTheme.spacing.xs,
    backgroundColor: BioPulseTheme.colors.surface,
    borderRadius: BioPulseTheme.borderRadius.sm,
    borderWidth: 1,
    marginHorizontal: BioPulseTheme.spacing.md,
    marginVertical: BioPulseTheme.spacing.xs,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: BioPulseTheme.spacing.xs,
  },
  compactText: {
    flex: 1,
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.textPrimary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: BioPulseTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: BioPulseTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: BioPulseTheme.colors.border,
  },
  title: {
    fontSize: BioPulseTheme.typography.fontSize.xl,
    fontWeight: '600',
    color: BioPulseTheme.colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BioPulseTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: BioPulseTheme.colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: BioPulseTheme.spacing.lg,
    backgroundColor: BioPulseTheme.colors.surface,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: BioPulseTheme.typography.fontSize.xl,
    fontWeight: '600',
    color: BioPulseTheme.colors.primary,
  },
  statLabel: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.textSecondary,
    marginTop: BioPulseTheme.spacing.xs,
  },
  timeContainer: {
    padding: BioPulseTheme.spacing.md,
    alignItems: 'center',
  },
  timeText: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.textSecondary,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: BioPulseTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BioPulseTheme.colors.border,
  },
  controlButton: {
    paddingHorizontal: BioPulseTheme.spacing.md,
    paddingVertical: BioPulseTheme.spacing.sm,
    backgroundColor: BioPulseTheme.colors.primary,
    borderRadius: BioPulseTheme.borderRadius.sm,
  },
  controlButtonText: {
    color: 'white',
    fontSize: BioPulseTheme.typography.fontSize.sm,
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: BioPulseTheme.colors.error,
  },
  dangerButtonText: {
    color: 'white',
  },
  photoList: {
    flex: 1,
  },
  photoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: BioPulseTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BioPulseTheme.colors.border,
  },
  photoInfo: {
    flex: 1,
  },
  photoName: {
    fontSize: BioPulseTheme.typography.fontSize.md,
    fontWeight: '500',
    color: BioPulseTheme.colors.textPrimary,
  },
  photoSize: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.textSecondary,
    marginTop: BioPulseTheme.spacing.xs,
  },
  errorText: {
    fontSize: BioPulseTheme.typography.fontSize.xs,
    color: BioPulseTheme.colors.error,
    marginTop: BioPulseTheme.spacing.xs,
  },
  photoStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    width: 60,
    height: 20,
    backgroundColor: BioPulseTheme.colors.surface,
    borderRadius: 10,
    marginRight: BioPulseTheme.spacing.sm,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: BioPulseTheme.colors.primary,
    borderRadius: 10,
  },
  progressText: {
    fontSize: BioPulseTheme.typography.fontSize.xs,
    color: BioPulseTheme.colors.textPrimary,
    fontWeight: '500',
  },
  retryButton: {
    paddingHorizontal: BioPulseTheme.spacing.sm,
    paddingVertical: BioPulseTheme.spacing.xs,
    backgroundColor: BioPulseTheme.colors.warning,
    borderRadius: BioPulseTheme.borderRadius.sm,
    marginRight: BioPulseTheme.spacing.xs,
  },
  retryButtonText: {
    color: 'white',
    fontSize: BioPulseTheme.typography.fontSize.xs,
    fontWeight: '500',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BioPulseTheme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: BioPulseTheme.typography.fontSize.xs,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: BioPulseTheme.spacing.xl,
  },
  emptyText: {
    fontSize: BioPulseTheme.typography.fontSize.md,
    color: BioPulseTheme.colors.textSecondary,
  },
});

export default OfflineQueueStatus;