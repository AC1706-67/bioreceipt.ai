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
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';

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
    paddingHorizontal: BioReceiptTheme.spacing.lg,
  },
  dialog: {
    backgroundColor: BioReceiptTheme.colors.surface,
    borderRadius: BioReceiptTheme.borderRadius.lg,
    width: Math.min(screenWidth - BioReceiptTheme.spacing.lg * 2, 400),
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
    paddingTop: BioReceiptTheme.spacing.lg,
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingBottom: BioReceiptTheme.spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: BioReceiptTheme.colors.textPrimary,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingBottom: BioReceiptTheme.spacing.lg,
  },
  message: {
    fontSize: 16,
    color: BioReceiptTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: BioReceiptTheme.colors.border,
  },
  button: {
    flex: 1,
    paddingVertical: BioReceiptTheme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  cancelButton: {
    borderRightWidth: 1,
    borderRightColor: BioReceiptTheme.colors.border,
  },
  confirmButton: {
    backgroundColor: BioReceiptTheme.colors.primary,
  },
  destructiveButton: {
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: BioReceiptTheme.colors.textSecondary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  destructiveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: BioReceiptTheme.colors.error,
  },
});

export default DeleteConfirmationDialog;