/**
 * Substance Database Service Tests
 * Unit tests for custom substance addition functionality
 */

import { substanceDatabase } from '../substanceDatabase';
import { supabaseHelpers } from '../../../config/supabase';
import { SubstanceCategory } from '../../../models/Substance';
import { NewSubstance } from '../../../models/NewSubstance';

// Mock the supabaseHelpers
jest.mock('../../../config/supabase', () => ({
  supabaseHelpers: {
    addCustomSubstance: jest.fn(),
    getSubstances: jest.fn(),
    getSubstanceCategories: jest.fn(),
  }
}));

// Mock the validation utilities
jest.mock('../../../utils/substanceValidation', () => ({
  validateNewSubstance: jest.fn(),
  sanitizeNewSubstance: jest.fn(),
  isDuplicateName: jest.fn(),
}));

// Mock storage
jest.mock('../../../utils/storage', () => ({
  storage: {
    getData: jest.fn(),
    storeData: jest.fn(),
  }
}));

const mockSupabaseHelpers = supabaseHelpers as jest.Mocked<typeof supabaseHelpers>;
const mockValidation = require('../../../utils/substanceValidation');

describe('SubstanceDatabaseService - Custom Substance Addition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addCustomSubstance', () => {
    const validNewSubstance: NewSubstance = {
      name: 'Vitamin D3',
      category: SubstanceCategory.SUPPLEMENTS,
      defaultUnit: 'mg',
      description: 'Essential vitamin for bone health'
    };

    const sanitizedSubstance: NewSubstance = {
      name: 'Vitamin D3',
      category: SubstanceCategory.SUPPLEMENTS,
      defaultUnit: 'mg',
      description: 'Essential vitamin for bone health'
    };

    const mockSupabaseResult = {
      id: 'test-id',
      name: 'Vitamin D3',
      category_id: 'supplements-id',
      default_unit: 'mg',
      description: 'Essential vitamin for bone health',
      created_at: '2024-01-01T00:00:00Z',
      substance_categories: {
        id: 'supplements-id',
        name: 'supplements'
      }
    };

    it('should successfully add a valid custom substance', async () => {
      // Setup mocks
      mockValidation.validateNewSubstance.mockReturnValue({
        isValid: true,
        errors: {}
      });
      mockValidation.sanitizeNewSubstance.mockReturnValue(sanitizedSubstance);
      mockValidation.isDuplicateName.mockReturnValue(false);
      
      mockSupabaseHelpers.getSubstances.mockResolvedValue([]);
      mockSupabaseHelpers.getSubstanceCategories.mockResolvedValue([
        { id: 'supplements-id', name: 'supplements' }
      ]);
      mockSupabaseHelpers.addCustomSubstance.mockResolvedValue(mockSupabaseResult);

      // Execute
      const result = await substanceDatabase.addCustomSubstance(validNewSubstance);

      // Verify
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSupabaseResult);
      expect(result.error).toBeUndefined();
      expect(mockSupabaseHelpers.addCustomSubstance).toHaveBeenCalledWith({
        name: 'Vitamin D3',
        category_id: 'supplements-id',
        default_unit: 'mg',
        description: 'Essential vitamin for bone health'
      });
    });

    it('should return validation errors for invalid substance data', async () => {
      const validationErrors = {
        name: 'Name is too short',
        defaultUnit: 'Invalid unit format'
      };

      mockValidation.validateNewSubstance.mockReturnValue({
        isValid: false,
        errors: validationErrors
      });

      const result = await substanceDatabase.addCustomSubstance({
        name: 'ab',
        category: SubstanceCategory.SUPPLEMENTS,
        defaultUnit: 'mg123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(result.validationErrors).toEqual(validationErrors);
      expect(mockSupabaseHelpers.addCustomSubstance).not.toHaveBeenCalled();
    });

    it('should detect duplicate substance names', async () => {
      mockValidation.validateNewSubstance.mockReturnValue({
        isValid: true,
        errors: {}
      });
      mockValidation.sanitizeNewSubstance.mockReturnValue(sanitizedSubstance);
      mockValidation.isDuplicateName.mockReturnValue(true);
      
      mockSupabaseHelpers.getSubstances.mockResolvedValue([
        { name: 'Vitamin D3', id: 'existing-id' } as any
      ]);

      const result = await substanceDatabase.addCustomSubstance(validNewSubstance);

      expect(result.success).toBe(false);
      expect(result.error).toBe('A substance with this name already exists in your collection. Please choose a different name.');
      expect(mockSupabaseHelpers.addCustomSubstance).not.toHaveBeenCalled();
    });

    it('should handle invalid category', async () => {
      mockValidation.validateNewSubstance.mockReturnValue({
        isValid: true,
        errors: {}
      });
      mockValidation.sanitizeNewSubstance.mockReturnValue(sanitizedSubstance);
      mockValidation.isDuplicateName.mockReturnValue(false);
      
      mockSupabaseHelpers.getSubstances.mockResolvedValue([]);
      mockSupabaseHelpers.getSubstanceCategories.mockResolvedValue([]);

      const result = await substanceDatabase.addCustomSubstance(validNewSubstance);

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred. Please try again or contact support if the problem persists.');
    });

    it('should handle Supabase unique constraint violation', async () => {
      mockValidation.validateNewSubstance.mockReturnValue({
        isValid: true,
        errors: {}
      });
      mockValidation.sanitizeNewSubstance.mockReturnValue(sanitizedSubstance);
      mockValidation.isDuplicateName.mockReturnValue(false);
      
      mockSupabaseHelpers.getSubstances.mockResolvedValue([]);
      mockSupabaseHelpers.getSubstanceCategories.mockResolvedValue([
        { id: 'supplements-id', name: 'supplements' }
      ]);
      
      const duplicateError = new Error('Duplicate key violation');
      (duplicateError as any).code = '23505';
      mockSupabaseHelpers.addCustomSubstance.mockRejectedValue(duplicateError);

      const result = await substanceDatabase.addCustomSubstance(validNewSubstance);

      expect(result.success).toBe(false);
      expect(result.error).toBe('A substance with this name already exists in your collection. Please choose a different name.');
    });

    it('should handle Supabase foreign key constraint violation', async () => {
      mockValidation.validateNewSubstance.mockReturnValue({
        isValid: true,
        errors: {}
      });
      mockValidation.sanitizeNewSubstance.mockReturnValue(sanitizedSubstance);
      mockValidation.isDuplicateName.mockReturnValue(false);
      
      mockSupabaseHelpers.getSubstances.mockResolvedValue([]);
      mockSupabaseHelpers.getSubstanceCategories.mockResolvedValue([
        { id: 'supplements-id', name: 'supplements' }
      ]);
      
      const fkError = new Error('Foreign key violation');
      (fkError as any).code = '23503';
      mockSupabaseHelpers.addCustomSubstance.mockRejectedValue(fkError);

      const result = await substanceDatabase.addCustomSubstance(validNewSubstance);

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred. Please try again or contact support if the problem persists.');
    });

    it('should handle insufficient privileges error', async () => {
      mockValidation.validateNewSubstance.mockReturnValue({
        isValid: true,
        errors: {}
      });
      mockValidation.sanitizeNewSubstance.mockReturnValue(sanitizedSubstance);
      mockValidation.isDuplicateName.mockReturnValue(false);
      
      mockSupabaseHelpers.getSubstances.mockResolvedValue([]);
      mockSupabaseHelpers.getSubstanceCategories.mockResolvedValue([
        { id: 'supplements-id', name: 'supplements' }
      ]);
      
      const permissionError = new Error('Insufficient privileges');
      (permissionError as any).code = '42501';
      mockSupabaseHelpers.addCustomSubstance.mockRejectedValue(permissionError);

      const result = await substanceDatabase.addCustomSubstance(validNewSubstance);

      expect(result.success).toBe(false);
      expect(result.error).toBe('You don\'t have permission to add substances. Please sign in and try again.');
    });

    it('should handle network errors', async () => {
      mockValidation.validateNewSubstance.mockReturnValue({
        isValid: true,
        errors: {}
      });
      mockValidation.sanitizeNewSubstance.mockReturnValue(sanitizedSubstance);
      mockValidation.isDuplicateName.mockReturnValue(false);
      
      mockSupabaseHelpers.getSubstances.mockResolvedValue([]);
      mockSupabaseHelpers.getSubstanceCategories.mockResolvedValue([
        { id: 'supplements-id', name: 'supplements' }
      ]);
      
      const networkError = new Error('network request failed');
      mockSupabaseHelpers.addCustomSubstance.mockRejectedValue(networkError);

      const result = await substanceDatabase.addCustomSubstance(validNewSubstance);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unable to connect to the server. Please check your internet connection and try again.');
    });

    it('should handle generic errors', async () => {
      mockValidation.validateNewSubstance.mockReturnValue({
        isValid: true,
        errors: {}
      });
      mockValidation.sanitizeNewSubstance.mockReturnValue(sanitizedSubstance);
      mockValidation.isDuplicateName.mockReturnValue(false);
      
      mockSupabaseHelpers.getSubstances.mockResolvedValue([]);
      mockSupabaseHelpers.getSubstanceCategories.mockResolvedValue([
        { id: 'supplements-id', name: 'supplements' }
      ]);
      
      const genericError = new Error('Something went wrong');
      mockSupabaseHelpers.addCustomSubstance.mockRejectedValue(genericError);

      const result = await substanceDatabase.addCustomSubstance(validNewSubstance);

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred. Please try again or contact support if the problem persists.');
    });
  });

  describe('getSupabaseSubstances', () => {
    it('should successfully fetch substances from Supabase', async () => {
      const mockSubstances = [
        {
          id: 'test-id',
          name: 'Test Substance',
          category_id: 'test-category-id',
          default_unit: 'mg',
          description: 'Test description',
          created_at: '2024-01-01T00:00:00Z',
          substance_categories: {
            id: 'test-category-id',
            name: 'supplements'
          }
        }
      ];

      mockSupabaseHelpers.getSubstances.mockResolvedValue(mockSubstances);

      const result = await substanceDatabase.getSupabaseSubstances();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSubstances);
      expect(result.error).toBeUndefined();
    });

    it('should handle network errors when fetching substances', async () => {
      const networkError = new Error('network request failed');
      mockSupabaseHelpers.getSubstances.mockRejectedValue(networkError);

      const result = await substanceDatabase.getSupabaseSubstances();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error. Please check your connection and try again.');
    });

    it('should handle generic errors when fetching substances', async () => {
      const genericError = new Error('Something went wrong');
      mockSupabaseHelpers.getSubstances.mockRejectedValue(genericError);

      const result = await substanceDatabase.getSupabaseSubstances();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to load substances. Please try again.');
    });
  });

  describe('getSupabaseCategories', () => {
    it('should successfully fetch categories from Supabase', async () => {
      const mockCategories = [
        { id: 'supplements-id', name: 'supplements' },
        { id: 'alcohol-id', name: 'alcohol' }
      ];

      mockSupabaseHelpers.getSubstanceCategories.mockResolvedValue(mockCategories);

      const result = await substanceDatabase.getSupabaseCategories();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCategories);
      expect(result.error).toBeUndefined();
    });

    it('should handle network errors when fetching categories', async () => {
      const networkError = new Error('fetch failed');
      mockSupabaseHelpers.getSubstanceCategories.mockRejectedValue(networkError);

      const result = await substanceDatabase.getSupabaseCategories();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error. Please check your connection and try again.');
    });

    it('should handle generic errors when fetching categories', async () => {
      const genericError = new Error('Database error');
      mockSupabaseHelpers.getSubstanceCategories.mockRejectedValue(genericError);

      const result = await substanceDatabase.getSupabaseCategories();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to load categories. Please try again.');
    });
  });

  describe('private helper methods', () => {
    describe('getExistingSubstanceNames', () => {
      it('should return empty array when getSubstances fails', async () => {
        mockSupabaseHelpers.getSubstances.mockRejectedValue(new Error('Network error'));

        // Access private method through any cast for testing
        const result = await (substanceDatabase as any).getExistingSubstanceNames();

        expect(result).toEqual([]);
      });
    });

    describe('getCategoryId', () => {
      it('should return null when getSubstanceCategories fails', async () => {
        mockSupabaseHelpers.getSubstanceCategories.mockRejectedValue(new Error('Network error'));

        // Access private method through any cast for testing
        const result = await (substanceDatabase as any).getCategoryId(SubstanceCategory.SUPPLEMENTS);

        expect(result).toBeNull();
      });

      it('should return null when category is not found', async () => {
        mockSupabaseHelpers.getSubstanceCategories.mockResolvedValue([
          { id: 'alcohol-id', name: 'alcohol' }
        ]);

        // Access private method through any cast for testing
        const result = await (substanceDatabase as any).getCategoryId(SubstanceCategory.SUPPLEMENTS);

        expect(result).toBeNull();
      });
    });
  });
});