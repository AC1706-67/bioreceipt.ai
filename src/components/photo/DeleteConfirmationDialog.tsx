/**
 * DeleteConfirmationDialog Component
 * Reusable confirmation dialog for photo deletion with customizable options
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BioPulseTheme } from '../../constants/bioPulseTheme';

interface DeleteConfirmationDialogProps {
  visible: boolean;
  title?: string;
  message?: string;
  photoCount?: number;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  visible,
  title,
  message,
  photoCount = 1,
  onConfirm,
  onCancel,
  confirmText,
  cancelText = 'Cancel',
  destructive = true,
}) => {
  const defaultTitle = photoCount > 1 ? 'Delete Photos' : 'Delete Photo';
  const defaultMessage = photoCount > 1 
    ? `Are you sure you want to delete ${photoCount} photos? This action cannot be undone.`
    : 'Are you sure you want to delete this photo? This action cannot be undone.';
  const defaultConfirmText = photoCount > 1 ? 'Delete All' : 'Delete';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {title || defaultTitle}
            </Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.message}>
              {message || defaultMessage}
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelText}
            >
              <Text style={styles.cancelButtonText}>
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                destructive ? styles.destructiveButton : styles.confirmButton
              ]}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmText || defaultConfirmText}
            >
              <Text style={[
                destructive ? styles.destructiveButtonText : styles.confirmButtonText
              ]}>
                {confirmText || defaultConfirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: BioPulseTheme.spacing.lg,
  },
  dialog: {
    backgroundColor: BioPulseTheme.colors.surface,
    borderRadius: BioPulseTheme.borderRadius.lg,
    width: Math.min(screenWidth - BioPulseTheme.spacing.lg * 2, 400),
    maxWidth: '100%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  header: {
    paddingTop: BioPulseTheme.spacing.lg,
    paddingHorizontal: BioPulseTheme.spacing.lg,
    paddingBottom: BioPulseTheme.spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: BioPulseTheme.colors.textPrimary,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: BioPulseTheme.spacing.lg,
    paddingBottom: BioPulseTheme.spacing.lg,
  },
  message: {
    fontSize: 16,
    color: BioPulseTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: BioPulseTheme.colors.border,
  },
  button: {
    flex: 1,
    paddingVertical: BioPulseTheme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  cancelButton: {
    borderRightWidth: 1,
    borderRightColor: BioPulseTheme.colors.border,
  },
  confirmButton: {
    backgroundColor: BioPulseTheme.colors.primary,
  },
  destructiveButton: {
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: BioPulseTheme.colors.textSecondary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  destructiveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: BioPulseTheme.colors.error,
  },
});

export default DeleteConfirmationDialog;