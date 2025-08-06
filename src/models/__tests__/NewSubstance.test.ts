/**
 * NewSubstance Model Tests
 * Unit tests for enhanced unit suggestions system
 */

import {
  NewSubstance,
  UnitSuggestion,
  getUnitSuggestions,
  getUnitStrings,
  getCommonUnits,
  getAllUnits,
  hasUnitSuggestions,
  isUnitSuggested,
  isCommonUnit,
  getUnitSuggestion,
  CATEGORY_UNIT_SUGGESTIONS
} from '../NewSubstance';
import { SubstanceCategory } from '../Substance';

describe('NewSubstance Model - Unit Suggestions', () => {
  describe('getUnitSuggestions', () => {
    it('should return unit suggestions for valid category', () => {
      const suggestions = getUnitSuggestions(SubstanceCategory.SUPPLEMENTS);
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Check structure of suggestions
      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('unit');
        expect(suggestion).toHaveProperty('displayName');
        expect(suggestion).toHaveProperty('isCommon');
        expect(typeof suggestion.unit).toBe('string');
        expect(typeof suggestion.displayName).toBe('string');
        expect(typeof suggestion.isCommon).toBe('boolean');
      });
    });

    it('should include expected units for supplements category', () => {
      const suggestions = getUnitSuggestions(SubstanceCategory.SUPPLEMENTS);
      const units = suggestions.map(s => s.unit);
      
      expect(units).toContain('mg');
      expect(units).toContain('mcg');
      expect(units).toContain('tablet');
      expect(units).toContain('capsule');
      expect(units).toContain('IU');
    });

    it('should include expected units for alcohol category', () => {
      const suggestions = getUnitSuggestions(SubstanceCategory.ALCOHOL);
      const units = suggestions.map(s => s.unit);
      
      expect(units).toContain('ml');
      expect(units).toContain('oz');
      expect(units).toContain('glass');
      expect(units).toContain('shot');
    });
  });

  describe('getUnitStrings', () => {
    it('should return array of unit strings', () => {
      const unitStrings = getUnitStrings(SubstanceCategory.DRUGS_PRESCRIPTION);
      
      expect(Array.isArray(unitStrings)).toBe(true);
      expect(unitStrings.every(unit => typeof unit === 'string')).toBe(true);
      expect(unitStrings).toContain('mg');
      expect(unitStrings).toContain('tablet');
    });

    it('should maintain backward compatibility', () => {
      const suggestions = getUnitSuggestions(SubstanceCategory.FOOD);
      const unitStrings = getUnitStrings(SubstanceCategory.FOOD);
      
      expect(unitStrings).toEqual(suggestions.map(s => s.unit));
    });
  });

  describe('getCommonUnits', () => {
    it('should return only common units', () => {
      const commonUnits = getCommonUnits(SubstanceCategory.SUPPLEMENTS);
      
      expect(Array.isArray(commonUnits)).toBe(true);
      expect(commonUnits.every(unit => unit.isCommon)).toBe(true);
      expect(commonUnits.length).toBeGreaterThan(0);
    });

    it('should be subset of all units', () => {
      const allUnits = getAllUnits(SubstanceCategory.HORMONES);
      const commonUnits = getCommonUnits(SubstanceCategory.HORMONES);
      
      expect(commonUnits.length).toBeLessThanOrEqual(allUnits.length);
      
      commonUnits.forEach(commonUnit => {
        expect(allUnits.some(unit => unit.unit === commonUnit.unit)).toBe(true);
      });
    });
  });

  describe('isUnitSuggested', () => {
    it('should return true for suggested units', () => {
      expect(isUnitSuggested(SubstanceCategory.SUPPLEMENTS, 'mg')).toBe(true);
      expect(isUnitSuggested(SubstanceCategory.ALCOHOL, 'ml')).toBe(true);
      expect(isUnitSuggested(SubstanceCategory.FOOD, 'g')).toBe(true);
    });

    it('should return false for non-suggested units', () => {
      expect(isUnitSuggested(SubstanceCategory.SUPPLEMENTS, 'gallon')).toBe(false);
      expect(isUnitSuggested(SubstanceCategory.ALCOHOL, 'tablet')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isUnitSuggested(SubstanceCategory.SUPPLEMENTS, 'MG')).toBe(true);
      expect(isUnitSuggested(SubstanceCategory.SUPPLEMENTS, 'Mg')).toBe(true);
      expect(isUnitSuggested(SubstanceCategory.ALCOHOL, 'ML')).toBe(true);
    });
  });

  describe('isCommonUnit', () => {
    it('should return true for common units', () => {
      const commonUnits = getCommonUnits(SubstanceCategory.SUPPLEMENTS);
      const firstCommonUnit = commonUnits[0];
      
      expect(isCommonUnit(SubstanceCategory.SUPPLEMENTS, firstCommonUnit.unit)).toBe(true);
    });

    it('should return false for uncommon units', () => {
      const allUnits = getAllUnits(SubstanceCategory.SUPPLEMENTS);
      const uncommonUnit = allUnits.find(unit => !unit.isCommon);
      
      if (uncommonUnit) {
        expect(isCommonUnit(SubstanceCategory.SUPPLEMENTS, uncommonUnit.unit)).toBe(false);
      }
    });
  });

  describe('Category-specific unit suggestions', () => {
    describe('Alcohol category', () => {
      it('should have volume-based units', () => {
        const units = getUnitStrings(SubstanceCategory.ALCOHOL);
        
        expect(units).toContain('ml');
        expect(units).toContain('oz');
        expect(units).toContain('glass');
        expect(units).toContain('shot');
      });

      it('should mark common alcohol units appropriately', () => {
        const commonUnits = getCommonUnits(SubstanceCategory.ALCOHOL);
        const commonUnitStrings = commonUnits.map(u => u.unit);
        
        expect(commonUnitStrings).toContain('ml');
        expect(commonUnitStrings).toContain('oz');
        expect(commonUnitStrings).toContain('glass');
      });
    });

    describe('Supplements category', () => {
      it('should have supplement-specific units', () => {
        const units = getUnitStrings(SubstanceCategory.SUPPLEMENTS);
        
        expect(units).toContain('mg');
        expect(units).toContain('mcg');
        expect(units).toContain('IU');
        expect(units).toContain('scoop');
      });

      it('should include both weight and form-based units', () => {
        const suggestions = getUnitSuggestions(SubstanceCategory.SUPPLEMENTS);
        const units = suggestions.map(s => s.unit);
        
        // Weight-based
        expect(units).toContain('mg');
        expect(units).toContain('g');
        
        // Form-based
        expect(units).toContain('tablet');
        expect(units).toContain('capsule');
      });
    });

    describe('Food category', () => {
      it('should have food measurement units', () => {
        const units = getUnitStrings(SubstanceCategory.FOOD);
        
        expect(units).toContain('g');
        expect(units).toContain('serving');
        expect(units).toContain('cup');
        expect(units).toContain('piece');
      });
    });

    describe('Prescription drugs category', () => {
      it('should have medical dosing units', () => {
        const units = getUnitStrings(SubstanceCategory.DRUGS_PRESCRIPTION);
        
        expect(units).toContain('mg');
        expect(units).toContain('mcg');
        expect(units).toContain('tablet');
        expect(units).toContain('ml');
      });

      it('should prioritize precise dosing units', () => {
        const commonUnits = getCommonUnits(SubstanceCategory.DRUGS_PRESCRIPTION);
        const commonUnitStrings = commonUnits.map(u => u.unit);
        
        expect(commonUnitStrings).toContain('mg');
        expect(commonUnitStrings).toContain('mcg');
      });
    });
  });

  describe('Unit suggestion metadata', () => {
    it('should have proper display names', () => {
      const suggestions = getUnitSuggestions(SubstanceCategory.SUPPLEMENTS);
      
      suggestions.forEach(suggestion => {
        expect(suggestion.displayName).toBeTruthy();
        expect(suggestion.displayName.length).toBeGreaterThanOrEqual(suggestion.unit.length);
        expect(suggestion.displayName.toLowerCase()).toContain(suggestion.unit.toLowerCase());
      });
    });

    it('should have descriptions for most units', () => {
      const suggestions = getUnitSuggestions(SubstanceCategory.HORMONES);
      const withDescriptions = suggestions.filter(s => s.description);
      
      expect(withDescriptions.length).toBeGreaterThan(0);
      
      withDescriptions.forEach(suggestion => {
        expect(suggestion.description!.length).toBeGreaterThan(0);
      });
    });

    it('should have consistent isCommon flags', () => {
      Object.values(SubstanceCategory).forEach(category => {
        const allUnits = getAllUnits(category);
        const commonUnits = getCommonUnits(category);
        
        // Every common unit should be marked as common
        commonUnits.forEach(commonUnit => {
          expect(commonUnit.isCommon).toBe(true);
        });
        
        // Should have at least one common unit per category
        expect(commonUnits.length).toBeGreaterThan(0);
        
        // Common units should be subset of all units
        expect(commonUnits.length).toBeLessThanOrEqual(allUnits.length);
      });
    });
  });

  describe('Data integrity', () => {
    it('should have suggestions for all categories', () => {
      Object.values(SubstanceCategory).forEach(category => {
        const suggestions = getUnitSuggestions(category);
        expect(suggestions.length).toBeGreaterThan(0);
      });
    });

    it('should not have duplicate units within categories', () => {
      Object.values(SubstanceCategory).forEach(category => {
        const suggestions = getUnitSuggestions(category);
        const units = suggestions.map(s => s.unit.toLowerCase());
        const uniqueUnits = [...new Set(units)];
        
        expect(units.length).toBe(uniqueUnits.length);
      });
    });

    it('should have valid unit strings', () => {
      Object.values(SubstanceCategory).forEach(category => {
        const suggestions = getUnitSuggestions(category);
        
        suggestions.forEach(suggestion => {
          expect(suggestion.unit).toBeTruthy();
          expect(suggestion.unit.trim()).toBe(suggestion.unit);
          expect(suggestion.unit.length).toBeGreaterThan(0);
          expect(suggestion.unit.length).toBeLessThanOrEqual(20);
        });
      });
    });
  });
});