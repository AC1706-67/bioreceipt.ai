/**
 * End-to-End Flow - Integration Tests
 * Complete user journey testing from substance search to logging
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import SubstanceSelector from '../../components/logging/SubstanceSelector';
import { ToastProvider } from '../../contexts/ToastContext';
import { substanceDatabase } from '../../services/substance/substanceDatabase';
import { SubstanceCategory } from '../../models/Substance';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock dependencies
jest.mock('../../services/substance/substanceDatabase');
const mockSubstanceDatabase = substanceDatabase as jest.Mocked<typeof substanceDatabase>;

// Test wrapper with all providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NavigationContainer>
    <ToastProvider>
      {children}
    </ToastProvider>
  </NavigationContainer>
);

describe('End-to-End Flow - Integration Tests', () => {
  const mockCategories = [
    { id: 'supplements-id', name: 'supplements' },
    { id: 'food-id', name: 'food' },
    { id: 'alcohol-id', name: 'alcohol' },
  ];

  const mockBuiltInSubstances = [
    {
      id: 'builtin-1',
      name: 'Caffeine',
      category: SubstanceCategory.OTHER,
      defaultUnit: 'mg',
      description: 'Stimulant',
      verified: true,
      commonNames: ['Coffee'],
      toxicityLevel: 'low' as const,
      addictionPotential: 'low' as const,
      legalStatus: 'legal' as const,
      interactions: [],
      sideEffects: [],
      dosageGuidelines: {
        minimum: 50,
        maximum: 400,
        unit: 'mg',
        frequency: 'daily' as const
      },
      lastUpdated: new Date(),
      tags: []
    }
  ];

  const mockCustomSubstances = [
    {
      id: 'custom-1',
      name: 'Vitamin D3',
      category_id: 'supplements-id',
      default_unit: 'IU',
      description: 'Essential vitamin',
      created_at: '2024-01-01T00:00:00Z',
      substance_categories: { id: 'supplements-id', name: 'supplements' }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockSubstanceDatabase.getSubstances.mockResolvedValue(mockBuiltInSubstances);
    mockSubstanceDatabase.getSupabaseSubstances.mockResolvedValue({
      success: true,
      data: mockCustomSubstances
    });
    mockSubstanceDatabase.getSupabaseCategories.mockResolvedValue({
      success: true,
      data: mockCategories
    });
  });

  describe('Complete User Journey - Happy Path', () => {
    it('should complete full journey: search -> create custom -> select -> navigate to logging', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock successful substance creation
      const newSubstance = {
        id: 'journey-test-1',
        name: 'Omega-3 Fish Oil',
        category_id: 'supplements-id',
        default_unit: 'mg',
        description: 'Essential fatty acids',
        created_at: '2024-01-01T00:00:00Z',
        substance_categories: { id: 'supplements-id', name: 'supplements' }
      };
      
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: true,
        data: newSubstance
      });

      const { getByPlaceholderText, getByTestId, getByText, queryByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Step 1: Wait for initial data loading
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSubstances).toHaveBeenCalled();
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      // Step 2: User searches for a substance that doesn't exist
      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      
      // Verify dropdown expands
      await waitFor(() => {
        expect(getByText('Vitamin D3')).toBeTruthy(); // Custom substance should appear
        expect(getByText('Caffeine')).toBeTruthy(); // Built-in substance should appear
      });

      // Step 3: Search for non-existing substance
      fireEvent.changeText(searchInput, 'Omega-3 Fish Oil');

      // Step 4: Verify "Add Custom" option appears
      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        expect(addCustomOption).toBeTruthy();
        expect(getByText('Add "Omega-3 Fish Oil"')).toBeTruthy();
      });

      // Step 5: Click "Add Custom" option
      const addCustomOption = getByTestId('add-custom-substance-option');
      fireEvent.press(addCustomOption);

      // Step 6: Verify modal opens with pre-filled name
      await waitFor(() => {
        expect(getByText('Add Custom Substance')).toBeTruthy();
        const nameInput = getByTestId('substance-name-input');
        expect(nameInput.props.value).toBe('Omega-3 Fish Oil');
      });

      // Step 7: Complete the form
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');
      const descriptionInput = getByTestId('substance-description-input');

      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      
      // Step 8: Use unit suggestions
      await waitFor(() => {
        const mgSuggestion = getByTestId('unit-suggestion-mg');
        fireEvent.press(mgSuggestion);
      });

      fireEvent.changeText(descriptionInput, 'Essential fatty acids');

      // Step 9: Submit the form
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Step 10: Verify success toast appears
      await waitFor(() => {
        expect(mockSubstanceDatabase.addCustomSubstance).toHaveBeenCalledWith(
          {
            name: 'Omega-3 Fish Oil',
            category: SubstanceCategory.SUPPLEMENTS,
            defaultUnit: 'mg',
            description: 'Essential fatty acids'
          },
          expect.any(Function)
        );
      });

      // Step 11: Verify substance is auto-selected
      await waitFor(() => {
        expect(onSubstanceSelect).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'journey-test-1',
            name: 'Omega-3 Fish Oil',
            defaultUnit: 'mg'
          })
        );
      });

      // Step 12: Verify modal closes
      await waitFor(() => {
        expect(queryByText('Add Custom Substance')).toBeNull();
      });

      // Step 13: Verify search input shows selected substance
      expect(searchInput.props.value).toBe('Omega-3 Fish Oil');
    });

    it('should handle selecting existing custom substance', async () => {
      const onSubstanceSelect = jest.fn();

      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Wait for data loading
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      // Search for existing custom substance
      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Vitamin D3');

      // Select the existing custom substance
      await waitFor(() => {
        const vitaminD3Item = getByText('Vitamin D3');
        fireEvent.press(vitaminD3Item);
      });

      // Verify selection
      expect(onSubstanceSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'custom-1',
          name: 'Vitamin D3',
          defaultUnit: 'IU'
        })
      );
    });

    it('should handle selecting built-in substance', async () => {
      const onSubstanceSelect = jest.fn();

      const { getByPlaceholderText, getByTestId } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Wait for data loading
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSubstances).toHaveBeenCalled();
      });

      // Search for built-in substance
      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Caffeine');

      // Select the built-in substance
      await waitFor(() => {
        const caffeineItem = getByTestId('substance-item-builtin-1');
        fireEvent.press(caffeineItem);
      });

      // Verify selection
      expect(onSubstanceSelect).toHaveBeenCalledWith(mockBuiltInSubstances[0]);
    });
  });

  describe('Error Recovery Journeys', () => {
    it('should recover from network error and complete successfully', async () => {
      const onSubstanceSelect = jest.fn();
      
      // Mock network error followed by success
      mockSubstanceDatabase.addCustomSubstance
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'recovery-test-1',
            name: 'Recovery Test',
            category_id: 'supplements-id',
            default_unit: 'mg',
            description: 'Network recovery test',
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

      // Navigate through the flow
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Recovery Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Fill form
      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');
      const descriptionInput = getByTestId('substance-description-input');

      fireEvent.changeText(nameInput, 'Recovery Test');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');
      fireEvent.changeText(descriptionInput, 'Network recovery test');

      // Submit (will fail first time)
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Wait for retry and success
      await waitFor(() => {
        expect(onSubstanceSelect).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'recovery-test-1',
            name: 'Recovery Test'
          })
        );
      }, { timeout: 10000 });
    });

    it('should handle validation error and allow correction', async () => {
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
      fireEvent.changeText(searchInput, 'Validation Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Submit form with invalid data (empty name)
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Verify validation error
      await waitFor(() => {
        expect(getByText('Substance name is required')).toBeTruthy();
      });

      // Correct the error
      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Validation Test');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');

      // Mock successful submission after correction
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: true,
        data: {
          id: 'validation-test-1',
          name: 'Validation Test',
          category_id: 'supplements-id',
          default_unit: 'mg',
          description: null,
          created_at: '2024-01-01T00:00:00Z',
          substance_categories: { id: 'supplements-id', name: 'supplements' }
        }
      });

      // Submit again
      fireEvent.press(saveButton);

      // Verify success
      await waitFor(() => {
        expect(onSubstanceSelect).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'validation-test-1',
            name: 'Validation Test'
          })
        );
      });
    });
  });

  describe('State Management and Caching', () => {
    it('should maintain consistent state across component re-renders', async () => {
      const onSubstanceSelect = jest.fn();

      const { getByPlaceholderText, rerender } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      // Search for substance
      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'State Test');

      // Re-render component with selected substance
      const selectedSubstance = {
        id: 'state-test-1',
        name: 'State Test',
        category: SubstanceCategory.SUPPLEMENTS,
        defaultUnit: 'mg',
        description: 'State management test',
        verified: false,
        commonNames: [],
        toxicityLevel: 'unknown' as const,
        addictionPotential: 'unknown' as const,
        legalStatus: 'unknown' as const,
        interactions: [],
        sideEffects: [],
        dosageGuidelines: {
          minimum: 0,
          maximum: 0,
          unit: 'mg',
          frequency: 'as_needed' as const
        },
        lastUpdated: new Date(),
        tags: ['custom']
      };

      rerender(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={selectedSubstance}
          />
        </TestWrapper>
      );

      // Verify state is maintained
      const updatedSearchInput = getByPlaceholderText('Search substances...');
      expect(updatedSearchInput.props.value).toBe('State Test');
    });

    it('should update cache after successful substance addition', async () => {
      const onSubstanceSelect = jest.fn();
      
      const newSubstance = {
        id: 'cache-update-1',
        name: 'Cache Update Test',
        category_id: 'supplements-id',
        default_unit: 'mg',
        description: 'Cache update test',
        created_at: '2024-01-01T00:00:00Z',
        substance_categories: { id: 'supplements-id', name: 'supplements' }
      };
      
      mockSubstanceDatabase.addCustomSubstance.mockResolvedValue({
        success: true,
        data: newSubstance
      });

      // Mock cache refresh
      const mockRefreshCache = jest.fn().mockResolvedValue(undefined);
      mockSubstanceDatabase.refreshSubstanceCache = mockRefreshCache;

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
      fireEvent.changeText(searchInput, 'Cache Update Test');

      await waitFor(() => {
        const addCustomOption = getByTestId('add-custom-substance-option');
        fireEvent.press(addCustomOption);
      });

      // Fill and submit form
      const nameInput = getByTestId('substance-name-input');
      const categoryPicker = getByTestId('substance-category-picker');
      const unitInput = getByTestId('substance-unit-input');

      fireEvent.changeText(nameInput, 'Cache Update Test');
      fireEvent(categoryPicker, 'onValueChange', SubstanceCategory.SUPPLEMENTS);
      fireEvent.changeText(unitInput, 'mg');

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      // Verify cache is refreshed
      await waitFor(() => {
        expect(mockRefreshCache).toHaveBeenCalled();
      });

      expect(onSubstanceSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cache-update-1',
          name: 'Cache Update Test'
        })
      );
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const onSubstanceSelect = jest.fn();

      // Mock large datasets
      const largeBuiltInDataset = Array.from({ length: 500 }, (_, i) => ({
        id: `builtin-${i}`,
        name: `Built-in Substance ${i}`,
        category: SubstanceCategory.OTHER,
        defaultUnit: 'mg',
        description: `Description ${i}`,
        verified: true,
        commonNames: [],
        toxicityLevel: 'low' as const,
        addictionPotential: 'low' as const,
        legalStatus: 'legal' as const,
        interactions: [],
        sideEffects: [],
        dosageGuidelines: {
          minimum: 0,
          maximum: 100,
          unit: 'mg',
          frequency: 'daily' as const
        },
        lastUpdated: new Date(),
        tags: []
      }));

      const largeCustomDataset = Array.from({ length: 200 }, (_, i) => ({
        id: `custom-${i}`,
        name: `Custom Substance ${i}`,
        category_id: 'supplements-id',
        default_unit: 'mg',
        description: `Custom description ${i}`,
        created_at: '2024-01-01T00:00:00Z',
        substance_categories: { id: 'supplements-id', name: 'supplements' }
      }));

      mockSubstanceDatabase.getSubstances.mockResolvedValue(largeBuiltInDataset);
      mockSubstanceDatabase.getSupabaseSubstances.mockResolvedValue({
        success: true,
        data: largeCustomDataset
      });

      const startTime = Date.now();

      const { getByPlaceholderText } = render(
        <TestWrapper>
          <SubstanceSelector
            onSubstanceSelect={onSubstanceSelect}
            selectedSubstance={null}
          />
        </TestWrapper>
      );

      // Wait for data loading
      await waitFor(() => {
        expect(mockSubstanceDatabase.getSubstances).toHaveBeenCalled();
        expect(mockSubstanceDatabase.getSupabaseSubstances).toHaveBeenCalled();
      });

      // Test search performance
      const searchInput = getByPlaceholderText('Search substances...');
      fireEvent(searchInput, 'focus');
      fireEvent.changeText(searchInput, 'Substance 100');

      const endTime = Date.now();

      // Should complete within reasonable time (under 2 seconds for large dataset)
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });
});