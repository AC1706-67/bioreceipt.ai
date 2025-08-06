/**
 * Friendly Error Screen Component
 * User-friendly error display when something goes wrong
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LoggingService } from '../../services/logging/loggingService';

interface Props {
  error?: Error;
  errorInfo?: React.ErrorInfo;
  onRetry?: () => void;
  onGoHome?: () => void;
}

export const FriendlyErrorScreen: React.FC<Props> = ({
  error,
  errorInfo,
  onRetry,
  onGoHome,
}) => {
  const loggingService = LoggingService.getInstance();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // Default retry behavior - reload the app
      // In a real app, you might use a navigation reset or app restart
      console.log('Retrying...');
    }
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      // Default home behavior
      console.log('Going home...');
    }
  };

  const handleReportError = async () => {
    try {
      if (error) {
        await loggingService.logError(error, {
          module: 'user_report',
          userReported: true,
          errorInfo: errorInfo?.componentStack,
        });
      }

      Alert.alert(
        'Thank You',
        'Your error report has been sent. We\'ll work on fixing this issue.',
        [{ text: 'OK' }]
      );
    } catch (reportError) {
      Alert.alert(
        'Report Failed',
        'We couldn\'t send your error report right now. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleShowDetails = () => {
    const errorDetails = `
Error: ${error?.message || 'Unknown error'}

Stack Trace:
${error?.stack || 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}
    `.trim();

    Alert.alert(
      'Error Details',
      errorDetails,
      [
        { text: 'Copy', onPress: () => {
          // In a real app, you'd copy to clipboard
          console.log('Error details copied to clipboard');
        }},
        { text: 'Close', style: 'cancel' }
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.errorIcon}>😵</Text>
        </View>

        {/* Main Message */}
        <Text style={styles.title}>Oops! Something went wrong</Text>
        <Text style={styles.subtitle}>
          We're sorry for the inconvenience. The app encountered an unexpected error.
        </Text>

        {/* Error Summary */}
        <View style={styles.errorSummary}>
          <Text style={styles.errorSummaryTitle}>What happened?</Text>
          <Text style={styles.errorSummaryText}>
            {error?.message || 'An unexpected error occurred while using the app.'}
          </Text>
        </View>

        {/* Suggestions */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>What you can do:</Text>
          <View style={styles.suggestion}>
            <Text style={styles.suggestionBullet}>•</Text>
            <Text style={styles.suggestionText}>
              Try refreshing the screen by tapping "Try Again"
            </Text>
          </View>
          <View style={styles.suggestion}>
            <Text style={styles.suggestionBullet}>•</Text>
            <Text style={styles.suggestionText}>
              Go back to the home screen and try a different action
            </Text>
          </View>
          <View style={styles.suggestion}>
            <Text style={styles.suggestionBullet}>•</Text>
            <Text style={styles.suggestionText}>
              If the problem persists, please report it to help us fix it
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleRetry}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleGoHome}
          >
            <Text style={styles.secondaryButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>

        {/* Additional Actions */}
        <View style={styles.additionalActions}>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={handleReportError}
          >
            <Text style={styles.linkButtonText}>📧 Report this error</Text>
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleShowDetails}
            >
              <Text style={styles.linkButtonText}>🔍 Show error details</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            We're constantly working to improve your experience. Thank you for your patience!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: '100%',
  },
  iconContainer: {
    marginBottom: 24,
  },
  errorIcon: {
    fontSize: 64,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  errorSummary: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  errorSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  errorSummaryText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  suggestionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  suggestionBullet: {
    fontSize: 16,
    color: '#3498db',
    marginRight: 12,
    marginTop: 2,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#3498db',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db',
  },
  additionalActions: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  linkButtonText: {
    fontSize: 14,
    color: '#6c757d',
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  footerText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});