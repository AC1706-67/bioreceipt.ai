/**
 * UndoNotification Component
 * Shows a temporary notification with undo functionality for photo deletions
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';

interface UndoNotificationProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
  photoCount?: number;
}

const { width: screenWidth } = Dimensions.get('window');

const UndoNotification: React.FC<UndoNotificationProps> = ({
  visible,
  message,
  onUndo,
  onDismiss,
  duration = 10000,
  photoCount = 1,
}) => {
  const [slideAnim] = useState(new Animated.Value(-100));
  const [progressAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      // Slide in animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      // Progress bar animation
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: duration,
        useNativeDriver: false,
      }).start();

      // Auto dismiss after duration
      const timeout = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timeout);
    } else {
      // Reset animations
      slideAnim.setValue(-100);
      progressAnim.setValue(1);
    }
  }, [visible, duration]);

  const handleUndo = () => {
    onUndo();
    handleDismiss();
  };

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!visible) {
    return null;
  }

  const defaultMessage = photoCount > 1 
    ? `${photoCount} photos deleted`
    : 'Photo deleted';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.notification}>
        <View style={styles.content}>
          <Text style={styles.message}>
            {message || defaultMessage}
          </Text>
          
          <TouchableOpacity
            style={styles.undoButton}
            onPress={handleUndo}
            accessibilityRole="button"
            accessibilityLabel="Undo deletion"
            accessibilityHint="Restore the deleted photo"
          >
            <Text style={styles.undoButtonText}>UNDO</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
        >
          <Text style={styles.dismissButtonText}>✕</Text>
        </TouchableOpacity>

        {/* Progress bar */}
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50, // Below status bar
    left: BioReceiptTheme.spacing.md,
    right: BioReceiptTheme.spacing.md,
    zIndex: 1000,
  },
  notification: {
    backgroundColor: BioReceiptTheme.colors.textPrimary,
    borderRadius: BioReceiptTheme.borderRadius.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: BioReceiptTheme.spacing.md,
    paddingLeft: BioReceiptTheme.spacing.lg,
    paddingRight: BioReceiptTheme.spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    marginRight: BioReceiptTheme.spacing.md,
  },
  undoButton: {
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.sm,
    borderRadius: BioReceiptTheme.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: BioReceiptTheme.spacing.sm,
  },
  undoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  dismissButton: {
    position: 'absolute',
    top: BioReceiptTheme.spacing.xs,
    right: BioReceiptTheme.spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dismissButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    backgroundColor: BioReceiptTheme.colors.primary,
  },
});

export default UndoNotification;