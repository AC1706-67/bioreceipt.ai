/**
 * NewSubstance Model
 * Data model for creating custom substances in BioReceipt
 */

import { SubstanceCategory } from './Substance';

/**
 * Interface for creating a new custom substance
 */
export interface NewSubstance {
  /** Substance name (3-50 characters, unique) */
  name: string;
  
  /** Category from predefined list */
  category: SubstanceCategory;
  
  /** Default unit for logging (letters only, e.g., "mg", "ml") */
  defaultUnit: string;
  
  /** Optional description (max 255 characters) */
  description?: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

/**
 * Validation errors interface
 */
export interface ValidationErrors {
  name?: string;
  category?: string;
  defaultUnit?: string;
  description?: string;
}

/**
 * Unit suggestion with metadata for better UX
 */
export interface UnitSuggestion {
  /** The unit abbreviation */
  unit: string;
  /** Display name for the unit */
  displayName: string;
  /** Whether this is a common/recommended unit for the category */
  isCommon: boolean;
  /** Optional description or example */
  description?: string;
}

/**
 * Enhanced category-based unit suggestions mapping with metadata
 */
export const CATEGORY_UNIT_SUGGESTIONS: Record<SubstanceCategory, UnitSuggestion[]> = {
  [SubstanceCategory.ALCOHOL]: [
    { unit: 'ml', displayName: 'Milliliters (ml)', isCommon: true, description: 'Most precise for liquids' },
    { unit: 'oz', displayName: 'Fluid Ounces (oz)', isCommon: true, description: 'Common in US' },
    { unit: 'glass', displayName: 'Glass', isCommon: true, description: 'Standard serving' },
    { unit: 'bottle', displayName: 'Bottle', isCommon: false, description: 'Beer/wine bottle' },
    { unit: 'can', displayName: 'Can', isCommon: false, description: 'Standard can' },
    { unit: 'shot', displayName: 'Shot', isCommon: true, description: '1.5 oz serving' },
    { unit: 'pint', displayName: 'Pint', isCommon: false, description: '16 oz serving' }
  ],
  [SubstanceCategory.DRUGS_RECREATIONAL]: [
    { unit: 'mg', displayName: 'Milligrams (mg)', isCommon: true, description: 'Most precise for dosing' },
    { unit: 'g', displayName: 'Grams (g)', isCommon: true, description: 'For larger amounts' },
    { unit: 'mcg', displayName: 'Micrograms (mcg)', isCommon: false, description: 'For very small doses' },
    { unit: 'tablet', displayName: 'Tablet', isCommon: true, description: 'Pill form' },
    { unit: 'capsule', displayName: 'Capsule', isCommon: true, description: 'Capsule form' },
    { unit: 'dose', displayName: 'Dose', isCommon: false, description: 'Generic unit' }
  ],
  [SubstanceCategory.DRUGS_PRESCRIPTION]: [
    { unit: 'mg', displayName: 'Milligrams (mg)', isCommon: true, description: 'Standard dosing unit' },
    { unit: 'mcg', displayName: 'Micrograms (mcg)', isCommon: true, description: 'For precise dosing' },
    { unit: 'g', displayName: 'Grams (g)', isCommon: false, description: 'For larger doses' },
    { unit: 'tablet', displayName: 'Tablet', isCommon: true, description: 'Solid dosage form' },
    { unit: 'capsule', displayName: 'Capsule', isCommon: true, description: 'Encapsulated form' },
    { unit: 'ml', displayName: 'Milliliters (ml)', isCommon: true, description: 'Liquid medications' },
    { unit: 'dose', displayName: 'Dose', isCommon: false, description: 'As prescribed' }
  ],
  [SubstanceCategory.DRUGS_OTC]: [
    { unit: 'mg', displayName: 'Milligrams (mg)', isCommon: true, description: 'Standard OTC dosing' },
    { unit: 'tablet', displayName: 'Tablet', isCommon: true, description: 'Most common form' },
    { unit: 'capsule', displayName: 'Capsule', isCommon: true, description: 'Gel caps, etc.' },
    { unit: 'ml', displayName: 'Milliliters (ml)', isCommon: true, description: 'Liquid forms' },
    { unit: 'tsp', displayName: 'Teaspoon (tsp)', isCommon: true, description: 'Liquid measurement' },
    { unit: 'g', displayName: 'Grams (g)', isCommon: false, description: 'Topical applications' },
    { unit: 'dose', displayName: 'Dose', isCommon: false, description: 'Generic unit' }
  ],
  [SubstanceCategory.FOOD]: [
    { unit: 'g', displayName: 'Grams (g)', isCommon: true, description: 'Precise measurement' },
    { unit: 'serving', displayName: 'Serving', isCommon: true, description: 'Standard portion' },
    { unit: 'cup', displayName: 'Cup', isCommon: true, description: 'Volume measurement' },
    { unit: 'piece', displayName: 'Piece', isCommon: true, description: 'Individual items' },
    { unit: 'slice', displayName: 'Slice', isCommon: true, description: 'Cut portions' },
    { unit: 'portion', displayName: 'Portion', isCommon: false, description: 'General serving' },
    { unit: 'oz', displayName: 'Ounces (oz)', isCommon: false, description: 'Weight measurement' }
  ],
  [SubstanceCategory.SUPPLEMENTS]: [
    { unit: 'mg', displayName: 'Milligrams (mg)', isCommon: true, description: 'Most common dosing' },
    { unit: 'mcg', displayName: 'Micrograms (mcg)', isCommon: true, description: 'Vitamins like B12' },
    { unit: 'g', displayName: 'Grams (g)', isCommon: true, description: 'Protein powders' },
    { unit: 'tablet', displayName: 'Tablet', isCommon: true, description: 'Pill supplements' },
    { unit: 'capsule', displayName: 'Capsule', isCommon: true, description: 'Encapsulated forms' },
    { unit: 'scoop', displayName: 'Scoop', isCommon: true, description: 'Powder supplements' },
    { unit: 'serving', displayName: 'Serving', isCommon: false, description: 'As directed' },
    { unit: 'IU', displayName: 'International Units (IU)', isCommon: true, description: 'Vitamins A, D, E' }
  ],
  [SubstanceCategory.STEROIDS]: [
    { unit: 'mg', displayName: 'Milligrams (mg)', isCommon: true, description: 'Oral steroids' },
    { unit: 'ml', displayName: 'Milliliters (ml)', isCommon: true, description: 'Injectable forms' },
    { unit: 'mcg', displayName: 'Micrograms (mcg)', isCommon: false, description: 'Very potent forms' },
    { unit: 'tablet', displayName: 'Tablet', isCommon: true, description: 'Oral tablets' },
    { unit: 'injection', displayName: 'Injection', isCommon: true, description: 'Injectable dose' },
    { unit: 'dose', displayName: 'Dose', isCommon: false, description: 'Generic unit' }
  ],
  [SubstanceCategory.NOOTROPICS]: [
    { unit: 'mg', displayName: 'Milligrams (mg)', isCommon: true, description: 'Standard dosing' },
    { unit: 'g', displayName: 'Grams (g)', isCommon: true, description: 'Bulk powders' },
    { unit: 'mcg', displayName: 'Micrograms (mcg)', isCommon: false, description: 'Potent compounds' },
    { unit: 'tablet', displayName: 'Tablet', isCommon: true, description: 'Pill form' },
    { unit: 'capsule', displayName: 'Capsule', isCommon: true, description: 'Encapsulated' },
    { unit: 'scoop', displayName: 'Scoop', isCommon: false, description: 'Powder form' },
    { unit: 'dose', displayName: 'Dose', isCommon: false, description: 'Generic unit' }
  ],
  [SubstanceCategory.HORMONES]: [
    { unit: 'mcg', displayName: 'Micrograms (mcg)', isCommon: true, description: 'Precise hormone dosing' },
    { unit: 'mg', displayName: 'Milligrams (mg)', isCommon: true, description: 'Standard dosing' },
    { unit: 'ml', displayName: 'Milliliters (ml)', isCommon: true, description: 'Injectable forms' },
    { unit: 'IU', displayName: 'International Units (IU)', isCommon: true, description: 'Growth hormone, etc.' },
    { unit: 'tablet', displayName: 'Tablet', isCommon: false, description: 'Oral forms' },
    { unit: 'injection', displayName: 'Injection', isCommon: true, description: 'Injectable dose' },
    { unit: 'dose', displayName: 'Dose', isCommon: false, description: 'Generic unit' }
  ],
  [SubstanceCategory.OTHER]: [
    { unit: 'mg', displayName: 'Milligrams (mg)', isCommon: true, description: 'Weight measurement' },
    { unit: 'g', displayName: 'Grams (g)', isCommon: true, description: 'Larger amounts' },
    { unit: 'ml', displayName: 'Milliliters (ml)', isCommon: true, description: 'Volume measurement' },
    { unit: 'tablet', displayName: 'Tablet', isCommon: false, description: 'Pill form' },
    { unit: 'capsule', displayName: 'Capsule', isCommon: false, description: 'Capsule form' },
    { unit: 'dose', displayName: 'Dose', isCommon: false, description: 'Generic unit' },
    { unit: 'serving', displayName: 'Serving', isCommon: false, description: 'Standard portion' }
  ]
};

/**
 * Get unit suggestions for a given category
 */
export const getUnitSuggestions = (category: SubstanceCategory): UnitSuggestion[] => {
  return CATEGORY_UNIT_SUGGESTIONS[category] || CATEGORY_UNIT_SUGGESTIONS[SubstanceCategory.OTHER];
};

/**
 * Get only the unit strings for backward compatibility
 */
export const getUnitStrings = (category: SubstanceCategory): string[] => {
  return getUnitSuggestions(category).map(suggestion => suggestion.unit);
};

/**
 * Get common (recommended) units for a category
 */
export const getCommonUnits = (category: SubstanceCategory): UnitSuggestion[] => {
  return getUnitSuggestions(category).filter(suggestion => suggestion.isCommon);
};

/**
 * Get all units (common and uncommon) for a category
 */
export const getAllUnits = (category: SubstanceCategory): UnitSuggestion[] => {
  return getUnitSuggestions(category);
};

/**
 * Check if a category has specific unit suggestions
 */
export const hasUnitSuggestions = (category: SubstanceCategory): boolean => {
  return category in CATEGORY_UNIT_SUGGESTIONS;
};

/**
 * Check if a unit is suggested for a given category
 */
export const isUnitSuggested = (category: SubstanceCategory, unit: string): boolean => {
  return getUnitStrings(category).includes(unit.toLowerCase());
};

/**
 * Check if a unit is a common suggestion for a given category
 */
export const isCommonUnit = (category: SubstanceCategory, unit: string): boolean => {
  return getCommonUnits(category).some(suggestion => suggestion.unit.toLowerCase() === unit.toLowerCase());
};

/**
 * Get unit suggestion by unit string
 */
export const getUnitSuggestion = (category: SubstanceCategory, unit: string): UnitSuggestion | undefined => {
  return getUnitSuggestions(category).find(suggestion => suggestion.unit.toLowerCase() === unit.toLowerCase());
};
