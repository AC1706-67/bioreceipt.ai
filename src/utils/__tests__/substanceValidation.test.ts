/**
 * Substance Validation Tests
 * Unit tests for substance validation utilities
 */

import {
  validateName,
  validateCategory,
  validateDefaultUnit,
  validateDescription,
  validateNewSubstance,
  sanitizeName,
  sanitizeUnit,
  sanitizeDescription,
  sanitizeNewSubstance,
  isDuplicateName,
  VALIDATION_MESSAGES
} from '../substanceValidation';
import { SubstanceCategory } from '../../models/Substance';
import { NewSubstance } from '../../models/NewSubstance';

describe('substanceValidation', () => {
  describe('validateName', () => {
    it('should return error for empty name', () => {
      expect(validateName('')).toBe(VALIDATION_MESSAGES.NAME.REQUIRED);
      expect(validateName('   ')).toBe(VALIDATION_MESSAGES.NAME.REQUIRED);
    });

    it('should return error for name too short', () => {
      expect(validateName('ab')).toBe(VALIDATION_MESSAGES.NAME.TOO_SHORT);
    });

    it('should return error for name too long', () => {
      const longName = 'a'.repeat(51);
      expect(validateName(longName)).toBe(VALIDATION_MESSAGES.NAME.TOO_LONG);
    });

    it('should return error for numbers-only name', () => {
      expect(validateName('123')).toBe(VALIDATION_MESSAGES.NAME.NUMBERS_ONLY);
      expect(validateName('456789')).toBe(VALIDATION_MESSAGES.NAME.NUMBERS_ONLY);
    });

    it('should return error for profanity', () => {
      expect(validateName('fuck this')).toBe(VALIDATION_MESSAGES.NAME.PROFANITY);
      expect(validateName('shit substance')).toBe(VALIDATION_MESSAGES.NAME.PROFANITY);
    });

    it('should return error for invalid characters', () => {
      expect(validateName('test@substance')).toBe(VALIDATION_MESSAGES.NAME.INVALID_CHARACTERS);
      expect(validateName('test#substance')).toBe(VALIDATION_MESSAGES.NAME.INVALID_CHARACTERS);
    });

    it('should return null for valid names', () => {
      expect(validateName('Vitamin D3')).toBeNull();
      expect(validateName('Omega-3 Fish Oil')).toBeNull();
      expect(validateName('Acetaminophen (Tylenol)')).toBeNull();
      expect(validateName('Green Tea Extract')).toBeNull();
    });
  });

  describe('validateCategory', () => {
    it('should return error for empty category', () => {
      expect(validateCategory('')).toBe(VALIDATION_MESSAGES.CATEGORY.REQUIRED);
      expect(validateCategory('   ')).toBe(VALIDATION_MESSAGES.CATEGORY.REQUIRED);
    });

    it('should return error for invalid category', () => {
      expect(validateCategory('invalid_category')).toBe(VALIDATION_MESSAGES.CATEGORY.INVALID);
      expect(validateCategory('random')).toBe(VALIDATION_MESSAGES.CATEGORY.INVALID);
    });

    it('should return null for valid categories', () => {
      expect(validateCategory(SubstanceCategory.SUPPLEMENTS)).toBeNull();
      expect(validateCategory(SubstanceCategory.ALCOHOL)).toBeNull();
      expect(validateCategory(SubstanceCategory.DRUGS_OTC)).toBeNull();
      expect(validateCategory(SubstanceCategory.OTHER)).toBeNull();
    });
  });

  describe('validateDefaultUnit', () => {
    it('should return error for empty unit', () => {
      expect(validateDefaultUnit('')).toBe(VALIDATION_MESSAGES.DEFAULT_UNIT.REQUIRED);
      expect(validateDefaultUnit('   ')).toBe(VALIDATION_MESSAGES.DEFAULT_UNIT.REQUIRED);
    });

    it('should return error for unit too long', () => {
      const longUnit = 'a'.repeat(21);
      expect(validateDefaultUnit(longUnit)).toBe(VALIDATION_MESSAGES.DEFAULT_UNIT.TOO_LONG);
    });

    it('should return error for invalid format', () => {
      expect(validateDefaultUnit('mg123')).toBe(VALIDATION_MESSAGES.DEFAULT_UNIT.INVALID_FORMAT);
      expect(validateDefaultUnit('ml-dose')).toBe(VALIDATION_MESSAGES.DEFAULT_UNIT.INVALID_FORMAT);
      expect(validateDefaultUnit('tablet@')).toBe(VALIDATION_MESSAGES.DEFAULT_UNIT.INVALID_FORMAT);
    });

    it('should return null for valid units', () => {
      expect(validateDefaultUnit('mg')).toBeNull();
      expect(validateDefaultUnit('ml')).toBeNull();
      expect(validateDefaultUnit('tablet')).toBeNull();
      expect(validateDefaultUnit('capsule')).toBeNull();
      expect(validateDefaultUnit('%')).toBeNull(); // Allow percentage
    });
  });

  describe('validateDescription', () => {
    it('should return null for undefined description', () => {
      expect(validateDescription(undefined)).toBeNull();
    });

    it('should return null for empty description', () => {
      expect(validateDescription('')).toBeNull();
    });

    it('should return error for description too long', () => {
      const longDescription = 'a'.repeat(256);
      expect(validateDescription(longDescription)).toBe(VALIDATION_MESSAGES.DESCRIPTION.TOO_LONG);
    });

    it('should return null for valid description', () => {
      expect(validateDescription('A helpful supplement for joint health')).toBeNull();
      expect(validateDescription('a'.repeat(255))).toBeNull(); // Exactly 255 chars
    });
  });

  describe('validateNewSubstance', () => {
    const validSubstance: NewSubstance = {
      name: 'Vitamin D3',
      category: SubstanceCategory.SUPPLEMENTS,
      defaultUnit: 'mg',
      description: 'Essential vitamin for bone health'
    };

    it('should return valid for complete valid substance', () => {
      const result = validateNewSubstance(validSubstance);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should return invalid with multiple errors', () => {
      const invalidSubstance = {
        name: 'ab', // Too short
        category: 'invalid', // Invalid category
        defaultUnit: 'mg123', // Invalid format
        description: 'a'.repeat(256) // Too long
      };

      const result = validateNewSubstance(invalidSubstance);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe(VALIDATION_MESSAGES.NAME.TOO_SHORT);
      expect(result.errors.category).toBe(VALIDATION_MESSAGES.CATEGORY.INVALID);
      expect(result.errors.defaultUnit).toBe(VALIDATION_MESSAGES.DEFAULT_UNIT.INVALID_FORMAT);
      expect(result.errors.description).toBe(VALIDATION_MESSAGES.DESCRIPTION.TOO_LONG);
    });

    it('should handle partial substance data', () => {
      const result = validateNewSubstance({});
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe(VALIDATION_MESSAGES.NAME.REQUIRED);
      expect(result.errors.category).toBe(VALIDATION_MESSAGES.CATEGORY.REQUIRED);
      expect(result.errors.defaultUnit).toBe(VALIDATION_MESSAGES.DEFAULT_UNIT.REQUIRED);
    });
  });

  describe('sanitization functions', () => {
    describe('sanitizeName', () => {
      it('should trim whitespace', () => {
        expect(sanitizeName('  Vitamin D3  ')).toBe('Vitamin D3');
      });

      it('should normalize multiple spaces', () => {
        expect(sanitizeName('Vitamin   D3')).toBe('Vitamin D3');
        expect(sanitizeName('Fish  Oil   Extract')).toBe('Fish Oil Extract');
      });
    });

    describe('sanitizeUnit', () => {
      it('should trim and lowercase', () => {
        expect(sanitizeUnit('  MG  ')).toBe('mg');
        expect(sanitizeUnit('TABLET')).toBe('tablet');
      });
    });

    describe('sanitizeDescription', () => {
      it('should return undefined for empty string', () => {
        expect(sanitizeDescription('')).toBeUndefined();
        expect(sanitizeDescription('   ')).toBeUndefined();
      });

      it('should trim whitespace', () => {
        expect(sanitizeDescription('  Good supplement  ')).toBe('Good supplement');
      });

      it('should return undefined for undefined input', () => {
        expect(sanitizeDescription(undefined)).toBeUndefined();
      });
    });

    describe('sanitizeNewSubstance', () => {
      it('should sanitize all fields', () => {
        const substance: NewSubstance = {
          name: '  Vitamin D3  ',
          category: SubstanceCategory.SUPPLEMENTS,
          defaultUnit: '  MG  ',
          description: '  Good for bones  '
        };

        const sanitized = sanitizeNewSubstance(substance);
        expect(sanitized.name).toBe('Vitamin D3');
        expect(sanitized.defaultUnit).toBe('mg');
        expect(sanitized.description).toBe('Good for bones');
      });
    });
  });

  describe('isDuplicateName', () => {
    const existingNames = ['Vitamin D3', 'Fish Oil', 'Creatine'];

    it('should detect exact duplicates', () => {
      expect(isDuplicateName('Vitamin D3', existingNames)).toBe(true);
    });

    it('should detect case-insensitive duplicates', () => {
      expect(isDuplicateName('vitamin d3', existingNames)).toBe(true);
      expect(isDuplicateName('FISH OIL', existingNames)).toBe(true);
    });

    it('should handle whitespace in comparison', () => {
      expect(isDuplicateName('  Vitamin D3  ', existingNames)).toBe(true);
    });

    it('should return false for non-duplicates', () => {
      expect(isDuplicateName('Vitamin B12', existingNames)).toBe(false);
      expect(isDuplicateName('Magnesium', existingNames)).toBe(false);
    });

    it('should handle empty existing names array', () => {
      expect(isDuplicateName('Vitamin D3', [])).toBe(false);
    });
  });
});