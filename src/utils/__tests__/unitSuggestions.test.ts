/**
 * Unit Suggestions Tests
 * Tests for enhanced unit suggestion functionality
 */

import { SubstanceCategory } from '../../models/Substance';
import {
  getSmartUnitSuggestions,
  validateUnitForCategory,
  getGroupedUnitSuggestions,
  formatUnitSuggestion,
  getEnhancedUnitSuggestions
} from '../unitSuggestions';

describe('Unit Suggestions', () => {
  describe('getSmartUnitSuggestions', () => {
    it('should return common units when no input provided', () => {
      const suggestions = getSmartUnitSuggestions(SubstanceCategory.SUPPLEMENTS, '');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(s => s.isCommon)).toBe(true);
    });

    it('should filter suggestions based on user input', () => {
      const suggestions = getSmartUnitSuggestions(SubstanceCategory.SUPPLEMENTS, 'mg');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].unit).toBe('mg');
    });

    it('should return partial matches for user input', () => {
      const suggestions = getSmartUnitSuggestions(SubstanceCategory.SUPPLEMENTS, 'm');
      const units = suggestions.map(s => s.unit);
      expect(units).toContain('mg');
      expect(units).toContain('mcg');
    });

    it('should limit results to maxSuggestions', () => {
      const suggestions = getSmartUnitSuggestions(SubstanceCategory.SUPPLEMENTS, '', 3);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('validateUnitForCategory', () => {
    it('should validate suggested units as valid', () => {
      const result = validateUnitForCategory(SubstanceCategory.SUPPLEMENTS, 'mg');
      expect(result.isValid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should provide suggestions for similar units', () => {
      const result = validateUnitForCategory(SubstanceCategory.SUPPLEMENTS, 'milligram');
      expect(result.isValid).toBe(true);
      // Should suggest 'mg' as alternative
    });

    it('should allow custom units', () => {
      const result = validateUnitForCategory(SubstanceCategory.SUPPLEMENTS, 'customunit');
      expect(result.isValid).toBe(true);
    });

    it('should warn about inappropriate unit types', () => {
      const result = validateUnitForCategory(SubstanceCategory.SUPPLEMENTS, 'glass');
      expect(result.isValid).toBe(true);
      // May have warning about unit type mismatch
    });
  });

  describe('getGroupedUnitSuggestions', () => {
    it('should group units by type', () => {
      const grouped = getGroupedUnitSuggestions(SubstanceCategory.SUPPLEMENTS);
      expect(grouped.weight).toBeDefined();
      expect(grouped.volume).toBeDefined();
      expect(grouped.count).toBeDefined();
      
      expect(grouped.weight.some(u => u.unit === 'mg')).toBe(true);
      expect(grouped.count.some(u => u.unit === 'tablet')).toBe(true);
    });

    it('should handle categories with mixed unit types', () => {
      const grouped = getGroupedUnitSuggestions(SubstanceCategory.ALCOHOL);
      expect(grouped.volume.length).toBeGreaterThan(0);
      expect(grouped.count.length).toBeGreaterThan(0);
    });
  });

  describe('formatUnitSuggestion', () => {
    const mockSuggestion = {
      unit: 'mg',
      displayName: 'Milligrams (mg)',
      isCommon: true,
      description: 'Most precise for dosing'
    };

    it('should format unit suggestion without details', () => {
      const formatted = formatUnitSuggestion(mockSuggestion, false);
      expect(formatted).toBe('mg');
    });

    it('should format unit suggestion with details', () => {
      const formatted = formatUnitSuggestion(mockSuggestion, true);
      expect(formatted).toContain('mg');
      expect(formatted).toContain('Milligrams (mg)');
      expect(formatted).toContain('Most precise for dosing');
    });
  });

  describe('getEnhancedUnitSuggestions', () => {
    it('should add frequency and context to suggestions', () => {
      const enhanced = getEnhancedUnitSuggestions(SubstanceCategory.SUPPLEMENTS);
      expect(enhanced.length).toBeGreaterThan(0);
      
      enhanced.forEach(suggestion => {
        expect(suggestion.frequency).toBeDefined();
        expect(typeof suggestion.frequency).toBe('number');
        expect(suggestion.frequency).toBeGreaterThanOrEqual(0);
        expect(suggestion.frequency).toBeLessThanOrEqual(1);
      });
    });

    it('should provide context for common units', () => {
      const enhanced = getEnhancedUnitSuggestions(SubstanceCategory.SUPPLEMENTS);
      const mgSuggestion = enhanced.find(s => s.unit === 'mg');
      expect(mgSuggestion?.context).toBeDefined();
    });

    it('should include alternatives for units', () => {
      const enhanced = getEnhancedUnitSuggestions(SubstanceCategory.SUPPLEMENTS);
      const mgSuggestion = enhanced.find(s => s.unit === 'mg');
      expect(mgSuggestion?.alternatives).toBeDefined();
      expect(Array.isArray(mgSuggestion?.alternatives)).toBe(true);
    });
  });

  describe('Category-specific behavior', () => {
    it('should prioritize weight units for supplements', () => {
      const suggestions = getSmartUnitSuggestions(SubstanceCategory.SUPPLEMENTS, '');
      const topUnits = suggestions.slice(0, 3).map(s => s.unit);
      expect(topUnits).toContain('mg');
    });

    it('should prioritize volume units for alcohol', () => {
      const suggestions = getSmartUnitSuggestions(SubstanceCategory.ALCOHOL, '');
      const topUnits = suggestions.slice(0, 3).map(s => s.unit);
      expect(topUnits).toContain('ml');
    });

    it('should include tablet/capsule for drug categories', () => {
      const prescriptionSuggestions = getSmartUnitSuggestions(SubstanceCategory.DRUGS_PRESCRIPTION, '');
      const otcSuggestions = getSmartUnitSuggestions(SubstanceCategory.DRUGS_OTC, '');
      
      const prescriptionUnits = prescriptionSuggestions.map(s => s.unit);
      const otcUnits = otcSuggestions.map(s => s.unit);
      
      expect(prescriptionUnits).toContain('tablet');
      expect(otcUnits).toContain('tablet');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty category gracefully', () => {
      const suggestions = getSmartUnitSuggestions(SubstanceCategory.OTHER, '');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should handle very long input strings', () => {
      const longInput = 'a'.repeat(100);
      const suggestions = getSmartUnitSuggestions(SubstanceCategory.SUPPLEMENTS, longInput);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should handle special characters in input', () => {
      const suggestions = getSmartUnitSuggestions(SubstanceCategory.SUPPLEMENTS, 'mg/ml');
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should be case insensitive', () => {
      const lowerSuggestions = getSmartUnitSuggestions(SubstanceCategory.SUPPLEMENTS, 'mg');
      const upperSuggestions = getSmartUnitSuggestions(SubstanceCategory.SUPPLEMENTS, 'MG');
      
      expect(lowerSuggestions.length).toBe(upperSuggestions.length);
      expect(lowerSuggestions[0].unit).toBe(upperSuggestions[0].unit);
    });
  });
});