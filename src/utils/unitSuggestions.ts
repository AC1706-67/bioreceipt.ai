/**
 * Enhanced Unit Suggestions Utility
 * Provides intelligent unit suggestions based on substance categories
 * with smart filtering and validation capabilities
 */

import { SubstanceCategory } from '../models/Substance';
import { UnitSuggestion, getUnitSuggestions, getCommonUnits, getAllUnits, isUnitSuggested, isCommonUnit } from '../models/NewSubstance';

/**
 * Enhanced unit suggestion with usage frequency and context
 */
export interface EnhancedUnitSuggestion extends UnitSuggestion {
  /** Usage frequency score (0-1, higher = more commonly used) */
  frequency: number;
  /** Context where this unit is most appropriate */
  context?: string;
  /** Alternative units that are equivalent */
  alternatives?: string[];
}

/**
 * Unit conversion factors for common units (to grams/ml base)
 */
export const UNIT_CONVERSIONS: Record<string, { factor: number; type: 'weight' | 'volume' | 'count' }> = {
  // Weight units
  'mg': { factor: 0.001, type: 'weight' },
  'g': { factor: 1, type: 'weight' },
  'kg': { factor: 1000, type: 'weight' },
  'mcg': { factor: 0.000001, type: 'weight' },
  'oz': { factor: 28.35, type: 'weight' },
  
  // Volume units
  'ml': { factor: 1, type: 'volume' },
  'l': { factor: 1000, type: 'volume' },
  'tsp': { factor: 4.93, type: 'volume' },
  'tbsp': { factor: 14.79, type: 'volume' },
  'cup': { factor: 236.59, type: 'volume' },
  'fl oz': { factor: 29.57, type: 'volume' },
  
  // Count units (no conversion)
  'tablet': { factor: 1, type: 'count' },
  'capsule': { factor: 1, type: 'count' },
  'pill': { factor: 1, type: 'count' },
  'dose': { factor: 1, type: 'count' },
  'serving': { factor: 1, type: 'count' },
  'piece': { factor: 1, type: 'count' }
};

/**
 * Get enhanced unit suggestions with frequency and context
 */
export const getEnhancedUnitSuggestions = (category: SubstanceCategory): EnhancedUnitSuggestion[] => {
  const baseSuggestions = getUnitSuggestions(category);
  
  return baseSuggestions.map(suggestion => ({
    ...suggestion,
    frequency: calculateUnitFrequency(category, suggestion.unit),
    context: getUnitContext(category, suggestion.unit),
    alternatives: getUnitAlternatives(suggestion.unit)
  }));
};

/**
 * Calculate usage frequency for a unit in a given category
 */
const calculateUnitFrequency = (category: SubstanceCategory, unit: string): number => {
  // Frequency mapping based on common usage patterns
  const frequencyMap: Record<SubstanceCategory, Record<string, number>> = {
    [SubstanceCategory.SUPPLEMENTS]: {
      'mg': 0.9, 'tablet': 0.8, 'capsule': 0.8, 'mcg': 0.7, 'IU': 0.6, 'g': 0.5, 'scoop': 0.4
    },
    [SubstanceCategory.DRUGS_PRESCRIPTION]: {
      'mg': 0.9, 'tablet': 0.8, 'mcg': 0.7, 'ml': 0.6, 'capsule': 0.5
    },
    [SubstanceCategory.DRUGS_OTC]: {
      'mg': 0.8, 'tablet': 0.9, 'ml': 0.7, 'tsp': 0.6, 'capsule': 0.5
    },
    [SubstanceCategory.ALCOHOL]: {
      'ml': 0.9, 'oz': 0.8, 'glass': 0.7, 'shot': 0.6, 'bottle': 0.4, 'can': 0.4
    },
    [SubstanceCategory.FOOD]: {
      'g': 0.8, 'serving': 0.9, 'cup': 0.7, 'piece': 0.6, 'slice': 0.5
    },
    [SubstanceCategory.DRUGS_RECREATIONAL]: {
      'mg': 0.8, 'g': 0.7, 'tablet': 0.6, 'dose': 0.5
    },
    [SubstanceCategory.STEROIDS]: {
      'mg': 0.9, 'ml': 0.8, 'injection': 0.7, 'tablet': 0.5
    },
    [SubstanceCategory.NOOTROPICS]: {
      'mg': 0.9, 'g': 0.7, 'tablet': 0.6, 'capsule': 0.6
    },
    [SubstanceCategory.HORMONES]: {
      'mcg': 0.9, 'mg': 0.8, 'IU': 0.7, 'ml': 0.6, 'injection': 0.6
    },
    [SubstanceCategory.OTHER]: {
      'mg': 0.6, 'g': 0.6, 'ml': 0.6, 'dose': 0.5
    }
  };
  
  return frequencyMap[category]?.[unit] || 0.3;
};

/**
 * Get context information for a unit
 */
const getUnitContext = (category: SubstanceCategory, unit: string): string | undefined => {
  const contextMap: Record<string, string> = {
    'mg': 'Precise dosing',
    'mcg': 'Very small doses',
    'g': 'Larger quantities',
    'tablet': 'Solid oral forms',
    'capsule': 'Encapsulated forms',
    'ml': 'Liquid measurements',
    'tsp': 'Home measurement',
    'IU': 'Vitamin potency',
    'shot': 'Standard alcohol serving',
    'serving': 'Portion control',
    'injection': 'Injectable forms'
  };
  
  return contextMap[unit];
};

/**
 * Get alternative units for a given unit
 */
const getUnitAlternatives = (unit: string): string[] => {
  const alternativesMap: Record<string, string[]> = {
    'mg': ['g', 'mcg'],
    'g': ['mg', 'oz'],
    'ml': ['tsp', 'tbsp', 'oz'],
    'tablet': ['pill', 'capsule'],
    'capsule': ['tablet', 'pill'],
    'tsp': ['ml', 'tbsp'],
    'serving': ['portion', 'dose'],
    'shot': ['oz', 'ml'],
    'glass': ['ml', 'oz']
  };
  
  return alternativesMap[unit] || [];
};

/**
 * Smart unit suggestion based on user input
 */
export const getSmartUnitSuggestions = (
  category: SubstanceCategory, 
  userInput: string,
  maxSuggestions: number = 6
): UnitSuggestion[] => {
  const allSuggestions = getEnhancedUnitSuggestions(category);
  
  if (!userInput.trim()) {
    // Return most common units when no input
    return allSuggestions
      .filter(s => s.isCommon)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, maxSuggestions);
  }
  
  const input = userInput.toLowerCase().trim();
  
  // Filter and score suggestions based on input
  const scoredSuggestions = allSuggestions
    .map(suggestion => ({
      ...suggestion,
      score: calculateMatchScore(suggestion, input)
    }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions);
  
  return scoredSuggestions;
};

/**
 * Calculate match score for a suggestion based on user input
 */
const calculateMatchScore = (suggestion: UnitSuggestion, input: string): number => {
  const unit = suggestion.unit.toLowerCase();
  const displayName = suggestion.displayName.toLowerCase();
  
  let score = 0;
  
  // Exact match gets highest score
  if (unit === input) {
    score += 100;
  }
  // Starts with input
  else if (unit.startsWith(input)) {
    score += 80;
  }
  // Contains input
  else if (unit.includes(input)) {
    score += 60;
  }
  // Display name matches
  else if (displayName.includes(input)) {
    score += 40;
  }
  
  // Boost score for common units
  if (suggestion.isCommon) {
    score += 20;
  }
  
  // Boost score based on frequency
  score += (suggestion as EnhancedUnitSuggestion).frequency * 10;
  
  return score;
};

/**
 * Validate if a unit is appropriate for a category
 */
export const validateUnitForCategory = (category: SubstanceCategory, unit: string): {
  isValid: boolean;
  warning?: string;
  suggestion?: string;
} => {
  const suggestions = getUnitSuggestions(category);
  const unitLower = unit.toLowerCase().trim();
  
  // Check if it's a suggested unit
  if (suggestions.some(s => s.unit.toLowerCase() === unitLower)) {
    return { isValid: true };
  }
  
  // Check for common alternatives or typos
  const alternatives = findUnitAlternatives(category, unit);
  if (alternatives.length > 0) {
    return {
      isValid: true,
      warning: `Did you mean "${alternatives[0]}"?`,
      suggestion: alternatives[0]
    };
  }
  
  // Check if it's a valid unit type for the category
  const categoryType = getCategoryUnitType(category);
  const unitType = getUnitType(unit);
  
  if (categoryType && unitType && categoryType !== unitType) {
    return {
      isValid: true,
      warning: `"${unit}" is a ${unitType} unit, but ${category} typically uses ${categoryType} units`
    };
  }
  
  return { isValid: true }; // Allow custom units
};

/**
 * Find alternative units that might be what the user meant
 */
const findUnitAlternatives = (category: SubstanceCategory, unit: string): string[] => {
  const suggestions = getUnitSuggestions(category);
  const unitLower = unit.toLowerCase().trim();
  
  // Look for similar units
  const alternatives: string[] = [];
  
  suggestions.forEach(suggestion => {
    const suggestionLower = suggestion.unit.toLowerCase();
    
    // Check for common typos or abbreviations
    if (isLikelyTypo(unitLower, suggestionLower)) {
      alternatives.push(suggestion.unit);
    }
  });
  
  return alternatives.slice(0, 3); // Return top 3 alternatives
};

/**
 * Check if one string is likely a typo of another
 */
const isLikelyTypo = (input: string, target: string): boolean => {
  // Simple Levenshtein distance check
  if (Math.abs(input.length - target.length) > 2) return false;
  
  let distance = 0;
  const maxDistance = Math.max(1, Math.floor(target.length / 3));
  
  for (let i = 0; i < Math.max(input.length, target.length); i++) {
    if (input[i] !== target[i]) {
      distance++;
      if (distance > maxDistance) return false;
    }
  }
  
  return distance <= maxDistance;
};

/**
 * Get the primary unit type for a category
 */
const getCategoryUnitType = (category: SubstanceCategory): 'weight' | 'volume' | 'count' | null => {
  const typeMap: Record<SubstanceCategory, 'weight' | 'volume' | 'count'> = {
    [SubstanceCategory.SUPPLEMENTS]: 'weight',
    [SubstanceCategory.DRUGS_PRESCRIPTION]: 'weight',
    [SubstanceCategory.DRUGS_OTC]: 'weight',
    [SubstanceCategory.DRUGS_RECREATIONAL]: 'weight',
    [SubstanceCategory.STEROIDS]: 'weight',
    [SubstanceCategory.NOOTROPICS]: 'weight',
    [SubstanceCategory.HORMONES]: 'weight',
    [SubstanceCategory.ALCOHOL]: 'volume',
    [SubstanceCategory.FOOD]: 'weight',
    [SubstanceCategory.OTHER]: 'weight'
  };
  
  return typeMap[category] || null;
};

/**
 * Get the type of a unit
 */
const getUnitType = (unit: string): 'weight' | 'volume' | 'count' | null => {
  const conversion = UNIT_CONVERSIONS[unit.toLowerCase()];
  return conversion?.type || null;
};

/**
 * Format unit suggestion for display with enhanced information
 */
export const formatUnitSuggestion = (suggestion: UnitSuggestion, showDetails: boolean = false): string => {
  if (!showDetails) {
    return suggestion.unit;
  }
  
  let formatted = `${suggestion.unit} - ${suggestion.displayName}`;
  
  if (suggestion.description) {
    formatted += ` (${suggestion.description})`;
  }
  
  return formatted;
};

/**
 * Get unit suggestions grouped by type
 */
export const getGroupedUnitSuggestions = (category: SubstanceCategory): {
  weight: UnitSuggestion[];
  volume: UnitSuggestion[];
  count: UnitSuggestion[];
} => {
  const suggestions = getUnitSuggestions(category);
  
  return {
    weight: suggestions.filter(s => getUnitType(s.unit) === 'weight'),
    volume: suggestions.filter(s => getUnitType(s.unit) === 'volume'),
    count: suggestions.filter(s => getUnitType(s.unit) === 'count')
  };
};