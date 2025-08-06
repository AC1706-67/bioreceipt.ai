/**
 * Photo Error Recovery Component
 * Provides user-friendly error recovery options with guided solutions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { BioPulseTheme } from '../../constants/bioPulseTheme';
import { PhotoErrorType, PhotoRecoveryOption } from '../../services/photo/photoErrorClassificationService';
import { photoErrorHandlingService } from '../../services/photo/photoErrorHandlingService';
import { photoToastService } from '../../services/photo/photoToastService';

interface PhotoErrorRecoveryProps {
  visible: boolean;
  onClose: () => void;
  errorType: PhotoErrorType;
  errorMessage: string;
  userMessage: string;
  recoveryOptions: PhotoRecoveryOption[];
  onRetry?: () => Promise<void>;
  onAlternativeAction?: (actionId: string) => Promise<void>;
  operationId: string;
  showTechnicalDetails?: boolean;
}

export const PhotoErrorRecovery: React.FC<PhotoErrorRecoveryProps> = ({
  visible,
  onClose,
  errorType,
  errorMessage,
  userMessage,
  recoveryOptions,
  onRetry,
  onAlternativeAction,
  operationId,
  showTechnicalDetails = false,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleRecoveryAction = async (option: PhotoRecoveryOption) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setSelectedOption(option.id);

    try {
      switch (option.action) {
        case 'retry':
          if (onRetry) {
            await onRetry();
            photoToastService.showSuccess('Operation completed successfully!');
            onClose();
          }
          break;

        case 'alternative':
          if (onAlternativeAction) {
            await onAlternativeAction(option.id);
            onClose();
          }
          break;

        case 'settings':
          await handleOpenSettings();
          break;

        case 'contact_support':
          await handleContactSupport();
          break;

        case 'dismiss':
        default:
          onClose();
          break;
      }
    } catch (error) {
      console.error('Error handling recovery action:', error);
      photoToastService.showError('Failed to complete the action. Please try again.');
    } finally {
      setIsProcessing(false);
      setSelectedOption(null);
    }
  };

  const handleOpenSettings = async () => {
    try {
      await photoErrorHandlingService.handleError(
        new Error('Settings redirect'),
        `${operationId}_settings`,
        {
          showUserFeedback: false,
          enableRetry: false,
        }
      );
    } catch (error) {
      console.error('Failed to open settings:', error);
    }
  };

  const handleContactSupport = async () => {
    Alert.alert(
      'Contact Support',
      'How would you like to contact our support team?',
      [
        {
          text: 'Email Support',
          onPress: () => {
            // Open email with pre-filled error details
            const subject = `Photo Error Report - ${errorType}`;
            const body = `Error Type: ${errorType}\nOperation: ${operationId}\nMessage: ${errorMessage}\n\nPlease describe what you were trying to do when this error occurred:`;
            // In a real app, you would use Linking.openURL with mailto
            console.log('Opening email support with:', { subject, body });
          },
        },
        {
          text: 'In-App Help',
          onPress: () => {
            // Navigate to help section
            console.log('Opening in-app help');
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const getErrorIcon = (): string => {
    switch (errorType) {
      case PhotoErrorType.CAMERA_PERMISSION_DENIED:
      case PhotoErrorType.STORAGE_PERMISSION_DENIED:
        return '🔒';
      case PhotoErrorType.CAMERA_UNAVAILABLE:
        return '📸';
      case PhotoErrorType.STORAGE_FULL:
        return '💾';
      case PhotoErrorType.NETWORK_ERROR:
        return '🌐';
      case PhotoErrorType.UPLOAD_FAILED:
        return '☁️';
      case PhotoErrorType.FILE_TOO_LARGE:
        return '📏';
      case PhotoErrorType.INVALID_FILE_FORMAT:
        return '📄';
      case PhotoErrorType.CAPTURE_FAILED:
        return '📷';
      case PhotoErrorType.PROCESSING_FAILED:
        return '⚙️';
      case PhotoErrorType.DELETION_FAILED:
        return '🗑️';
      default:
        return '⚠️';
    }
  };

  const getErrorTitle = (): string => {
    switch (errorType) {
      case PhotoErrorType.CAMERA_PERMISSION_DENIED:
        return 'Camera Permission Required';
      case PhotoErrorType.STORAGE_PERMISSION_DENIED:
        return 'Storage Permission Required';
      case PhotoErrorType.CAMERA_UNAVAILABLE:
        return 'Camera Unavailable';
      case PhotoErrorType.STORAGE_FULL:
        return 'Storage Full';
      case PhotoErrorType.NETWORK_ERROR:
        return 'Network Connection Issue';
      case PhotoErrorType.UPLOAD_FAILED:
        return 'Upload Failed';
      case PhotoErrorType.FILE_TOO_LARGE:
        return 'File Too Large';
      case PhotoErrorType.INVALID_FILE_FORMAT:
        return 'Invalid File Format';
      case PhotoErrorType.CAPTURE_FAILED:
        return 'Photo Capture Failed';
      case PhotoErrorType.PROCESSING_FAILED:
        return 'Processing Failed';
      case PhotoErrorType.DELETION_FAILED:
        return 'Deletion Failed';
      default:
        return 'Something Went Wrong';
    }
  };

  const getActionIcon = (action: string): string => {
    switch (action) {
      case 'retry':
        return '🔄';
      case 'settings':
        return '⚙️';
      case 'alternative':
        return '🔀';
      case 'contact_support':
        return '💬';
      case 'dismiss':
        return '✕';
      default:
        return '•';
    }
  };

  const getActionButtonStyle = (option: PhotoRecoveryOption) => {
    switch (option.action) {
      case 'retry':
        return [styles.actionButton, styles.primaryAction];
      case 'settings':
        return [styles.actionButton, styles.settingsAction];
      case 'alternative':
        return [styles.actionButton, styles.alternativeAction];
      case 'contact_support':
        return [styles.actionButton, styles.supportAction];
      case 'dismiss':
        return [styles.actionButton, styles.dismissAction];
      default:
        return styles.actionButton;
    }
  };

  const getActionButtonTextStyle = (option: PhotoRecoveryOption) => {
    switch (option.action) {
      case 'retry':
        return [styles.actionButtonText, styles.primaryActionText];
      case 'dismiss':
        return [styles.actionButtonText, styles.dismissActionText];
      default:
        return styles.actionButtonText;
    }
  };

  const renderTroubleshootingTips = () => {
    const tips: Record<PhotoErrorType, string[]> = {
      [PhotoErrorType.CAMERA_PERMISSION_DENIED]: [
        'Check if camera permission is enabled in device settings',
        'Restart the app after granting permission',
        'Make sure no other app is using the camera',
      ],
      [PhotoErrorType.STORAGE_PERMISSION_DENIED]: [
        'Check if storage permission is enabled in device settings',
        'Ensure you have enough storage space available',
        'Try restarting the app after granting permission',
      ],
      [PhotoErrorType.CAMERA_UNAVAILABLE]: [
        'Close other apps that might be using the camera',
        'Restart your device if the problem persists',
        'Check if your camera is working in other apps',
      ],
      [PhotoErrorType.STORAGE_FULL]: [
        'Delete unnecessary photos and videos',
        'Move files to cloud storage',
        'Clear app cache in device settings',
      ],
      [PhotoErrorType.NETWORK_ERROR]: [
        'Check your internet connection',
        'Try switching between WiFi and mobile data',
        'Photos will be uploaded automatically when connection is restored',
      ],
      [PhotoErrorType.UPLOAD_FAILED]: [
        'Check your internet connection',
        'Photos are saved locally and will retry automatically',
        'Try uploading again when you have a stable connection',
      ],
      [PhotoErrorType.FILE_TOO_LARGE]: [
        'The photo will be automatically compressed',
        'Try taking a photo with lower resolution',
        'Use the built-in compression feature',
      ],
      [PhotoErrorType.INVALID_FILE_FORMAT]: [
        'Only JPEG and PNG images are supported',
        'Try taking a new photo with the camera',
        'Convert the image to a supported format',
      ],
      [PhotoErrorType.CAPTURE_FAILED]: [
        'Make sure the camera lens is clean',
        'Try taking the photo again',
        'Restart the app if the problem continues',
      ],
      [PhotoErrorType.PROCESSING_FAILED]: [
        'Try with a different photo',
        'Ensure you have enough storage space',
        'Restart the app and try again',
      ],
      [PhotoErrorType.DELETION_FAILED]: [
        'Check your internet connection',
        'Try again in a few moments',
        'The photo may have already been deleted',
      ],
      [PhotoErrorType.UNKNOWN_ERROR]: [
        'Try the operation again',
        'Restart the app if the problem persists',
        'Contact support if you continue to experience issues',
      ],
    };

    const errorTips = tips[errorType] || tips[PhotoErrorType.UNKNOWN_ERROR];

    return (
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Troubleshooting Tips:</Text>
        {errorTips.map((tip, index) => (
          <View key={index} style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTechnicalDetails = () => {
    if (!showTechnicalDetails || !showDetails) return null;

    return (
      <View style={styles.technicalContainer}>
        <Text style={styles.technicalTitle}>Technical Details:</Text>
        <View style={styles.technicalContent}>
          <Text style={styles.technicalLabel}>Error Type:</Text>
          <Text style={styles.technicalValue}>{errorType}</Text>
          
          <Text style={styles.technicalLabel}>Operation ID:</Text>
          <Text style={styles.technicalValue}>{operationId}</Text>
          
          <Text style={styles.technicalLabel}>Error Message:</Text>
          <Text style={styles.technicalValue}>{errorMessage}</Text>
          
          <Text style={styles.technicalLabel}>Retry Attempts:</Text>
          <Text style={styles.technicalValue}>
            {photoErrorHandlingService.getRetryAttempts(operationId)}
          </Text>
        </View>
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

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.errorHeader}>
            <Text style={styles.errorIcon}>{getErrorIcon()}</Text>
            <Text style={styles.errorTitle}>{getErrorTitle()}</Text>
            <Text style={styles.errorMessage}>{userMessage}</Text>
          </View>

          <View style={styles.actionsContainer}>
            <Text style={styles.actionsTitle}>What would you like to do?</Text>
            {recoveryOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={getActionButtonStyle(option)}
                onPress={() => handleRecoveryAction(option)}
                disabled={isProcessing}
              >
                <View style={styles.actionContent}>
                  <Text style={styles.actionIcon}>{getActionIcon(option.action)}</Text>
                  <View style={styles.actionTextContainer}>
                    <Text style={getActionButtonTextStyle(option)}>
                      {option.label}
                    </Text>
                    {option.description && (
                      <Text style={styles.actionDescription}>
                        {option.description}
                      </Text>
                    )}
                  </View>
                  {isProcessing && selectedOption === option.id && (
                    <Text style={styles.processingIndicator}>⏳</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {renderTroubleshootingTips()}

          <TouchableOpacity
            style={styles.detailsToggle}
            onPress={() => setShowDetails(!showDetails)}
          >
            <Text style={styles.detailsToggleText}>
              {showDetails ? 'Hide Details' : 'Show Technical Details'}
            </Text>
          </TouchableOpacity>

          {renderTechnicalDetails()}
        </ScrollView>
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
    paddingHorizontal: BioPulseTheme.spacing.lg,
  },
  errorHeader: {
    alignItems: 'center',
    paddingVertical: BioPulseTheme.spacing.xl,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: BioPulseTheme.spacing.md,
  },
  errorTitle: {
    fontSize: BioPulseTheme.typography.fontSize.xl,
    fontWeight: '700',
    color: BioPulseTheme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: BioPulseTheme.spacing.sm,
  },
  errorMessage: {
    fontSize: BioPulseTheme.typography.fontSize.base,
    color: BioPulseTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: BioPulseTheme.spacing.md,
  },
  actionsContainer: {
    marginBottom: BioPulseTheme.spacing.xl,
  },
  actionsTitle: {
    fontSize: BioPulseTheme.typography.fontSize.lg,
    fontWeight: '600',
    color: BioPulseTheme.colors.textPrimary,
    marginBottom: BioPulseTheme.spacing.md,
  },
  actionButton: {
    backgroundColor: BioPulseTheme.colors.surface,
    borderRadius: BioPulseTheme.borderRadius.lg,
    padding: BioPulseTheme.spacing.md,
    marginBottom: BioPulseTheme.spacing.sm,
    borderWidth: 1,
    borderColor: BioPulseTheme.colors.border,
  },
  primaryAction: {
    backgroundColor: BioPulseTheme.colors.primary,
    borderColor: BioPulseTheme.colors.primary,
  },
  settingsAction: {
    backgroundColor: BioPulseTheme.colors.warning + '20',
    borderColor: BioPulseTheme.colors.warning,
  },
  alternativeAction: {
    backgroundColor: BioPulseTheme.colors.secondary + '20',
    borderColor: BioPulseTheme.colors.secondary,
  },
  supportAction: {
    backgroundColor: BioPulseTheme.colors.info + '20',
    borderColor: BioPulseTheme.colors.info,
  },
  dismissAction: {
    backgroundColor: 'transparent',
    borderColor: BioPulseTheme.colors.border,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 20,
    marginRight: BioPulseTheme.spacing.md,
    width: 24,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: BioPulseTheme.typography.fontSize.base,
    fontWeight: '600',
    color: BioPulseTheme.colors.textPrimary,
  },
  primaryActionText: {
    color: 'white',
  },
  dismissActionText: {
    color: BioPulseTheme.colors.textSecondary,
  },
  actionDescription: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.textSecondary,
    marginTop: BioPulseTheme.spacing.xs,
    lineHeight: 18,
  },
  processingIndicator: {
    fontSize: 16,
    marginLeft: BioPulseTheme.spacing.sm,
  },
  tipsContainer: {
    backgroundColor: BioPulseTheme.colors.surface,
    borderRadius: BioPulseTheme.borderRadius.lg,
    padding: BioPulseTheme.spacing.lg,
    marginBottom: BioPulseTheme.spacing.lg,
  },
  tipsTitle: {
    fontSize: BioPulseTheme.typography.fontSize.base,
    fontWeight: '600',
    color: BioPulseTheme.colors.textPrimary,
    marginBottom: BioPulseTheme.spacing.md,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: BioPulseTheme.spacing.sm,
  },
  tipBullet: {
    fontSize: BioPulseTheme.typography.fontSize.base,
    color: BioPulseTheme.colors.primary,
    marginRight: BioPulseTheme.spacing.sm,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.textSecondary,
    lineHeight: 20,
  },
  detailsToggle: {
    alignItems: 'center',
    paddingVertical: BioPulseTheme.spacing.md,
    marginBottom: BioPulseTheme.spacing.lg,
  },
  detailsToggleText: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.primary,
    fontWeight: '500',
  },
  technicalContainer: {
    backgroundColor: BioPulseTheme.colors.surface,
    borderRadius: BioPulseTheme.borderRadius.md,
    padding: BioPulseTheme.spacing.lg,
    marginBottom: BioPulseTheme.spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: BioPulseTheme.colors.warning,
  },
  technicalTitle: {
    fontSize: BioPulseTheme.typography.fontSize.base,
    fontWeight: '600',
    color: BioPulseTheme.colors.textPrimary,
    marginBottom: BioPulseTheme.spacing.md,
  },
  technicalContent: {
    gap: BioPulseTheme.spacing.sm,
  },
  technicalLabel: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    fontWeight: '500',
    color: BioPulseTheme.colors.textSecondary,
  },
  technicalValue: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.textPrimary,
    fontFamily: 'monospace',
    backgroundColor: BioPulseTheme.colors.background,
    padding: BioPulseTheme.spacing.xs,
    borderRadius: BioPulseTheme.borderRadius.sm,
    marginBottom: BioPulseTheme.spacing.sm,
  },
});

export default PhotoErrorRecovery;