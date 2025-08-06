/**
 * AddSubstanceModal Component Tests
 * Unit tests for the enhanced custom substance addition modal
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AddSubstanceModal from '../AddSubstanceModal';
import { substanceDatabase } from '../../../services/substance/substanceDatabase';
import { SubstanceCategory } from '../../../models/Substance';

// Mock the substance database service
jest.mock('../../../services/substance/substanceDatabase', () => ({
  substanceDatabase: {
    getSupabaseCategories: jest.fn(),
    addCustomSubstance: jest.fn(),
  }
}));

// Mock validation utilities
jest.mock('../../../utils/substanceValidation', () => ({
  validateName: jest.fn(),
  validateCategory: jest.fn(),
  validateDefaultUnit: jest.fn(),
  validateDescription: jest.fn(),
}));

// Mock Picker component
jest.mock('@react-native-picker/picker', () => {
  const React = require('react');
  return {
    Picker: React.forwardRef((props: any, ref: any) => {
      const MockPicker = require('react-native').View;
      return React.createElement(MockPicker, {
        ...props,
        testID: props.testID || 'picker',
        onValueChange: props.onValueChange,
        selectedValue: props.selectedValue,
      });
    }),
  };
}, { virtual: true });

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockSubstanceDatabase = substanceDatabase as jest.Mocked<typeof substanceDatabase>;
const mockValidation = require('../../../utils/substanceValidation');

describe('AddSubstanceModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSubstanceAdded = jest.fn();

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    onSubstanceAdded: mockOnSubstanceAdded,
  };

  const mockCategories = [
    { id: 'supplements-id', name: 'supplements' },
    { id: 'alcohol-id', name: 'alcohol' },
    { id: 'food-id', name: 'food' },
  ];

  const mockSuccessResult = {
    success: true,
    data: {
      id: 'test-substance-id',
      name: 'Vitamin D3',
      category_id: 'supplements-id',
      default_unit: 'mg',
      description: 'Essential vitamin',
      created_at: '2024-01-01T00:00:00Z',
      substance_categories: {
        id: 'supplements-id',
        name: 'supplements'
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockSubstanceDatabase.getSupabaseCategories.mockResolvedValue({
      success: true,
      data: mockCategories
    });

    // Setup validation mocks to return no errors by default
    mockValidation.validateName.mockReturnValue(null);
    mockValidation.validateCategory.mockReturnValue(null);
    mockValidation.validateDefaultUnit.mockReturnValue(null);
    mockValidation.validateDescription.mockReturnValue(null);
  });

  describe('Rendering', () => {
    it('should render modal when visible', () => {
      const { getByText, getByTestId } = render(<AddSubstanceModal {...defaultProps} />);

      expect(getByText('Add Custom Substance')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
      expect(getByText('Save')).toBeTruthy();
      expect(getByTestId('substance-name-input')).toBeTruthy();
      expect(getByTestId('substance-category-picker')).toBeTruthy();
      expect(getByTestId('substance-unit-input')).toBeTruthy();
      expect(getByTestId('substance-description-input')).toBeTruthy();
    });

    it('should not render modal when not visible', () => {
      const { queryByText } = render(
        <AddSubstanceModal {...defaultProps} visible={false} />
      );

      expect(queryByText('Add Custom Substance')).toBeNull();
    });

    it('should show loading state for categories', async () => {
      // Make categories loading take time
      mockSubstanceDatabase.getSupabaseCategories.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockCategories }), 100))
      );

      const { getByText } = render(<AddSubstanceModal {...defaultProps} />);

      expect(getByText('Loading categories...')).toBeTruthy();
    });
  });

  describe('Form Interaction', () => {
    it('should update form fields when user types', async () => {
      const { getByTestId } = render(<AddSubstanceModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseCategories).toHaveBeenCalled();
      });

      const nameInput = getByTestId('substance-name-input');
      const unitInput = getByTestId('substance-unit-input');
      const descriptionInput = getByTestId('substance-description-input');

      fireEvent.changeText(nameInput, 'Vitamin D3');
      fireEvent.changeText(unitInput, 'mg');
      fireEvent.changeText(descriptionInput, 'Essential vitamin');

      expect(nameInput.props.value).toBe('Vitamin D3');
      expect(unitInput.props.value).toBe('mg');
      expect(descriptionInput.props.value).toBe('Essential vitamin');
    });

    it('should show unit suggestions when category is selected', async () => {
      const { getByTestId, getByText } = render(<AddSubstanceModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseCategories).toHaveBeenCalled();
      });

      const categoryPicker = getByTestId('substance-category-picker');
      
      // Simulate category selection
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);

      await waitFor(() => {
        expect(getByText('Suggested units:')).toBeTruthy();
        expect(getByText('mg')).toBeTruthy();
        expect(getByText('tablet')).toBeTruthy();
      });
    });

    it('should set unit when suggestion chip is pressed', async () => {
      const { getByTestId, getByText } = render(<AddSubstanceModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseCategories).toHaveBeenCalled();
      });

      const categoryPicker = getByTestId('substance-category-picker');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);

      await waitFor(() => {
        const mgChip = getByText('mg');
        fireEvent.press(mgChip);
      });

      const unitInput = getByTestId('substance-unit-input');
      expect(unitInput.props.value).toBe('mg');
    });
  });

  describe('Validation', () => {
    it('should show validation errors in real-time', async () => {
      mockValidation.validateName.mockReturnValue('Name is too short');

      const { getByTestId, getByText } = render(<AddSubstanceModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseCategories).toHaveBeenCalled();
      });

      const nameInput = getByTestId('substance-name-input');
      
      // Type something to trigger validation
      fireEvent.changeText(nameInput, 'ab');

      // Should show error initially
      expect(getByText('Name is too short')).toBeTruthy();
    });

    it('should clear validation errors when input becomes valid', async () => {
      mockValidation.validateName
        .mockReturnValueOnce('Name is too short')
        .mockReturnValueOnce(null);

      const { getByTestId, getByText, queryByText } = render(<AddSubstanceModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseCategories).toHaveBeenCalled();
      });

      const nameInput = getByTestId('substance-name-input');
      
      // First type invalid input
      fireEvent.changeText(nameInput, 'ab');
      expect(getByText('Name is too short')).toBeTruthy();

      // Then type valid input
      fireEvent.changeText(nameInput, 'Vitamin D3');
      
      await waitFor(() => {
        expect(queryByText('Name is too short')).toBeNull();
      });
    });
  });

  describe('Form Submission', () => {
    it('should successfully submit valid form', async () => {
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue(mockSuccessResult);

      const { getByTestId, getByText } = render(<AddSubstanceModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseCategories).toHaveBeenCalled();
      });

      // Fill out form
      fireEvent.changeText(getByTestId('substance-name-input'), 'Vitamin D3');
      fireEvent(getByTestId('substance-category-picker'), 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(getByTestId('substance-unit-input'), 'mg');
      fireEvent.changeText(getByTestId('substance-description-input'), 'Essential vitamin');

      // Submit form
      fireEvent.press(getByText('Save'));

      await waitFor(() => {
        expect(mockSubstanceDatabase.addCustomSubstance).toHaveBeenCalledWith({
          name: 'Vitamin D3',
          category: SubstanceCategory.SUPPLEMENTS,
          defaultUnit: 'mg',
          description: 'Essential vitamin'
        });
      });

      // Should show success alert
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success!',
        'Vitamin D3 has been added to your substances.',
        expect.any(Array)
      );
    });

    it('should handle validation errors from service', async () => {
      const validationErrors = {
        name: 'A substance with this name already exists'
      };

      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: false,
        error: 'Validation failed',
        validationErrors
      });

      const { getByTestId, getByText } = render(<AddSubstanceModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseCategories).toHaveBeenCalled();
      });

      // Fill out form
      fireEvent.changeText(getByTestId('substance-name-input'), 'Existing Substance');
      fireEvent(getByTestId('substance-category-picker'), 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(getByTestId('substance-unit-input'), 'mg');

      // Submit form
      fireEvent.press(getByText('Save'));

      await waitFor(() => {
        expect(getByText('A substance with this name already exists')).toBeTruthy();
      });
    });

    it('should handle service errors', async () => {
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: false,
        error: 'Network error. Please check your connection and try again.'
      });

      const { getByTestId, getByText } = render(<AddSubstanceModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseCategories).toHaveBeenCalled();
      });

      // Fill out form
      fireEvent.changeText(getByTestId('substance-name-input'), 'Test Substance');
      fireEvent(getByTestId('substance-category-picker'), 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(getByTestId('substance-unit-input'), 'mg');

      // Submit form
      fireEvent.press(getByText('Save'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Network error. Please check your connection and try again.'
        );
      });
    });

    it('should prevent submission with validation errors', async () => {
      mockValidation.validateName.mockReturnValue('Name is required');

      const { getByTestId, getByText } = render(<AddSubstanceModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseCategories).toHaveBeenCalled();
      });

      // Try to submit empty form
      fireEvent.press(getByText('Save'));

      // Should not call service
      expect(mockSubstanceDatabase.addCustomSubstance).not.toHaveBeenCalled();
      
      // Should show validation error
      expect(getByText('Name is required')).toBeTruthy();
    });

    it('should show loading state during submission', async () => {
      // Make submission take time
      mockSubstanceDatabase.addCustomSubstance.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockSuccessResult), 100))
      );

      const { getByTestId, getByText } = render(<AddSubstanceModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseCategories).toHaveBeenCalled();
      });

      // Fill out form
      fireEvent.changeText(getByTestId('substance-name-input'), 'Test Substance');
      fireEvent(getByTestId('substance-category-picker'), 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(getByTestId('substance-unit-input'), 'mg');

      // Submit form
      fireEvent.press(getByText('Save'));

      // Should show loading state
      const saveButton = getByText('Save').parent;
      expect(saveButton?.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Modal Controls', () => {
    it('should close modal when cancel is pressed', () => {
      const { getByText } = render(<AddSubstanceModal {...defaultProps} />);

      fireEvent.press(getByText('Cancel'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should reset form when modal opens', async () => {
      const { getByTestId, rerender } = render(
        <AddSubstanceModal {...defaultProps} visible={false} />
      );

      // Reopen modal
      rerender(<AddSubstanceModal {...defaultProps} visible={true} />);

      await waitFor(() => {
        const nameInput = getByTestId('substance-name-input');
        expect(nameInput.props.value).toBe('');
      });
    });

    it('should call onSubstanceAdded when substance is successfully added', async () => {
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue(mockSuccessResult);

      const { getByTestId, getByText } = render(<AddSubstanceModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseCategories).toHaveBeenCalled();
      });

      // Fill out and submit form
      fireEvent.changeText(getByTestId('substance-name-input'), 'Vitamin D3');
      fireEvent(getByTestId('substance-category-picker'), 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(getByTestId('substance-unit-input'), 'mg');

      fireEvent.press(getByText('Save'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Simulate pressing OK on success alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const okButton = alertCall[2][0];
      okButton.onPress();

      expect(mockOnSubstanceAdded).toHaveBeenCalledWith(mockSuccessResult.data);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle category loading errors', async () => {
      mockSubstanceDatabase.getSupabaseCategories.mockResolvedValue({
        success: false,
        error: 'Failed to load categories'
      });

      render(<AddSubstanceModal {...defaultProps} />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to load categories'
        );
      });
    });

    it('should handle unexpected errors during submission', async () => {
      mockSubstanceDatabase.addCustomSubstance.mockRejectedValue(new Error('Unexpected error'));

      const { getByTestId, getByText } = render(<AddSubstanceModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseCategories).toHaveBeenCalled();
      });

      // Fill out form
      fireEvent.changeText(getByTestId('substance-name-input'), 'Test Substance');
      fireEvent(getByTestId('substance-category-picker'), 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(getByTestId('substance-unit-input'), 'mg');

      // Submit form
      fireEvent.press(getByText('Save'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'An unexpected error occurred. Please try again.'
        );
      });
    });
  });
});