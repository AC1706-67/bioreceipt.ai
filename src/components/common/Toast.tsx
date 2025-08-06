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
import { BioPulseTheme } from '../../constants/bioPulseTheme';

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
          backgroundColor: BioPulseTheme.colors.success,
          borderColor: BioPulseTheme.colors.successDark,
        };
      case 'error':
        return {
          backgroundColor: BioPulseTheme.colors.error,
          borderColor: BioPulseTheme.colors.errorDark,
        };
      case 'warning':
        return {
          backgroundColor: BioPulseTheme.colors.warning,
          borderColor: BioPulseTheme.colors.warningDark,
        };
      case 'info':
        return {
          backgroundColor: BioPulseTheme.colors.info,
          borderColor: BioPulseTheme.colors.infoDark,
        };
      default:
        return {
          backgroundColor: BioPulseTheme.colors.primary,
          borderColor: BioPulseTheme.colors.primaryDark,
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
    paddingHorizontal: BioPulseTheme.spacing.md,
  },
  toast: {
    borderRadius: BioPulseTheme.borderRadius.lg,
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
    padding: BioPulseTheme.spacing.md,
    minHeight: 60,
  },
  iconContainer: {
    marginRight: BioPulseTheme.spacing.sm,
  },
  icon: {
    fontSize: 20,
    color: BioPulseTheme.colors.surface,
    fontWeight: 'bold',
  },
  messageContainer: {
    flex: 1,
    marginRight: BioPulseTheme.spacing.sm,
  },
  message: {
    fontSize: BioPulseTheme.typography.fontSize.md,
    color: BioPulseTheme.colors.surface,
    fontWeight: BioPulseTheme.typography.fontWeight.medium,
    lineHeight: 20,
  },
  actionButton: {
    paddingHorizontal: BioPulseTheme.spacing.md,
    paddingVertical: BioPulseTheme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BioPulseTheme.borderRadius.sm,
    marginRight: BioPulseTheme.spacing.sm,
  },
  actionText: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.surface,
    fontWeight: BioPulseTheme.typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  closeButton: {
    padding: BioPulseTheme.spacing.xs,
    minWidth: 30,
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    color: BioPulseTheme.colors.surface,
    fontWeight: 'bold',
    lineHeight: 24,
  },
});

export default Toast;