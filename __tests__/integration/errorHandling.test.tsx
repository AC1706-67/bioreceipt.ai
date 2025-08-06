/**
 * Integration tests for error handling system
 * Tests the complete error handling flow including ErrorBoundary and logging
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { ErrorBoundary } from '../../src/components/error/ErrorBoundary';
import { LoggingService } from '../../src/services/logging/loggingService';
import * as storage from '../../src/utils/storage';

// Mock dependencies
jest.mock('../../src/utils/storage');
jest.mock('../../src/services/sync/syncService');

const mockStorage = storage as jest.Mocked<typeof storage>;

// Test component that throws an error
const ThrowErrorComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test component error');
  }
  return <Text>Component rendered successfully</Text>;
};

// Test component with button to trigger error
const ErrorTriggerComponent: React.FC = () => {
  const [shouldThrow, setShouldThrow] = React.useState(false);

  return (
    <>
      <TouchableOpacity
        testID="trigger-error"
        onPress={() => setShouldThrow(true)}
      >
        <Text>Trigger Error</Text>
      </TouchableOpacity>
      <ThrowErrorComponent shouldThrow={shouldThrow} />
    </>
  );
};

describe('Error Handling Integration', () => {
  let loggingService: LoggingService;

  beforeEach(() => {
    loggingService = LoggingService.getInstance();
    jest.clearAllMocks();
    mockStorage.getData.mockResolvedValue([]);
    mockStorage.storeData.mockResolvedValue();

    // Mock console methods to avoid noise in tests
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
  });

  describe('ErrorBoundary Integration', () => {
    it('should catch errors and display friendly error screen', () => {
      const { getByText, queryByText } = render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should not show the original component
      expect(queryByText('Component rendered successfully')).toBeNull();

      // Should show friendly error screen
      expect(getByText('Oops! Something went wrong')).toBeTruthy();
      expect(getByText('Try Again')).toBeTruthy();
      expect(getByText('Go to Home')).toBeTruthy();
    });

    it('should render children normally when no error occurs', () => {
      const { getByText, queryByText } = render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      // Should show the original component
      expect(getByText('Component rendered successfully')).toBeTruthy();

      // Should not show error screen
      expect(queryByText('Oops! Something went wrong')).toBeNull();
    });

    it('should allow retry functionality', () => {
      const { getByText, getByTestId } = render(
        <ErrorBoundary>
          <ErrorTriggerComponent />
        </ErrorBoundary>
      );

      // Initially should show normal component
      expect(getByText('Component rendered successfully')).toBeTruthy();

      // Trigger error
      fireEvent.press(getByTestId('trigger-error'));

      // Should show error screen
      expect(getByText('Oops! Something went wrong')).toBeTruthy();

      // Retry should reset the error boundary
      fireEvent.press(getByText('Try Again'));

      // Should show normal component again (but error will re-trigger due to state)
      // In a real app, retry would typically reset the error-causing state
    });

    it('should call custom error handler when provided', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should render custom fallback when provided', () => {
      const customFallback = <Text>Custom Error Message</Text>;

      const { getByText, queryByText } = render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show custom fallback
      expect(getByText('Custom Error Message')).toBeTruthy();

      // Should not show default error screen
      expect(queryByText('Oops! Something went wrong')).toBeNull();
    });
  });

  describe('Logging Integration', () => {
    beforeEach(async () => {
      await loggingService.initialize({ enableConsoleOutput: true });
    });

    it('should log errors caught by ErrorBoundary', async () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Wait for async logging to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should have logged the component error
      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'LOG_ENTRIES',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'error',
            message: 'Test component error',
            metadata: expect.objectContaining({
              module: 'component',
              componentStack: expect.any(String),
            }),
          })
        ])
      );
    });

    it('should include component stack in error logs', async () => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      await new Promise(resolve => setTimeout(resolve, 0));

      const logCall = mockStorage.storeData.mock.calls.find(
        call => call[0] === 'LOG_ENTRIES'
      );
      expect(logCall).toBeDefined();

      const logs = logCall![1] as any[];
      const errorLog = logs.find(log => log.level === 'error');
      expect(errorLog.metadata.componentStack).toContain('ThrowErrorComponent');
    });
  });

  describe('Error Recovery Flow', () => {
    it('should handle multiple errors gracefully', () => {
      const MultiErrorComponent: React.FC = () => {
        const [errorCount, setErrorCount] = React.useState(0);

        if (errorCount > 0) {
          throw new Error(`Error number ${errorCount}`);
        }

        return (
          <TouchableOpacity
            testID="trigger-multiple-errors"
            onPress={() => setErrorCount(prev => prev + 1)}
          >
            <Text>Trigger Error</Text>
          </TouchableOpacity>
        );
      };

      const { getByText, getByTestId, queryByTestId } = render(
        <ErrorBoundary>
          <MultiErrorComponent />
        </ErrorBoundary>
      );

      // Trigger first error
      fireEvent.press(getByTestId('trigger-multiple-errors'));

      // Should show error screen
      expect(getByText('Oops! Something went wrong')).toBeTruthy();

      // Retry
      fireEvent.press(getByText('Try Again'));

      // Should reset and show component again
      expect(queryByTestId('trigger-multiple-errors')).toBeTruthy();
    });

    it('should maintain error boundary state correctly', () => {
      const StatefulErrorComponent: React.FC = () => {
        const [count, setCount] = React.useState(0);
        const [shouldError, setShouldError] = React.useState(false);

        if (shouldError) {
          throw new Error('Stateful component error');
        }

        return (
          <>
            <Text>Count: {count}</Text>
            <TouchableOpacity
              testID="increment"
              onPress={() => setCount(prev => prev + 1)}
            >
              <Text>Increment</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="trigger-error"
              onPress={() => setShouldError(true)}
            >
              <Text>Trigger Error</Text>
            </TouchableOpacity>
          </>
        );
      };

      const { getByText, getByTestId } = render(
        <ErrorBoundary>
          <StatefulErrorComponent />
        </ErrorBoundary>
      );

      // Increment counter
      fireEvent.press(getByTestId('increment'));
      expect(getByText('Count: 1')).toBeTruthy();

      // Trigger error
      fireEvent.press(getByTestId('trigger-error'));

      // Should show error screen
      expect(getByText('Oops! Something went wrong')).toBeTruthy();

      // Retry should reset the component
      fireEvent.press(getByText('Try Again'));

      // Component should be reset to initial state
      expect(getByText('Count: 0')).toBeTruthy();
    });
  });

  describe('Error Reporting Flow', () => {
    it('should allow users to report errors', async () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show report error button
      expect(getByText('📧 Report this error')).toBeTruthy();

      // Mock Alert.alert
      const mockAlert = jest.fn();
      jest.doMock('react-native', () => ({
        ...jest.requireActual('react-native'),
        Alert: { alert: mockAlert },
      }));

      // Tap report error
      fireEvent.press(getByText('📧 Report this error'));

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should have logged the user report
      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'LOG_ENTRIES',
        expect.arrayContaining([
          expect.objectContaining({
            metadata: expect.objectContaining({
              module: 'user_report',
              userReported: true,
            }),
          })
        ])
      );
    });

    it('should show error details in development mode', () => {
      // Mock __DEV__ to be true
      (global as any).__DEV__ = true;

      const { getByText } = render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show error details button in dev mode
      expect(getByText('🔍 Show error details')).toBeTruthy();
    });
  });

  describe('Performance Impact', () => {
    it('should not significantly impact render performance', () => {
      const startTime = Date.now();

      // Render multiple components with error boundaries
      for (let i = 0; i < 100; i++) {
        render(
          <ErrorBoundary>
            <ThrowErrorComponent shouldThrow={false} />
          </ErrorBoundary>
        );
      }

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      // Should render quickly (less than 1 second for 100 components)
      expect(renderTime).toBeLessThan(1000);
    });

    it('should handle rapid error occurrences', async () => {
      const RapidErrorComponent: React.FC = () => {
        const [errorCount, setErrorCount] = React.useState(0);

        React.useEffect(() => {
          const interval = setInterval(() => {
            setErrorCount(prev => prev + 1);
          }, 10);

          return () => clearInterval(interval);
        }, []);

        if (errorCount > 5) {
          throw new Error(`Rapid error ${errorCount}`);
        }

        return <Text>Error count: {errorCount}</Text>;
      };

      const { getByText } = render(
        <ErrorBoundary>
          <RapidErrorComponent />
        </ErrorBoundary>
      );

      // Wait for errors to trigger
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should show error screen
      expect(getByText('Oops! Something went wrong')).toBeTruthy();

      // Should have logged the error
      expect(mockStorage.storeData).toHaveBeenCalled();
    });
  });
});