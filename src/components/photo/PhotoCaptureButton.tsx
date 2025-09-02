/**
 * PhotoCaptureButton Component
 * Camera trigger button for capturing photos during intake logging
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';
import { useImagePicker } from '../../hooks/useImagePicker';
import { useToast } from '../../contexts/ToastContext';
import { photoErrorHandlingService } from '../../services/photo/photoErrorHandlingService';
import { photoToastService } from '../../services/photo/photoToastService';
import CameraPermissionHandler, { PermissionType } from './CameraPermissionHandler';
import PhotoErrorRecovery from './PhotoErrorRecovery';
import { photoErrorClassificationService } from '../../services/photo/photoErrorClassificationService';

interface PhotoCaptureButtonProps {
  onPhotoCapture: (photoUrl: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
  enablePermissionHandling?: boolean;
  enableErrorRecovery?: boolean;
  showAlternatives?: boolean;
}

const PhotoCaptureButton: React.FC<PhotoCaptureButtonProps> = ({
  onPhotoCapture,
  onError,
  disabled = false,
  size = 'medium',
  style,
  enablePermissionHandling = true,
  enableErrorRecovery = true,
  showAlternatives = true,
}) => {
  const { signedUrl, error, isLoading, pickImage } = useImagePicker();
  const toast = useToast();
  
  const [showPermissionHandler, setShowPermissionHandler] = useState(false);
  const [showErrorRecovery, setShowErrorRecovery] = useState(false);
  const [currentError, setCurrentError] = useState<any>(null);

  // Handle photo capture with enhanced error handling
  const handleCapture = async () => {
    if (disabled || isLoading) return;

    const operationId = `photo_capture_${Date.now()}`;
    
    try {
      // Show capture starting toast
      const toastId = photoToastService.showPhotoProcessing();
      
      await pickImage();
      
      // Hide processing toast
      photoToastService.hideToast(toastId);
      
      if (signedUrl) {
        onPhotoCapture(signedUrl);
        photoToastService.showPhotoCaptureSuccess();
      }
    } catch (err) {
      if (enableErrorRecovery) {
        const handled = await photoErrorHandlingService.handleError(
          err,
          operationId,
          {
            showUserFeedback: false, // We'll show our custom UI
            enableRetry: true,
            onRetry: handleCapture,
            onAlternativeAction: handleAlternativeAction,
            onError: (error) => {
              setCurrentError(error);
              setShowErrorRecovery(true);
            },
          }
        );
        
        if (!handled) {
          // Show error recovery UI
          setCurrentError(err);
          setShowErrorRecovery(true);
        }
      } else {
        // Fallback to simple error handling
        const errorMessage = 'Failed to capture photo. Please try again.';
        if (onError) {
          onError(errorMessage);
        } else {
          toast.showError(errorMessage, 'Retry', handleCapture);
        }
      }
    }
  };

  const handleAlternativeAction = async (actionId: string) => {
    switch (actionId) {
      case 'use_gallery':
        // Open gallery picker
        try {
          // This would use the gallery picker functionality
          console.log('Opening gallery picker...');
        } catch (error) {
          console.error('Gallery picker failed:', error);
        }
        break;
      case 'compress':
        // Retry with compression
        console.log('Retrying with compression...');
        await handleCapture();
        break;
      default:
        console.log('Unknown alternative action:', actionId);
    }
  };

  const handlePermissionGranted = () => {
    setShowPermissionHandler(false);
    // Automatically retry capture after permission is granted
    setTimeout(() => {
      handleCapture();
    }, 500);
  };

  const handlePermissionDenied = () => {
    setShowPermissionHandler(false);
    if (onError) {
      onError('Camera permission is required to take photos');
    }
  };

  const handleErrorRecoveryClose = () => {
    setShowErrorRecovery(false);
    setCurrentError(null);
  };

  // Handle successful photo capture
  React.useEffect(() => {
    if (signedUrl) {
      onPhotoCapture(signedUrl);
      // Success toast is handled in handleCapture
    }
  }, [signedUrl, onPhotoCapture]);

  // Handle errors with enhanced error handling
  React.useEffect(() => {
    if (error && enableErrorRecovery) {
      setCurrentError(error);
      setShowErrorRecovery(true);
    } else if (error) {
      const errorMessage = error || 'Failed to capture photo';
      if (onError) {
        onError(errorMessage);
      } else {
        toast.showError(errorMessage, 'Retry', handleCapture);
      }
    }
  }, [error, onError, toast, enableErrorRecovery]);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          width: 40,
          height: 40,
          borderRadius: 20,
        };
      case 'large':
        return {
          width: 64,
          height: 64,
          borderRadius: 32,
        };
      default: // medium
        return {
          width: 52,
          height: 52,
          borderRadius: 26,
        };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 24;
      default: // medium
        return 20;
    }
  };

  const sizeStyles = getSizeStyles();
  const iconSize = getIconSize();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        sizeStyles,
        disabled && styles.buttonDisabled,
        error && styles.buttonError,
        style,
      ]}
      onPress={handleCapture}
      disabled={disabled || isLoading}
      accessible={true}
      accessibilityLabel="Capture photo"
      accessibilityHint="Opens camera to take a photo for this intake"
      accessibilityRole="button"
      accessibilityState={{
        disabled: disabled || isLoading,
        busy: isLoading,
      }}
      testID="photo-capture-button"
    >
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator 
            size="small" 
            color={BioReceiptTheme.colors.surface} 
            testID="photo-capture-loading"
          />
        ) : (
          <>
            {/* Camera Icon */}
            <View style={[styles.cameraIcon, { width: iconSize, height: iconSize }]}>
              <View style={[styles.cameraBody, { width: iconSize * 0.8, height: iconSize * 0.6 }]} />
              <View style={[styles.cameraLens, { 
                width: iconSize * 0.4, 
                height: iconSize * 0.4,
                borderRadius: iconSize * 0.2,
                top: iconSize * 0.1,
                left: iconSize * 0.2,
              }]} />
              <View style={[styles.cameraFlash, {
                width: iconSize * 0.15,
                height: iconSize * 0.15,
                borderRadius: iconSize * 0.075,
                top: iconSize * 0.05,
                right: iconSize * 0.1,
              }]} />
            </View>
            
            {/* Plus indicator for adding photo */}
            {size !== 'small' && (
              <View style={styles.plusIndicator}>
                <Text style={[styles.plusText, { fontSize: iconSize * 0.6 }]}>+</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Error indicator */}
      {error && (
        <View style={styles.errorIndicator}>
          <Text style={styles.errorText}>!</Text>
        </View>
      )}

      {/* Permission Handler Modal */}
      {enablePermissionHandling && (
        <CameraPermissionHandler
          visible={showPermissionHandler}
          onClose={() => setShowPermissionHandler(false)}
          onPermissionGranted={handlePermissionGranted}
          onPermissionDenied={handlePermissionDenied}
          permissionType={PermissionType.CAMERA}
          showAlternatives={showAlternatives}
          onUseGallery={() => handleAlternativeAction('use_gallery')}
        />
      )}

      {/* Error Recovery Modal */}
      {enableErrorRecovery && currentError && (
        <PhotoErrorRecovery
          visible={showErrorRecovery}
          onClose={handleErrorRecoveryClose}
          errorType={photoErrorClassificationService.classifyError(currentError).type}
          errorMessage={typeof currentError === 'string' ? currentError : currentError?.message || 'Unknown error'}
          userMessage={photoErrorClassificationService.getUserFriendlyMessage(currentError)}
          recoveryOptions={photoErrorClassificationService.getRecoveryOptions(currentError)}
          onRetry={handleCapture}
          onAlternativeAction={handleAlternativeAction}
          operationId={`photo_capture_${Date.now()}`}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: BioReceiptTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: BioReceiptTheme.colors.textTertiary,
    opacity: 0.6,
  },
  buttonError: {
    backgroundColor: BioReceiptTheme.colors.error,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cameraIcon: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBody: {
    backgroundColor: BioReceiptTheme.colors.surface,
    borderRadius: 2,
    position: 'absolute',
  },
  cameraLens: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: BioReceiptTheme.colors.surface,
    position: 'absolute',
  },
  cameraFlash: {
    backgroundColor: BioReceiptTheme.colors.surface,
    position: 'absolute',
  },
  plusIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: BioReceiptTheme.colors.secondary,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: BioReceiptTheme.colors.surface,
  },
  plusText: {
    color: BioReceiptTheme.colors.surface,
    fontWeight: 'bold',
    lineHeight: 12,
  },
  errorIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: BioReceiptTheme.colors.error,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: BioReceiptTheme.colors.surface,
  },
  errorText: {
    color: BioReceiptTheme.colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 12,
  },
});

export default PhotoCaptureButton;