/**
 * Error Test Component
 * Development component for testing error handling
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LoggingService } from '../../services/logging/loggingService';
import { withErrorLogging, handleApiError, handleValidationError } from '../../utils/errorHandler';

export const ErrorTestComponent: React.FC = () => {
  const [shouldThrow, setShouldThrow] = useState(false);
  const loggingService = LoggingService.getInstance();

  // This will trigger the ErrorBoundary
  if (shouldThrow) {
    throw new Error('Test component error for ErrorBoundary');
  }

  const testAsyncError = withErrorLogging(
    async () => {
      throw new Error('Test async error');
    },
    { module: 'ErrorTestComponent', method: 'testAsyncError' }
  );

  const testApiError = async () => {
    const mockApiError = {
      response: {
        status: 404,
        data: { message: 'Resource not found' }
      },
      message: 'Request failed'
    };
    
    await handleApiError(mockApiError, '/api/test-endpoint', { param: 'test' });
    Alert.alert('API Error', 'Check logs for API error details');
  };

  const testValidationError = async () => {
    await handleValidationError(
      'email',
      'invalid-email-format',
      'email validation',
      'Please enter a valid email address'
    );
    Alert.alert('Validation Error', 'Check logs for validation error details');
  };

  const testManualLogging = async () => {
    await loggingService.logError(new Error('Manual error log'), {
      module: 'ErrorTestComponent',
      method: 'testManualLogging',
      customData: { test: true }
    });

    await loggingService.logWarn('Test warning message', {
      warningType: 'performance',
      threshold: 2000
    });

    await loggingService.logInfo('Test info message', {
      action: 'user_interaction',
      details: 'Button clicked'
    });

    Alert.alert('Manual Logging', 'Various log levels have been recorded');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Error Handling Test</Text>
      <Text style={styles.subtitle}>
        Use these buttons to test different error scenarios
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={() => setShouldThrow(true)}
        >
          <Text style={styles.buttonText}>🚨 Trigger Component Error</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.warningButton]}
          onPress={async () => {
            try {
              await testAsyncError();
            } catch (error) {
              Alert.alert('Async Error', 'Error was caught and logged');
            }
          }}
        >
          <Text style={styles.buttonText}>⚡ Test Async Error</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.infoButton]}
          onPress={testApiError}
        >
          <Text style={styles.buttonText}>🌐 Test API Error</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.infoButton]}
          onPress={testValidationError}
        >
          <Text style={styles.buttonText}>✅ Test Validation Error</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={testManualLogging}
        >
          <Text style={styles.buttonText}>📝 Test Manual Logging</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>💡 How to test:</Text>
        <Text style={styles.infoText}>
          1. Tap buttons to trigger different error types{'\n'}
          2. Check the Application Logs screen to see logged errors{'\n'}
          3. The first button will trigger the ErrorBoundary{'\n'}
          4. Other buttons test different logging scenarios
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 32,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#e74c3c',
  },
  warningButton: {
    backgroundColor: '#f39c12',
  },
  infoButton: {
    backgroundColor: '#3498db',
  },
  primaryButton: {
    backgroundColor: '#27ae60',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
});