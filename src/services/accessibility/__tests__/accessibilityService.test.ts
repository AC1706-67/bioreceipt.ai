/**
 * Accessibility Service Tests
 * Comprehensive testing for accessibility service functionality and WCAG compliance
 */
import { AccessibilityService, AccessibilitySettings, AccessibilityAuditResult } from '../accessibilityService';
import { AuditLogService } from '../../compliance/auditLogService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo } from 'react-native';

// Mock dependencies
jest.mock('../../compliance/auditLogService');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn(),
    isReduceMotionEnabled: jest.fn(),
    announceForAccessibility: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  Platform: {
    OS: 'ios',
  },
}));

describe('AccessibilityService', () => {
  let accessibilityService: AccessibilityService;
  let mockAuditLogService: jest.Mocked<AuditLogService>;
  let mockAsyncStorage: jest.Mocked<typeof AsyncStorage>;
  let mockAccessibilityInfo: jest.Mocked<typeof AccessibilityInfo>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (AccessibilityService as any).instance = undefined;
    
    mockAuditLogService = {
      logDataAccess: jest.fn().mockResolvedValue(undefined),
      getInstance: jest.fn()
    } as any;
    
    mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockAsyncStorage.getItem = jest.fn().mockResolvedValue(null);
    mockAsyncStorage.setItem = jest.fn().mockResolvedValue(undefined);
    
    mockAccessibilityInfo = AccessibilityInfo as jest.Mocked<typeof AccessibilityInfo>;
    mockAccessibilityInfo.isScreenReaderEnabled = jest.fn().mockResolvedValue(false);
    mockAccessibilityInfo.isReduceMotionEnabled = jest.fn().mockResolvedValue(false);
    mockAccessibilityInfo.announceForAccessibility = jest.fn();
    mockAccessibilityInfo.addEventListener = jest.fn();
    mockAccessibilityInfo.removeEventListener = jest.fn();

    (AuditLogService.getInstance as jest.Mock).mockReturnValue(mockAuditLogService);
    
    accessibilityService = AccessibilityService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = AccessibilityService.getInstance();
      const instance2 = AccessibilityService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('initializes successfully', async () => {
      await accessibilityService.initialize();
      
      expect(mockAccessibilityInfo.isScreenReaderEnabled).toHaveBeenCalled();
      expect(mockAccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ACCESSIBILITY_SERVICE_INITIALIZED',
          success: true
        })
      );
    });

    it('loads saved settings from storage', async () => {
      const savedSettings = {
        customFontSize: 1.5,
        highContrastEnabled: true,
        boldTextEnabled: true
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedSettings));
      
      await accessibilityService.initialize();
      
      const settings = accessibilityService.getSettings();
      expect(settings.customFontSize).toBe(1.5);
      expect(settings.highContrastEnabled).toBe(true);
      expect(settings.boldTextEnabled).toBe(true);
    });

    it('handles storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      await expect(accessibilityService.initialize()).resolves.not.toThrow();
    });

    it('sets up accessibility listeners', async () => {
      await accessibilityService.initialize();
      
      expect(mockAccessibilityInfo.addEventListener).toHaveBeenCalledWith(
        'screenReaderChanged',
        expect.any(Function)
      );
      expect(mockAccessibilityInfo.addEventListener).toHaveBeenCalledWith(
        'reduceMotionChanged',
        expect.any(Function)
      );
    });
  });

  describe('Settings Management', () => {
    beforeEach(async () => {
      await accessibilityService.initialize();
    });

    it('returns current settings', () => {
      const settings = accessibilityService.getSettings();
      
      expect(settings).toHaveProperty('screenReaderEnabled');
      expect(settings).toHaveProperty('highContrastEnabled');
      expect(settings).toHaveProperty('customFontSize');
      expect(settings).toHaveProperty('customLineHeight');
      expect(settings).toHaveProperty('customLetterSpacing');
    });

    it('updates settings successfully', async () => {
      const newSettings = {
        highContrastEnabled: true,
        customFontSize: 1.5
      };
      
      await accessibilityService.updateSettings(newSettings);
      
      const settings = accessibilityService.getSettings();
      expect(settings.highContrastEnabled).toBe(true);
      expect(settings.customFontSize).toBe(1.5);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ACCESSIBILITY_SETTINGS_UPDATED',
          success: true
        })
      );
    });

    it('handles update errors', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      
      await expect(
        accessibilityService.updateSettings({ highContrastEnabled: true })
      ).rejects.toThrow('Storage error');
    });
  });

  describe('Screen Reader Support', () => {
    beforeEach(async () => {
      await accessibilityService.initialize();
    });

    it('checks screen reader status', async () => {
      mockAccessibilityInfo.isScreenReaderEnabled.mockResolvedValue(true);
      
      const isEnabled = await accessibilityService.isScreenReaderEnabled();
      
      expect(isEnabled).toBe(true);
      expect(mockAccessibilityInfo.isScreenReaderEnabled).toHaveBeenCalled();
    });

    it('handles screen reader check errors', async () => {
      mockAccessibilityInfo.isScreenReaderEnabled.mockRejectedValue(new Error('Check failed'));
      
      const isEnabled = await accessibilityService.isScreenReaderEnabled();
      
      expect(isEnabled).toBe(false);
    });

    it('announces messages for accessibility', () => {
      accessibilityService.announceForAccessibility('Test message');
      
      expect(mockAccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Test message');
    });

    it('respects announcement settings', async () => {
      await accessibilityService.updateSettings({ announceNotifications: false });
      
      accessibilityService.announceForAccessibility('Test message');
      
      // Should still announce if screen reader is enabled
      expect(mockAccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });
  });

  describe('Reduce Motion Support', () => {
    beforeEach(async () => {
      await accessibilityService.initialize();
    });

    it('checks reduce motion status', async () => {
      mockAccessibilityInfo.isReduceMotionEnabled.mockResolvedValue(true);
      
      const isEnabled = await accessibilityService.isReduceMotionEnabled();
      
      expect(isEnabled).toBe(true);
      expect(mockAccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
    });

    it('handles reduce motion check errors', async () => {
      mockAccessibilityInfo.isReduceMotionEnabled.mockRejectedValue(new Error('Check failed'));
      
      const isEnabled = await accessibilityService.isReduceMotionEnabled();
      
      expect(isEnabled).toBe(false);
    });
  });

  describe('Color Contrast Analysis', () => {
    beforeEach(async () => {
      await accessibilityService.initialize();
    });

    it('calculates contrast ratio correctly', () => {
      const ratio = accessibilityService.calculateContrastRatio('#000000', '#FFFFFF');
      
      expect(ratio).toBeCloseTo(21, 1); // Black on white should be 21:1
    });

    it('calculates contrast ratio for similar colors', () => {
      const ratio = accessibilityService.calculateContrastRatio('#333333', '#666666');
      
      expect(ratio).toBeGreaterThan(1);
      expect(ratio).toBeLessThan(21);
    });

    it('checks WCAG AA compliance', () => {
      const passes = accessibilityService.meetsContrastStandards('#000000', '#FFFFFF', false, 'AA');
      
      expect(passes).toBe(true);
    });

    it('checks WCAG AAA compliance', () => {
      const passes = accessibilityService.meetsContrastStandards('#666666', '#FFFFFF', false, 'AAA');
      
      expect(passes).toBe(false); // 3.1:1 ratio doesn't meet AAA standard (7:1)
    });

    it('handles large text standards', () => {
      const passes = accessibilityService.meetsContrastStandards('#666666', '#FFFFFF', true, 'AA');
      
      expect(passes).toBe(true); // 3.1:1 ratio meets AA large text standard (3:1)
    });

    it('handles invalid color formats gracefully', () => {
      const ratio = accessibilityService.calculateContrastRatio('invalid', '#FFFFFF');
      
      expect(ratio).toBe(1); // Should return worst case scenario
    });
  });

  describe('Font and Text Accessibility', () => {
    beforeEach(async () => {
      await accessibilityService.initialize();
    });

    it('calculates accessible font size', () => {
      await accessibilityService.updateSettings({ customFontSize: 1.5 });
      
      const accessibleSize = accessibilityService.getAccessibleFontSize(16);
      
      expect(accessibleSize).toBe(24); // 16 * 1.5
    });

    it('calculates accessible line height', () => {
      await accessibilityService.updateSettings({ 
        customFontSize: 1.2,
        customLineHeight: 1.5
      });
      
      const accessibleLineHeight = accessibilityService.getAccessibleLineHeight(16);
      
      expect(accessibleLineHeight).toBe(28.8); // 16 * 1.2 * 1.5
    });

    it('returns accessible letter spacing', () => {
      await accessibilityService.updateSettings({ customLetterSpacing: 0.5 });
      
      const letterSpacing = accessibilityService.getAccessibleLetterSpacing();
      
      expect(letterSpacing).toBe(0.5);
    });
  });

  describe('Touch Target Standards', () => {
    beforeEach(async () => {
      await accessibilityService.initialize();
    });

    it('checks touch target standards', () => {
      const meets = accessibilityService.meetsTouchTargetStandards(44, 44);
      
      expect(meets).toBe(true);
    });

    it('fails for small touch targets', () => {
      const meets = accessibilityService.meetsTouchTargetStandards(20, 20);
      
      expect(meets).toBe(false);
    });

    it('returns recommended touch target size', () => {
      const size = accessibilityService.getRecommendedTouchTargetSize();
      
      expect(size).toBe(48); // Default recommended size
    });
  });

  describe('Accessibility Props Generation', () => {
    beforeEach(async () => {
      await accessibilityService.initialize();
    });

    it('generates basic accessibility props', () => {
      const props = accessibilityService.generateAccessibilityProps({
        label: 'Test Button',
        hint: 'Tap to perform action',
        role: 'button'
      });
      
      expect(props).toEqual({
        accessibilityLabel: 'Test Button',
        accessibilityHint: 'Tap to perform action',
        accessibilityRole: 'button'
      });
    });

    it('generates props with state information', () => {
      const props = accessibilityService.generateAccessibilityProps({
        label: 'Toggle Button',
        role: 'button',
        state: { selected: true, disabled: false }
      });
      
      expect(props).toEqual({
        accessibilityLabel: 'Toggle Button',
        accessibilityRole: 'button',
        accessibilityState: { selected: true, disabled: false }
      });
    });

    it('generates props with value information', () => {
      const props = accessibilityService.generateAccessibilityProps({
        label: 'Volume Slider',
        role: 'adjustable',
        value: { min: 0, max: 100, now: 50, text: '50 percent' }
      });
      
      expect(props).toEqual({
        accessibilityLabel: 'Volume Slider',
        accessibilityRole: 'adjustable',
        accessibilityValue: { min: 0, max: 100, now: 50, text: '50 percent' }
      });
    });

    it('generates props with actions', () => {
      const actions = [
        { name: 'activate', label: 'Activate' },
        { name: 'increment', label: 'Increase' }
      ];
      
      const props = accessibilityService.generateAccessibilityProps({
        label: 'Counter',
        actions
      });
      
      expect(props).toEqual({
        accessibilityLabel: 'Counter',
        accessibilityActions: actions
      });
    });
  });

  describe('Component Auditing', () => {
    beforeEach(async () => {
      await accessibilityService.initialize();
    });

    it('audits component with good accessibility', () => {
      const componentProps = {
        accessibilityLabel: 'Good Button',
        accessibilityRole: 'button',
        onPress: jest.fn(),
        style: { width: 48, height: 48 }
      };
      
      const result = accessibilityService.auditComponent(componentProps, 'TestButton');
      
      expect(result.componentName).toBe('TestButton');
      expect(result.score).toBeGreaterThan(80);
      expect(result.wcagLevel).toMatch(/^(A|AA|AAA)$/);
      expect(result.issues.length).toBeLessThan(2);
    });

    it('audits component with poor accessibility', () => {
      const componentProps = {
        onPress: jest.fn(),
        style: { width: 20, height: 20 }
      };
      
      const result = accessibilityService.auditComponent(componentProps, 'PoorButton');
      
      expect(result.componentName).toBe('PoorButton');
      expect(result.score).toBeLessThan(60);
      expect(result.wcagLevel).toBe('FAIL');
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('identifies missing accessibility labels', () => {
      const componentProps = {
        onPress: jest.fn()
      };
      
      const result = accessibilityService.auditComponent(componentProps, 'UnlabeledButton');
      
      const labelIssue = result.issues.find(issue => issue.type === 'label');
      expect(labelIssue).toBeDefined();
      expect(labelIssue?.severity).toBe('high');
    });

    it('identifies missing accessibility roles', () => {
      const componentProps = {
        onPress: jest.fn(),
        accessibilityLabel: 'Button without role'
      };
      
      const result = accessibilityService.auditComponent(componentProps, 'RolelessButton');
      
      const structureIssue = result.issues.find(issue => issue.type === 'structure');
      expect(structureIssue).toBeDefined();
    });

    it('identifies small touch targets', () => {
      const componentProps = {
        accessibilityLabel: 'Small Button',
        accessibilityRole: 'button',
        onPress: jest.fn(),
        style: { width: 20, height: 20 }
      };
      
      const result = accessibilityService.auditComponent(componentProps, 'SmallButton');
      
      const interactionIssue = result.issues.find(issue => issue.type === 'interaction');
      expect(interactionIssue).toBeDefined();
    });
  });

  describe('Accessibility Report Generation', () => {
    beforeEach(async () => {
      await accessibilityService.initialize();
    });

    it('generates comprehensive accessibility report', async () => {
      const components = [
        {
          name: 'GoodButton',
          props: {
            accessibilityLabel: 'Good Button',
            accessibilityRole: 'button',
            onPress: jest.fn(),
            style: { width: 48, height: 48 }
          }
        },
        {
          name: 'PoorButton',
          props: {
            onPress: jest.fn(),
            style: { width: 20, height: 20 }
          }
        }
      ];
      
      const report = await accessibilityService.generateAccessibilityReport(components);
      
      expect(report.overallScore).toBeGreaterThan(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(report.wcagLevel).toMatch(/^(A|AA|AAA|FAIL)$/);
      expect(report.componentResults).toHaveLength(2);
      expect(report.summary.totalIssues).toBeGreaterThan(0);
      expect(report.recommendations).toBeInstanceOf(Array);
      
      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ACCESSIBILITY_AUDIT_PERFORMED',
          success: true
        })
      );
    });

    it('calculates correct overall score', async () => {
      const components = [
        {
          name: 'PerfectButton',
          props: {
            accessibilityLabel: 'Perfect Button',
            accessibilityRole: 'button',
            accessibilityHint: 'Tap to activate',
            onPress: jest.fn(),
            style: { width: 48, height: 48, color: '#000000', backgroundColor: '#FFFFFF' }
          }
        }
      ];
      
      const report = await accessibilityService.generateAccessibilityReport(components);
      
      expect(report.overallScore).toBeGreaterThan(90);
      expect(report.wcagLevel).toMatch(/^(AA|AAA)$/);
    });

    it('provides relevant recommendations', async () => {
      const components = [
        {
          name: 'ProblematicButton',
          props: {
            onPress: jest.fn(),
            style: { width: 20, height: 20, color: '#CCCCCC', backgroundColor: '#DDDDDD' }
          }
        }
      ];
      
      const report = await accessibilityService.generateAccessibilityReport(components);
      
      expect(report.recommendations).toContain(
        expect.stringMatching(/accessibility labeling/i)
      );
      expect(report.recommendations).toContain(
        expect.stringMatching(/touch target/i)
      );
    });
  });

  describe('Error Handling', () => {
    it('handles initialization errors gracefully', async () => {
      mockAccessibilityInfo.isScreenReaderEnabled.mockRejectedValue(new Error('System error'));
      
      await expect(accessibilityService.initialize()).rejects.toThrow();
    });

    it('handles contrast calculation errors', () => {
      const ratio = accessibilityService.calculateContrastRatio('invalid-color', '#FFFFFF');
      
      expect(ratio).toBe(1); // Should return fallback value
    });

    it('handles audit errors gracefully', () => {
      const invalidProps = null;
      
      expect(() => {
        accessibilityService.auditComponent(invalidProps as any, 'InvalidComponent');
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('cleans up event listeners', () => {
      accessibilityService.cleanup();
      
      expect(mockAccessibilityInfo.removeEventListener).toHaveBeenCalledWith(
        'screenReaderChanged',
        expect.any(Function)
      );
      expect(mockAccessibilityInfo.removeEventListener).toHaveBeenCalledWith(
        'reduceMotionChanged',
        expect.any(Function)
      );
    });

    it('handles cleanup errors gracefully', () => {
      mockAccessibilityInfo.removeEventListener.mockImplementation(() => {
        throw new Error('Cleanup error');
      });
      
      expect(() => {
        accessibilityService.cleanup();
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await accessibilityService.initialize();
    });

    it('caches settings to avoid repeated storage reads', async () => {
      // First call
      accessibilityService.getSettings();
      
      // Second call
      accessibilityService.getSettings();
      
      // Should only read from storage once during initialization
      expect(mockAsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });

    it('handles rapid setting updates', async () => {
      const updates = [
        { customFontSize: 1.1 },
        { customFontSize: 1.2 },
        { customFontSize: 1.3 }
      ];
      
      await Promise.all(updates.map(update => 
        accessibilityService.updateSettings(update)
      ));
      
      // Should handle all updates without errors
      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(3);
    });
  });
});