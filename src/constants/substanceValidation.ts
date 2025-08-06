/**
 * Substance Validation Constants
 * Centralized constants for substance validation
 */

/**
 * Validation constraints
 */
export const SUBSTANCE_VALIDATION_CONSTRAINTS = {
  NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50
  },
  UNIT: {
    MAX_LENGTH: 20
  },
  DESCRIPTION: {
    MAX_LENGTH: 255
  }
} as const;

/**
 * Regular expressions for validation
 */
export const VALIDATION_REGEX = {
  UNIT_FORMAT: /^[a-zA-Z%]+$/,
  NAME_ALLOWED_CHARS: /^[a-zA-Z0-9\s\-().,&']+$/,
  NUMBERS_ONLY: /^\d+$/
} as const;

/**
 * Validation error message keys for internationalization
 */
export const VALIDATION_ERROR_KEYS = {
  NAME: {
    REQUIRED: 'validation.name.required',
    TOO_SHORT: 'validation.name.tooShort',
    TOO_LONG: 'validation.name.tooLong',
    NUMBERS_ONLY: 'validation.name.numbersOnly',
    INVALID_CHARACTERS: 'validation.name.invalidCharacters',
    PROFANITY: 'validation.name.profanity'
  },
  CATEGORY: {
    REQUIRED: 'validation.category.required',
    INVALID: 'validation.category.invalid'
  },
  DEFAULT_UNIT: {
    REQUIRED: 'validation.defaultUnit.required',
    INVALID_FORMAT: 'validation.defaultUnit.invalidFormat',
    TOO_LONG: 'validation.defaultUnit.tooLong'
  },
  DESCRIPTION: {
    TOO_LONG: 'validation.description.tooLong'
  }
} as const;