/**
 * Enhanced Error Screen Component
 * Advanced error display with classification, recovery, and user guidance
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated
} from 'react-native';
import { 
  errorClassificationService, 
  ClassifiedError, 
  ErrorSeverity, 
  RecoveryStrategy 
} from '../../services/error/errorClassificationService';
import { loggingService } from '../../services/logging/loggingService';
import { useAnalytics } from '../../hooks/useAnalytics';

interface Props {
  error?: Error;
  errorInfo?: React.ErrorInfo;
  context?: Record<string, any>;
  userId?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  onRecovered?: () => void;
}

export const EnhancedErrorScreen: React.FC<Props> = ({
  error,
  errorInfo,
  context = {},
  userId,
  onRetry,
  onGoHome,
  onRecovered,
}) => {
  const [classifiedError, setClassifiedError] = useState<ClassifiedError | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  const { trackError } = useAnalytics({ userId });

  useEffect(() => {
    if (error) {
      classifyError();
    }
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [error]);

  const classifyError = useCallback(async () => {
    if (!error) return;

    try {
      const errorContext = {
        module: context.module || 'unknown',
        method: context.method,
        component: context.component,
        userAction: context.userAction,
        appState: context.appState,
        componentStack: errorInfo?.componentStack,
        ...context
      };

      const classified = await errorClassificationService.classifyAndHandle(
        error,
        errorContext,
        userId
      );

      setClassifiedError(classified);

      // Track error in analytics
      trackError(error, errorContext.module);

      // Attempt automatic recovery if applicable
      if (classified.errorCode.retryable && !recoveryAttempted) {
        attemptRecovery(classified);
      }
    } catch (classificationError) {
      console.error('Error during classification:', classificationError);
    }
  }, [error, context, errorInfo, userId, trackError, recoveryAttempted]);

  const attemptRecovery = useCallback(async (classified: ClassifiedError) => {
    if (isRecovering || recoveryAttempted) return;

    setIsRecovering(true);
    setRecoveryAttempted(true);

    try {
      const result = await errorClassificationService.attemptRecovery(classified);
      
      if (result.success) {
        // Recovery successful
        Alert.alert(
          'Problem Resolved',
          'We were able to fix the issue automatically. You can continue using the app.',
          [
            {
              text: 'Continue',
              onPress: () => {
                if (onRecovered) {
                  onRecovered();
                } else if (onRetry) {
                  onRetry();
                }
              }
            }
          ]
        );
      } else if (result.requiresUserAction) {
        // Show user action required
        Alert.alert(
          'Action Required',
          result.actionInstructions || 'Please follow the suggested actions to resolve this issue.',
          [{ text: 'OK' }]
        );
      }
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
    } finally {
      setIsRecovering(false);
    }
  }, [isRecovering, recoveryAttempted, onRecovered, onRetry]);

  const handleRetry = useCallback(() => {
    if (classifiedError && classifiedError.errorCode.retryable) {
      attemptRecovery(classifiedError);
    } else if (onRetry) {
      onRetry();
    }
  }, [classifiedError, onRetry, attemptRecovery]);

  const handleReportError = useCallback(async () => {
    try {
      if (classifiedError) {
        await loggingService.logError(classifiedError.originalError, {
          ...classifiedError.context,
          userReported: true,
          errorId: classifiedError.id,
          errorCode: classifiedError.errorCode.code
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
  }, [classifiedError]);

  const getSeverityColor = (severity: ErrorSeverity): string => {
    const colors = {
      [ErrorSeverity.LOW]: '#28a745',
      [ErrorSeverity.MEDIUM]: '#ffc107',
      [ErrorSeverity.HIGH]: '#fd7e14',
      [ErrorSeverity.CRITICAL]: '#dc3545'
    };
    return colors[severity] || colors[ErrorSeverity.MEDIUM];
  };

  const getSeverityIcon = (severity: ErrorSeverity): string => {
    const icons = {
      [ErrorSeverity.LOW]: '⚠️',
      [ErrorSeverity.MEDIUM]: '😕',
      [ErrorSeverity.HIGH]: '😰',
      [ErrorSeverity.CRITICAL]: '💥'
    };
    return icons[severity] || icons[ErrorSeverity.MEDIUM];
  };

  const getRecoveryStrategyMessage = (strategy: RecoveryStrategy): string => {
    const messages = {
      [RecoveryStrategy.RETRY]: 'We can try to fix this automatically.',
      [RecoveryStrategy.FALLBACK]: 'We\'ll use an alternative approach.',
      [RecoveryStrategy.GRACEFUL_DEGRADATION]: 'Some features may be limited temporarily.',
      [RecoveryStrategy.USER_ACTION_REQUIRED]: 'We need your help to resolve this.',
      [RecoveryStrategy.RESTART_REQUIRED]: 'The app needs to be restarted.',
      [RecoveryStrategy.NO_RECOVERY]: 'This issue requires manual intervention.'
    };
    return messages[strategy] || 'We\'re working on a solution.';
  };

  const renderErrorDetails = () => {
    if (!showDetails || !classifiedError) return null;

    return (
      <View style={styles.detailsContainer}>
        <Text style={styles.detailsTitle}>Technical Details</Text>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Error ID:</Text>
          <Text style={styles.detailValue}>{classifiedError.id}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Error Code:</Text>
          <Text style={styles.detailValue}>{classifiedError.errorCode.code}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Category:</Text>
          <Text style={styles.detailValue}>{classifiedError.errorCode.category}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Recovery Attempts:</Text>
          <Text style={styles.detailValue}>{classifiedError.recoveryAttempts}</Text>
        </View>
        {__DEV__ && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Stack Trace:</Text>
            <Text style={[styles.detailValue, styles.stackTrace]}>
              {classifiedError.originalError.stack || 'No stack trace available'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (!classifiedError) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Analyzing error...</Text>
        </View>
      </View>
    );
  }

  const { errorCode } = classifiedError;
  const userMessage = errorClassificationService.getUserFriendlyMessage(classifiedError);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Icon and Severity */}
        <View style={styles.iconContainer}>
          <Text style={styles.errorIcon}>
            {getSeverityIcon(errorCode.severity)}
          </Text>
          <View style={[
            styles.severityBadge, 
            { backgroundColor: getSeverityColor(errorCode.severity) }
          ]}>
            <Text style={styles.severityText}>
              {errorCode.severity.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Main Message */}
        <Text style={styles.title}>{userMessage.title}</Text>
        <Text style={styles.subtitle}>{userMessage.message}</Text>

        {/* Recovery Status */}
        {isRecovering && (
          <View style={styles.recoveryContainer}>
            <ActivityIndicator size="small" color="#3498db" />
            <Text style={styles.recoveryText}>
              Attempting to resolve the issue...
            </Text>
          </View>
        )}

        {/* Recovery Strategy Info */}
        <View style={styles.strategyContainer}>
          <Text style={styles.strategyTitle}>What we're doing:</Text>
          <Text style={styles.strategyText}>
            {getRecoveryStrategyMessage(errorCode.recoveryStrategy)}
          </Text>
        </View>

        {/* Suggested Actions */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Suggested actions:</Text>
          {userMessage.actions.map((action, index) => (
            <View key={index} style={styles.suggestion}>
              <Text style={styles.suggestionBullet}>•</Text>
              <Text style={styles.suggestionText}>{action}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {errorCode.retryable && (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleRetry}
              disabled={isRecovering}
            >
              {isRecovering ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {recoveryAttempted ? 'Try Again' : 'Auto-Fix'}
                </Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onGoHome}
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

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => setShowDetails(!showDetails)}
          >
            <Text style={styles.linkButtonText}>
              {showDetails ? '🔼 Hide details' : '🔍 Show details'}
            </Text>
          </TouchableOpacity>
        </View>

        {renderErrorDetails()}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Error ID: {classifiedError.id}
          </Text>
          <Text style={styles.footerText}>
            We're constantly working to improve your experience.
          </Text>
        </View>
      </ScrollView>
    </Animated.View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  errorIcon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 12,
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
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
    marginBottom: 24,
  },
  recoveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  recoveryText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
  },
  strategyContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  strategyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  strategyText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
  suggestionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
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
    minHeight: 52,
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
    marginBottom: 24,
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
  detailsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    width: 120,
  },
  detailValue: {
    flex: 1,
    fontSize: 12,
    color: '#495057',
  },
  stackTrace: {
    fontFamily: 'monospace',
    fontSize: 10,
    backgroundColor: '#f1f3f4',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
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
    marginBottom: 4,
  },
});

export default EnhancedErrorScreen;