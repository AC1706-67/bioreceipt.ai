/**
 * Substance Operation Error Boundary
 * Catches and handles errors in substance-related operations
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';

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
    padding: BioReceiptTheme.spacing.lg,
    backgroundColor: BioReceiptTheme.colors.background,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: BioReceiptTheme.spacing.md,
  },
  errorTitle: {
    fontSize: BioReceiptTheme.typography.fontSize.xl,
    fontWeight: BioReceiptTheme.typography.fontWeight.bold,
    color: BioReceiptTheme.colors.error,
    marginBottom: BioReceiptTheme.spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: BioReceiptTheme.spacing.lg,
    lineHeight: 22,
  },
  debugInfo: {
    backgroundColor: BioReceiptTheme.colors.surfaceLight,
    padding: BioReceiptTheme.spacing.md,
    borderRadius: BioReceiptTheme.borderRadius.md,
    marginBottom: BioReceiptTheme.spacing.lg,
    width: '100%',
  },
  debugTitle: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.error,
    marginBottom: BioReceiptTheme.spacing.xs,
  },
  debugText: {
    fontSize: BioReceiptTheme.typography.fontSize.xs,
    color: BioReceiptTheme.colors.textTertiary,
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: BioReceiptTheme.colors.primary,
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.md,
    borderRadius: BioReceiptTheme.borderRadius.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
    color: BioReceiptTheme.colors.surface,
  },
});

export default SubstanceOperationErrorBoundary;