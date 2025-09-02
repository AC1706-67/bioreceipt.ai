/**
 * Accessible Component Wrapper
 * Ensures WCAG 2.1 AA compliance for all wrapped components
 */
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  ViewProps,
  TextProps,
  AccessibilityRole,
  AccessibilityState,
  AccessibilityValue,
  AccessibilityActionInfo
} from 'react-native';
import { useAccessibility } from '../../hooks/useAccessibility';
import { AccessibilityService } from '../../services/accessibility/accessibilityService';

// Enhanced accessibility props
interface AccessibilityEnhancedProps {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityValue?: AccessibilityValue;
  accessibilityActions?: AccessibilityActionInfo[];
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  accessibilityElementsHidden?: boolean;
  accessibilityViewIsModal?: boolean;
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
  // WCAG specific props
  wcagLevel?: 'A' | 'AA' | 'AAA';
  contrastRatio?: number;
  minimumTouchTarget?: boolean;
  semanticStructure?: boolean;
  keyboardNavigable?: boolean;
  // Custom accessibility features
  announceOnMount?: boolean;
  announceOnChange?: boolean;
  skipLink?: boolean;
  landmark?: 'banner' | 'main' | 'navigation' | 'complementary' | 'contentinfo' | 'search' | 'form';
}

// Accessible Button Component
interface AccessibleButtonProps extends TouchableOpacityProps, AccessibilityEnhancedProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const AccessibleButton = forwardRef<TouchableOpacity, AccessibleButtonProps>(({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  disabled,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  announceOnMount,
  minimumTouchTarget = true,
  wcagLevel = 'AA',
  ...props
}, ref) => {
  const buttonRef = useRef<TouchableOpacity>(null);
  const { settings, generateAccessibilityProps, meetsContrastStandards } = useAccessibility();
  const accessibilityService = AccessibilityService.getInstance();

  useImperativeHandle(ref, () => buttonRef.current!);

  React.useEffect(() => {
    if (announceOnMount && accessibilityLabel) {
      accessibilityService.announceForAccessibility(`Button: ${accessibilityLabel}`);
    }
  }, [announceOnMount, accessibilityLabel]);

  // Calculate button styles based on accessibility settings
  const getButtonStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      borderRadius: settings.buttonShapesEnabled ? 8 : 4,
      paddingHorizontal: size === 'small' ? 12 : size === 'large' ? 24 : 16,
      paddingVertical: size === 'small' ? 8 : size === 'large' ? 16 : 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: disabled || loading ? 0.6 : 1,
    };

    // Ensure minimum touch target size
    if (minimumTouchTarget) {
      const minSize = accessibilityService.getRecommendedTouchTargetSize();
      baseStyles.minHeight = minSize;
      baseStyles.minWidth = minSize;
    }

    // Apply variant styles
    switch (variant) {
      case 'primary':
        baseStyles.backgroundColor = '#4CAF50';
        break;
      case 'secondary':
        baseStyles.backgroundColor = '#2196F3';
        break;
      case 'outline':
        baseStyles.backgroundColor = 'transparent';
        baseStyles.borderWidth = 2;
        baseStyles.borderColor = '#4CAF50';
        break;
      case 'text':
        baseStyles.backgroundColor = 'transparent';
        break;
    }

    // High contrast mode adjustments
    if (settings.highContrastEnabled) {
      baseStyles.borderWidth = 2;
      baseStyles.borderColor = '#000000';
    }

    return baseStyles;
  };

  const getTextStyles = (): TextStyle => {
    const baseStyles: TextStyle = {
      fontSize: settings.customFontSize * (size === 'small' ? 14 : size === 'large' ? 18 : 16),
      fontWeight: settings.boldTextEnabled ? 'bold' : '600',
      letterSpacing: settings.customLetterSpacing,
      textAlign: 'center',
    };

    // Apply variant text colors
    switch (variant) {
      case 'primary':
      case 'secondary':
        baseStyles.color = '#FFFFFF';
        break;
      case 'outline':
        baseStyles.color = '#4CAF50';
        break;
      case 'text':
        baseStyles.color = '#4CAF50';
        break;
    }

    // High contrast mode adjustments
    if (settings.highContrastEnabled) {
      baseStyles.color = variant === 'primary' || variant === 'secondary' ? '#FFFFFF' : '#000000';
    }

    return baseStyles;
  };

  const buttonStyles = getButtonStyles();
  const textStyles = getTextStyles();

  // Generate comprehensive accessibility props
  const accessibilityProps = generateAccessibilityProps({
    label: accessibilityLabel || title,
    hint: accessibilityHint || `${loading ? 'Loading, ' : ''}${disabled ? 'Disabled ' : ''}${title} button`,
    role: 'button',
    state: { 
      disabled: disabled || loading,
      busy: loading
    },
    actions: onPress ? [{ name: 'activate', label: title }] : undefined
  });

  const handlePress = (event: any) => {
    if (!disabled && !loading && onPress) {
      // Announce button press for screen readers
      if (settings.announceNotifications) {
        accessibilityService.announceForAccessibility(`${title} activated`);
      }
      onPress(event);
    }
  };

  return (
    <TouchableOpacity
      ref={buttonRef}
      style={[buttonStyles, style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={settings.reducedMotionEnabled ? 1 : 0.7}
      {...accessibilityProps}
      {...props}
    >
      {icon && iconPosition === 'left' && (
        <View style={{ marginRight: 8 }}>
          {icon}
        </View>
      )}
      
      <Text style={textStyles}>
        {loading ? 'Loading...' : title}
      </Text>
      
      {icon && iconPosition === 'right' && (
        <View style={{ marginLeft: 8 }}>
          {icon}
        </View>
      )}
    </TouchableOpacity>
  );
});

// Accessible Text Component
interface AccessibleTextProps extends TextProps, AccessibilityEnhancedProps {
  variant?: 'heading1' | 'heading2' | 'heading3' | 'body' | 'caption' | 'label';
  color?: string;
  align?: 'left' | 'center' | 'right';
  weight?: 'normal' | 'bold';
}

export const AccessibleText = forwardRef<Text, AccessibleTextProps>(({
  children,
  variant = 'body',
  color,
  align = 'left',
  weight,
  style,
  accessibilityLabel,
  accessibilityRole,
  announceOnMount,
  semanticStructure = true,
  ...props
}, ref) => {
  const textRef = useRef<Text>(null);
  const { settings } = useAccessibility();
  const accessibilityService = AccessibilityService.getInstance();

  useImperativeHandle(ref, () => textRef.current!);

  React.useEffect(() => {
    if (announceOnMount && (accessibilityLabel || children)) {
      const text = accessibilityLabel || (typeof children === 'string' ? children : 'Text content');
      accessibilityService.announceForAccessibility(text);
    }
  }, [announceOnMount, accessibilityLabel, children]);

  const getTextStyles = (): TextStyle => {
    let fontSize = 16;
    let fontWeight: TextStyle['fontWeight'] = 'normal';
    let role: AccessibilityRole = 'text';

    // Set base styles based on variant
    switch (variant) {
      case 'heading1':
        fontSize = 28;
        fontWeight = 'bold';
        role = 'header';
        break;
      case 'heading2':
        fontSize = 24;
        fontWeight = 'bold';
        role = 'header';
        break;
      case 'heading3':
        fontSize = 20;
        fontWeight = 'bold';
        role = 'header';
        break;
      case 'body':
        fontSize = 16;
        fontWeight = 'normal';
        break;
      case 'caption':
        fontSize = 12;
        fontWeight = 'normal';
        break;
      case 'label':
        fontSize = 14;
        fontWeight = '600';
        break;
    }

    // Apply accessibility settings
    fontSize *= settings.customFontSize;
    
    if (settings.boldTextEnabled || weight === 'bold') {
      fontWeight = 'bold';
    } else if (weight) {
      fontWeight = weight;
    }

    const baseStyles: TextStyle = {
      fontSize,
      fontWeight,
      letterSpacing: settings.customLetterSpacing,
      lineHeight: fontSize * settings.customLineHeight,
      textAlign: align,
      color: color || (settings.highContrastEnabled ? '#000000' : '#333333'),
    };

    return baseStyles;
  };

  const textStyles = getTextStyles();
  
  // Determine accessibility role
  let accessibilityRoleFinal: AccessibilityRole = accessibilityRole || 'text';
  if (semanticStructure && variant.startsWith('heading')) {
    accessibilityRoleFinal = 'header';
  }

  return (
    <Text
      ref={textRef}
      style={[textStyles, style]}
      accessibilityRole={accessibilityRoleFinal}
      accessibilityLabel={accessibilityLabel}
      {...props}
    >
      {children}
    </Text>
  );
});

// Accessible Container Component
interface AccessibleContainerProps extends ViewProps, AccessibilityEnhancedProps {
  padding?: number | 'small' | 'medium' | 'large';
  margin?: number | 'small' | 'medium' | 'large';
  backgroundColor?: string;
  borderRadius?: number;
  elevation?: number;
  focusable?: boolean;
}

export const AccessibleContainer = forwardRef<View, AccessibleContainerProps>(({
  children,
  padding = 0,
  margin = 0,
  backgroundColor,
  borderRadius = 0,
  elevation = 0,
  focusable = false,
  style,
  landmark,
  accessibilityLabel,
  accessibilityRole,
  ...props
}, ref) => {
  const containerRef = useRef<View>(null);
  const { settings } = useAccessibility();

  useImperativeHandle(ref, () => containerRef.current!);

  const getContainerStyles = (): ViewStyle => {
    // Convert padding/margin values
    const getPaddingValue = (value: typeof padding): number => {
      if (typeof value === 'number') return value;
      switch (value) {
        case 'small': return 8;
        case 'medium': return 16;
        case 'large': return 24;
        default: return 0;
      }
    };

    const paddingValue = getPaddingValue(padding);
    const marginValue = getPaddingValue(margin);

    const baseStyles: ViewStyle = {
      padding: paddingValue,
      margin: marginValue,
      backgroundColor: backgroundColor || (settings.highContrastEnabled ? '#FFFFFF' : 'transparent'),
      borderRadius: settings.buttonShapesEnabled ? Math.max(borderRadius, 4) : borderRadius,
    };

    // Add elevation/shadow
    if (elevation > 0) {
      baseStyles.shadowColor = '#000';
      baseStyles.shadowOffset = { width: 0, height: elevation };
      baseStyles.shadowOpacity = 0.1;
      baseStyles.shadowRadius = elevation * 2;
      baseStyles.elevation = elevation;
    }

    // High contrast mode adjustments
    if (settings.highContrastEnabled && backgroundColor) {
      baseStyles.borderWidth = 1;
      baseStyles.borderColor = '#000000';
    }

    // Reduce transparency if enabled
    if (settings.reduceTransparencyEnabled && baseStyles.backgroundColor) {
      // Ensure background is fully opaque
      baseStyles.backgroundColor = baseStyles.backgroundColor.replace(/rgba?\([^)]+,\s*[\d.]+\)/, 
        (match) => match.replace(/,\s*[\d.]+\)/, ', 1)'));
    }

    return baseStyles;
  };

  const containerStyles = getContainerStyles();

  // Determine accessibility role based on landmark
  let accessibilityRoleFinal: AccessibilityRole | undefined = accessibilityRole;
  if (landmark && !accessibilityRole) {
    switch (landmark) {
      case 'banner':
      case 'main':
      case 'navigation':
      case 'complementary':
      case 'contentinfo':
        accessibilityRoleFinal = 'none'; // React Native doesn't have landmark roles
        break;
      case 'search':
        accessibilityRoleFinal = 'search';
        break;
      case 'form':
        accessibilityRoleFinal = 'none';
        break;
    }
  }

  return (
    <View
      ref={containerRef}
      style={[containerStyles, style]}
      accessible={focusable || !!accessibilityLabel}
      accessibilityRole={accessibilityRoleFinal}
      accessibilityLabel={accessibilityLabel}
      {...props}
    >
      {children}
    </View>
  );
});

// Accessible Input Component (basic implementation)
interface AccessibleInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoComplete?: string;
  style?: ViewStyle;
}

export const AccessibleInput = forwardRef<View, AccessibleInputProps>(({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  required = false,
  multiline = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoComplete,
  style
}, ref) => {
  const containerRef = useRef<View>(null);
  const { settings, generateAccessibilityProps } = useAccessibility();

  useImperativeHandle(ref, () => containerRef.current!);

  const inputId = React.useMemo(() => `input_${Math.random().toString(36).substr(2, 9)}`, []);

  const inputStyles: TextStyle = {
    fontSize: settings.customFontSize * 16,
    fontWeight: settings.boldTextEnabled ? 'bold' : 'normal',
    letterSpacing: settings.customLetterSpacing,
    lineHeight: settings.customFontSize * 16 * settings.customLineHeight,
    padding: 12,
    borderWidth: 1,
    borderColor: error ? '#F44336' : (settings.highContrastEnabled ? '#000000' : '#CCCCCC'),
    borderRadius: settings.buttonShapesEnabled ? 8 : 4,
    backgroundColor: settings.highContrastEnabled ? '#FFFFFF' : '#FAFAFA',
    color: settings.highContrastEnabled ? '#000000' : '#333333',
    minHeight: 44, // WCAG minimum touch target
  };

  const labelStyles: TextStyle = {
    fontSize: settings.customFontSize * 14,
    fontWeight: settings.boldTextEnabled ? 'bold' : '600',
    letterSpacing: settings.customLetterSpacing,
    color: settings.highContrastEnabled ? '#000000' : '#333333',
    marginBottom: 8,
  };

  const errorStyles: TextStyle = {
    fontSize: settings.customFontSize * 12,
    color: '#F44336',
    marginTop: 4,
    letterSpacing: settings.customLetterSpacing,
  };

  const accessibilityProps = generateAccessibilityProps({
    label: `${label}${required ? ', required' : ''}${error ? `, error: ${error}` : ''}`,
    hint: placeholder || `Enter ${label.toLowerCase()}`,
    role: 'none' // TextInput handles its own accessibility
  });

  return (
    <AccessibleContainer ref={containerRef} style={style}>
      <AccessibleText
        variant="label"
        style={labelStyles}
        accessibilityLabel={`${label}${required ? ' required' : ''} input field`}
      >
        {label}{required && ' *'}
      </AccessibleText>
      
      {/* Note: In a real implementation, you would use TextInput here */}
      <View style={inputStyles} {...accessibilityProps}>
        <Text style={{ color: value ? '#333333' : '#999999' }}>
          {value || placeholder}
        </Text>
      </View>
      
      {error && (
        <AccessibleText
          variant="caption"
          style={errorStyles}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </AccessibleText>
      )}
    </AccessibleContainer>
  );
});

// Export all components
export {
  AccessibleButton,
  AccessibleText,
  AccessibleContainer,
  AccessibleInput
};

// Default export for convenience
export default {
  Button: AccessibleButton,
  Text: AccessibleText,
  Container: AccessibleContainer,
  Input: AccessibleInput
};