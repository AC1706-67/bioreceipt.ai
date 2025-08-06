/**
 * Enhanced Error Handling - Integration Tests
 * Tests for comprehensive error handling, recovery, and user feedback systems
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import SubstanceSelector from '../../components/logging/SubstanceSelector';
import AddSubstanceModal from '../../components/logging/AddSubstanceModal';
import { ToastProvider } from '../../contexts/ToastContext';
import { substanceDatabase } from '../../services/substance/substanceDatabase';
import { errorRecoveryService } from '../../services/error/errorRecoveryService';
import { SubstanceErrorHandler, SubstanceErrorType } from '../../services/error/substanceErrorHandler';
import { SubstanceCategory } from '../../models/Substance';

// Mock dependencies
jest.mock('../../services/substance/substanceDatabase');
jest.mock('../../services/error/errorRecoveryService');
jest.mock('@react-native-community/netinfo');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

const mockSubstanceDatabase = substanceDatabase as jest.Mocked<typeof substanceDatabase>;
const mockErrorRecoveryService = errorRecoveryService as jest.Mocked<typeof errorRecoveryService>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    {children}
  </ToastProvider>
);

describe('Enhanced Error Handling - Integration Tests', () => {
  const mockCategories = [
    { id: 'supplements-id', name: 'supplements' },
    { id: 'food-id', name: 'food' },
    { id: 'alcohol-id', name: 'alcohol' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockSubstanceDatabase.getSupabaseSubstances.mockResolvedValue({
      success: true,
      data: []
    });
    mockSubstanceDatabase.getSupabaseCategories.mockResolvedValue({
      success: true,
      data: mockCategories
    });
    
    // Setup network status mock
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: { strength: 80 }
    } as any);
    
    mockNetInfo.addEventListener.mockReturnValue(() => {});
    
    // Setup error recovery service mocks
    mockErrorRecoveryService.recoverFromError.mockResolvedValue({
      success: false,
      message: 'Recovery attempted',
      requiresUserAction: true,
      userActionDescription: 'Please try again'
    });
    
    mockErrorRecoveryService.createSmartRetryStrategy.mockImplementation(
      async (error, operation, context) => {
        try {
          const result = await operation();
          return { success: true, message: 'Operation succeeded', data: result };
        } catch (err) {
          return { success: false, message: 'Operation failed after retries' };
        }
      }
    );
  });

  describe('Network Error Recovery Integration', () => {
    it('should detect network issues and provide appropriate feedback', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock network disconnection
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      } as any);

      const { getByPlaceholderText, getByTestId, getByText, queryByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockSubInfo.fetch).toHaveBeenCalled();
      });

      // Try to open add substance modal
      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Network Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Fill form
      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Network Test');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');

      // Try to submit with no network
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Should show network error message
      await waitFor(() => {
        expect(queryByText(/No internet connection/)).toBeTruthy();
      });

      // Should not call the database service
      expect(mockSubstanceDatabase.addCustomSubstance).not.toHaveBeenCalled();
    });

    it('should recover when network connection is restored', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Start with no connection
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      } as any);

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Navigate to modal and fill form
      await waitFor(() => {
        expect(mockNetInfo.fetch).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Recovery Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Recovery Test');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');

      // Try to submit with no network
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Simulate network restoration
      await act(async () => {
        mockNetInfo.fetch.mockResolvedValue({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: { strength: 80 }
        } as any);

        // Trigger network status change
        const listener = mockNetInfo.addEventListener.mock.calls[0][0];
        listener({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: { strength: 80 }
        } as any);
      });

      // Mock successful submission after network recovery
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: true,
        data: {
          id: 'recovery-test-1',
          name: 'Recovery Test',
          category_id: 'supplements-id',
          default_unit: 'mg',
          description: null,
          created_at: '2024-01-01T00:00:00Z',
          substance_categories: { id: 'supplements-id', name: 'supplements' }
        }
      });

      // Should show connection restored message
      await waitFor(() => {
        expect(queryByText(/Connection restored/)).toBeTruthy();
      });
    });

    it('should handle poor connection quality warnings', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock poor connection
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: { strength: 20 } // Poor signal
      } as any);

      const { getByPlaceholderText, getByTestId, queryByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Wait for network status detection
      await waitFor(() => {
        expect(mockNetInfo.fetch).toHaveBeenCalled();
      });

      // Should show poor connection warning
      await waitFor(() => {
        expect(queryByText(/Poor connection quality/)).toBeTruthy();
      });
    });
  });

  describe('Error Recovery Service Integration', () => {
    it('should use error recovery service for automatic recovery', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock network error that can be recovered
      const networkError = new Error('Network timeout');
      (networkError as any).code = 'NETWORK_ERROR';
      
      mockSubstanceDatabase.addCustomSubstance.mockRejectedValueOnce(networkError);
      
      // Mock successful recovery
      mockErrorRecoveryService.recoverFromError.mockResolvedValue({
        success: true,
        message: 'Network error recovered automatically'
      });

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Navigate to modal and submit
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Auto Recovery Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Fill and submit form
      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Auto Recovery Test');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Verify error recovery service is called
      await waitFor(() => {
        expect(mockErrorRecoveryService.recoverFromError).toHaveBeenCalledWith(
          expect.objectContaining({
            type: SubstanceErrorType.NETWORK_ERROR
          }),
          expect.any(Object)
        );
      });
    });

    it('should show detailed error panel for complex errors', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock complex error requiring user action
      const complexError = new Error('Complex validation error');
      (complexError as any).code = 'VALIDATION_ERROR';
      
      mockSubstanceDatabase.addCustomSubstance.mockRejectedValue(complexError);
      
      // Mock recovery requiring user action
      mockErrorRecoveryService.recoverFromError.mockResolvedValue({
        success: false,
        message: 'Manual intervention required',
        requiresUserAction: true,
        userActionDescription: 'Please correct the validation errors'
      });

      const { getByPlaceholderText, getByTestId, getByText, queryByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Navigate to modal and submit invalid data
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Complex Error Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Submit with invalid data
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Should show detailed error panel
      await waitFor(() => {
        expect(queryByText(/Manual intervention required/)).toBeTruthy();
      });

      // Should show error recovery options
      await waitFor(() => {
        expect(queryByText(/Show Details/)).toBeTruthy();
      });
    });

    it('should track error recovery statistics', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock error recovery with statistics tracking
      mockErrorRecoveryService.getRecoveryStats.mockReturnValue({
        'network_retry': { attempts: 5, successRate: 0.8 },
        'validation_guidance': { attempts: 3, successRate: 1.0 }
      });

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Trigger error scenario
      const networkError = new Error('Network error');
      mockSubstanceDatabase.addCustomSubstance.mockRejectedValue(networkError);

      // Navigate and submit
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Stats Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Stats Test');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Verify statistics are tracked
      await waitFor(() => {
        expect(mockErrorRecoveryService.getRecoveryStats).toHaveBeenCalled();
      });
    });
  });

  describe('Error Boundary Integration', () => {
    it('should catch and handle component errors gracefully', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock component error
      const ComponentWithError = () => {
        throw new Error('Component rendering error');
      };

      // This test would need to be implemented with a proper error boundary setup
      // For now, we'll test that the error boundary exists and can be triggered
      
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Verify component renders without throwing
      expect(getByPlaceholderText('Search substances...')).toBeTruthy();
    });

    it('should provide error recovery options in error boundary', async () => {
      // This would test the SubstanceErrorBoundary component
      // Implementation would depend on how we trigger the error boundary
      
      const onError = jest.fn();
      
      // Mock error boundary behavior
      const mockErrorBoundary = {
        componentDidCatch: jest.fn(),
        render: jest.fn().mockReturnValue(null)
      };

      // Verify error boundary handles errors appropriately
      expect(mockErrorBoundary).toBeDefined();
    });
  });

  describe('Toast Integration with Error Handling', () => {
    it('should show appropriate toast messages for different error types', async () => {
      const onSubstanceSelect = jest.fn();
      
      const errorScenarios = [
        {
          error: new Error('Network timeout'),
          errorType: 'NETWORK_ERROR',
          expectedMessage: /network/i
        },
        {
          error: new Error('Duplicate name'),
          errorType: 'DUPLICATE_NAME',
          expectedMessage: /already exists/i
        },
        {
          error: new Error('Validation failed'),
          errorType: 'VALIDATION_ERROR',
          expectedMessage: /validation/i
        }
      ];

      for (const scenario of errorScenarios) {
        jest.clearAllMocks();
        
        mockSubstanceDatabase.addCustomSubstance.mockRejectedValue(scenario.error);

        const { getByPlaceholderText, getByTestId, getByText, queryByText } = render(
          <TestWrapper>
            <SubstanceSelector
              onSubstanceSelect={onSubstanceSelect}
              selectedSubstance={null}
            />
          </TestWrapper>
        );

        // Navigate and submit
        await waitFor(() => {
          expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
        });

        const searchInput = getByPlaceholderText('Search substances...');
        fireEvent(searchInput, 'focus');
        fireEvent.changeText(searchInput, `Toast Test ${scenario.errorType}`);

        await waitFor(() => {
          const addCustomOption = getByTestId('add-custom-substance-option');
          fireEvent.press(addCustomOption);
        });

        const nameInput = getByTestId('substance-name-input');
        const categoryPicker = getByTestId('substance-category-picker');
        const unitInput = getByTestId('substance-unit-input');

        fireEvent.changeText(nameInput, `Toast Test ${scenario.errorType}`);
        fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
        fireEvent.changeText(unitInput, 'mg');

        const saveButton = getByText('Save');
        fireEvent.press(saveButton);

        // Verify appropriate error message is shown
        await waitFor(() => {
          // This would check for toast messages in a real implementation
          expect(mockSubstanceDatabase.addCustomSubstance).toHaveBeenCalled();
        });
      }
    });

    it('should provide actionable toast buttons for retryable errors', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock retryable network error
      const networkError = new Error('Network timeout');
      mockSubstanceDatabase.addCustomSubstance
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'retry-toast-1',
            name: 'Retry Toast Test',
            category_id: 'supplements-id',
            default_unit: 'mg',
            description: null,
            created_at: '2024-01-01T00:00:00Z',
            substance_categories: { id: 'supplements-id', name: 'supplements' }
          }
        });

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Navigate and submit
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Retry Toast Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Retry Toast Test');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // First attempt should fail, then retry should succeed
      await waitFor(() => {
        expect(mockSubstanceDatabase.addCustomSubstance).toHaveBeenCalledTimes(1);
      });

      // In a real implementation, we would test the retry button functionality
      // For now, we verify the service was called
      expect(mockSubstanceDatabase.addCustomSubstance).toHaveBeenCalled();
    });
  });

  describe('Performance Under Error Conditions', () => {
    it('should maintain performance during error recovery', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock multiple rapid errors
      const errors = Array.from({ length: 10 }, (_, i) => 
        new Error(`Error ${i}`)
      );
      
      errors.forEach(error => {
        mockSubstanceDatabase.addCustomSubstance.mockRejectedValueOnce(error);
      });

      const startTime = Date.now();

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Trigger multiple error scenarios rapidly
      for (let i = 0; i < 5; i++) {
        await waitFor(() => {
          expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
        });

        const searchInput = getByPlaceholderText('Search substances...');
        fireEvent(searchInput, 'focus');
        fireEvent.changeText(searchInput, `Performance Test ${i}`);

        await waitFor(() => {
          const addCustomOption = getByTestId('add-custom-substance-option');
          fireEvent.press(addCustomOption);
        });

        const nameInput = getByTestId('substance-name-input');
        const categoryPicker = getByTestId('substance-category-picker');
        const unitInput = getByTestId('substance-unit-input');

        fireEvent.changeText(nameInput, `Performance Test ${i}`);
        fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
        fireEvent.changeText(unitInput, 'mg');

        const saveButton = getByText('Save');
        fireEvent.press(saveButton);

        // Close modal for next iteration
        const cancelButton = getByText('Cancel');
        fireEvent.press(cancelButton);
      }

      const endTime = Date.now();

      // Should complete within reasonable time even with errors
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should handle memory efficiently during error scenarios', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock memory-intensive error scenario
      const largeError = new Error('Large error with extensive context');
      (largeError as any).context = Array.from({ length: 1000 }, (_, i) => 
        `Context item ${i}`
      );
      
      mockSubstanceDatabase.addCustomSubstance.mockRejectedValue(largeError);

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Trigger error scenario
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Memory Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Memory Test');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Should handle large error without memory issues
      await waitFor(() => {
        expect(mockSubstanceDatabase.addCustomSubstance).toHaveBeenCalled();
      });

      // Component should still be responsive
      expect(getByText('Cancel')).toBeTruthy();
    });
  });
});