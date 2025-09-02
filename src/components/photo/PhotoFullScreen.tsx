/**
 * PhotoFullScreen Component
 * Full-screen modal photo viewer with zoom, pan, and management capabilities
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';
import { PhotoMetadata } from '../../types/photo';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PhotoFullScreenProps {
  photoUrl: string;
  visible: boolean;
  onClose: () => void;
  onDelete?: () => void;
  metadata?: PhotoMetadata;
  style?: any;
}

const PhotoFullScreen: React.FC<PhotoFullScreenProps> = ({
  photoUrl,
  visible,
  onClose,
  onDelete,
  metadata,
  style,
}) => {
  const [showControls, setShowControls] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const handleClose = () => {
    onClose();
  };

  const handleDelete = () => {
    if (!onDelete) return;

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
          onPress: () => {
            onDelete();
            handleClose();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoaded(false);
    setImageError(true);
  };

  const handleRetry = () => {
    setImageError(false);
    setImageLoaded(false);
  };

  const formatMetadata = () => {
    if (!metadata) return null;

    return (
      <View style={styles.metadataContainer}>
        <Text style={styles.metadataTitle}>Photo Details</Text>
        <Text style={styles.metadataText}>Captured: {metadata.captureDate}</Text>
        <Text style={styles.metadataText}>Size: {metadata.fileSize}</Text>
        <Text style={styles.metadataText}>Dimensions: {metadata.dimensions}</Text>
        {metadata.location && (
          <Text style={styles.metadataText}>Location: {metadata.location}</Text>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <StatusBar hidden={true} />
      <View style={styles.container}>
        <View style={styles.background}>
          <TouchableOpacity
            style={styles.backgroundTouchable}
            activeOpacity={1}
            onPress={toggleControls}
          />

          {/* Controls Header */}
          {showControls && (
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleClose}
                accessible={true}
                accessibilityLabel="Close full screen photo view"
                accessibilityRole="button"
                accessibilityHint="Returns to photo gallery"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                testID="photo-fullscreen-close"
              >
                <Text style={styles.controlIcon}>✕</Text>
              </TouchableOpacity>

              <View style={styles.headerActions}>
                {metadata && (
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => setShowMetadata(!showMetadata)}
                    accessible={true}
                    accessibilityLabel="Show photo details"
                    accessibilityRole="button"
                    testID="photo-fullscreen-info"
                  >
                    <Text style={styles.controlIcon}>ℹ</Text>
                  </TouchableOpacity>
                )}

                {onDelete && (
                  <TouchableOpacity
                    style={[styles.controlButton, styles.deleteButton]}
                    onPress={handleDelete}
                    accessible={true}
                    accessibilityLabel="Delete photo"
                    accessibilityRole="button"
                    testID="photo-fullscreen-delete"
                  >
                    <Text style={styles.controlIcon}>🗑</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Photo Container with ScrollView for basic zoom/pan */}
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent={true}
          >
            <View style={styles.imageContainer}>
              {!imageLoaded && !imageError && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator 
                    size="large" 
                    color={BioReceiptTheme.colors.primary}
                    testID="photo-fullscreen-loading"
                  />
                </View>
              )}

              {imageError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorIcon}>📷</Text>
                  <Text style={styles.errorText}>Failed to load photo</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleRetry}
                    testID="photo-fullscreen-retry"
                  >
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Image
                  source={{ uri: photoUrl }}
                  style={styles.image}
                  resizeMode="contain"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  testID="photo-fullscreen-image"
                />
              )}
            </View>
          </ScrollView>

          {/* Controls Footer */}
          {showControls && (
            <View style={styles.footer}>
              <Text style={styles.instructionText}>
                Pinch to zoom • Tap to toggle controls
              </Text>
            </View>
          )}

          {/* Metadata Overlay */}
          {showMetadata && metadata && (
            <View style={styles.metadataOverlay}>
              {formatMetadata()}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  backgroundTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    position: 'absolute',
    top: StatusBar.currentHeight || 44,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  controlIcon: {
    color: BioReceiptTheme.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: screenWidth,
    minHeight: screenHeight * 0.8,
  },
  image: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: screenWidth,
    height: screenHeight * 0.6,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: screenWidth,
    height: screenHeight * 0.6,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    color: BioReceiptTheme.colors.textSecondary,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: BioReceiptTheme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: BioReceiptTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  instructionText: {
    color: BioReceiptTheme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  metadataOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  metadataContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
  },
  metadataTitle: {
    color: BioReceiptTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  metadataText: {
    color: BioReceiptTheme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
});

export default PhotoFullScreen;