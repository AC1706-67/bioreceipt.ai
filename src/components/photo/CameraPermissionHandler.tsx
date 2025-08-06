/**
 * Camera Permission Handler Component
 * Handles camera and storage permissions with user-friendly UI and guidance
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { BioPulseTheme } from '../../constants/bioPulseTheme';
import { photoErrorHandlingService } from '../../services/photo/photoErrorHandlingService';
import { photoToastService } from '../../services/photo/photoToastService';

export enum PermissionType {
  CAMERA = 'camera',
  STORAGE = 'storage',
  BOTH = 'both',
}

export enum PermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  BLOCKED = 'blocked',
  UNAVAILABLE = 'unavailable',
  UNKNOWN = 'unknown',
}

interface CameraPermissionHandlerProps {
  visible: boolean;
  onClose: () => void;
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
  permissionType?: PermissionType;
  showAlternatives?: boolean;
  onUseGallery?: () => void;
  title?: string;
  message?: string;
}

export const CameraPermissionHandler: React.FC<CameraPermissionHandlerProps> = ({
  visible,
  onClose,
  onPermissionGranted,
  onPermissionDenied,
  permissionType = PermissionType.CAMERA,
  showAlternatives = true,
  onUseGallery,
  title,
  message,
}) => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>(PermissionStatus.UNKNOWN);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showDetailedHelp, setShowDetailedHelp] = useState(false);

  useEffect(() => {
    if (visible) {
      checkPermissionStatus();
    }
  }, [visible, permissionType]);

  const checkPermissionStatus = async () => {
    try {
      // In a real implementation, you would use react-native-permissions
      // For now, we'll simulate permission checking
      console.log(`Checking ${permissionType} permission status...`);
      
      // Simulate permission status
      setPermissionStatus(PermissionStatus.DENIED);
    } catch (error) {
      console.error('Error checking permission status:', error);
      setPermissionStatus(PermissionStatus.UNKNOWN);
    }
  };

  const requestPermission = async () => {
    setIsRequesting(true);
    
    try {
      let granted = false;
      
      switch (permissionType) {
        case PermissionType.CAMERA:
          granted = await photoErrorHandlingService.handleCameraPermission();
          break;
        case PermissionType.STORAGE:
          granted = await photoErrorHandlingService.handleStoragePermission();
          break;
        case PermissionType.BOTH:
          const cameraGranted = await photoErrorHandlingService.handleCameraPermission();
          const storageGranted = await photoErrorHandlingService.handleStoragePermission();
          granted = cameraGranted && storageGranted;
          break;
      }
      
      if (granted) {
        setPermissionStatus(PermissionStatus.GRANTED);
        photoToastService.showSuccess('Permission granted successfully!');
        onPermissionGranted();
        onClose();
      } else {
        setPermissionStatus(PermissionStatus.DENIED);
        onPermissionDenied();
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      setPermissionStatus(PermissionStatus.DENIED);
      onPermissionDenied();
    } finally {
      setIsRequesting(false);
    }
  };

  const openAppSettings = async () => {
    try {
      await Linking.openSettings();
      photoToastService.showInfo('Please enable the required permissions and return to the app.');
    } catch (error) {
      console.error('Failed to open app settings:', error);
      Alert.alert(
        'Settings Unavailable',
        'Unable to open settings automatically. Please go to your device settings > Apps > BioPulse > Permissions and enable the required permissions.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleUseGallery = () => {
    if (onUseGallery) {
      onUseGallery();
      onClose();
    }
  };

  const getPermissionTitle = (): string => {
    if (title) return title;
    
    switch (permissionType) {
      case PermissionType.CAMERA:
        return 'Camera Permission Required';
      case PermissionType.STORAGE:
        return 'Storage Permission Required';
      case PermissionType.BOTH:
        return 'Permissions Required';
      default:
        return 'Permission Required';
    }
  };

  const getPermissionMessage = (): string => {
    if (message) return message;
    
    switch (permissionType) {
      case PermissionType.CAMERA:
        return 'We need camera permission to take photos of your intake. This helps you visually document what you consume.';
      case PermissionType.STORAGE:
        return 'We need storage permission to save your photos. This ensures your intake photos are safely stored on your device.';
      case PermissionType.BOTH:
        return 'We need camera and storage permissions to take and save photos of your intake. This helps you visually document what you consume.';
      default:
        return 'We need permission to access this feature.';
    }
  };

  const getPermissionIcon = (): string => {
    switch (permissionType) {
      case PermissionType.CAMERA:
        return '📸';
      case PermissionType.STORAGE:
        return '💾';
      case PermissionType.BOTH:
        return '📱';
      default:
        return '🔒';
    }
  };

  const renderPermissionStatus = () => {
    switch (permissionStatus) {
      case PermissionStatus.GRANTED:
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.statusIcon}>✅</Text>
            <Text style={styles.statusText}>Permission granted!</Text>
          </View>
        );
      case PermissionStatus.BLOCKED:
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.statusIcon}>🚫</Text>
            <Text style={styles.statusText}>Permission blocked. Please enable in settings.</Text>
          </View>
        );
      case PermissionStatus.UNAVAILABLE:
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.statusIcon}>❌</Text>
            <Text style={styles.statusText}>Feature not available on this device.</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderDetailedHelp = () => {
    if (!showDetailedHelp) return null;

    const steps = Platform.OS === 'ios' ? [
      '1. Tap "Open Settings" below',
      '2. Find "BioPulse" in the app list',
      '3. Tap on "BioPulse"',
      '4. Enable Camera and Photos permissions',
      '5. Return to BioPulse and try again',
    ] : [
      '1. Tap "Open Settings" below',
      '2. Find "Apps" or "Application Manager"',
      '3. Find and tap "BioPulse"',
      '4. Tap "Permissions"',
      '5. Enable Camera and Storage permissions',
      '6. Return to BioPulse and try again',
    ];

    return (
      <View style={styles.helpContainer}>
        <Text style={styles.helpTitle}>How to enable permissions:</Text>
        {steps.map((step, index) => (
          <Text key={index} style={styles.helpStep}>
            {step}
          </Text>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.permissionIcon}>{getPermissionIcon()}</Text>
          </View>

          <Text style={styles.title}>{getPermissionTitle()}</Text>
          <Text style={styles.message}>{getPermissionMessage()}</Text>

          {renderPermissionStatus()}

          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>Why we need this permission:</Text>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>📷</Text>
              <Text style={styles.benefitText}>Take photos of your meals and supplements</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>📊</Text>
              <Text style={styles.benefitText}>Better track your intake patterns</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🔒</Text>
              <Text style={styles.benefitText}>Your photos are stored securely and privately</Text>
            </View>
          </View>

          {renderDetailedHelp()}
        </View>

        <View style={styles.footer}>
          {permissionStatus === PermissionStatus.DENIED || permissionStatus === PermissionStatus.UNKNOWN ? (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, isRequesting && styles.buttonDisabled]}
                onPress={requestPermission}
                disabled={isRequesting}
              >
                <Text style={styles.primaryButtonText}>
                  {isRequesting ? 'Requesting...' : 'Grant Permission'}
                </Text>
              </TouchableOpacity>

              {permissionStatus === PermissionStatus.DENIED && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={openAppSettings}
                >
                  <Text style={styles.secondaryButtonText}>Open Settings</Text>
                </TouchableOpacity>
              )}
            </>
          ) : permissionStatus === PermissionStatus.BLOCKED ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={openAppSettings}
            >
              <Text style={styles.primaryButtonText}>Open Settings</Text>
            </TouchableOpacity>
          ) : null}

          {showAlternatives && onUseGallery && (
            <TouchableOpacity
              style={styles.alternativeButton}
              onPress={handleUseGallery}
            >
              <Text style={styles.alternativeButtonText}>Choose from Gallery Instead</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => setShowDetailedHelp(!showDetailedHelp)}
          >
            <Text style={styles.helpButtonText}>
              {showDetailedHelp ? 'Hide Help' : 'Need Help?'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={onClose}
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BioPulseTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: BioPulseTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: BioPulseTheme.colors.border,
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
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: BioPulseTheme.spacing.xl,
    paddingVertical: BioPulseTheme.spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: BioPulseTheme.spacing.xl,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: BioPulseTheme.spacing.md,
  },
  title: {
    fontSize: BioPulseTheme.typography.fontSize['2xl'],
    fontWeight: '700',
    color: BioPulseTheme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: BioPulseTheme.spacing.md,
  },
  message: {
    fontSize: BioPulseTheme.typography.fontSize.base,
    color: BioPulseTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: BioPulseTheme.spacing.xl,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BioPulseTheme.colors.surface,
    padding: BioPulseTheme.spacing.md,
    borderRadius: BioPulseTheme.borderRadius.md,
    marginBottom: BioPulseTheme.spacing.lg,
  },
  statusIcon: {
    fontSize: 20,
    marginRight: BioPulseTheme.spacing.sm,
  },
  statusText: {
    fontSize: BioPulseTheme.typography.fontSize.base,
    color: BioPulseTheme.colors.textPrimary,
    fontWeight: '500',
  },
  benefitsContainer: {
    backgroundColor: BioPulseTheme.colors.surface,
    padding: BioPulseTheme.spacing.lg,
    borderRadius: BioPulseTheme.borderRadius.lg,
    marginBottom: BioPulseTheme.spacing.lg,
  },
  benefitsTitle: {
    fontSize: BioPulseTheme.typography.fontSize.lg,
    fontWeight: '600',
    color: BioPulseTheme.colors.textPrimary,
    marginBottom: BioPulseTheme.spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: BioPulseTheme.spacing.sm,
  },
  benefitIcon: {
    fontSize: 20,
    marginRight: BioPulseTheme.spacing.md,
    width: 24,
  },
  benefitText: {
    flex: 1,
    fontSize: BioPulseTheme.typography.fontSize.base,
    color: BioPulseTheme.colors.textSecondary,
    lineHeight: 20,
  },
  helpContainer: {
    backgroundColor: BioPulseTheme.colors.info + '20',
    padding: BioPulseTheme.spacing.lg,
    borderRadius: BioPulseTheme.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: BioPulseTheme.colors.info,
  },
  helpTitle: {
    fontSize: BioPulseTheme.typography.fontSize.base,
    fontWeight: '600',
    color: BioPulseTheme.colors.textPrimary,
    marginBottom: BioPulseTheme.spacing.sm,
  },
  helpStep: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: BioPulseTheme.spacing.xs,
  },
  footer: {
    padding: BioPulseTheme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: BioPulseTheme.colors.border,
  },
  primaryButton: {
    backgroundColor: BioPulseTheme.colors.primary,
    paddingVertical: BioPulseTheme.spacing.md,
    paddingHorizontal: BioPulseTheme.spacing.xl,
    borderRadius: BioPulseTheme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: BioPulseTheme.spacing.md,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: BioPulseTheme.typography.fontSize.base,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: BioPulseTheme.colors.surface,
    paddingVertical: BioPulseTheme.spacing.md,
    paddingHorizontal: BioPulseTheme.spacing.xl,
    borderRadius: BioPulseTheme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: BioPulseTheme.spacing.md,
    borderWidth: 1,
    borderColor: BioPulseTheme.colors.border,
  },
  secondaryButtonText: {
    color: BioPulseTheme.colors.textPrimary,
    fontSize: BioPulseTheme.typography.fontSize.base,
    fontWeight: '500',
  },
  alternativeButton: {
    backgroundColor: BioPulseTheme.colors.secondary,
    paddingVertical: BioPulseTheme.spacing.sm,
    paddingHorizontal: BioPulseTheme.spacing.lg,
    borderRadius: BioPulseTheme.borderRadius.md,
    alignItems: 'center',
    marginBottom: BioPulseTheme.spacing.sm,
  },
  alternativeButtonText: {
    color: 'white',
    fontSize: BioPulseTheme.typography.fontSize.sm,
    fontWeight: '500',
  },
  helpButton: {
    alignItems: 'center',
    paddingVertical: BioPulseTheme.spacing.sm,
    marginBottom: BioPulseTheme.spacing.xs,
  },
  helpButtonText: {
    color: BioPulseTheme.colors.primary,
    fontSize: BioPulseTheme.typography.fontSize.sm,
    fontWeight: '500',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: BioPulseTheme.spacing.sm,
  },
  skipButtonText: {
    color: BioPulseTheme.colors.textTertiary,
    fontSize: BioPulseTheme.typography.fontSize.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default CameraPermissionHandler;