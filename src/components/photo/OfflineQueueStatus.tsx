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
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';
import { usePhotoUploadQueue } from '../../hooks/usePhotoUploadQueue';
import { usePhotoManager } from '../../features/photos/usePhotoManager';

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
  const { status, triggerProcessing, isActive, hasErrors, isOnline } = usePhotoUploadQueue();
  const { getPhotosByStatus, uploadPhotoById } = usePhotoManager();
  const [showDetails, setShowDetails] = useState(false);

  // Get photos by status
  const queuedPhotos = getPhotosByStatus('queued');
  const errorPhotos = getPhotosByStatus('error');
  const uploadingPhotos = getPhotosByStatus('uploading');

  if (!compact && !visible) {
    return null;
  }

  const handleRetryPhoto = async (photoId: string) => {
    try {
      await uploadPhotoById(photoId);
    } catch (error) {
      Alert.alert('Error', 'Failed to retry photo upload');
    }
  };

  const handleTriggerProcessing = () => {
    triggerProcessing();
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
    if (!isOnline) return BioReceiptTheme.colors.textSecondary;
    if (hasErrors) return BioReceiptTheme.colors.error;
    if (status.isProcessing) return BioReceiptTheme.colors.primary;
    if (status.totalPending > 0) return BioReceiptTheme.colors.warning;
    return BioReceiptTheme.colors.success;
  };

  const getStatusText = (): string => {
    if (!isOnline) return 'Offline';
    if (hasErrors) return `${status.errorCount} failed`;
    if (status.isProcessing) return `Uploading...`;
    if (status.totalPending > 0) return `${status.totalPending} queued`;
    return 'All uploaded';
  };

  const renderPhotoItem = ({ item }: { item: any }) => {
    const isUploading = item.status === 'uploading';
    const isFailed = item.status === 'error';
    const progress = item.uploadProgress || 0;

    return (
      <View style={styles.photoItem}>
        <View style={styles.photoInfo}>
          <Text style={styles.photoName} numberOfLines={1}>
            {item.metadata?.fileName || `Photo ${item.id.slice(-6)}`}
          </Text>
          <Text style={styles.photoSize}>
            {item.metadata?.fileSize ? formatFileSize(item.metadata.fileSize) : 'Unknown size'}
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
        </View>
      </View>
    );
  };

  if (compact) {
    // Only show if there's something to show
    if (!isActive && isOnline) {
      return null;
    }

    return (
      <TouchableOpacity
        style={[styles.compactContainer, { borderColor: getStatusColor() }]}
        onPress={() => setShowDetails(true)}
        accessibilityRole="button"
        accessibilityLabel={`Upload queue status: ${getStatusText()}`}
      >
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.compactText}>{getStatusText()}</Text>
        {status.isProcessing && <ActivityIndicator size="small" color={getStatusColor()} />}
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
            <Text style={styles.statValue}>{status.queuedCount}</Text>
            <Text style={styles.statLabel}>Queued</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{uploadingPhotos.length}</Text>
            <Text style={styles.statLabel}>Uploading</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{status.errorCount}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{isOnline ? 'Online' : 'Offline'}</Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.controlButton} onPress={handleTriggerProcessing}>
            <Text style={styles.controlButtonText}>Process Queue</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={[...queuedPhotos, ...uploadingPhotos, ...errorPhotos]}
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
    paddingHorizontal: BioReceiptTheme.spacing.sm,
    paddingVertical: BioReceiptTheme.spacing.xs,
    backgroundColor: BioReceiptTheme.colors.surface,
    borderRadius: BioReceiptTheme.borderRadius.sm,
    borderWidth: 1,
    marginHorizontal: BioReceiptTheme.spacing.md,
    marginVertical: BioReceiptTheme.spacing.xs,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: BioReceiptTheme.spacing.xs,
  },
  compactText: {
    flex: 1,
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textPrimary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: BioReceiptTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: BioReceiptTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: BioReceiptTheme.colors.border,
  },
  title: {
    fontSize: BioReceiptTheme.typography.fontSize.xl,
    fontWeight: '600',
    color: BioReceiptTheme.colors.textPrimary,
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
    fontSize: 18,
    color: BioReceiptTheme.colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: BioReceiptTheme.spacing.lg,
    backgroundColor: BioReceiptTheme.colors.surface,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: BioReceiptTheme.typography.fontSize.xl,
    fontWeight: '600',
    color: BioReceiptTheme.colors.primary,
  },
  statLabel: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textSecondary,
    marginTop: BioReceiptTheme.spacing.xs,
  },
  timeContainer: {
    padding: BioReceiptTheme.spacing.md,
    alignItems: 'center',
  },
  timeText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textSecondary,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: BioReceiptTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BioReceiptTheme.colors.border,
  },
  controlButton: {
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.sm,
    backgroundColor: BioReceiptTheme.colors.primary,
    borderRadius: BioReceiptTheme.borderRadius.sm,
  },
  controlButtonText: {
    color: 'white',
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: BioReceiptTheme.colors.error,
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
    padding: BioReceiptTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BioReceiptTheme.colors.border,
  },
  photoInfo: {
    flex: 1,
  },
  photoName: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    fontWeight: '500',
    color: BioReceiptTheme.colors.textPrimary,
  },
  photoSize: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textSecondary,
    marginTop: BioReceiptTheme.spacing.xs,
  },
  errorText: {
    fontSize: BioReceiptTheme.typography.fontSize.xs,
    color: BioReceiptTheme.colors.error,
    marginTop: BioReceiptTheme.spacing.xs,
  },
  photoStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    width: 60,
    height: 20,
    backgroundColor: BioReceiptTheme.colors.surface,
    borderRadius: 10,
    marginRight: BioReceiptTheme.spacing.sm,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: BioReceiptTheme.colors.primary,
    borderRadius: 10,
  },
  progressText: {
    fontSize: BioReceiptTheme.typography.fontSize.xs,
    color: BioReceiptTheme.colors.textPrimary,
    fontWeight: '500',
  },
  retryButton: {
    paddingHorizontal: BioReceiptTheme.spacing.sm,
    paddingVertical: BioReceiptTheme.spacing.xs,
    backgroundColor: BioReceiptTheme.colors.warning,
    borderRadius: BioReceiptTheme.borderRadius.sm,
    marginRight: BioReceiptTheme.spacing.xs,
  },
  retryButtonText: {
    color: 'white',
    fontSize: BioReceiptTheme.typography.fontSize.xs,
    fontWeight: '500',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BioReceiptTheme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: BioReceiptTheme.typography.fontSize.xs,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: BioReceiptTheme.spacing.xl,
  },
  emptyText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.textSecondary,
  },
});

export default OfflineQueueStatus;