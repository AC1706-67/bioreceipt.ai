/**
 * Error Feedback Panel
 * Provides detailed error feedback with actionable guidance
 * Specialized for substance addition errors
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';
import { SubstanceError, SubstanceErrorType } from '../../services/error/substanceErrorHandler';

interface ErrorFeedbackPanelProps {
  error: SubstanceError;
  onRetry?: () => void;
  onDismiss?: () => void;
  onContactSupport?: () => void;
  context?: string;
}

interface ErrorGuidance {
  icon: string;
  title: string;
  description: string;
  steps: string[];
  preventionTips?: string[];
  technicalDetails?: string;
}

const ERROR_GUIDANCE: Record<SubstanceErrorType, ErrorGuidance> = {
  NETWORK_ERROR: {
    icon: '🌐',
    title: 'Connection Issue',
    description: 'Unable to connect to our servers. This is usually temporary.',
    steps: [
      'Check your internet connection',
      'Try switching between WiFi and mobile data',
      'Wait a moment and try again',
      'Restart the app if the problem persists'
    ],
    preventionTips: [
      'Ensure stable internet connection before adding substances',
      'Consider adding substances when you have good connectivity'
    ]
  },
  DUPLICATE_NAME: {
    icon: '📝',
    title: 'Name Already Exists',
    description: 'You already have a substance with this name in your collection.',
    steps: [
      'Choose a different, more specific name',
      'Add details like brand or strength (e.g., "Vitamin D3 5000IU")',
      'Check your existing substances to avoid duplicates',
      'Consider using abbreviations or alternative names'
    ],
    preventionTips: [
      'Use descriptive names that include brand or dosage',
      'Check existing substances before adding new ones',
      'Use consistent naming conventions'
    ]
  },
  VALIDATION_ERROR: {
    icon: '✏️',
    title: 'Invalid Information',
    description: 'Some of the information you entered needs to be corrected.',
    steps: [
      'Check all required fields are filled',
      'Ensure the substance name is 3-50 characters',
      'Select a valid category',
      'Use appropriate units for the selected category',
      'Keep description under 255 characters'
    ],
    preventionTips: [
      'Fill out all required fields before submitting',
      'Use standard units appropriate for your substance type',
      'Keep names concise but descriptive'
    ]
  },
  PERMISSION_DENIED: {
    icon: '🔒',
    title: 'Access Denied',
    description: 'You don\'t have permission to perform this action.',
    steps: [
      'Make sure you\'re logged in',
      'Check your account status',
      'Try logging out and back in',
      'Contact support if the problem continues'
    ],
    preventionTips: [
      'Keep your app updated',
      'Maintain an active account subscription if required'
    ],
    technicalDetails: 'This may indicate an authentication or authorization issue.'
  },
  RATE_LIMITED: {
    icon: '⏱️',
    title: 'Too Many Requests',
    description: 'You\'re adding substances too quickly. Please slow down.',
    steps: [
      'Wait a few minutes before trying again',
      'Add substances one at a time',
      'Take breaks between multiple additions',
      'The limit will reset automatically'
    ],
    preventionTips: [
      'Add substances at a reasonable pace',
      'Consider preparing your substance list beforehand',
      'Use bulk import features if available'
    ]
  },
  SERVER_ERROR: {
    icon: '🔧',
    title: 'Server Problem',
    description: 'Our servers are experiencing issues. This is not your fault.',
    steps: [
      'Wait a few minutes and try again',
      'Check our status page for updates',
      'Try again later if the problem persists',
      'Contact support if urgent'
    ],
    preventionTips: [
      'Save your work frequently',
      'Consider adding substances during off-peak hours'
    ],
    technicalDetails: 'Server returned an internal error. Our team has been notified.'
  },
  TIMEOUT: {
    icon: '⏰',
    title: 'Request Timed Out',
    description: 'The operation took too long to complete.',
    steps: [
      'Check your internet connection speed',
      'Try again with a better connection',
      'Close other apps that might be using bandwidth',
      'Contact support if timeouts persist'
    ],
    preventionTips: [
      'Use a stable, fast internet connection',
      'Avoid adding substances during peak usage times',
      'Keep the app updated for performance improvements'
    ]
  },
  UNKNOWN_ERROR: {
    icon: '❓',
    title: 'Unexpected Error',
    description: 'Something unexpected happened. We\'re looking into it.',
    steps: [
      'Try the operation again',
      'Restart the app if needed',
      'Check for app updates',
      'Contact support with details about what you were doing'
    ],
    preventionTips: [
      'Keep the app updated',
      'Report unusual behavior to help us improve',
      'Save your work frequently'
    ],
    technicalDetails: 'An unclassified error occurred. Error details have been logged.'
  }
};

export const ErrorFeedbackPanel: React.FC<ErrorFeedbackPanelProps> = ({
  error,
  onRetry,
  onDismiss,
  onContactSupport,
  context
}) => {
  const guidance = ERROR_GUIDANCE[error.type];
  const isRetryable = ['NETWORK_ERROR', 'SERVER_ERROR', 'TIMEOUT', 'RATE_LIMITED'].includes(error.type);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>{guidance.icon}</Text>
          <Text style={styles.title}>{guidance.title}</Text>
          <Text style={styles.description}>{guidance.description}</Text>
        </View>

        {/* Context Information */}
        {context && (
          <View style={styles.contextContainer}>
            <Text style={styles.contextLabel}>What you were doing:</Text>
            <Text style={styles.contextText}>{context}</Text>
          </View>
        )}

        {/* Steps to Resolve */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to fix this:</Text>
          {guidance.steps.map((step, index) => (
            <View key={index} style={styles.stepContainer}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Prevention Tips */}
        {guidance.preventionTips && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Tips to prevent this:</Text>
            {guidance.preventionTips.map((tip, index) => (
              <View key={index} style={styles.tipContainer}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Technical Details (Development Mode) */}
        {__DEV__ && guidance.technicalDetails && (
          <View style={styles.technicalSection}>
            <Text style={styles.technicalTitle}>Technical Details:</Text>
            <Text style={styles.technicalText}>{guidance.technicalDetails}</Text>
            {error.originalError && (
              <Text style={styles.technicalText}>
                Original Error: {error.originalError.message}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {isRetryable && onRetry && (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={onRetry}
            accessibilityLabel="Retry the operation"
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}

        {onContactSupport && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onContactSupport}
            accessibilityLabel="Contact support for help"
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Get Help</Text>
          </TouchableOpacity>
        )}

        {onDismiss && (
          <TouchableOpacity
            style={[styles.button, styles.tertiaryButton]}
            onPress={onDismiss}
            accessibilityLabel="Dismiss error message"
            accessibilityRole="button"
          >
            <Text style={styles.tertiaryButtonText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BioReceiptTheme.colors.surface,
    borderRadius: BioReceiptTheme.borderRadius.lg,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
    padding: BioReceiptTheme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: BioReceiptTheme.spacing.xl,
  },
  icon: {
    fontSize: 48,
    marginBottom: BioReceiptTheme.spacing.md,
  },
  title: {
    fontSize: BioReceiptTheme.typography.fontSize.xl,
    fontWeight: BioReceiptTheme.typography.fontWeight.bold,
    color: BioReceiptTheme.colors.text,
    textAlign: 'center',
    marginBottom: BioReceiptTheme.spacing.sm,
  },
  description: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  contextContainer: {
    backgroundColor: BioReceiptTheme.colors.primaryLight,
    padding: BioReceiptTheme.spacing.md,
    borderRadius: BioReceiptTheme.borderRadius.md,
    marginBottom: BioReceiptTheme.spacing.lg,
  },
  contextLabel: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.primary,
    marginBottom: BioReceiptTheme.spacing.xs,
  },
  contextText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.text,
  },
  section: {
    marginBottom: BioReceiptTheme.spacing.xl,
  },
  sectionTitle: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.text,
    marginBottom: BioReceiptTheme.spacing.md,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: BioReceiptTheme.spacing.md,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    fontWeight: BioReceiptTheme.typography.fontWeight.bold,
    color: BioReceiptTheme.colors.primary,
    backgroundColor: BioReceiptTheme.colors.primaryLight,
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: BioReceiptTheme.spacing.sm,
  },
  stepText: {
    flex: 1,
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.text,
    lineHeight: 22,
  },
  tipContainer: {
    flexDirection: 'row',
    marginBottom: BioReceiptTheme.spacing.sm,
    alignItems: 'flex-start',
  },
  tipBullet: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.secondary,
    marginRight: BioReceiptTheme.spacing.sm,
    lineHeight: 22,
  },
  tipText: {
    flex: 1,
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textSecondary,
    lineHeight: 20,
  },
  technicalSection: {
    backgroundColor: BioReceiptTheme.colors.surfaceLight,
    padding: BioReceiptTheme.spacing.md,
    borderRadius: BioReceiptTheme.borderRadius.md,
    marginTop: BioReceiptTheme.spacing.lg,
  },
  technicalTitle: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.textSecondary,
    marginBottom: BioReceiptTheme.spacing.xs,
  },
  technicalText: {
    fontSize: BioReceiptTheme.typography.fontSize.xs,
    color: BioReceiptTheme.colors.textTertiary,
    fontFamily: 'monospace',
    lineHeight: 16,
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: BioReceiptTheme.spacing.lg,
    gap: BioReceiptTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: BioReceiptTheme.colors.border,
  },
  button: {
    flex: 1,
    paddingVertical: BioReceiptTheme.spacing.md,
    borderRadius: BioReceiptTheme.borderRadius.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: BioReceiptTheme.colors.primary,
  },
  primaryButtonText: {
    color: BioReceiptTheme.colors.surface,
    fontSize: BioReceiptTheme.typography.fontSize.md,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
  },
  secondaryButton: {
    backgroundColor: BioReceiptTheme.colors.secondary,
  },
  secondaryButtonText: {
    color: BioReceiptTheme.colors.surface,
    fontSize: BioReceiptTheme.typography.fontSize.md,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
  },
  tertiaryButton: {
    backgroundColor: BioReceiptTheme.colors.surface,
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
  },
  tertiaryButtonText: {
    color: BioReceiptTheme.colors.textSecondary,
    fontSize: BioReceiptTheme.typography.fontSize.md,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
  },
});

export default ErrorFeedbackPanel;