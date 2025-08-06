/**
 * Photo Accessibility Service Tests
 * Enhanced with WCAG AA compliance, ARIA patterns, and intake-specific labeling tests
 */

import { photoAccessibilityService } from '../photoAccessibilityService';
import type { IntakeMetadata, WCAGColors } from '../photoAccessibilityService';
import { AccessibilityInfo, Platform } from 'react-native';

// Mock React Native modules
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn(),
    isReduceMotionEnabled: jest.fn(),
    isHighContrastEnabled: jest.fn(),
    addEventListener: jest.fn(),
    announceForAccessibility: jest.fn(),
    setAccessibilityFocus: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((options) => options.ios),
  },
}));

describe('PhotoAccessibilityService', () => {
  const mockIntakeMetadata: IntakeMetadata = {
    substanceName: 'Aspirin',
    intakeTime: '2024-01-15T10:30:00Z',
    dosage: '325',
    unit: 'mg',
    intakeType: 'medication',
    notes: 'With breakfast',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(false);
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);
    (AccessibilityInfo.isHighContrastEnabled as jest.Mock).mockResolvedValue(false);
  });

  describe('initialization', () => {
    it('should initialize with default accessibility settings', () => {
      const settings = photoAccessibilityService.getSettings();
      
      expect(settings).toEqual({
        isScreenReaderEnabled: false,
        isReduceMotionEnabled: false,
        isHighContrastEnabled: false,
        isLargeTextEnabled: false,
        isVoiceControlEnabled: false,
        preferredColorScheme: 'auto',
        fontSize: 'medium',
      });
    });

    it('should detect accessibility features on initialization', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockResolvedValue(true);
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(AccessibilityInfo.isScreenReaderEnabled).toHaveBeenCalled();
      expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
    });
  });

  describe('intake-specific alt text generation', () => {
    it('should generate descriptive alt text for medication intake photos', () => {
      const altText = photoAccessibilityService.generateIntakePhotoAltText(mockIntakeMetadata);
      
      expect(altText).toBe('Photo of Aspirin intake, 325 mg, taken at 10:30 AM, medication documentation');
    });

    it('should generate alt text with minimal metadata', () => {
      const minimalMetadata: IntakeMetadata = {
        substanceName: 'Vitamin D',
        intakeType: 'supplement',
      };
      
      const altText = photoAccessibilityService.generateIntakePhotoAltText(minimalMetadata);
      expect(altText).toBe('Photo of Vitamin D intake, dietary supplement documentation');
    });

    it('should generate alt text without substance name', () => {
      const noNameMetadata: IntakeMetadata = {
        dosage: '500',
        unit: 'mg',
        intakeType: 'medication',
      };
      
      const altText = photoAccessibilityService.generateIntakePhotoAltText(noNameMetadata);
      expect(altText).toBe('Photo of substance intake, 500 mg, medication documentation');
    });

    it('should include photo capture date when provided', () => {
      const photoMetadata = {
        captureDate: '2024-01-15T14:30:00Z',
        fileName: 'aspirin_photo.jpg',
      };
      
      const altText = photoAccessibilityService.generateIntakePhotoAltText(
        mockIntakeMetadata,
        photoMetadata
      );
      
      expect(altText).toContain('photo captured on 1/15/2024');
    });
  });

  describe('thumbnail accessibility labels', () => {
    it('should generate comprehensive thumbnail labels', () => {
      const label = photoAccessibilityService.generateThumbnailLabel(
        mockIntakeMetadata,
        0,
        3,
        { fileName: 'aspirin.jpg', fileSize: 2048000 }
      );
      
      expect(label).toContain('Photo of Aspirin intake');
      expect(label).toContain('Photo 1 of 3');
      expect(label).toContain('File size: 2000 KB');
      expect(label).toContain('Tap to view full size, double tap for options');
    });

    it('should handle missing file metadata gracefully', () => {
      const label = photoAccessibilityService.generateThumbnailLabel(
        mockIntakeMetadata,
        1,
        2
      );
      
      expect(label).toContain('Photo of Aspirin intake');
      expect(label).toContain('Photo 2 of 2');
      expect(label).not.toContain('File size');
    });
  });

  describe('full-screen accessibility labels', () => {
    it('should generate full-screen photo labels with dimensions', () => {
      const photoMetadata = {
        fileName: 'aspirin.jpg',
        dimensions: { width: 1920, height: 1080 },
        captureDate: '2024-01-15T10:30:00Z',
      };
      
      const label = photoAccessibilityService.generateFullScreenLabel(
        mockIntakeMetadata,
        photoMetadata
      );
      
      expect(label).toContain('Full screen view: Photo of Aspirin intake');
      expect(label).toContain('1920 by 1080 pixels, landscape orientation');
      expect(label).toContain('Pinch to zoom, double tap to fit screen, swipe down to close');
    });

    it('should identify portrait orientation correctly', () => {
      const photoMetadata = {
        dimensions: { width: 1080, height: 1920 },
      };
      
      const label = photoAccessibilityService.generateFullScreenLabel(
        mockIntakeMetadata,
        photoMetadata
      );
      
      expect(label).toContain('portrait orientation');
    });

    it('should identify square orientation correctly', () => {
      const photoMetadata = {
        dimensions: { width: 1080, height: 1080 },
      };
      
      const label = photoAccessibilityService.generateFullScreenLabel(
        mockIntakeMetadata,
        photoMetadata
      );
      
      expect(label).toContain('square orientation');
    });
  });

  describe('focus trap management', () => {
    it('should setup focus trap for modal dialogs', () => {
      const cleanup = photoAccessibilityService.setupFocusTrap({
        modalId: 'photo-modal',
        firstFocusableSelector: '#first-button',
        lastFocusableSelector: '#last-button',
        returnFocusSelector: '#trigger-button',
      });
      
      expect(typeof cleanup).toBe('function');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Dialog opened. Use Tab to navigate, Escape to close.'
      );
      
      // Cleanup
      cleanup();
    });

    it('should handle focus trap keyboard navigation', () => {
      photoAccessibilityService.setupFocusTrap({
        modalId: 'test-modal',
        firstFocusableSelector: '#first',
        lastFocusableSelector: '#last',
        returnFocusSelector: '#return',
      });

      const mockEvent = {
        key: 'Escape',
        shiftKey: false,
        target: {},
        preventDefault: jest.fn(),
      };

      const handled = photoAccessibilityService.handleFocusTrapKeyboard(mockEvent);
      
      expect(handled).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should handle Tab key navigation in focus trap', () => {
      photoAccessibilityService.setupFocusTrap({
        modalId: 'test-modal',
        firstFocusableSelector: '#first',
        lastFocusableSelector: '#last',
        returnFocusSelector: '#return',
      });

      const mockEvent = {
        key: 'Tab',
        shiftKey: false,
        target: {},
        preventDefault: jest.fn(),
      };

      const handled = photoAccessibilityService.handleFocusTrapKeyboard(mockEvent);
      expect(handled).toBe(true);
    });

    it('should not handle non-trap keys', () => {
      const mockEvent = {
        key: 'Enter',
        shiftKey: false,
        target: {},
        preventDefault: jest.fn(),
      };

      const handled = photoAccessibilityService.handleFocusTrapKeyboard(mockEvent);
      expect(handled).toBe(false);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('ARIA attributes', () => {
    it('should provide correct ARIA attributes for thumbnails', () => {
      const attributes = photoAccessibilityService.getARIAAttributes('thumbnail', {
        isSelected: true,
      });
      
      expect(attributes.role).toBe('button');
      expect(attributes.accessibilityRole).toBe('imagebutton');
      expect(attributes['aria-selected']).toBe(true);
      expect(attributes.accessibilityState).toEqual({ selected: true });
    });

    it('should provide correct ARIA attributes for modals', () => {
      const attributes = photoAccessibilityService.getARIAAttributes('modal', {
        labelledBy: 'modal-title',
      });
      
      expect(attributes.role).toBe('dialog');
      expect(attributes['aria-modal']).toBe(true);
      expect(attributes['aria-labelledby']).toBe('modal-title');
      expect(attributes.accessibilityViewIsModal).toBe(true);
    });

    it('should provide correct ARIA attributes for buttons', () => {
      const attributes = photoAccessibilityService.getARIAAttributes('button', {
        isPressed: true,
        hasPopup: true,
        isExpanded: false,
      });
      
      expect(attributes.role).toBe('button');
      expect(attributes['aria-pressed']).toBe(true);
      expect(attributes['aria-haspopup']).toBe(true);
      expect(attributes['aria-expanded']).toBe(false);
    });

    it('should provide correct ARIA attributes for status regions', () => {
      const attributes = photoAccessibilityService.getARIAAttributes('status', {
        live: 'assertive',
      });
      
      expect(attributes.role).toBe('status');
      expect(attributes['aria-live']).toBe('assertive');
      expect(attributes.accessibilityLiveRegion).toBe('assertive');
    });

    it('should provide correct ARIA attributes for gallery', () => {
      const attributes = photoAccessibilityService.getARIAAttributes('gallery');
      
      expect(attributes.role).toBe('region');
      expect(attributes['aria-label']).toBe('Photo gallery');
    });
  });

  describe('live region announcements', () => {
    beforeEach(() => {
      photoAccessibilityService.updateSettings({ isScreenReaderEnabled: true });
    });

    it('should update live regions with photo operation messages', () => {
      photoAccessibilityService.updateLiveRegion(
        'photo-status',
        'Photo uploaded successfully',
        'polite'
      );
      
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Photo uploaded successfully'
      );
    });

    it('should generate appropriate loading announcements', () => {
      const announcement = photoAccessibilityService.getPhotoOperationAnnouncement(
        'loading',
        { substanceName: 'Aspirin' }
      );
      
      expect(announcement).toBe('Loading photo for Aspirin intake');
    });

    it('should generate appropriate upload announcements', () => {
      const announcement = photoAccessibilityService.getPhotoOperationAnnouncement(
        'uploading',
        { substanceName: 'Vitamin D' }
      );
      
      expect(announcement).toBe('Uploading photo for Vitamin D intake');
    });

    it('should generate appropriate error announcements', () => {
      const announcement = photoAccessibilityService.getPhotoOperationAnnouncement(
        'error',
        { errorMessage: 'Network connection failed' }
      );
      
      expect(announcement).toBe('Photo operation failed: Network connection failed');
    });

    it('should announce photo count changes', () => {
      photoAccessibilityService.announcePhotoCountChange(3, 2, 'Aspirin');
      
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        '1 photo added for Aspirin. Total: 3'
      );
    });

    it('should announce photo deletions', () => {
      photoAccessibilityService.announcePhotoCountChange(1, 2, 'Vitamin D');
      
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        '1 photo removed from Vitamin D. Total: 1'
      );
    });
  });

  describe('WCAG color contrast compliance', () => {
    it('should calculate contrast ratios correctly', () => {
      const whiteOnBlack = photoAccessibilityService.validateColorContrast('#ffffff', '#000000');
      
      expect(whiteOnBlack.contrastRatio).toBe(21); // Perfect contrast
      expect(whiteOnBlack.meetsAA).toBe(true);
      expect(whiteOnBlack.meetsAAA).toBe(true);
    });

    it('should validate AA compliance for normal text', () => {
      const result = photoAccessibilityService.validateColorContrast('#666666', '#ffffff', 'normal');
      
      expect(result.meetsAA).toBe(result.contrastRatio >= 4.5);
    });

    it('should validate AA compliance for large text', () => {
      const result = photoAccessibilityService.validateColorContrast('#999999', '#ffffff', 'large');
      
      expect(result.meetsAA).toBe(result.contrastRatio >= 3);
    });

    it('should provide WCAG compliant colors for light theme', () => {
      const colors = photoAccessibilityService.getWCAGCompliantColors('light');
      
      expect(colors.overlay.meetsAA).toBe(true);
      expect(colors.badge.meetsAA).toBe(true);
      expect(colors.error.meetsAA).toBe(true);
      expect(colors.success.meetsAA).toBe(true);
      expect(colors.warning.meetsAA).toBe(true);
    });

    it('should provide WCAG compliant colors for dark theme', () => {
      const colors = photoAccessibilityService.getWCAGCompliantColors('dark');
      
      expect(colors.overlay.meetsAA).toBe(true);
      expect(colors.badge.meetsAA).toBe(true);
      expect(colors.error.meetsAA).toBe(true);
      expect(colors.success.meetsAA).toBe(true);
      expect(colors.warning.meetsAA).toBe(true);
    });

    it('should identify failing contrast ratios', () => {
      const poorContrast = photoAccessibilityService.validateColorContrast('#cccccc', '#ffffff');
      
      expect(poorContrast.meetsAA).toBe(false);
      expect(poorContrast.contrastRatio).toBeLessThan(4.5);
    });

    it('should provide enhanced high contrast colors', () => {
      photoAccessibilityService.updateSettings({ isHighContrastEnabled: true });
      
      const colors = photoAccessibilityService.getHighContrastColors();
      
      expect(colors).not.toBeNull();
      expect(colors?.overlay.meetsAA).toBe(true);
      expect(colors?.badge.meetsAA).toBe(true);
    });
  });

  describe('animation and motion preferences', () => {
    it('should reduce animation duration when reduce motion is enabled', () => {
      photoAccessibilityService.updateSettings({ isReduceMotionEnabled: true });
      
      const duration = photoAccessibilityService.getAnimationDuration(300);
      expect(duration).toBeLessThanOrEqual(150); // Significantly reduced
    });

    it('should return default duration when reduce motion is disabled', () => {
      photoAccessibilityService.updateSettings({ isReduceMotionEnabled: false });
      
      const duration = photoAccessibilityService.getAnimationDuration(300);
      expect(duration).toBe(300);
    });

    it('should indicate when to reduce motion', () => {
      photoAccessibilityService.updateSettings({ isReduceMotionEnabled: true });
      
      const shouldReduce = photoAccessibilityService.shouldReduceMotion();
      expect(shouldReduce).toBe(true);
    });
  });

  describe('alternative interaction methods', () => {
    it('should recommend alternative interactions for screen readers', () => {
      photoAccessibilityService.updateSettings({ isScreenReaderEnabled: true });
      
      const shouldUseAlternative = photoAccessibilityService.shouldUseAlternativeInteraction();
      expect(shouldUseAlternative).toBe(true);
    });

    it('should recommend alternative interactions for voice control', () => {
      photoAccessibilityService.updateSettings({ isVoiceControlEnabled: true });
      
      const shouldUseAlternative = photoAccessibilityService.shouldUseAlternativeInteraction();
      expect(shouldUseAlternative).toBe(true);
    });

    it('should recommend alternative interactions for reduced motion', () => {
      photoAccessibilityService.updateSettings({ isReduceMotionEnabled: true });
      
      const shouldUseAlternative = photoAccessibilityService.shouldUseAlternativeInteraction();
      expect(shouldUseAlternative).toBe(true);
    });

    it('should not recommend alternative interactions when accessibility features are disabled', () => {
      photoAccessibilityService.updateSettings({
        isScreenReaderEnabled: false,
        isVoiceControlEnabled: false,
        isReduceMotionEnabled: false,
      });
      
      const shouldUseAlternative = photoAccessibilityService.shouldUseAlternativeInteraction();
      expect(shouldUseAlternative).toBe(false);
    });
  });

  describe('subscription system', () => {
    it('should allow subscribing to accessibility changes', () => {
      const callback = jest.fn();
      const unsubscribe = photoAccessibilityService.subscribe(callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Clean up
      unsubscribe();
    });

    it('should call subscribers when accessibility config changes', () => {
      const callback = jest.fn();
      photoAccessibilityService.subscribe(callback);
      
      // Simulate accessibility change
      const mockListener = (AccessibilityInfo.addEventListener as jest.Mock).mock.calls[0][1];
      mockListener(true);
      
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('accessibility compliance testing', () => {
    it('should test accessibility compliance with color validation', async () => {
      const testColors = [
        { foreground: '#ffffff', background: '#000000', context: 'high contrast' },
        { foreground: '#666666', background: '#ffffff', context: 'normal text' },
      ];

      const result = await photoAccessibilityService.testAccessibilityCompliance(testColors);
      
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('colorTests');
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should identify color contrast failures', async () => {
      const failingColors = [
        { foreground: '#cccccc', background: '#ffffff', context: 'poor contrast' },
      ];

      const result = await photoAccessibilityService.testAccessibilityCompliance(failingColors);
      
      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.includes('poor contrast'))).toBe(true);
    });

    it('should generate comprehensive accessibility report', () => {
      const report = photoAccessibilityService.getAccessibilityReport();
      
      expect(report).toHaveProperty('settings');
      expect(report).toHaveProperty('focusTraps');
      expect(report).toHaveProperty('liveRegions');
      expect(report).toHaveProperty('colorCompliance');
      expect(report).toHaveProperty('recommendations');
      expect(report.colorCompliance).toHaveProperty('light');
      expect(report.colorCompliance).toHaveProperty('dark');
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('touch target and font scaling', () => {
    it('should provide appropriate touch target sizes', () => {
      const normalSize = photoAccessibilityService.getTouchTargetSize();
      expect(normalSize.minWidth).toBe(44);
      expect(normalSize.minHeight).toBe(44);
    });

    it('should increase touch target size for large text', () => {
      photoAccessibilityService.updateSettings({ isLargeTextEnabled: true });
      
      const largeSize = photoAccessibilityService.getTouchTargetSize();
      expect(largeSize.minWidth).toBeGreaterThan(44);
      expect(largeSize.minHeight).toBeGreaterThan(44);
    });

    it('should provide font size multipliers', () => {
      const normalMultiplier = photoAccessibilityService.getFontSizeMultiplier();
      expect(normalMultiplier).toBe(1.0);
      
      photoAccessibilityService.updateSettings({ 
        fontSize: 'large',
        isLargeTextEnabled: true 
      });
      
      const largeMultiplier = photoAccessibilityService.getFontSizeMultiplier();
      expect(largeMultiplier).toBeGreaterThan(1.0);
    });
  });

  describe('keyboard and voice navigation', () => {
    it('should provide keyboard navigation configuration', () => {
      const keyboardNav = photoAccessibilityService.getKeyboardNavigation();
      
      expect(keyboardNav).toHaveProperty('enabled');
      expect(keyboardNav).toHaveProperty('focusRingVisible');
      expect(keyboardNav).toHaveProperty('tabOrder');
      expect(keyboardNav).toHaveProperty('shortcuts');
      expect(Array.isArray(keyboardNav.tabOrder)).toBe(true);
    });

    it('should enable keyboard navigation for screen readers', () => {
      photoAccessibilityService.updateSettings({ isScreenReaderEnabled: true });
      
      const keyboardNav = photoAccessibilityService.getKeyboardNavigation();
      expect(keyboardNav.enabled).toBe(true);
    });

    it('should provide voice commands mapping', () => {
      const voiceCommands = photoAccessibilityService.getVoiceCommands();
      
      expect(voiceCommands).toHaveProperty('take photo');
      expect(voiceCommands).toHaveProperty('show gallery');
      expect(voiceCommands).toHaveProperty('delete photo');
      expect(voiceCommands['take photo']).toBe('photo-capture');
    });
  });

  describe('contextual and semantic descriptions', () => {
    it('should generate contextual labels with metadata', () => {
      const contextualLabel = photoAccessibilityService.getContextualLabel(
        'Photo preview',
        {
          photoCount: 5,
          currentIndex: 2,
          fileName: 'aspirin.jpg',
          fileSize: '2.1 MB',
          captureDate: '2024-01-15',
          isLoading: false,
          hasError: false,
        }
      );
      
      expect(contextualLabel).toContain('Photo preview');
      expect(contextualLabel).toContain('Photo 3 of 5');
      expect(contextualLabel).toContain('aspirin.jpg');
      expect(contextualLabel).toContain('Size: 2.1 MB');
      expect(contextualLabel).toContain('Captured: 2024-01-15');
    });

    it('should generate semantic photo descriptions', () => {
      const metadata = {
        fileName: 'medication.jpg',
        fileSize: 1024000,
        dimensions: { width: 1920, height: 1080 },
        captureDate: '2024-01-15T10:30:00Z',
        location: 'Home',
      };
      
      const description = photoAccessibilityService.generatePhotoDescription(metadata);
      
      expect(description).toContain('Photo named medication.jpg');
      expect(description).toContain('1920 by 1080 pixels, landscape orientation');
      expect(description).toContain('1.0 megabytes');
      expect(description).toContain('taken at Home');
    });

    it('should provide action hints', () => {
      const captureHint = photoAccessibilityService.getActionHint('capture');
      expect(captureHint).toContain('Opens camera');
      expect(captureHint).toContain('Requires camera permission');
      
      const deleteHint = photoAccessibilityService.getActionHint('delete');
      expect(deleteHint).toContain('Removes photo permanently');
      expect(deleteHint).toContain('Confirmation dialog');
    });
  });

  describe('cleanup', () => {
    it('should clean up listeners on destroy', () => {
      const mockRemove = jest.fn();
      (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValue({ remove: mockRemove });
      
      // Create new instance to test cleanup
      const service = new (photoAccessibilityService.constructor as any)();
      service.destroy();
      
      expect(mockRemove).toHaveBeenCalled();
    });
  });
});  descr
ibe('subscription system', () => {
    it('should allow subscribing to accessibility changes', () => {
      const callback = jest.fn();
      const unsubscribe = photoAccessibilityService.subscribe(callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Clean up
      unsubscribe();
    });

    it('should call subscribers when accessibility settings change', () => {
      const callback = jest.fn();
      photoAccessibilityService.subscribe(callback);
      
      // Simulate settings change
      photoAccessibilityService.updateSettings({ isScreenReaderEnabled: true });
      
      expect(callback).toHaveBeenCalled();
    });

    it('should remove subscribers correctly', () => {
      const callback = jest.fn();
      const unsubscribe = photoAccessibilityService.subscribe(callback);
      
      unsubscribe();
      
      // Settings change should not trigger callback after unsubscribe
      photoAccessibilityService.updateSettings({ isReduceMotionEnabled: true });
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('announcement queue management', () => {
    beforeEach(() => {
      photoAccessibilityService.updateSettings({ isScreenReaderEnabled: true });
    });

    it('should queue announcements by priority', () => {
      photoAccessibilityService.announceMessage('Low priority', 'low');
      photoAccessibilityService.announceMessage('High priority', 'high');
      photoAccessibilityService.announceMessage('Medium priority', 'medium');
      
      // High priority should be announced first
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('High priority');
    });

    it('should handle delayed announcements', async () => {
      photoAccessibilityService.announceMessage('Delayed message', 'medium', 100);
      
      // Should not be announced immediately
      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalledWith('Delayed message');
      
      // Wait for delay
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Delayed message');
    });

    it('should not announce when screen reader is disabled', () => {
      photoAccessibilityService.updateSettings({ isScreenReaderEnabled: false });
      
      photoAccessibilityService.announceMessage('Test message');
      
      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalledWith('Test message');
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle missing intake metadata gracefully', () => {
      const emptyMetadata: IntakeMetadata = {};
      
      const altText = photoAccessibilityService.generateIntakePhotoAltText(emptyMetadata);
      expect(altText).toBe('Photo of substance intake');
    });

    it('should handle invalid color values gracefully', () => {
      const result = photoAccessibilityService.validateColorContrast('invalid', '#ffffff');
      
      // Should not throw and should return a result
      expect(result).toHaveProperty('contrastRatio');
      expect(result).toHaveProperty('meetsAA');
    });

    it('should handle focus trap cleanup when no traps exist', () => {
      const mockEvent = {
        key: 'Escape',
        shiftKey: false,
        target: {},
        preventDefault: jest.fn(),
      };

      const handled = photoAccessibilityService.handleFocusTrapKeyboard(mockEvent);
      expect(handled).toBe(false);
    });

    it('should handle accessibility info errors gracefully', async () => {
      (AccessibilityInfo.isScreenReaderEnabled as jest.Mock).mockRejectedValue(
        new Error('Accessibility API error')
      );

      const result = await photoAccessibilityService.testAccessibilityCompliance();
      
      expect(result.issues).toContain('Unable to detect screen reader status');
    });
  });
});