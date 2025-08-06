/**
 * Accessibility Utilities
 * Helper functions and constants for WCAG 2.1 AA compliance
 */

import { AccessibilityRole, AccessibilityState } from 'react-native';

// WCAG 2.1 AA Color Contrast Requirements
export const CONTRAST_RATIOS = {
  NORMAL_TEXT: 4.5, // 14pt and above
  LARGE_TEXT: 3.0,  // 18pt+ or 14pt+ bold
  UI_COMPONENTS: 3.0, // Non-text elements like buttons, form controls
} as const;

// Common accessibility roles for our app
export const ACCESSIBILITY_ROLES = {
  BUTTON: 'button' as AccessibilityRole,
  LINK: 'link' as AccessibilityRole,
  TEXT: 'text' as AccessibilityRole,
  HEADER: 'header' as AccessibilityRole,
  IMAGE: 'image' as AccessibilityRole,
  IMAGEBUTTON: 'imagebutton' as AccessibilityRole,
  SEARCH: 'search' as AccessibilityRole,
  TEXTINPUT: 'none' as AccessibilityRole, // React Native uses 'none' for TextInput
  SWITCH: 'switch' as AccessibilityRole,
  CHECKBOX: 'checkbox' as AccessibilityRole,
  RADIO: 'radio' as AccessibilityRole,
  TAB: 'tab' as AccessibilityRole,
  TABLIST: 'tablist' as AccessibilityRole,
  LIST: 'list' as AccessibilityRole,
  LISTITEM: 'listitem' as AccessibilityRole,
  GRID: 'grid' as AccessibilityRole,
  CELL: 'cell' as AccessibilityRole,
  GROUP: 'group' as AccessibilityRole,
  ALERT: 'alert' as AccessibilityRole,
  PROGRESSBAR: 'progressbar' as AccessibilityRole,
  SLIDER: 'slider' as AccessibilityRole,
  MENU: 'menu' as AccessibilityRole,
  MENUITEM: 'menuitem' as AccessibilityRole,
} as const;

// Accessibility traits for iOS (mapped to roles for cross-platform compatibility)
export const ACCESSIBILITY_TRAITS = {
  ADJUSTABLE: 'adjustable',
  ALLOWS_DIRECT_INTERACTION: 'allowsDirectInteraction',
  BUTTON: 'button',
  DISABLED: 'disabled',
  HEADER: 'header',
  IMAGE: 'image',
  KEYBOARD_KEY: 'keyboardKey',
  LINK: 'link',
  NONE: 'none',
  PLAYS_SOUND: 'playsSound',
  SEARCH_FIELD: 'searchField',
  SELECTED: 'selected',
  STARTS_MEDIA_SESSION: 'startsMediaSession',
  SUMMARY_ELEMENT: 'summaryElement',
  TEXT: 'text',
  UPDATES_FREQUENTLY: 'updatesFrequently',
} as const;

/**
 * Interface for accessibility props that can be spread onto components
 */
export interface AccessibilityProps {
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
  accessibilityActions?: Array<{
    name: string;
    label?: string;
  }>;
  onAccessibilityAction?: (event: { nativeEvent: { actionName: string } }) => void;
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  accessibilityElementsHidden?: boolean;
  accessibilityViewIsModal?: boolean;
}

/**
 * Create accessibility props for buttons
 */
export function createButtonAccessibility(
  label: string,
  hint?: string,
  state?: AccessibilityState
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.BUTTON,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: state,
  };
}

/**
 * Create accessibility props for text inputs
 */
export function createTextInputAccessibility(
  label: string,
  hint?: string,
  required?: boolean,
  invalid?: boolean
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: {
      disabled: false,
      ...(required && { required: true }),
    },
    accessibilityLiveRegion: invalid ? 'assertive' : 'none',
  };
}

/**
 * Create accessibility props for images
 */
export function createImageAccessibility(
  label: string,
  decorative: boolean = false
): AccessibilityProps {
  if (decorative) {
    return {
      accessible: false,
      accessibilityElementsHidden: true,
    };
  }

  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.IMAGE,
    accessibilityLabel: label,
  };
}

/**
 * Create accessibility props for headers
 */
export function createHeaderAccessibility(
  label: string,
  level?: number
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.HEADER,
    accessibilityLabel: level ? `${label}, heading level ${level}` : label,
  };
}

/**
 * Create accessibility props for links
 */
export function createLinkAccessibility(
  label: string,
  hint?: string
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.LINK,
    accessibilityLabel: label,
    accessibilityHint: hint || 'Double tap to open',
  };
}

/**
 * Create accessibility props for switches/toggles
 */
export function createSwitchAccessibility(
  label: string,
  value: boolean,
  hint?: string
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.SWITCH,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: {
      checked: value,
    },
    accessibilityValue: {
      text: value ? 'On' : 'Off',
    },
  };
}

/**
 * Create accessibility props for progress indicators
 */
export function createProgressAccessibility(
  label: string,
  value: number,
  min: number = 0,
  max: number = 100
): AccessibilityProps {
  const percentage = Math.round(((value - min) / (max - min)) * 100);
  
  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.PROGRESSBAR,
    accessibilityLabel: label,
    accessibilityValue: {
      min,
      max,
      now: value,
      text: `${percentage} percent`,
    },
  };
}

/**
 * Create accessibility props for lists
 */
export function createListAccessibility(
  label: string,
  itemCount?: number
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.LIST,
    accessibilityLabel: itemCount 
      ? `${label}, ${itemCount} items`
      : label,
  };
}

/**
 * Create accessibility props for list items
 */
export function createListItemAccessibility(
  label: string,
  index?: number,
  total?: number,
  hint?: string
): AccessibilityProps {
  const positionInfo = (index !== undefined && total !== undefined) 
    ? `, ${index + 1} of ${total}`
    : '';

  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.LISTITEM,
    accessibilityLabel: `${label}${positionInfo}`,
    accessibilityHint: hint,
  };
}

/**
 * Create accessibility props for alerts/notifications
 */
export function createAlertAccessibility(
  message: string,
  type: 'info' | 'warning' | 'error' | 'success' = 'info'
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.ALERT,
    accessibilityLabel: `${type} alert: ${message}`,
    accessibilityLiveRegion: type === 'error' ? 'assertive' : 'polite',
    importantForAccessibility: 'yes',
  };
}

/**
 * Create accessibility props for tab navigation
 */
export function createTabAccessibility(
  label: string,
  selected: boolean,
  index: number,
  total: number
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.TAB,
    accessibilityLabel: `${label}, tab ${index + 1} of ${total}`,
    accessibilityState: {
      selected,
    },
    accessibilityHint: selected ? 'Currently selected' : 'Double tap to select',
  };
}

/**
 * Utility to calculate color contrast ratio
 * Based on WCAG 2.1 guidelines
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  // This is a simplified version - in a real app you'd use a proper color library
  // For now, return a mock value that indicates if colors meet WCAG standards
  
  // Convert hex colors to RGB (simplified)
  const getRGB = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };

  // Calculate relative luminance (simplified)
  const getLuminance = (rgb: { r: number; g: number; b: number }) => {
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  try {
    const rgb1 = getRGB(color1);
    const rgb2 = getRGB(color2);
    const lum1 = getLuminance(rgb1);
    const lum2 = getLuminance(rgb2);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  } catch (error) {
    console.warn('Error calculating contrast ratio:', error);
    return 1; // Return failing ratio if calculation fails
  }
}

/**
 * Check if color combination meets WCAG contrast requirements
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: 'normal' | 'large' | 'ui' = 'normal'
): boolean {
  const ratio = calculateContrastRatio(foreground, background);
  const requirement = level === 'normal' 
    ? CONTRAST_RATIOS.NORMAL_TEXT
    : level === 'large'
    ? CONTRAST_RATIOS.LARGE_TEXT
    : CONTRAST_RATIOS.UI_COMPONENTS;
    
  return ratio >= requirement;
}

/**
 * Accessibility audit utility for development
 */
export interface AccessibilityAuditResult {
  component: string;
  issues: Array<{
    type: 'missing_label' | 'missing_role' | 'poor_contrast' | 'missing_hint' | 'focus_issue';
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion: string;
  }>;
  score: number; // 0-100
}

/**
 * Audit a component's accessibility props
 */
export function auditAccessibility(
  componentName: string,
  props: any,
  children?: any
): AccessibilityAuditResult {
  const issues: AccessibilityAuditResult['issues'] = [];

  // Check for interactive elements without accessibility labels
  if (props.onPress && !props.accessibilityLabel) {
    issues.push({
      type: 'missing_label',
      severity: 'error',
      message: 'Interactive element missing accessibilityLabel',
      suggestion: 'Add accessibilityLabel prop with descriptive text',
    });
  }

  // Check for missing accessibility roles
  if (props.onPress && !props.accessibilityRole) {
    issues.push({
      type: 'missing_role',
      severity: 'warning',
      message: 'Interactive element missing accessibilityRole',
      suggestion: 'Add accessibilityRole="button" or appropriate role',
    });
  }

  // Check for images without labels
  if (componentName.toLowerCase().includes('image') && !props.accessibilityLabel && props.accessible !== false) {
    issues.push({
      type: 'missing_label',
      severity: 'error',
      message: 'Image missing accessibilityLabel',
      suggestion: 'Add descriptive accessibilityLabel or set accessible={false} for decorative images',
    });
  }

  // Check for complex controls without hints
  if (props.accessibilityRole === 'slider' && !props.accessibilityHint) {
    issues.push({
      type: 'missing_hint',
      severity: 'info',
      message: 'Slider missing accessibilityHint',
      suggestion: 'Add accessibilityHint to explain how to use the slider',
    });
  }

  // Calculate score based on issues
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;
  
  const score = Math.max(0, 100 - (errorCount * 30) - (warningCount * 15) - (infoCount * 5));

  return {
    component: componentName,
    issues,
    score,
  };
}

/**
 * Screen reader announcement utility
 */
export function announceForAccessibility(message: string, priority: 'polite' | 'assertive' = 'polite') {
  // In React Native, you would use AccessibilityInfo.announceForAccessibility
  // For now, we'll log it for development
  console.log(`[Accessibility Announcement - ${priority}]: ${message}`);
}

/**
 * Focus management utility
 */
export function setAccessibilityFocus(ref: any) {
  // In React Native, you would use AccessibilityInfo.setAccessibilityFocus
  // For now, we'll log it for development
  if (ref?.current) {
    console.log('[Accessibility Focus]: Setting focus to element');
    // ref.current.focus(); // For web compatibility
  }
}

/**
 * Dynamic text size support
 */
export function getScaledFontSize(baseFontSize: number, maxScale: number = 2.0): number {
  // In a real app, you'd get the system font scale
  // For now, return the base size
  const fontScale = 1.0; // Would get from PixelRatio.getFontScale() or similar
  return Math.min(baseFontSize * fontScale, baseFontSize * maxScale);
}

/**
 * Accessibility preferences
 */
export interface AccessibilityPreferences {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReaderEnabled: boolean;
  voiceOverEnabled: boolean; // iOS
  talkBackEnabled: boolean;  // Android
}

/**
 * Get current accessibility preferences
 */
export async function getAccessibilityPreferences(): Promise<AccessibilityPreferences> {
  // In a real app, you'd check system accessibility settings
  // For now, return default values
  return {
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    screenReaderEnabled: false,
    voiceOverEnabled: false,
    talkBackEnabled: false,
  };
}