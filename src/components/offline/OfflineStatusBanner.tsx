/**
 * Offline Status Banner
 * Visual indicator for offline status and sync progress
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Modal
} from 'react-native';
import { useOffline } from '../../hooks/useOffline';

interface OfflineStatusBannerProps {
  userId?: string;
  showDetails?: boolean;
  position?: 'top' | 'bottom';
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const OfflineStatusBanner: React.FC<OfflineStatusBannerProps> = ({
  userId,
  showDetails = true,
  position = 'top',
  autoHide = false,
  autoHideDelay = 5000
}) => {
  const {
    isOnline,
    networkState,
    syncStatus,
    isSyncing,
    queuedItemsCount,
    syncNow,
    clearOfflineQueue
  } = useOffline({ userId });

  const [showModal, setShowModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));

  // Auto-hide functionality
  React.useEffect(() => {
    if (autoHide && isOnline && !isSyncing && queuedItemsCount === 0) {
      const timer = setTimeout(() => {
        Animated.fadeOut(fadeAnim, {
          duration: 300,
          useNativeDriver: true
        }).start();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    } else {
      Animated.fadeIn(fadeAnim, {
        duration: 300,
        useNativeDriver: true
      }).start();
    }
  }, [isOnline, isSyncing, queuedItemsCount, autoHide, autoHideDelay, fadeAnim]);

  const getBannerStyle = () => {
    if (isOnline && !isSyncing && queuedItemsCount === 0) {
      return styles.bannerOnline;
    } else if (isOnline && (isSyncing || queuedItemsCount > 0)) {
      return styles.bannerSyncing;
    } else {
      return styles.bannerOffline;
    }
  };

  const getBannerText = () => {
    if (isOnline && isSyncing) {
      return `Syncing... ${Math.round(syncStatus.syncProgress)}%`;
    } else if (isOnline && queuedItemsCount > 0) {
      return `${queuedItemsCount} items queued for sync`;
    } else if (isOnline) {
      return 'Connected';
    } else {
      return 'Offline - Some features may be limited';
    }
  };

  const getStatusIcon = () => {
    if (isOnline && isSyncing) {
      return <ActivityIndicator size="small" color="#FFFFFF" />;
    } else if (isOnline && queuedItemsCount > 0) {
      return <Text style={styles.icon}>⏳</Text>;
    } else if (isOnline) {
      return <Text style={styles.icon}>✓</Text>;
    } else {
      return <Text style={styles.icon}>⚠️</Text>;
    }
  };

  const handleBannerPress = () => {
    if (showDetails) {
      setShowModal(true);
    }
  };

  const handleSyncNow = async () => {
    try {
      await syncNow();
    } catch (error) {
      console.error('Failed to sync:', error);
    }
  };

  const handleClearQueue = async () => {
    try {
      await clearOfflineQueue();
      setShowModal(false);
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  };

  const renderDetailModal = () => (
    <Modal
      visible={showModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Connection Status</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowModal(false)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          {/* Network Status */}
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Network Status</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Connection:</Text>
              <Text style={[
                styles.statusValue,
                { color: isOnline ? '#4CAF50' : '#F44336' }
              ]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Type:</Text>
              <Text style={styles.statusValue}>
                {networkState.type || 'Unknown'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Internet:</Text>
              <Text style={styles.statusValue}>
                {networkState.isInternetReachable === null 
                  ? 'Unknown' 
                  : networkState.isInternetReachable 
                    ? 'Reachable' 
                    : 'Not Reachable'
                }
              </Text>
            </View>
          </View>

          {/* Sync Status */}
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Sync Status</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status:</Text>
              <Text style={styles.statusValue}>
                {isSyncing ? 'Syncing...' : 'Idle'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Queued Items:</Text>
              <Text style={styles.statusValue}>
                {queuedItemsCount}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Failed Items:</Text>
              <Text style={styles.statusValue}>
                {syncStatus.failedItemsCount}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last Sync:</Text>
              <Text style={styles.statusValue}>
                {syncStatus.lastSyncTime 
                  ? syncStatus.lastSyncTime.toLocaleString()
                  : 'Never'
                }
              </Text>
            </View>
            {isSyncing && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressLabel}>
                  Progress: {Math.round(syncStatus.syncProgress)}%
                </Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { width: `${syncStatus.syncProgress}%` }
                    ]} 
                  />
                </View>
              </View>
            )}
          </View>

          {/* Errors */}
          {syncStatus.errors.length > 0 && (
            <View style={styles.statusSection}>
              <Text style={styles.sectionTitle}>Sync Errors</Text>
              {syncStatus.errors.map((error, index) => (
                <Text key={index} style={styles.errorText}>
                  • {error}
                </Text>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.syncButton,
                { opacity: isOnline && !isSyncing ? 1 : 0.5 }
              ]}
              onPress={handleSyncNow}
              disabled={!isOnline || isSyncing}
            >
              <Text style={styles.actionButtonText}>
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.clearButton,
                { opacity: queuedItemsCount > 0 ? 1 : 0.5 }
              ]}
              onPress={handleClearQueue}
              disabled={queuedItemsCount === 0}
            >
              <Text style={[styles.actionButtonText, styles.clearButtonText]}>
                Clear Queue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Don't show banner if online and no queued items (unless forced)
  if (isOnline && !isSyncing && queuedItemsCount === 0 && autoHide) {
    return null;
  }

  return (
    <>
      <Animated.View
        style={[
          styles.banner,
          getBannerStyle(),
          position === 'bottom' ? styles.bannerBottom : styles.bannerTop,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity
          style={styles.bannerContent}
          onPress={handleBannerPress}
          disabled={!showDetails}
        >
          <View style={styles.bannerLeft}>
            {getStatusIcon()}
            <Text style={styles.bannerText}>
              {getBannerText()}
            </Text>
          </View>
          
          {showDetails && (
            <Text style={styles.detailsArrow}>ⓘ</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {showDetails && renderDetailModal()}
    </>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 1000,
  },
  bannerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bannerBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bannerOnline: {
    backgroundColor: '#4CAF50',
  },
  bannerSyncing: {
    backgroundColor: '#FF9800',
  },
  bannerOffline: {
    backgroundColor: '#F44336',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
    color: '#FFFFFF',
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  detailsArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666666',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  statusSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    marginBottom: 4,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  syncButton: {
    backgroundColor: '#4CAF50',
  },
  clearButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clearButtonText: {
    color: '#F44336',
  },
});