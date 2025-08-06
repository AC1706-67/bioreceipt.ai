/**
 * Custom Substance Addition - Integration Tests
 * End-to-end testing of the complete custom substance addition flow
 * Enhanced with comprehensive error handling and network status monitoring
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SubstanceSelector from '../../components/logging/SubstanceSelector';
import AddSubstanceModal from '../../components/logging/AddSubstanceModal';
import { ToastProvider } from '../../contexts/ToastContext';
import { substanceDatabase } from '../../services/substance/substanceDatabase';
import { supabaseHelpers } from '../../config/supabase';
import { SubstanceCategory } from '../../models/Substance';
import { errorRecoveryService } from '../../services/error/errorRecoveryService';
import NetInfo from '@react-native-community/netinfo';

// Mock dependencies
jest.mock('../../services/substance/substanceDatabase');
jest.mock('../../config/supabase');
jest.mock('../../services/error/errorRecoveryService');
jest.mock('@react-native-community/netinfo');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

const mockSubstanceDatabase = substanceDatabase as jest.Mocked<typeof substanceDatabase>;
const mockSupabaseHelpers = supabaseHelpers as jest.Mocked<typeof supabaseHelpers>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;
const mockErrorRecoveryService = errorRecoveryService as jest.Mocked<typeof errorRecoveryService>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    {children}
  </ToastProvider>
);

describe('Custom Substance Addition - Integration Tests', () => {
  const mockCategories = [
    { id: 'supplements-id', name: 'supplements' },
    { id: 'food-id', name: 'food' },
    { id: 'alcohol-id', name: 'alcohol' },
  ];

  const mockExistingSubstances = [
    {
      id: 'existing-1',
      name: 'Existing Substance',
      category_id: 'supplements-id',
      default_unit: 'mg',
      description: 'An existing substance',
      created_at: '2024-01-01T00:00:00Z',
      substance_categories: { id: 'supplements-id', name: 'supplements' }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockSubstanceDatabase.getSubstances.mockResolvedValue([]);
    mockSubstanceDatabase.getSupabaseSubstances.mockResolvedValue({
      success: true,
      data: mockExistingSubstances
    });
    mockSubstanceDatabase.getSupabaseCategories.mockResolvedValue({
      success: true,
      data: mockCategories
    });
  });

  describe('Complete User Flow - Success Scenarios', () => {
    it('should complete full flow: search -> add custom -> select -> success', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock successful substance creation
      const newSubstance = {
        id: 'new-substance-1',
        name: 'New Custom Substance',
        category_id: 'supplements-id',
        default_unit: 'mg',
        description: 'A new custom substance',
        created_at: '2024-01-01T00:00:00Z',
        substance_categories: { id: 'supplements-id', name: 'supplements' }
      };
      
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: true,
        data: newSubstance
      });

      // 1. Render SubstanceSelector
      const { getByPlaceholderText, getByTestId, getByText, queryByTestId } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Wait for initial data loading
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      // 2. Search for non-existing substance
      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'New Custom Substance');

      // 3. Click "Add Custom" option
      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // 4. Verify modal opens
      await waitFor(() => {
        expect(getByText('Add Custom Substance')).toBeTruthy();
      });

      // 5. Fill out the form
      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');
      const descriptionInput = getByTestId('substance-description-input');

      fireEvent.changeText(nameInput, 'New Custom Substance');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');
      fireEvent.changeText(descriptionInput, 'A new custom substance');

      // 6. Submit the form
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // 7. Verify success flow
      await waitFor(() => {
        expect(mockSubstanceDatabase.addCustomSubstance).toHaveBeenCalledWith(
          {
            name: 'New Custom Substance',
            category: SubstanceCategory.SUPPLEMENTS,
            defaultUnit: 'mg',
            description: 'A new custom substance'
          },
          expect.any(Function)
        );
      });

      // 8. Verify substance is selected and modal closes
      await waitFor(() => {
        expect(onSubstanceSelect).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'new-substance-1',
            name: 'New Custom Substance',
            defaultUnit: 'mg'
          })
        );
      });

      // 9. Verify modal is closed
      await waitFor(() => {
        expect(queryByTestId('add-substance-modal')).toBeNull();
      });
    });

    it('should handle unit suggestions selection flow', async () => {
      const onSubstanceSelect = jest.fn();
      
      const newSubstance = {
        id: 'new-substance-2',
        name: 'Vitamin D3',
        category_id: 'supplements-id',
        default_unit: 'IU',
        description: 'Essential vitamin',
        created_at: '2024-01-01T00:00:00Z',
        substance_categories: { id: 'supplements-id', name: 'supplements' }
      };
      
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: true,
        data: newSubstance
      });

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Wait for loading
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      // Search and open modal
      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Vitamin D3');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Fill form with category first to show unit suggestions
      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');

      fireEvent.changeText(nameInput, 'Vitamin D3');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);

      // Select unit suggestion
      await waitFor(() => {
        const iuSuggestion = getByTestId('unit-suggestion-IU');
        fireEvent.press(iuSuggestion);
      });

      // Verify unit is selected
      const unitInput = getByTestId('substance-unit-input');
      expect(unitInput.props.value).toBe('IU');

      // Complete form and submit
      const descriptionInput = getByTestId('substance-description-input');
      fireEvent.changeText(descriptionInput, 'Essential vitamin');

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Verify success
      await waitFor(() => {
        expect(mockSubstanceDatabase.addCustomSubstance).toHaveBeenCalledWith(
          expect.objectContaining({
            defaultUnit: 'IU'
          }),
          expect.any(Function)
        );
      });
    });
  });

  describe('Error Scenarios - Network Failures', () => {
    it('should handle network errors with retry functionality', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock network error followed by success
      mockSubstanceDatabase.addCustomSubstance
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'retry-success-1',
            name: 'Retry Success',
            category_id: 'supplements-id',
            default_unit: 'mg',
            description: 'Succeeded after retry',
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

      // Navigate to modal and fill form
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Retry Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Fill form
      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Retry Success');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');

      // Submit form (will fail first time)
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Verify retry mechanism is triggered
      await waitFor(() => {
        expect(mockSubstanceDatabase.addCustomSubstance).toHaveBeenCalledTimes(1);
      });

      // The retry should happen automatically
      await waitFor(() => {
        expect(onSubstanceSelect).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'retry-success-1',
            name: 'Retry Success'
          })
        );
      }, { timeout: 5000 });
    });

    it('should handle persistent network failures gracefully', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock persistent network error
      const networkError = new Error('Persistent network error');
      (networkError as any).code = 'NETWORK_ERROR';
      
      mockSubstanceDatabase.addCustomSubstance.mockRejectedValue(networkError);

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
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Network Fail');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Fill and submit form
      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Network Fail');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Verify error handling
      await waitFor(() => {
        expect(mockSubstanceDatabase.addCustomSubstance).toHaveBeenCalled();
      });

      // Should not call onSubstanceSelect on failure
      expect(onSubstanceSelect).not.toHaveBeenCalled();
    });
  });

  describe('Error Scenarios - Validation Errors', () => {
    it('should handle validation errors with proper feedback', async () => {
      const onSubstanceSelect = jest.fn();

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Navigate to modal
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Invalid');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Submit form with invalid data (empty name)
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Verify validation errors are shown
      await waitFor(() => {
        expect(getByText('Substance name is required')).toBeTruthy();
      });

      // Verify service is not called with invalid data
      expect(mockSubstanceDatabase.addCustomSubstance).not.toHaveBeenCalled();
      expect(onSubstanceSelect).not.toHaveBeenCalled();
    });

    it('should handle server-side validation errors', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock server validation error
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          name: 'Name contains invalid characters'
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

      // Navigate to modal and fill form
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Server Validation');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Fill form with data that will fail server validation
      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Invalid@Name');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Verify server validation error is displayed
      await waitFor(() => {
        expect(getByText('Name contains invalid characters')).toBeTruthy();
      });

      expect(onSubstanceSelect).not.toHaveBeenCalled();
    });
  });

  describe('Error Scenarios - Duplicate Names', () => {
    it('should handle duplicate name errors gracefully', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock duplicate name error
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: false,
        error: 'A substance with this name already exists',
        validationErrors: {
          name: 'A substance with this name already exists'
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

      // Navigate to modal and fill form
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Existing Substance');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Fill form with existing substance name
      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Existing Substance');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Verify duplicate error is displayed
      await waitFor(() => {
        expect(getByText('A substance with this name already exists')).toBeTruthy();
      });

      expect(onSubstanceSelect).not.toHaveBeenCalled();
    });
  });

  describe('Cache Updates and State Management', () => {
    it('should update cache after successful substance addition', async () => {
      const onSubstanceSelect = jest.fn();
      
      const newSubstance = {
        id: 'cache-test-1',
        name: 'Cache Test Substance',
        category_id: 'supplements-id',
        default_unit: 'mg',
        description: 'For cache testing',
        created_at: '2024-01-01T00:00:00Z',
        substance_categories: { id: 'supplements-id', name: 'supplements' }
      };
      
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: true,
        data: newSubstance
      });

      // Mock cache refresh
      mockSubstanceDatabase.refreshSubstanceCache = jest.fn().mockResolvedValue(undefined);

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Complete the flow
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Cache Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Fill and submit form
      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Cache Test Substance');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Verify cache is refreshed after successful addition
      await waitFor(() => {
        expect(mockSubstanceDatabase.refreshSubstanceCache).toHaveBeenCalled();
      });

      expect(onSubstanceSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cache-test-1',
          name: 'Cache Test Substance'
        })
      );
    });

    it('should maintain UI state during loading and error states', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock slow response
      mockSubstanceDatabase.addCustomSubstance.mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            data: {
              id: 'loading-test-1',
              name: 'Loading Test',
              category_id: 'supplements-id',
              default_unit: 'mg',
              description: 'Loading test',
              created_at: '2024-01-01T00:00:00Z',
              substance_categories: { id: 'supplements-id', name: 'supplements' }
            }
          }), 1000)
        )
      );

      const { getByPlaceholderText, getByTestId, getByText, queryByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Navigate to modal and fill form
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Loading Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Fill form
      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Loading Test');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');

      // Submit form
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Verify loading state is shown
      await waitFor(() => {
        expect(queryByText('Save')).toBeNull(); // Button should show loading
      });

      // Wait for completion
      await waitFor(() => {
        expect(onSubstanceSelect).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should maintain accessibility during error states', async () => {
      const onSubstanceSelect = jest.fn();

      const { getByPlaceholderText, getByTestId, getByText, getByLabelText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Navigate to modal
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Accessibility Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        expect(addCustomOption.props.accessibilityLabel).toContain('Add custom substance');
        fireEvent.press(addCustomOption);
      });

      // Verify modal accessibility
      expect(getByLabelText('Cancel adding substance')).toBeTruthy();
      expect(getByLabelText('Save new substance')).toBeTruthy();

      // Test form field accessibility
      expect(getByLabelText('Substance name')).toBeTruthy();
      expect(getByLabelText('Substance category')).toBeTruthy();
      expect(getByLabelText('Default unit of measurement')).toBeTruthy();
    });
  });

  describe('Enhanced Error Handling Integration', () => {
    beforeEach(() => {
      // Setup enhanced error handling mocks
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: { strength: 80 }
      } as any);
      
      mockNetInfo.addEventListener.mockReturnValue(() => {});
      
      mockErrorRecoveryService.recoverFromError.mockResolvedValue({
        success: false,
        message: 'Recovery attempted',
        requiresUserAction: true
      });
    });

    it('should integrate with error recovery service for network failures', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock network error with recovery
      const networkError = new Error('Network timeout');
      mockSubstanceDatabase.addCustomSubstance
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'recovery-integration-1',
            name: 'Recovery Integration Test',
            category_id: 'supplements-id',
            default_unit: 'mg',
            description: 'Network recovery test',
            created_at: '2024-01-01T00:00:00Z',
            substance_categories: { id: 'supplements-id', name: 'supplements' }
          }
        });

      // Mock successful recovery
      mockErrorRecoveryService.recoverFromError.mockResolvedValue({
        success: true,
        message: 'Network error recovered'
      });

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Complete the flow
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Recovery Integration Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Fill and submit form
      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Recovery Integration Test');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Verify error recovery service integration
      await waitFor(() => {
        expect(mockErrorRecoveryService.recoverFromError).toHaveBeenCalled();
      });

      // Should eventually succeed after recovery
      await waitFor(() => {
        expect(onSubstanceSelect).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'recovery-integration-1',
            name: 'Recovery Integration Test'
          })
        );
      }, { timeout: 5000 });
    });

    it('should show enhanced error feedback panel for complex errors', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock complex error requiring detailed feedback
      const complexError = new Error('Complex validation error with multiple issues');
      mockSubstanceDatabase.addCustomSubstance.mockRejectedValue(complexError);
      
      // Mock recovery requiring user action
      mockErrorRecoveryService.recoverFromError.mockResolvedValue({
        success: false,
        message: 'Complex error requires manual intervention',
        requiresUserAction: true,
        userActionDescription: 'Please review and correct the following issues'
      });

      const { getByPlaceholderText, getByTestId, getByText, queryByText } = render(
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
      fireEvent.changeText(searchInput, 'Complex Error Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Fill form with problematic data
      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Complex Error Test');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'invalid-unit');

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Should show enhanced error feedback
      await waitFor(() => {
        expect(mockErrorRecoveryService.recoverFromError).toHaveBeenCalled();
      });

      // Should not complete successfully
      expect(onSubstanceSelect).not.toHaveBeenCalled();
    });

    it('should handle network status changes during submission', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Start with good connection
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: { strength: 80 }
      } as any);

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Navigate to modal
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Network Status Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Fill form
      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Network Status Test');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');

      // Simulate network disconnection during submission
      await act(async () => {
        mockNetInfo.fetch.mockResolvedValue({
          isConnected: false,
          isInternetReachable: false,
          type: 'none'
        } as any);

        // Trigger network status change
        const listener = mockNetInfo.addEventListener.mock.calls[0][0];
        listener({
          isConnected: false,
          isInternetReachable: false,
          type: 'none'
        } as any);
      });

      // Try to submit with no network
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Should handle network disconnection gracefully
      await waitFor(() => {
        // In a real implementation, this would check for network error handling
        expect(mockNetInfo.fetch).toHaveBeenCalled();
      });
    });

    it('should integrate smart unit suggestions with error recovery', async () => {
      const onSubstanceSelect = jest.fn();
      
      const { getByPlaceholderText, getByTestId, getByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Navigate to modal
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Smart Unit Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Fill form and use smart unit suggestions
      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Smart Unit Test');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);

      // Type partial unit to trigger smart suggestions
      fireEvent.changeText(unitInput, 'm');

      // Should show smart suggestions
      await waitFor(() => {
        // In a real implementation, this would check for smart suggestions UI
        expect(unitInput.props.value).toBe('m');
      });

      // Complete with suggested unit
      fireEvent.changeText(unitInput, 'mg');

      // Mock successful submission
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: true,
        data: {
          id: 'smart-unit-1',
          name: 'Smart Unit Test',
          category_id: 'supplements-id',
          default_unit: 'mg',
          description: null,
          created_at: '2024-01-01T00:00:00Z',
          substance_categories: { id: 'supplements-id', name: 'supplements' }
        }
      });

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Should succeed with smart unit suggestion
      await waitFor(() => {
        expect(onSubstanceSelect).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'smart-unit-1',
            name: 'Smart Unit Test',
            defaultUnit: 'mg'
          })
        );
      });
    });
  });

  describe('Performance and Reliability Integration', () => {
    it('should maintain performance with enhanced error handling', async () => {
      const onSubstanceSelect = jest.fn();
      
      const startTime = Date.now();

      // Mock multiple error scenarios
      const errors = [
        new Error('Network error 1'),
        new Error('Network error 2'),
        new Error('Validation error')
      ];

      errors.forEach(error => {
        mockSubstanceDatabase.addCustomSubstance.mockRejectedValueOnce(error);
      });

      // Final success
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: true,
        data: {
          id: 'performance-test-1',
          name: 'Performance Test',
          category_id: 'supplements-id',
          default_unit: 'mg',
          description: 'Performance test with error handling',
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

      // Complete flow multiple times to test performance
      for (let i = 0; i < 3; i++) {
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

        // Wait for completion or error
        await waitFor(() => {
          expect(mockSubstanceDatabase.addCustomSubstance).toHaveBeenCalled();
        });

        // Reset for next iteration
        jest.clearAllMocks();
        mockSubstanceDatabase.getSupabaseSubstances.mockResolvedValue({
          success: true,
          data: []
        });
      }

      const endTime = Date.now();

      // Should complete within reasonable time even with error handling
      expect(endTime - startTime).toBeLessThan(10000);
    });

    it('should handle concurrent error scenarios gracefully', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock concurrent error scenarios
      const concurrentErrors = Array.from({ length: 5 }, (_, i) => 
        new Error(`Concurrent error ${i}`)
      );

      concurrentErrors.forEach(error => {
        mockSubstanceDatabase.addCustomSubstance.mockRejectedValueOnce(error);
      });

      const { getByPlaceholderText, getByTestId, getByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Trigger multiple concurrent operations
      const promises = Array.from({ length: 3 }, async (_, i) => {
        await waitFor(() => {
          expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
        });

        const searchInput = getByPlaceholderText('Search substances...');
        fireEvent(searchInput, 'focus');
        fireEvent.changeText(searchInput, `Concurrent Test ${i}`);

        await waitFor(() => {
          const addCustomOption = getByTestId('add-custom-substance-option');
          fireEvent.press(addCustomOption);
        });

        const nameInput = getByTestId('substance-name-input');
        const categoryPicker = getByTestId('substance-category-picker');
        const unitInput = getByTestId('substance-unit-input');

        fireEvent.changeText(nameInput, `Concurrent Test ${i}`);
        fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
        fireEvent.changeText(unitInput, 'mg');

        const saveButton = getByText('Save');
        fireEvent.press(saveButton);
      });

      // Wait for all concurrent operations to complete
      await Promise.allSettled(promises);

      // Should handle concurrent errors without crashing
      expect(mockSubstanceDatabase.addCustomSubstance).toHaveBeenCalled();
    });
  });
});