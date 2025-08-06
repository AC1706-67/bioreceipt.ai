/**
 * Substance Operation Error Boundary
 * Catches and handles errors in substance-related operations
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BioPulseTheme } from '../../constants/bioPulseTheme';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  fallbackComponent?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class SubstanceOperationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('SubstanceOperationErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback component if provided
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      // Default error UI
      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>
              There was an error with the substance operation. Please try again.
            </Text>
            
            {__DEV__ && this.state.error && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Debug Info:</Text>
                <Text style={styles.debugText}>{this.state.error.message}</Text>
                {this.state.errorInfo && (
                  <Text style={styles.debugText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}
            
            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleRetry}
              accessible={true}
              accessibilityLabel="Retry operation"
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: BioPulseTheme.spacing.lg,
    backgroundColor: BioPulseTheme.colors.background,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: BioPulseTheme.spacing.md,
  },
  errorTitle: {
    fontSize: BioPulseTheme.typography.fontSize.xl,
    fontWeight: BioPulseTheme.typography.fontWeight.bold,
    color: BioPulseTheme.colors.error,
    marginBottom: BioPulseTheme.spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: BioPulseTheme.typography.fontSize.md,
    color: BioPulseTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: BioPulseTheme.spacing.lg,
    lineHeight: 22,
  },
  debugInfo: {
    backgroundColor: BioPulseTheme.colors.surfaceLight,
    padding: BioPulseTheme.spacing.md,
    borderRadius: BioPulseTheme.borderRadius.md,
    marginBottom: BioPulseTheme.spacing.lg,
    width: '100%',
  },
  debugTitle: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    fontWeight: BioPulseTheme.typography.fontWeight.semibold,
    color: BioPulseTheme.colors.error,
    marginBottom: BioPulseTheme.spacing.xs,
  },
  debugText: {
    fontSize: BioPulseTheme.typography.fontSize.xs,
    color: BioPulseTheme.colors.textTertiary,
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: BioPulseTheme.colors.primary,
    paddingHorizontal: BioPulseTheme.spacing.lg,
    paddingVertical: BioPulseTheme.spacing.md,
    borderRadius: BioPulseTheme.borderRadius.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: BioPulseTheme.typography.fontSize.md,
    fontWeight: BioPulseTheme.typography.fontWeight.medium,
    color: BioPulseTheme.colors.surface,
  },
});

export default SubstanceOperationErrorBoundary;