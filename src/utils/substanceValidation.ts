/**
 * Substance Validation Utilities
 * Client-side validation functions for custom substance creation
 */

import { NewSubstance, ValidationResult, ValidationErrors } from '../models/NewSubstance';
import { SubstanceCategory } from '../models/Substance';
import { 
  SUBSTANCE_VALIDATION_CONSTRAINTS, 
  VALIDATION_REGEX 
} from '../constants/substanceValidation';

/**
 * Validation error messages
 */
export const VALIDATION_MESSAGES = {
  NAME: {
    REQUIRED: 'Substance name is required',
    TOO_SHORT: 'Name must be at least 3 characters long',
    TOO_LONG: 'Name must be no more than 50 characters long',
    NUMBERS_ONLY: 'Name cannot contain only numbers',
    INVALID_CHARACTERS: 'Name contains invalid characters',
    PROFANITY: 'Name contains inappropriate content'
  },
  CATEGORY: {
    REQUIRED: 'Category is required',
    INVALID: 'Please select a valid category'
  },
  DEFAULT_UNIT: {
    REQUIRED: 'Default unit is required',
    INVALID_FORMAT: 'Unit must contain only letters (e.g., mg, ml, tablet)',
    TOO_LONG: 'Unit must be no more than 20 characters long'
  },
  DESCRIPTION: {
    TOO_LONG: 'Description must be no more than 255 characters long'
  }
} as const;

/**
 * Basic profanity filter - simple word list for content quality
 */
const PROFANITY_WORDS = [
  'fuck', 'shit', 'damn', 'bitch', 'ass', 'hell',
  // Add more as needed, keeping it basic for now
];

/**
 * Validate substance name
 */
export const validateName = (name: string): string | null => {
  if (!name || name.trim().length === 0) {
    return VALIDATION_MESSAGES.NAME.REQUIRED;
  }

  const trimmedName = name.trim();

  if (trimmedName.length < SUBSTANCE_VALIDATION_CONSTRAINTS.NAME.MIN_LENGTH) {
    return VALIDATION_MESSAGES.NAME.TOO_SHORT;
  }

  if (trimmedName.length > SUBSTANCE_VALIDATION_CONSTRAINTS.NAME.MAX_LENGTH) {
    return VALIDATION_MESSAGES.NAME.TOO_LONG;
  }

  // Check if name is only numbers
  if (VALIDATION_REGEX.NUMBERS_ONLY.test(trimmedName)) {
    return VALIDATION_MESSAGES.NAME.NUMBERS_ONLY;
  }

  // Check for basic profanity
  const lowerName = trimmedName.toLowerCase();
  if (PROFANITY_WORDS.some(word => lowerName.includes(word))) {
    return VALIDATION_MESSAGES.NAME.PROFANITY;
  }

  // Allow letters, numbers, spaces, hyphens, parentheses, and common punctuation
  if (!VALIDATION_REGEX.NAME_ALLOWED_CHARS.test(trimmedName)) {
    return VALIDATION_MESSAGES.NAME.INVALID_CHARACTERS;
  }

  return null;
};

/**
 * Validate substance category
 */
export const validateCategory = (category: string): string | null => {
  if (!category || category.trim().length === 0) {
    return VALIDATION_MESSAGES.CATEGORY.REQUIRED;
  }

  // Check if category is valid enum value
  const validCategories = Object.values(SubstanceCategory);
  if (!validCategories.includes(category as SubstanceCategory)) {
    return VALIDATION_MESSAGES.CATEGORY.INVALID;
  }

  return null;
};

/**
 * Validate default unit
 */
export const validateDefaultUnit = (unit: string): string | null => {
  if (!unit || unit.trim().length === 0) {
    return VALIDATION_MESSAGES.DEFAULT_UNIT.REQUIRED;
  }

  const trimmedUnit = unit.trim();

  if (trimmedUnit.length > SUBSTANCE_VALIDATION_CONSTRAINTS.UNIT.MAX_LENGTH) {
    return VALIDATION_MESSAGES.DEFAULT_UNIT.TOO_LONG;
  }

  // Unit should contain only letters (allow some common symbols like %)
  if (!VALIDATION_REGEX.UNIT_FORMAT.test(trimmedUnit)) {
    return VALIDATION_MESSAGES.DEFAULT_UNIT.INVALID_FORMAT;
  }

  return null;
};

/**
 * Enhanced unit validation with category-specific suggestions
 */
export const validateDefaultUnitWithSuggestions = (
  unit: string, 
  category?: SubstanceCategory
): { error: string | null; suggestion?: string } => {
  const basicError = validateDefaultUnit(unit);
  if (basicError) {
    return { error: basicError };
  }

  // If no category provided, just return basic validation
  if (!category) {
    return { error: null };
  }

  // Import here to avoid circular dependency
  const { isUnitSuggested, getCommonUnits } = require('../models/NewSubstance');
  
  const trimmedUnit = unit.trim().toLowerCase();
  
  // Check if unit is suggested for this category
  if (!isUnitSuggested(category, trimmedUnit)) {
    const commonUnits = getCommonUnits(category);
    if (commonUnits.length > 0) {
      const suggestion = `Consider using: ${commonUnits.slice(0, 3).map(u => u.unit).join(', ')}`;
      return { 
        error: null, 
        suggestion 
      };
    }
  }

  return { error: null };
};

/**
 * Validate description
 */
export const validateDescription = (description?: string): string | null => {
  if (!description) {
    return null; // Description is optional
  }

  if (description.length > SUBSTANCE_VALIDATION_CONSTRAINTS.DESCRIPTION.MAX_LENGTH) {
    return VALIDATION_MESSAGES.DESCRIPTION.TOO_LONG;
  }

  return null;
};

/**
 * Validate entire NewSubstance object
 */
export const validateNewSubstance = (substance: Partial<NewSubstance>): ValidationResult => {
  const errors: ValidationErrors = {};

  // Validate name
  const nameError = validateName(substance.name || '');
  if (nameError) {
    errors.name = nameError;
  }

  // Validate category
  const categoryError = validateCategory(substance.category || '');
  if (categoryError) {
    errors.category = categoryError;
  }

  // Validate default unit
  const unitError = validateDefaultUnit(substance.defaultUnit || '');
  if (unitError) {
    errors.defaultUnit = unitError;
  }

  // Validate description
  const descriptionError = validateDescription(substance.description);
  if (descriptionError) {
    errors.description = descriptionError;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Sanitize substance name for database insertion
 */
export const sanitizeName = (name: string): string => {
  return name.trim().replace(/\s+/g, ' '); // Remove extra whitespace
};

/**
 * Sanitize default unit for database insertion
 */
export const sanitizeUnit = (unit: string): string => {
  return unit.trim().toLowerCase();
};

/**
 * Sanitize description for database insertion
 */
export const sanitizeDescription = (description?: string): string | undefined => {
  if (!description) return undefined;
  return description.trim() || undefined;
};

/**
 * Sanitize entire NewSubstance object for database insertion
 */
export const sanitizeNewSubstance = (substance: NewSubstance): NewSubstance => {
  return {
    name: sanitizeName(substance.name),
    category: substance.category,
    defaultUnit: sanitizeUnit(substance.defaultUnit),
    description: sanitizeDescription(substance.description)
  };
};

/**
 * Check if a substance name might be a duplicate (case-insensitive)
 */
export const isDuplicateName = (name: string, existingNames: string[]): boolean => {
  const normalizedName = name.trim().toLowerCase();
  return existingNames.some(existing => existing.toLowerCase() === normalizedName);
};