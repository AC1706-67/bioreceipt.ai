/**
 * Substance Error Boundary
 * Specialized error boundary for substance addition flow
 * Provides graceful error recovery and user-friendly feedback
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BioPulseTheme } from '../../constants/bioPulseTheme';
import { SubstanceErrorHandler } from '../../services/error/substanceErrorHandler';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  fallbackComponent?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  retryCount: number;
}

export class SubstanceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `substance_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error for debugging and analytics
    console.error('SubstanceErrorBoundary caught an error:', error, errorInfo);
    
    // Classify and log the error
    const substanceError = SubstanceErrorHandler.classifyError(error);
    SubstanceErrorHandler.logError(substanceError, {
      context: 'SubstanceErrorBoundary',
      errorInfo,
      errorId: this.state.errorId,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString(),
    });

    // Notify parent component if callback provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback component if provided
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      // Default error UI
      const substanceError = this.state.error ? 
        SubstanceErrorHandler.classifyError(this.state.error) : null;
      
      const isRetryable = substanceError ? 
        SubstanceErrorHandler.isRetryable(substanceError) : true;

      const userMessage = substanceError ? 
        SubstanceErrorHandler.getUserMessage(substanceError) : {
          title: 'Something went wrong',
          message: 'An unexpected error occurred while managing substances.',
          actionText: 'Try Again'
        };

      return (
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <View style={styles.iconContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
            </View>
            
            <Text style={styles.errorTitle}>{userMessage.title}</Text>
            <Text style={styles.errorMessage}>{userMessage.message}</Text>
            
            {this.state.retryCount > 0 && (
              <Text style={styles.retryInfo}>
                Retry attempt: {this.state.retryCount}
              </Text>
            )}
            
            <View style={styles.buttonContainer}>
              {isRetryable && (
                <TouchableOpacity
                  style={[styles.button, styles.retryButton]}
                  onPress={this.handleRetry}
                  accessibilityLabel="Retry operation"
                  accessibilityRole="button"
                >
                  <Text style={styles.retryButtonText}>
                    {userMessage.actionText || 'Try Again'}
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.button, styles.resetButton]}
                onPress={this.handleReset}
                accessibilityLabel="Reset and start over"
                accessibilityRole="button"
              >
                <Text style={styles.resetButtonText}>Start Over</Text>
              </TouchableOpacity>
            </View>
            
            {__DEV__ && this.state.errorId && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugText}>
                  Error ID: {this.state.errorId}
                </Text>
                <Text style={styles.debugText}>
                  Error: {this.state.error?.message}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: BioPulseTheme.spacing.lg,
    backgroundColor: BioPulseTheme.colors.background,
  },
  errorCard: {
    backgroundColor: BioPulseTheme.colors.surface,
    borderRadius: BioPulseTheme.borderRadius.lg,
    padding: BioPulseTheme.spacing.xl,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    marginBottom: BioPulseTheme.spacing.lg,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: BioPulseTheme.typography.fontSize.xl,
    fontWeight: BioPulseTheme.typography.fontWeight.bold,
    color: BioPulseTheme.colors.text,
    textAlign: 'center',
    marginBottom: BioPulseTheme.spacing.md,
  },
  errorMessage: {
    fontSize: BioPulseTheme.typography.fontSize.md,
    color: BioPulseTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: BioPulseTheme.spacing.lg,
  },
  retryInfo: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.textTertiary,
    marginBottom: BioPulseTheme.spacing.md,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: BioPulseTheme.spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: BioPulseTheme.spacing.md,
    paddingHorizontal: BioPulseTheme.spacing.lg,
    borderRadius: BioPulseTheme.borderRadius.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: BioPulseTheme.colors.primary,
  },
  retryButtonText: {
    color: BioPulseTheme.colors.surface,
    fontSize: BioPulseTheme.typography.fontSize.md,
    fontWeight: BioPulseTheme.typography.fontWeight.semibold,
  },
  resetButton: {
    backgroundColor: BioPulseTheme.colors.surface,
    borderWidth: 1,
    borderColor: BioPulseTheme.colors.border,
  },
  resetButtonText: {
    color: BioPulseTheme.colors.textSecondary,
    fontSize: BioPulseTheme.typography.fontSize.md,
    fontWeight: BioPulseTheme.typography.fontWeight.medium,
  },
  debugInfo: {
    marginTop: BioPulseTheme.spacing.lg,
    padding: BioPulseTheme.spacing.md,
    backgroundColor: BioPulseTheme.colors.surfaceLight,
    borderRadius: BioPulseTheme.borderRadius.sm,
    width: '100%',
  },
  debugText: {
    fontSize: BioPulseTheme.typography.fontSize.xs,
    color: BioPulseTheme.colors.textTertiary,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});

export default SubstanceErrorBoundary;