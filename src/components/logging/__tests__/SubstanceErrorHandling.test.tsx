/**
 * Substance Error Handling Tests
 * Tests comprehensive error handling for substance operations
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SubstanceSelector from '../SubstanceSelector';
import AddSubstanceModal from '../AddSubstanceModal';
import { ToastProvider } from '../../../contexts/ToastContext';
import { substanceDatabase } from '../../../services/substance/substanceDatabase';

// Mock the substance database
jest.mock('../../../services/substance/substanceDatabase');
const mockSubstanceDatabase = substanceDatabase as jest.Mocked<typeof substanceDatabase>;

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock console methods
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('Substance Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockClear();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  describe('SubstanceSelector Error Handling', () => {
    const mockProps = {
      selectedSubstance: null,
      onSelectSubstance: jest.fn(),
      onSubstanceAdded: jest.fn(),
    };

    it('should handle network errors when loading substances', async () => {
      mockSubstanceDatabase.getSupabaseSubstances.mockResolvedValue({
        success: false,
        error: 'Network connection failed',
      });

      render(
        <TestWrapper>
          <SubstanceSelector {...mockProps} />
        </TestWrapper>
      );

      // Open the selector modal
      const selectorButton = screen.getByTestId('substance-selector-button');
      fireEvent.press(selectorButton);

      await waitFor(() => {
        expect(screen.getByText('Connection problem. Please check your internet connection.')).toBeTruthy();
      });
    });

    it('should handle permission errors gracefully', async () => {
      mockSubstanceDatabase.getSupabaseSubstances.mockResolvedValue({
        success: false,
        error: 'Permission denied - unauthorized access',
      });

      render(
        <TestWrapper>
          <SubstanceSelector {...mockProps} />
        </TestWrapper>
      );

      const selectorButton = screen.getByTestId('substance-selector-button');
      fireEvent.press(selectorButton);

      await waitFor(() => {
        expect(screen.getByText('Access denied. Please log in again.')).toBeTruthy();
      });
    });

    it('should handle timeout errors with retry option', async () => {
      mockSubstanceDatabase.getSupabaseSubstances.mockResolvedValue({
        success: false,
        error: 'Request timeout occurred',
      });

      render(
        <TestWrapper>
          <SubstanceSelector {...mockProps} />
        </TestWrapper>
      );

      const selectorButton = screen.getByTestId('substance-selector-button');
      fireEvent.press(selectorButton);

      await waitFor(() => {
        expect(screen.getByText('Request timed out. Please try again.')).toBeTruthy();
      });
    });

    it('should handle unexpected errors with fallback message', async () => {
      mockSubstanceDatabase.getSupabaseSubstances.mockRejectedValue(
        new Error('Unexpected database error')
      );

      render(
        <TestWrapper>
          <SubstanceSelector {...mockProps} />
        </TestWrapper>
      );

      const selectorButton = screen.getByTestId('substance-selector-button');
      fireEvent.press(selectorButton);

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred while loading substances.')).toBeTruthy();
      });
    });

    it('should show success message on successful refresh', async () => {
      const mockSubstances = [
        {
          id: '1',
          name: 'Test Substance',
          substance_categories: { id: '1', name: 'supplements' },
          default_unit: 'mg',
          description: 'Test description',
          created_by: null,
        },
      ];

      mockSubstanceDatabase.getSupabaseSubstances.mockResolvedValue({
        success: true,
        data: mockSubstances,
      });

      render(
        <TestWrapper>
          <SubstanceSelector {...mockProps} />
        </TestWrapper>
      );

      const selectorButton = screen.getByTestId('substance-selector-button');
      fireEvent.press(selectorButton);

      await waitFor(() => {
        expect(screen.getByText('Test Substance')).toBeTruthy();
      });
    });
  });

  describe('AddSubstanceModal Error Handling', () => {
    const mockProps = {
      visible: true,
      onClose: jest.fn(),
      onSubstanceAdded: jest.fn(),
    };

    it('should handle duplicate name errors', async () => {
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: false,
        error: 'Duplicate name error',
        substanceError: {
          code: 'DUPLICATE_NAME',
          message: 'Substance name already exists',
          userMessage: 'A substance with this name already exists',
          retryable: false,
        },
      });

      render(
        <TestWrapper>
          <AddSubstanceModal {...mockProps} />
        </TestWrapper>
      );

      // Fill out the form
      const nameInput = screen.getByTestId('substance-name-input');
      fireEvent.changeText(nameInput, 'Existing Substance');

      // Submit the form
      const saveButton = screen.getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(screen.getByText('This substance name is already taken')).toBeTruthy();
      });
    });

    it('should handle network errors with retry option', async () => {
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: false,
        error: 'Network error',
        substanceError: {
          code: 'NETWORK_ERROR',
          message: 'Network connection failed',
          userMessage: 'Unable to connect to the server',
          retryable: true,
        },
      });

      render(
        <TestWrapper>
          <AddSubstanceModal {...mockProps} />
        </TestWrapper>
      );

      const nameInput = screen.getByTestId('substance-name-input');
      fireEvent.changeText(nameInput, 'New Substance');

      const saveButton = screen.getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Connection problem. Check your internet and try again.')).toBeTruthy();
      });
    });

    it('should handle validation errors', async () => {
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: false,
        error: 'Validation failed',
        validationErrors: {
          name: 'Name is required',
          category: 'Category must be selected',
        },
      });

      render(
        <TestWrapper>
          <AddSubstanceModal {...mockProps} />
        </TestWrapper>
      );

      // Submit without filling required fields
      const saveButton = screen.getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Please fix the highlighted errors and try again.')).toBeTruthy();
      });
    });

    it('should handle rate limiting errors', async () => {
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: false,
        error: 'Rate limited',
        substanceError: {
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          userMessage: 'You are making requests too quickly',
          retryable: true,
        },
      });

      render(
        <TestWrapper>
          <AddSubstanceModal {...mockProps} />
        </TestWrapper>
      );

      const nameInput = screen.getByTestId('substance-name-input');
      fireEvent.changeText(nameInput, 'Rate Limited Test');

      const saveButton = screen.getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Too many requests. Please wait a moment before trying again.')).toBeTruthy();
      });
    });

    it('should handle successful submission with enhanced feedback', async () => {
      const mockNewSubstance = {
        id: 'new-123',
        name: 'New Substance',
        substance_categories: { id: '1', name: 'supplements' },
        default_unit: 'mg',
        description: 'New test substance',
        created_by: 'user-123',
      };

      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: true,
        data: mockNewSubstance,
      });

      render(
        <TestWrapper>
          <AddSubstanceModal {...mockProps} />
        </TestWrapper>
      );

      const nameInput = screen.getByTestId('substance-name-input');
      fireEvent.changeText(nameInput, 'New Substance');

      const saveButton = screen.getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockProps.onSubstanceAdded).toHaveBeenCalledWith(mockNewSubstance);
        expect(mockProps.onClose).toHaveBeenCalled();
      });
    });

    it('should handle unexpected errors during submission', async () => {
      mockSubstanceDatabase.addCustomSubstance.mockRejectedValue(
        new Error('Unexpected error during submission')
      );

      render(
        <TestWrapper>
          <AddSubstanceModal {...mockProps} />
        </TestWrapper>
      );

      const nameInput = screen.getByTestId('substance-name-input');
      fireEvent.changeText(nameInput, 'Error Test');

      const saveButton = screen.getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
      });
    });
  });

  describe('Error Recovery Strategies', () => {
    it('should provide appropriate recovery actions for different error types', () => {
      // This would test the error recovery utilities
      // Implementation depends on how the utilities are integrated
    });

    it('should implement exponential backoff for retries', () => {
      // Test the retry mechanism with exponential backoff
    });

    it('should check network connectivity before retrying', () => {
      // Test the smart retry functionality
    });
  });
});