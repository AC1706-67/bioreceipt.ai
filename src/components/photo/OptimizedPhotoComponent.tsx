/**
 * Optimized Photo Component
 * Combines accessibility and performance optimizations for photo display
 * Enhanced with lazy loading, progressive loading, caching, and memoization
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  StyleSheet,
  Animated,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { photoAccessibilityService } from '../../services/photo/photoAccessibilityService';
import { photoPerformanceService } from '../../services/photo/photoPerformanceService';
import { usePhotoOptimization } from '../../hooks/usePhotoOptimization';
import { useProgressiveImage } from '../../hooks/useProgressiveImage';
import { useLazyImageLoading } from '../../hooks/useLazyImageLoading';

interface OptimizedPhotoComponentProps {
  photoUrl: string;
  lowResUrl?: string;
  fileName?: string;
  index?: number;
  total?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  onError?: (error: Error) => void;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  showLoadingIndicator?: boolean;
  enableThumbnail?: boolean;
  thumbnailSize?: { width: number; height: number };
  priority?: 'high' | 'normal' | 'low';
  testID?: string;
  enableLazyLoading?: boolean;
  enableProgressiveLoading?: boolean;
  enableCaching?: boolean;
  lazyLoadThreshold?: number;
  intakeMetadata?: {
    substanceName?: string;
    intakeTime?: string;
    dosage?: string;
    unit?: string;
  };
}

export const OptimizedPhotoComponent: React.FC<OptimizedPhotoComponentProps> = memo(({
  photoUrl,
  lowResUrl,
  fileName,
  index,
  total,
  onPress,
  onLongPress,
  onError,
  style,
  resizeMode = 'cover',
  showLoadingIndicator = true,
  enableThumbnail = true,
  thumbnailSize,
  priority = 'normal',
  testID,
  enableLazyLoading = true,
  enableProgressiveLoading = true,
  enableCaching = true,
  lazyLoadThreshold = 0.1,
  intakeMetadata,
}) => {
  // Initialize photo optimization hook
  const photoOptimization = usePhotoOptimization({
    enableAccessibility: true,
    enablePerformanceOptimization: true,
    enableThumbnails: enableThumbnail,
    cachePhotos: enableCaching,
    priority,
    enableLazyLoading,
    enableProgressiveLoading,
    enablePrefetching: true,
    enableMetrics: true,
  });

  // Progressive image loading
  const progressiveImage = useProgressiveImage({
    highResUrl: photoUrl,
    lowResUrl: lowResUrl || (enableThumbnail ? undefined : photoUrl),
    enableBlur: true,
    enableMetrics: true,
  });

  // Lazy loading
  const lazyLoading = useLazyImageLoading({
    threshold: lazyLoadThreshold,
    enabled: enableLazyLoading,
    preloadDistance: 200,
  });

  const [hasError, setHasError] = useState(false);
  const imageRef = useRef<Image>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Memoized accessibility features
  const accessibilityLabel = useMemo(() => {
    if (intakeMetadata) {
      return photoAccessibilityService.generateThumbnailLabel(
        intakeMetadata,
        index || 0,
        total || 1,
        { fileName, fileSize: 0 }
      );
    }
    return `Photo ${fileName || 'image'}${index !== undefined && total ? `, ${index + 1} of ${total}` : ''}`;
  }, [intakeMetadata, index, total, fileName]);

  const accessibilityHint = useMemo(() => 
    'Double tap to view full screen, long press for options menu',
    []
  );

  // Memoized animation settings
  const animationDuration = useMemo(() => 
    photoOptimization.getAnimationDuration(300),
    [photoOptimization]
  );

  const gestureTimeout = useMemo(() => 
    photoOptimization.getGestureTimeout(500),
    [photoOptimization]
  );

  // Performance measurement
  const renderTimer = useMemo(() => 
    photoOptimization.measureRenderTime(`OptimizedPhotoComponent-${testID || 'unknown'}`),
    [photoOptimization, testID]
  );

  // Start render measurement
  useEffect(() => {
    renderTimer.start();
    return () => renderTimer.end();
  }, [renderTimer]);

  // Determine which image to display
  const currentImageUrl = useMemo(() => {
    if (hasError) return null;
    
    // Use lazy loading check
    if (enableLazyLoading && !lazyLoading.shouldLoad) {
      return null;
    }
    
    // Use progressive loading if enabled
    if (enableProgressiveLoading && progressiveImage.currentImageUrl) {
      return progressiveImage.currentImageUrl;
    }
    
    return photoUrl;
  }, [
    hasError,
    enableLazyLoading,
    lazyLoading.shouldLoad,
    enableProgressiveLoading,
    progressiveImage.currentImageUrl,
    photoUrl,
  ]);

  const isLoading = useMemo(() => {
    if (enableProgressiveLoading) {
      return progressiveImage.isLoading;
    }
    return !currentImageUrl && !hasError;
  }, [enableProgressiveLoading, progressiveImage.isLoading, currentImageUrl, hasError]);

  // Handle image load success
  const handleImageLoad = useCallback(() => {
    setHasError(false);

    // Animate image appearance
    if (animationDuration > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Skip animation for reduced motion
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    }

    // Announce to screen reader if needed
    if (photoOptimization.accessibilityConfig?.isScreenReaderEnabled) {
      const message = fileName 
        ? `Photo ${fileName} loaded successfully`
        : 'Photo loaded successfully';
      photoOptimization.announceToScreenReader(message);
    }
  }, [animationDuration, fadeAnim, scaleAnim, fileName, photoOptimization]);

  // Handle image load error
  const handleImageError = useCallback((error: any) => {
    console.error('Image load error:', error);
    setHasError(true);
    onError?.(new Error('Failed to load image'));

    // Announce error to screen reader
    if (photoOptimization.accessibilityConfig?.isScreenReaderEnabled) {
      photoOptimization.announceToScreenReader(
        'Failed to load photo. Please try again.',
        'high'
      );
    }
  }, [onError, photoOptimization]);

  // Memoized press handlers
  const handlePress = useCallback(() => {
    if (hasError) return;

    // Provide haptic feedback if available
    if (Platform.OS === 'ios') {
      // In a real implementation, you'd use react-native-haptic-feedback
      // HapticFeedback.trigger('impactLight');
    }

    // Set accessibility focus after press if needed
    if (photoOptimization.accessibilityConfig?.isScreenReaderEnabled && imageRef.current) {
      setTimeout(() => {
        photoOptimization.setAccessibilityFocus(imageRef);
      }, 100);
    }

    onPress?.();
  }, [hasError, onPress, photoOptimization]);

  const handleLongPress = useCallback(() => {
    if (hasError) return;
    onLongPress?.();
  }, [hasError, onLongPress]);

  // Memoized styling
  const accessibleColors = useMemo(() => 
    photoOptimization.getAccessibleColors(),
    [photoOptimization]
  );

  const containerStyle = useMemo(() => [
    styles.container,
    style,
    accessibleColors && {
      borderColor: accessibleColors.primary,
      borderWidth: photoOptimization.shouldUseSimplifiedUI() ? 2 : 1,
    },
  ], [style, accessibleColors, photoOptimization]);

  const imageStyle = useMemo(() => [
    styles.image,
    {
      opacity: fadeAnim,
      transform: [{ scale: scaleAnim }],
    },
  ], [fadeAnim, scaleAnim]);

  // Image source with caching
  const imageSource = useMemo(() => {
    if (hasError || !currentImageUrl) return null;
    return { uri: currentImageUrl };
  }, [hasError, currentImageUrl]);

  // Render error state
  if (hasError) {
    return (
      <View 
        style={[containerStyle, styles.errorContainer]}
        accessible={true}
        accessibilityLabel="Failed to load photo"
        accessibilityRole="image"
        testID={testID ? `${testID}-error` : undefined}
      >
        <Text 
          style={[
            styles.errorText,
            accessibleColors && { color: accessibleColors.error }
          ]}
        >
          Failed to load image
        </Text>
      </View>
    );
  }

  // Render placeholder for lazy loading
  if (enableLazyLoading && !lazyLoading.shouldLoad) {
    return (
      <View 
        style={containerStyle}
        onLayout={lazyLoading.onLayout}
        testID={testID ? `${testID}-placeholder` : undefined}
      >
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>📷</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={gestureTimeout}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="imagebutton"
      testID={testID}
      onLayout={lazyLoading.onLayout}
    >
      {imageSource && (
        <Animated.Image
          ref={imageRef}
          source={imageSource}
          style={imageStyle}
          resizeMode={resizeMode}
          onLoad={handleImageLoad}
          onError={handleImageError}
          accessible={false} // Parent handles accessibility
        />
      )}
      
      {isLoading && showLoadingIndicator && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color={accessibleColors?.primary || '#007AFF'}
            accessible={true}
            accessibilityLabel="Loading photo"
          />
          {enableProgressiveLoading && progressiveImage.loadingProgress > 0 && (
            <View style={styles.progressContainer}>
              <View 
                style={[
                  styles.progressBar,
                  { width: `${progressiveImage.loadingProgress}%` }
                ]}
              />
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 1,
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholderText: {
    fontSize: 24,
    opacity: 0.5,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
    backgroundColor: '#f8f8f8',
  },
  errorText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default OptimizedPhotoComponent;