/**
 * PhotoPreview Component - Thumbnail and Full-Screen Photo Preview
 * Provides thumbnail display with tap-to-expand functionality and delete options
 */

import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BioPulseTheme } from '../../constants/bioPulseTheme';

interface PhotoPreviewProps {
  photoUrl: string;
  onDelete?: () => void;
  onFullScreen?: () => void;
  showControls?: boolean;
  size?: number;
  metadata?: {
    captureDate?: string;
    fileSize?: string;
    dimensions?: string;
  };
}

const PhotoPreview: React.FC<PhotoPreviewProps> = ({
  photoUrl,
  onDelete,
  onFullScreen,
  showControls = true,
  size = 80,
  metadata,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
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
          onPress: onDelete,
        },
      ],
      { cancelable: true }
    );
  };

  const handlePress = () => {
    if (onFullScreen) {
      onFullScreen();
    }
  };

  const renderContent = () => {
    if (hasError) {
      return (
        <View style={[styles.errorContainer, { width: size, height: size }]}>
          <Text style={styles.errorIcon}>📷</Text>
          <Text style={styles.errorText}>Failed to load</Text>
        </View>
      );
    }

    return (
      <>
        <Image
          source={{ uri: photoUrl }}
          style={[styles.image, { width: size, height: size }]}
          onLoad={handleImageLoad}
          onError={handleImageError}
          resizeMode="cover"
          accessibilityLabel="Photo preview"
        />
        {isLoading && (
          <View style={[styles.loadingOverlay, { width: size, height: size }]}>
            <ActivityIndicator 
              size="small" 
              color={BioPulseTheme.colors.primary} 
            />
          </View>
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.previewContainer, { width: size, height: size }]}
        onPress={handlePress}
        disabled={hasError}
        accessibilityRole="button"
        accessibilityLabel={`Photo preview${metadata?.captureDate ? ` from ${metadata.captureDate}` : ''}`}
        accessibilityHint="Tap to view full size photo"
      >
        {renderContent()}
      </TouchableOpacity>

      {showControls && onDelete && !hasError && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete photo"
          accessibilityHint="Removes this photo permanently"
        >
          <Text style={styles.deleteIcon}>×</Text>
        </TouchableOpacity>
      )}

      {metadata && !isLoading && !hasError && (
        <View style={styles.metadataContainer}>
          {metadata.captureDate && (
            <Text style={styles.metadataText} numberOfLines={1}>
              {new Date(metadata.captureDate).toLocaleDateString()}
            </Text>
          )}
          {metadata.fileSize && (
            <Text style={styles.metadataText} numberOfLines={1}>
              {metadata.fileSize}
            </Text>
          )}
          {metadata.dimensions && (
            <Text style={styles.metadataText} numberOfLines={1}>
              {metadata.dimensions}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginRight: BioPulseTheme.spacing.sm,
    marginBottom: BioPulseTheme.spacing.sm,
  },
  previewContainer: {
    borderRadius: BioPulseTheme.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: BioPulseTheme.colors.surface,
    borderWidth: 1,
    borderColor: BioPulseTheme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  image: {
    borderRadius: BioPulseTheme.borderRadius.md,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: BioPulseTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BioPulseTheme.borderRadius.md,
  },
  errorContainer: {
    backgroundColor: BioPulseTheme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BioPulseTheme.borderRadius.md,
  },
  errorIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 10,
    color: BioPulseTheme.colors.textSecondary,
    textAlign: 'center',
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BioPulseTheme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  deleteIcon: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  metadataContainer: {
    marginTop: 4,
    alignItems: 'center',
  },
  metadataText: {
    fontSize: 10,
    color: BioPulseTheme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default PhotoPreview;