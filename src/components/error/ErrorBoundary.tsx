/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */

import React, { Component, ReactNode } from 'react';
import { LoggingService } from '../../services/logging/loggingService';
import { FriendlyErrorScreen } from './FriendlyErrorScreen';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  private loggingService: LoggingService;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
    this.loggingService = LoggingService.getInstance();
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    this.loggingService.logComponentError(error, errorInfo, this.getComponentName());
    
    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  private getComponentName(): string {
    // Try to extract component name from the stack
    try {
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        for (const line of lines) {
          if (line.includes('at ') && !line.includes('ErrorBoundary')) {
            const match = line.match(/at (\w+)/);
            if (match) {
              return match[1];
            }
          }
        }
      }
    } catch (e) {
      // Ignore errors in component name extraction
    }
    return 'Unknown';
  }

  private handleRetry = () => {
    // Reset the error boundary state
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined 
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default friendly error screen
      return (
        <FriendlyErrorScreen
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error reporting in functional components
export function useErrorHandler() {
  const loggingService = LoggingService.getInstance();

  const reportError = React.useCallback((error: Error, context?: Record<string, any>) => {
    loggingService.logError(error, {
      module: 'component',
      ...context,
    });
  }, [loggingService]);

  return { reportError };
}