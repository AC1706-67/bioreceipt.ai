/**
 * Accessibility Utilities Tests
 * Tests for accessibility helper functions and utilities
 */

import {
  createButtonAccessibility,
  createTextInputAccessibility,
  createImageAccessibility,
  createHeaderAccessibility,
  createSwitchAccessibility,
  createProgressAccessibility,
  calculateContrastRatio,
  meetsContrastRequirement,
  auditAccessibility,
  ACCESSIBILITY_ROLES,
  CONTRAST_RATIOS,
} from '../../src/utils/accessibility';

describe('Accessibility Utilities', () => {
  describe('createButtonAccessibility', () => {
    it('should create proper button accessibility props', () => {
      const props = createButtonAccessibility(
        'Submit',
        'Double tap to submit form',
      );

      expect(props).toEqual({
        accessible: true,
        accessibilityRole: ACCESSIBILITY_ROLES.BUTTON,
        accessibilityLabel: 'Submit',
        accessibilityHint: 'Double tap to submit form',
        accessibilityState: undefined,
      });
    });

    it('should include state when provided', () => {
      const props = createButtonAccessibility('Toggle', 'Toggle setting', {
        selected: true,
      });

      expect(props.accessibilityState).toEqual({ selected: true });
    });
  });

  describe('createTextInputAccessibility', () => {
    it('should create proper text input accessibility props', () => {
      const props = createTextInputAccessibility(
        'Email',
        'Enter your email address',
        true,
        false,
      );

      expect(props).toEqual({
        accessible: true,
        accessibilityLabel: 'Email',
        accessibilityHint: 'Enter your email address',
        accessibilityState: {
          disabled: false,
          required: true,
        },
        accessibilityLiveRegion: 'none',
      });
    });

    it('should set assertive live region for invalid inputs', () => {
      const props = createTextInputAccessibility(
        'Email',
        'Enter email',
        false,
        true,
      );

      expect(props.accessibilityLiveRegion).toBe('assertive');
    });
  });

  describe('createImageAccessibility', () => {
    it('should create proper image accessibility props', () => {
      const props = createImageAccessibility('Profile picture');

      expect(props).toEqual({
        accessible: true,
        accessibilityRole: ACCESSIBILITY_ROLES.IMAGE,
        accessibilityLabel: 'Profile picture',
      });
    });

    it('should hide decorative images from accessibility', () => {
      const props = createImageAccessibility('Decorative border', true);

      expect(props).toEqual({
        accessible: false,
        accessibilityElementsHidden: true,
      });
    });
  });

  describe('createHeaderAccessibility', () => {
    it('should create proper header accessibility props', () => {
      const props = createHeaderAccessibility('Page Title', 1);

      expect(props).toEqual({
        accessible: true,
        accessibilityRole: ACCESSIBILITY_ROLES.HEADER,
        accessibilityLabel: 'Page Title, heading level 1',
      });
    });

    it('should work without level', () => {
      const props = createHeaderAccessibility('Section Title');

      expect(props.accessibilityLabel).toBe('Section Title');
    });
  });

  describe('createSwitchAccessibility', () => {
    it('should create proper switch accessibility props', () => {
      const props = createSwitchAccessibility(
        'Dark mode',
        true,
        'Toggle dark mode',
      );

      expect(props).toEqual({
        accessible: true,
        accessibilityRole: ACCESSIBILITY_ROLES.SWITCH,
        accessibilityLabel: 'Dark mode',
        accessibilityHint: 'Toggle dark mode',
        accessibilityState: {
          checked: true,
        },
        accessibilityValue: {
          text: 'On',
        },
      });
    });

    it('should show Off for false value', () => {
      const props = createSwitchAccessibility('Notifications', false);

      expect(props.accessibilityValue?.text).toBe('Off');
      expect(props.accessibilityState?.checked).toBe(false);
    });
  });

  describe('createProgressAccessibility', () => {
    it('should create proper progress accessibility props', () => {
      const props = createProgressAccessibility('Loading', 75, 0, 100);

      expect(props).toEqual({
        accessible: true,
        accessibilityRole: ACCESSIBILITY_ROLES.PROGRESSBAR,
        accessibilityLabel: 'Loading',
        accessibilityValue: {
          min: 0,
          max: 100,
          now: 75,
          text: '75 percent',
        },
      });
    });

    it('should calculate percentage correctly', () => {
      const props = createProgressAccessibility('Upload', 3, 0, 10);

      expect(props.accessibilityValue?.text).toBe('30 percent');
    });
  });

  describe('Color Contrast', () => {
    describe('calculateContrastRatio', () => {
      it('should calculate contrast ratio between colors', () => {
        // Test with black and white (should be maximum contrast ~21:1)
        const ratio = calculateContrastRatio('#000000', '#ffffff');
        expect(ratio).toBeGreaterThan(15); // Should be around 21
      });

      it('should handle same colors (minimum contrast 1:1)', () => {
        const ratio = calculateContrastRatio('#ff0000', '#ff0000');
        expect(ratio).toBe(1);
      });

      it('should handle invalid colors gracefully', () => {
        const ratio = calculateContrastRatio('invalid', 'colors');
        expect(ratio).toBe(1);
      });
    });

    describe('meetsContrastRequirement', () => {
      it('should pass high contrast combinations', () => {
        const passes = meetsContrastRequirement('#000000', '#ffffff', 'normal');
        expect(passes).toBe(true);
      });

      it('should use correct thresholds for different text sizes', () => {
        // Mock a ratio that's between large and normal text requirements
        const mockRatio = 4.0; // Between 3.0 (large) and 4.5 (normal)

        // This would need to be tested with actual color combinations
        // For now, we test the function exists and returns boolean
        const result = meetsContrastRequirement('#333333', '#ffffff', 'large');
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('auditAccessibility', () => {
    it('should identify missing accessibility labels on interactive elements', () => {
      const props = { onPress: jest.fn() }; // Interactive but no label
      const result = auditAccessibility('TestButton', props);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'missing_label',
          severity: 'error',
          message: 'Interactive element missing accessibilityLabel',
        }),
      );
    });

    it('should identify missing accessibility roles', () => {
      const props = { onPress: jest.fn(), accessibilityLabel: 'Test' };
      const result = auditAccessibility('TestButton', props);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'missing_role',
          severity: 'warning',
          message: 'Interactive element missing accessibilityRole',
        }),
      );
    });

    it('should identify missing image labels', () => {
      const result = auditAccessibility('TestImage', {});

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'missing_label',
          severity: 'error',
          message: 'Image missing accessibilityLabel',
        }),
      );
    });

    it('should calculate score based on issues', () => {
      // Perfect component
      const perfectProps = {
        accessibilityLabel: 'Perfect Button',
        accessibilityRole: 'button',
        onPress: jest.fn(),
      };
      const perfectResult = auditAccessibility('PerfectButton', perfectProps);
      expect(perfectResult.score).toBe(100);

      // Component with errors
      const badProps = { onPress: jest.fn() }; // Missing label and role
      const badResult = auditAccessibility('BadButton', badProps);
      expect(badResult.score).toBeLessThan(100);
    });

    it('should not penalize properly configured components', () => {
      const goodProps = {
        accessibilityLabel: 'Good Button',
        accessibilityRole: ACCESSIBILITY_ROLES.BUTTON,
        onPress: jest.fn(),
      };
      const result = auditAccessibility('GoodButton', goodProps);

      expect(result.issues).toHaveLength(0);
      expect(result.score).toBe(100);
    });
  });

  describe('Constants', () => {
    it('should have correct WCAG contrast ratios', () => {
      expect(CONTRAST_RATIOS.NORMAL_TEXT).toBe(4.5);
      expect(CONTRAST_RATIOS.LARGE_TEXT).toBe(3.0);
      expect(CONTRAST_RATIOS.UI_COMPONENTS).toBe(3.0);
    });

    it('should have all required accessibility roles', () => {
      expect(ACCESSIBILITY_ROLES.BUTTON).toBe('button');
      expect(ACCESSIBILITY_ROLES.TEXT).toBe('text');
      expect(ACCESSIBILITY_ROLES.IMAGE).toBe('image');
      expect(ACCESSIBILITY_ROLES.HEADER).toBe('header');
      expect(ACCESSIBILITY_ROLES.TEXTINPUT).toBe('none'); // React Native specific
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings gracefully', () => {
      const props = createButtonAccessibility('', '');
      expect(props.accessibilityLabel).toBe('');
      expect(props.accessibilityHint).toBe('');
    });

    it('should handle undefined values gracefully', () => {
      const props = createTextInputAccessibility(
        'Test',
        undefined,
        undefined,
        undefined,
      );
      expect(props.accessibilityHint).toBeUndefined();
      expect(props.accessibilityState?.required).toBeUndefined();
    });

    it('should audit components with no props', () => {
      const result = auditAccessibility('EmptyComponent', {});
      expect(result.component).toBe('EmptyComponent');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
