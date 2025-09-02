/**
 * Toast Notification Component
 * Provides user feedback for success, error, and info messages
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  visible: boolean;
  message: string;
  type: ToastType;
  duration?: number;
  onHide: () => void;
  actionText?: string;
  onActionPress?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type,
  duration = 4000,
  onHide,
  actionText,
  onActionPress,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: BioReceiptTheme.colors.success,
          borderColor: BioReceiptTheme.colors.successDark,
        };
      case 'error':
        return {
          backgroundColor: BioReceiptTheme.colors.error,
          borderColor: BioReceiptTheme.colors.errorDark,
        };
      case 'warning':
        return {
          backgroundColor: BioReceiptTheme.colors.warning,
          borderColor: BioReceiptTheme.colors.warningDark,
        };
      case 'info':
        return {
          backgroundColor: BioReceiptTheme.colors.info,
          borderColor: BioReceiptTheme.colors.infoDark,
        };
      default:
        return {
          backgroundColor: BioReceiptTheme.colors.primary,
          borderColor: BioReceiptTheme.colors.primaryDark,
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return 'ℹ';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={[styles.toast, getToastStyle()]}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{getIcon()}</Text>
          </View>
          
          <View style={styles.messageContainer}>
            <Text style={styles.message} numberOfLines={3}>
              {message}
            </Text>
          </View>

          {actionText && onActionPress && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onActionPress}
              accessible={true}
              accessibilityLabel={actionText}
              accessibilityRole="button"
            >
              <Text style={styles.actionText}>{actionText}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={hideToast}
            accessible={true}
            accessibilityLabel="Close notification"
            accessibilityRole="button"
          >
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: BioReceiptTheme.spacing.md,
  },
  toast: {
    borderRadius: BioReceiptTheme.borderRadius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: BioReceiptTheme.spacing.md,
    minHeight: 60,
  },
  iconContainer: {
    marginRight: BioReceiptTheme.spacing.sm,
  },
  icon: {
    fontSize: 20,
    color: BioReceiptTheme.colors.surface,
    fontWeight: 'bold',
  },
  messageContainer: {
    flex: 1,
    marginRight: BioReceiptTheme.spacing.sm,
  },
  message: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.surface,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
    lineHeight: 20,
  },
  actionButton: {
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BioReceiptTheme.borderRadius.sm,
    marginRight: BioReceiptTheme.spacing.sm,
  },
  actionText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.surface,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  closeButton: {
    padding: BioReceiptTheme.spacing.xs,
    minWidth: 30,
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    color: BioReceiptTheme.colors.surface,
    fontWeight: 'bold',
    lineHeight: 24,
  },
});

export default Toast;