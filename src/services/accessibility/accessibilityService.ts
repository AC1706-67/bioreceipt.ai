/**
 * Accessibility Service
 * Comprehensive accessibility support and compliance system
 */
import { AccessibilityInfo, Dimensions, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuditLogService } from '../compliance/auditLogService';

// Accessibility Settings Interface
export interface AccessibilitySettings {
  screenReaderEnabled: boolean;
  highContrastEnabled: boolean;
  largeTextEnabled: boolean;
  reducedMotionEnabled: boolean;
  voiceOverEnabled: boolean;
  switchControlEnabled: boolean;
  boldTextEnabled: boolean;
  buttonShapesEnabled: boolean;
  grayscaleEnabled: boolean;
  invertColorsEnabled: boolean;
  reduceTransparencyEnabled: boolean;
  announceNotifications: boolean;
  customFontSize: number; // 1.0 = normal, 1.5 = 150%, etc.
  customLineHeight: number;
  customLetterSpacing: number;
}

// Color Contrast Standards
export interface ColorContrastStandards {
  normalTextMinimum: number; // 4.5:1 for WCAG AA
  largeTextMinimum: number; // 3:1 for WCAG AA
  graphicalObjectsMinimum: number; // 3:1 for WCAG AA
  enhancedNormalText: number; // 7:1 for WCAG AAA
  enhancedLargeText: number; // 4.5:1 for WCAG AAA
}

// Accessibility Audit Result
export interface AccessibilityAuditResult {
  componentName: string;
  issues: AccessibilityIssue[];
  score: number; // 0-100
  wcagLevel: 'A' | 'AA' | 'AAA' | 'FAIL';
  recommendations: string[];
}

// Accessibility Issue
export interface AccessibilityIssue {
  type: 'contrast' | 'label' | 'focus' | 'structure' | 'interaction' | 'content';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  element?: string;
  recommendation: string;
  wcagReference: string;
}

// Touch Target Standards
export interface TouchTargetStandards {
  minimumSize: number; // 44pt minimum for iOS, 48dp for Android
  minimumSpacing: number; // 8pt minimum spacing
  recommendedSize: number; // 48pt recommended
}

export class AccessibilityService {
  private static instance: AccessibilityService;
  private auditLogService: AuditLogService;
  private settings: AccessibilitySettings;
  private contrastStandards: ColorContrastStandards;
  private touchTargetStandards: TouchTargetStandards;
  private screenDimensions: { width: number; height: number };

  private constructor() {
    this.auditLogService = AuditLogService.getInstance();
    this.screenDimensions = Dimensions.get('window');
    
    // Initialize default settings
    this.settings = {
      screenReaderEnabled: false,
      highContrastEnabled: false,
      largeTextEnabled: false,
      reducedMotionEnabled: false,
      voiceOverEnabled: false,
      switchControlEnabled: false,
      boldTextEnabled: false,
      buttonShapesEnabled: false,
      grayscaleEnabled: false,
      invertColorsEnabled: false,
      reduceTransparencyEnabled: false,
      announceNotifications: true,
      customFontSize: 1.0,
      customLineHeight: 1.2,
      customLetterSpacing: 0
    };

    // WCAG 2.1 AA Standards
    this.contrastStandards = {
      normalTextMinimum: 4.5,
      largeTextMinimum: 3.0,
      graphicalObjectsMinimum: 3.0,
      enhancedNormalText: 7.0,
      enhancedLargeText: 4.5
    };

    // Touch target standards
    this.touchTargetStandards = {
      minimumSize: Platform.OS === 'ios' ? 44 : 48,
      minimumSpacing: 8,
      recommendedSize: 48
    };
  }

  public static getInstance(): AccessibilityService {
    if (!AccessibilityService.instance) {
      AccessibilityService.instance = new AccessibilityService();
    }
    return AccessibilityService.instance;
  }

  /**
   * Initialize accessibility service
   */
  public async initialize(): Promise<void> {
    try {
      // Load saved settings
      await this.loadSettings();

      // Detect system accessibility settings
      await this.detectSystemAccessibilitySettings();

      // Set up accessibility listeners
      this.setupAccessibilityListeners();

      // Log initialization
      await this.auditLogService.logDataAccess({
        userId: 'system',
        action: 'ACCESSIBILITY_SERVICE_INITIALIZED',
        resourceType: 'ACCESSIBILITY_SERVICE',
        resourceId: 'initialization',
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          settings: this.settings,
          platform: Platform.OS
        }
      });

      console.log('Accessibility service initialized');
    } catch (error) {
      console.error('Failed to initialize accessibility service:', error);
      throw error;
    }
  }

  /**
   * Get current accessibility settings
   */
  public getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  /**
   * Update accessibility settings
   */
  public async updateSettings(newSettings: Partial<AccessibilitySettings>): Promise<void> {
    try {
      const previousSettings = { ...this.settings };
      this.settings = { ...this.settings, ...newSettings };

      // Save to storage
      await this.saveSettings();

      // Log settings change
      await this.auditLogService.logDataAccess({
        userId: 'user',
        action: 'ACCESSIBILITY_SETTINGS_UPDATED',
        resourceType: 'ACCESSIBILITY_SETTINGS',
        resourceId: 'user_settings',
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          previousSettings,
          newSettings: this.settings,
          changedFields: Object.keys(newSettings)
        }
      });

      console.log('Accessibility settings updated:', newSettings);
    } catch (error) {
      console.error('Failed to update accessibility settings:', error);
      throw error;
    }
  }

  /**
   * Check if screen reader is enabled
   */
  public async isScreenReaderEnabled(): Promise<boolean> {
    try {
      const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      this.settings.screenReaderEnabled = isEnabled;
      return isEnabled;
    } catch (error) {
      console.error('Failed to check screen reader status:', error);
      return false;
    }
  }

  /**
   * Check if reduce motion is enabled
   */
  public async isReduceMotionEnabled(): Promise<boolean> {
    try {
      const isEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      this.settings.reducedMotionEnabled = isEnabled;
      return isEnabled;
    } catch (error) {
      console.error('Failed to check reduce motion status:', error);
      return false;
    }
  }

  /**
   * Announce message to screen reader
   */
  public announceForAccessibility(message: string): void {
    try {
      if (this.settings.screenReaderEnabled || this.settings.announceNotifications) {
        AccessibilityInfo.announceForAccessibility(message);
      }
    } catch (error) {
      console.error('Failed to announce for accessibility:', error);
    }
  }

  /**
   * Calculate color contrast ratio
   */
  public calculateContrastRatio(foreground: string, background: string): number {
    try {
      const fgLuminance = this.calculateLuminance(foreground);
      const bgLuminance = this.calculateLuminance(background);
      
      const lighter = Math.max(fgLuminance, bgLuminance);
      const darker = Math.min(fgLuminance, bgLuminance);
      
      return (lighter + 0.05) / (darker + 0.05);
    } catch (error) {
      console.error('Failed to calculate contrast ratio:', error);
      return 1; // Worst case scenario
    }
  }

  /**
   * Check if color combination meets WCAG standards
   */
  public meetsContrastStandards(
    foreground: string, 
    background: string, 
    isLargeText: boolean = false,
    level: 'AA' | 'AAA' = 'AA'
  ): boolean {
    const ratio = this.calculateContrastRatio(foreground, background);
    
    if (level === 'AAA') {
      return isLargeText ? 
        ratio >= this.contrastStandards.enhancedLargeText : 
        ratio >= this.contrastStandards.enhancedNormalText;
    } else {
      return isLargeText ? 
        ratio >= this.contrastStandards.largeTextMinimum : 
        ratio >= this.contrastStandards.normalTextMinimum;
    }
  }

  /**
   * Get accessible font size based on user preferences
   */
  public getAccessibleFontSize(baseFontSize: number): number {
    return baseFontSize * this.settings.customFontSize;
  }

  /**
   * Get accessible line height based on user preferences
   */
  public getAccessibleLineHeight(baseFontSize: number): number {
    return this.getAccessibleFontSize(baseFontSize) * this.settings.customLineHeight;
  }

  /**
   * Get accessible letter spacing
   */
  public getAccessibleLetterSpacing(): number {
    return this.settings.customLetterSpacing;
  }

  /**
   * Check if touch target meets minimum size requirements
   */
  public meetsTouchTargetStandards(width: number, height: number): boolean {
    const minSize = this.touchTargetStandards.minimumSize;
    return width >= minSize && height >= minSize;
  }

  /**
   * Get recommended touch target size
   */
  public getRecommendedTouchTargetSize(): number {
    return this.touchTargetStandards.recommendedSize;
  }

  /**
   * Generate accessibility props for components
   */
  public generateAccessibilityProps(options: {
    label?: string;
    hint?: string;
    role?: string;
    state?: { disabled?: boolean; selected?: boolean; expanded?: boolean };
    value?: { min?: number; max?: number; now?: number; text?: string };
    actions?: Array<{ name: string; label: string }>;
  }) {
    const props: any = {};

    if (options.label) {
      props.accessibilityLabel = options.label;
    }

    if (options.hint) {
      props.accessibilityHint = options.hint;
    }

    if (options.role) {
      props.accessibilityRole = options.role;
    }

    if (options.state) {
      props.accessibilityState = options.state;
    }

    if (options.value) {
      props.accessibilityValue = options.value;
    }

    if (options.actions) {
      props.accessibilityActions = options.actions;
    }

    return props;
  }

  /**
   * Audit component for accessibility compliance
   */
  public auditComponent(componentProps: any, componentName: string): AccessibilityAuditResult {
    const issues: AccessibilityIssue[] = [];
    let score = 100;

    // Check for accessibility label
    if (!componentProps.accessibilityLabel && !componentProps.children) {
      issues.push({
        type: 'label',
        severity: 'high',
        description: 'Component lacks accessibility label',
        element: componentName,
        recommendation: 'Add accessibilityLabel prop or ensure meaningful text content',
        wcagReference: 'WCAG 2.1 - 4.1.2 Name, Role, Value'
      });
      score -= 20;
    }

    // Check for proper role
    if (componentProps.onPress && !componentProps.accessibilityRole) {
      issues.push({
        type: 'structure',
        severity: 'medium',
        description: 'Interactive component lacks accessibility role',
        element: componentName,
        recommendation: 'Add accessibilityRole="button" for pressable components',
        wcagReference: 'WCAG 2.1 - 4.1.2 Name, Role, Value'
      });
      score -= 10;
    }

    // Check touch target size
    if (componentProps.style) {
      const width = componentProps.style.width || 0;
      const height = componentProps.style.height || 0;
      
      if (componentProps.onPress && !this.meetsTouchTargetStandards(width, height)) {
        issues.push({
          type: 'interaction',
          severity: 'medium',
          description: 'Touch target too small',
          element: componentName,
          recommendation: `Increase size to at least ${this.touchTargetStandards.minimumSize}pt`,
          wcagReference: 'WCAG 2.1 - 2.5.5 Target Size'
        });
        score -= 15;
      }
    }

    // Check color contrast (simplified - would need actual color values)
    if (componentProps.style?.color && componentProps.style?.backgroundColor) {
      const contrastRatio = this.calculateContrastRatio(
        componentProps.style.color,
        componentProps.style.backgroundColor
      );
      
      if (contrastRatio < this.contrastStandards.normalTextMinimum) {
        issues.push({
          type: 'contrast',
          severity: 'high',
          description: 'Insufficient color contrast',
          element: componentName,
          recommendation: 'Increase contrast ratio to at least 4.5:1',
          wcagReference: 'WCAG 2.1 - 1.4.3 Contrast (Minimum)'
        });
        score -= 25;
      }
    }

    // Determine WCAG level
    let wcagLevel: 'A' | 'AA' | 'AAA' | 'FAIL';
    if (score >= 95) wcagLevel = 'AAA';
    else if (score >= 80) wcagLevel = 'AA';
    else if (score >= 60) wcagLevel = 'A';
    else wcagLevel = 'FAIL';

    const recommendations = this.generateRecommendations(issues);

    return {
      componentName,
      issues,
      score,
      wcagLevel,
      recommendations
    };
  }

  /**
   * Generate comprehensive accessibility report
   */
  public async generateAccessibilityReport(components: Array<{ name: string; props: any }>): Promise<{
    overallScore: number;
    wcagLevel: 'A' | 'AA' | 'AAA' | 'FAIL';
    componentResults: AccessibilityAuditResult[];
    summary: {
      totalIssues: number;
      criticalIssues: number;
      highIssues: number;
      mediumIssues: number;
      lowIssues: number;
    };
    recommendations: string[];
  }> {
    const componentResults = components.map(component => 
      this.auditComponent(component.props, component.name)
    );

    const overallScore = componentResults.reduce((sum, result) => sum + result.score, 0) / componentResults.length;
    
    let wcagLevel: 'A' | 'AA' | 'AAA' | 'FAIL';
    if (overallScore >= 95) wcagLevel = 'AAA';
    else if (overallScore >= 80) wcagLevel = 'AA';
    else if (overallScore >= 60) wcagLevel = 'A';
    else wcagLevel = 'FAIL';

    const allIssues = componentResults.flatMap(result => result.issues);
    const summary = {
      totalIssues: allIssues.length,
      criticalIssues: allIssues.filter(issue => issue.severity === 'critical').length,
      highIssues: allIssues.filter(issue => issue.severity === 'high').length,
      mediumIssues: allIssues.filter(issue => issue.severity === 'medium').length,
      lowIssues: allIssues.filter(issue => issue.severity === 'low').length
    };

    const recommendations = this.generateOverallRecommendations(componentResults);

    // Log accessibility audit
    await this.auditLogService.logDataAccess({
      userId: 'system',
      action: 'ACCESSIBILITY_AUDIT_PERFORMED',
      resourceType: 'ACCESSIBILITY_AUDIT',
      resourceId: 'app_audit',
      ipAddress: 'mobile_app',
      userAgent: 'BioReceipt',
      success: true,
      details: {
        overallScore,
        wcagLevel,
        componentsAudited: components.length,
        totalIssues: summary.totalIssues
      }
    });

    return {
      overallScore,
      wcagLevel,
      componentResults,
      summary,
      recommendations
    };
  }

  // Private helper methods

  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('accessibility_settings');
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load accessibility settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem('accessibility_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save accessibility settings:', error);
      throw error;
    }
  }

  private async detectSystemAccessibilitySettings(): Promise<void> {
    try {
      // Detect screen reader
      this.settings.screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      
      // Detect reduce motion
      this.settings.reducedMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();

      // Platform-specific detections
      if (Platform.OS === 'ios') {
        // iOS-specific accessibility settings would be detected here
        // This would require additional native modules or libraries
      } else if (Platform.OS === 'android') {
        // Android-specific accessibility settings would be detected here
        // This would require additional native modules or libraries
      }
    } catch (error) {
      console.error('Failed to detect system accessibility settings:', error);
    }
  }

  private setupAccessibilityListeners(): void {
    try {
      // Listen for screen reader changes
      AccessibilityInfo.addEventListener('screenReaderChanged', (isEnabled) => {
        this.settings.screenReaderEnabled = isEnabled;
        this.saveSettings().catch(console.error);
      });

      // Listen for reduce motion changes
      AccessibilityInfo.addEventListener('reduceMotionChanged', (isEnabled) => {
        this.settings.reducedMotionEnabled = isEnabled;
        this.saveSettings().catch(console.error);
      });
    } catch (error) {
      console.error('Failed to setup accessibility listeners:', error);
    }
  }

  private calculateLuminance(color: string): number {
    // Convert hex color to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Calculate relative luminance
    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  }

  private generateRecommendations(issues: AccessibilityIssue[]): string[] {
    const recommendations = new Set<string>();

    issues.forEach(issue => {
      switch (issue.type) {
        case 'label':
          recommendations.add('Add meaningful accessibility labels to all interactive elements');
          break;
        case 'contrast':
          recommendations.add('Ensure color contrast meets WCAG 2.1 AA standards (4.5:1 for normal text)');
          break;
        case 'focus':
          recommendations.add('Implement proper focus management and visible focus indicators');
          break;
        case 'structure':
          recommendations.add('Use semantic roles and proper heading hierarchy');
          break;
        case 'interaction':
          recommendations.add('Ensure touch targets are at least 44pt (iOS) or 48dp (Android)');
          break;
        case 'content':
          recommendations.add('Provide alternative text for images and meaningful content structure');
          break;
      }
    });

    return Array.from(recommendations);
  }

  private generateOverallRecommendations(results: AccessibilityAuditResult[]): string[] {
    const recommendations = new Set<string>();

    // Add general recommendations based on common issues
    const allIssues = results.flatMap(result => result.issues);
    const issueTypes = new Set(allIssues.map(issue => issue.type));

    if (issueTypes.has('contrast')) {
      recommendations.add('Review and improve color contrast throughout the app');
    }

    if (issueTypes.has('label')) {
      recommendations.add('Implement comprehensive accessibility labeling strategy');
    }

    if (issueTypes.has('interaction')) {
      recommendations.add('Audit and improve touch target sizes for better usability');
    }

    // Add specific recommendations based on severity
    const criticalIssues = allIssues.filter(issue => issue.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.add('Address critical accessibility issues immediately to ensure basic usability');
    }

    const highIssues = allIssues.filter(issue => issue.severity === 'high');
    if (highIssues.length > 0) {
      recommendations.add('Prioritize high-severity accessibility issues for next release');
    }

    // Add testing recommendations
    recommendations.add('Test with actual assistive technologies (VoiceOver, TalkBack)');
    recommendations.add('Conduct user testing with people who use assistive technologies');
    recommendations.add('Implement automated accessibility testing in CI/CD pipeline');

    return Array.from(recommendations);
  }

  /**
   * Cleanup accessibility service
   */
  public cleanup(): void {
    try {
      // Remove event listeners
      AccessibilityInfo.removeEventListener('screenReaderChanged', () => {});
      AccessibilityInfo.removeEventListener('reduceMotionChanged', () => {});
      
      console.log('Accessibility service cleaned up');
    } catch (error) {
      console.error('Failed to cleanup accessibility service:', error);
    }
  }
}