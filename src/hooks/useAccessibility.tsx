/**
 * Accessibility Hook
 * React hook for easy accessibility integration throughout the app
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { 
  AccessibilityService, 
  AccessibilitySettings,
  AccessibilityAuditResult 
} from '../services/accessibility/accessibilityService';

interface UseAccessibilityOptions {
  enableAutoAnnouncements?: boolean;
  enableContrastChecking?: boolean;
  enableTouchTargetValidation?: boolean;
}

interface UseAccessibilityReturn {
  // Settings
  settings: AccessibilitySettings;
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => Promise<void>;
  
  // System state
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  
  // Utilities
  announceForAccessibility: (message: string) => void;
  getAccessibleFontSize: (baseFontSize: number) => number;
  getAccessibleLineHeight: (baseFontSize: number) => number;
  getAccessibleLetterSpacing: () => number;
  
  // Validation
  checkContrastRatio: (foreground: string, background: string) => number;
  meetsContrastStandards: (foreground: string, background: string, isLargeText?: boolean) => boolean;
  validateTouchTarget: (width: number, height: number) => boolean;
  
  // Props generation
  generateAccessibilityProps: (options: {
    label?: string;
    hint?: string;
    role?: string;
    state?: { disabled?: boolean; selected?: boolean; expanded?: boolean };
    value?: { min?: number; max?: number; now?: number; text?: string };
    actions?: Array<{ name: string; label: string }>;
  }) => any;
  
  // Audit
  auditComponent: (componentProps: any, componentName: string) => AccessibilityAuditResult;
}

export const useAccessibility = (options: UseAccessibilityOptions = {}): UseAccessibilityReturn => {
  const {
    enableAutoAnnouncements = true,
    enableContrastChecking = true,
    enableTouchTargetValidation = true
  } = options;

  const accessibilityService = AccessibilityService.getInstance();
  
  // State
  const [settings, setSettings] = useState<AccessibilitySettings>(accessibilityService.getSettings());
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);

  // Initialize and setup listeners
  useEffect(() => {
    const initializeAccessibility = async () => {
      try {
        await accessibilityService.initialize();
        
        // Get initial system state
        const screenReaderEnabled = await accessibilityService.isScreenReaderEnabled();
        const reduceMotionEnabled = await accessibilityService.isReduceMotionEnabled();
        
        setIsScreenReaderEnabled(screenReaderEnabled);
        setIsReduceMotionEnabled(reduceMotionEnabled);
        setSettings(accessibilityService.getSettings());
      } catch (error) {
        console.error('Failed to initialize accessibility:', error);
      }
    };

    initializeAccessibility();

    // Setup system listeners
    const screenReaderListener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    const reduceMotionListener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReduceMotionEnabled
    );

    return () => {
      screenReaderListener?.remove();
      reduceMotionListener?.remove();
    };
  }, []);

  // Update settings
  const updateSettings = useCallback(async (newSettings: Partial<AccessibilitySettings>) => {
    try {
      await accessibilityService.updateSettings(newSettings);
      setSettings(accessibilityService.getSettings());
    } catch (error) {
      console.error('Failed to update accessibility settings:', error);
      throw error;
    }
  }, []);

  // Announce for accessibility
  const announceForAccessibility = useCallback((message: string) => {
    if (enableAutoAnnouncements) {
      accessibilityService.announceForAccessibility(message);
    }
  }, [enableAutoAnnouncements]);

  // Font size utilities
  const getAccessibleFontSize = useCallback((baseFontSize: number) => {
    return accessibilityService.getAccessibleFontSize(baseFontSize);
  }, [settings.customFontSize]);

  const getAccessibleLineHeight = useCallback((baseFontSize: number) => {
    return accessibilityService.getAccessibleLineHeight(baseFontSize);
  }, [settings.customFontSize, settings.customLineHeight]);

  const getAccessibleLetterSpacing = useCallback(() => {
    return accessibilityService.getAccessibleLetterSpacing();
  }, [settings.customLetterSpacing]);

  // Contrast checking
  const checkContrastRatio = useCallback((foreground: string, background: string) => {
    if (!enableContrastChecking) return 21; // Perfect contrast if checking disabled
    return accessibilityService.calculateContrastRatio(foreground, background);
  }, [enableContrastChecking]);

  const meetsContrastStandards = useCallback((
    foreground: string, 
    background: string, 
    isLargeText: boolean = false
  ) => {
    if (!enableContrastChecking) return true;
    return accessibilityService.meetsContrastStandards(foreground, background, isLargeText);
  }, [enableContrastChecking]);

  // Touch target validation
  const validateTouchTarget = useCallback((width: number, height: number) => {
    if (!enableTouchTargetValidation) return true;
    return accessibilityService.meetsTouchTargetStandards(width, height);
  }, [enableTouchTargetValidation]);

  // Props generation
  const generateAccessibilityProps = useCallback((options: {
    label?: string;
    hint?: string;
    role?: string;
    state?: { disabled?: boolean; selected?: boolean; expanded?: boolean };
    value?: { min?: number; max?: number; now?: number; text?: string };
    actions?: Array<{ name: string; label: string }>;
  }) => {
    return accessibilityService.generateAccessibilityProps(options);
  }, []);

  // Component audit
  const auditComponent = useCallback((componentProps: any, componentName: string) => {
    return accessibilityService.auditComponent(componentProps, componentName);
  }, []);

  return {
    settings,
    updateSettings,
    isScreenReaderEnabled,
    isReduceMotionEnabled,
    announceForAccessibility,
    getAccessibleFontSize,
    getAccessibleLineHeight,
    getAccessibleLetterSpacing,
    checkContrastRatio,
    meetsContrastStandards,
    validateTouchTarget,
    generateAccessibilityProps,
    auditComponent
  };
};

// Higher-order component for accessibility enhancement
export const withAccessibility = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  accessibilityOptions: {
    defaultLabel?: string;
    defaultRole?: string;
    announceOnMount?: string;
    validateProps?: boolean;
  } = {}
) => {
  return (props: P) => {
    const { 
      announceForAccessibility, 
      generateAccessibilityProps,
      auditComponent 
    } = useAccessibility();

    // Announce on mount if specified
    useEffect(() => {
      if (accessibilityOptions.announceOnMount) {
        announceForAccessibility(accessibilityOptions.announceOnMount);
      }
    }, []);

    // Validate props if enabled
    useEffect(() => {
      if (accessibilityOptions.validateProps) {
        const audit = auditComponent(props, WrappedComponent.displayName || 'Component');
        if (audit.issues.length > 0) {
          console.warn(`Accessibility issues found in ${WrappedComponent.displayName}:`, audit.issues);
        }
      }
    }, [props]);

    // Generate default accessibility props
    const defaultAccessibilityProps = useMemo(() => {
      return generateAccessibilityProps({
        label: accessibilityOptions.defaultLabel,
        role: accessibilityOptions.defaultRole
      });
    }, [accessibilityOptions.defaultLabel, accessibilityOptions.defaultRole]);

    // Merge props with accessibility enhancements
    const enhancedProps = {
      ...defaultAccessibilityProps,
      ...props
    };

    return <WrappedComponent {...enhancedProps} />;
  };
};

// Hook for accessible text styling
export const useAccessibleTextStyle = (baseStyle: any = {}) => {
  const { getAccessibleFontSize, getAccessibleLineHeight, getAccessibleLetterSpacing, settings } = useAccessibility();

  return useMemo(() => {
    const baseFontSize = baseStyle.fontSize || 16;
    
    return {
      ...baseStyle,
      fontSize: getAccessibleFontSize(baseFontSize),
      lineHeight: getAccessibleLineHeight(baseFontSize),
      letterSpacing: getAccessibleLetterSpacing(),
      fontWeight: settings.boldTextEnabled ? 'bold' : baseStyle.fontWeight,
    };
  }, [baseStyle, settings.boldTextEnabled, settings.customFontSize, settings.customLineHeight, settings.customLetterSpacing]);
};

// Hook for accessible colors
export const useAccessibleColors = (colorScheme: {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
}) => {
  const { settings, checkContrastRatio, meetsContrastStandards } = useAccessibility();

  return useMemo(() => {
    let colors = { ...colorScheme };

    // Apply high contrast if enabled
    if (settings.highContrastEnabled) {
      colors = {
        ...colors,
        primary: '#000000',
        secondary: '#FFFFFF',
        background: '#FFFFFF',
        text: '#000000',
        accent: '#0000FF'
      };
    }

    // Apply grayscale if enabled
    if (settings.grayscaleEnabled) {
      colors = Object.keys(colors).reduce((acc, key) => {
        acc[key] = convertToGrayscale(colors[key]);
        return acc;
      }, {} as any);
    }

    // Apply invert colors if enabled
    if (settings.invertColorsEnabled) {
      colors = Object.keys(colors).reduce((acc, key) => {
        acc[key] = invertColor(colors[key]);
        return acc;
      }, {} as any);
    }

    return colors;
  }, [colorScheme, settings.highContrastEnabled, settings.grayscaleEnabled, settings.invertColorsEnabled]);
};

// Hook for accessible animations
export const useAccessibleAnimation = (animationConfig: any) => {
  const { isReduceMotionEnabled, settings } = useAccessibility();

  return useMemo(() => {
    if (isReduceMotionEnabled || settings.reducedMotionEnabled) {
      // Disable or reduce animations
      return {
        ...animationConfig,
        duration: 0,
        useNativeDriver: false
      };
    }

    return animationConfig;
  }, [animationConfig, isReduceMotionEnabled, settings.reducedMotionEnabled]);
};

// Hook for focus management
export const useFocusManagement = () => {
  const { announceForAccessibility, isScreenReaderEnabled } = useAccessibility();

  const focusElement = useCallback((elementRef: any, announcement?: string) => {
    if (elementRef?.current) {
      if (Platform.OS === 'ios') {
        elementRef.current.focus();
      } else {
        // Android focus management
        elementRef.current.focus();
      }

      if (announcement && isScreenReaderEnabled) {
        // Delay announcement to ensure focus is set
        setTimeout(() => {
          announceForAccessibility(announcement);
        }, 100);
      }
    }
  }, [announceForAccessibility, isScreenReaderEnabled]);

  const setAccessibilityFocus = useCallback((elementRef: any) => {
    if (elementRef?.current && isScreenReaderEnabled) {
      AccessibilityInfo.setAccessibilityFocus(elementRef.current);
    }
  }, [isScreenReaderEnabled]);

  return {
    focusElement,
    setAccessibilityFocus
  };
};

// Utility functions
const convertToGrayscale = (color: string): string => {
  // Simple grayscale conversion - would need more sophisticated implementation
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const grayHex = gray.toString(16).padStart(2, '0');
  
  return `#${grayHex}${grayHex}${grayHex}`;
};

const invertColor = (color: string): string => {
  const hex = color.replace('#', '');
  const r = (255 - parseInt(hex.substr(0, 2), 16)).toString(16).padStart(2, '0');
  const g = (255 - parseInt(hex.substr(2, 2), 16)).toString(16).padStart(2, '0');
  const b = (255 - parseInt(hex.substr(4, 2), 16)).toString(16).padStart(2, '0');
  
  return `#${r}${g}${b}`;
};