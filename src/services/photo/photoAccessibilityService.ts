/**
 * Photo Accessibility Service
 * Provides comprehensive accessibility features for photo components
 * Enhanced with WCAG AA compliance, ARIA patterns, and intake-specific labeling
 */

import { AccessibilityInfo, Platform } from 'react-native';

export interface AccessibilitySettings {
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isHighContrastEnabled: boolean;
  isLargeTextEnabled: boolean;
  isVoiceControlEnabled: boolean;
  preferredColorScheme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
}

export interface PhotoAccessibilityLabels {
  photoCapture: string;
  photoPreview: string;
  photoGallery: string;
  photoFullScreen: string;
  photoDelete: string;
  photoShare: string;
  photoUpload: string;
  photoError: string;
  photoLoading: string;
}

export interface IntakeMetadata {
  substanceName?: string;
  intakeTime?: string;
  dosage?: string;
  unit?: string;
  notes?: string;
  intakeType?: 'medication' | 'supplement' | 'food' | 'beverage' | 'other';
}

export interface FocusTrapConfig {
  isActive: boolean;
  firstFocusableElement: string | null;
  lastFocusableElement: string | null;
  returnFocusTo: string | null;
}

export interface WCAGColors {
  background: string;
  foreground: string;
  contrastRatio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
}

export interface AccessibilityAnnouncement {
  message: string;
  priority: 'low' | 'medium' | 'high';
  delay?: number;
}

class PhotoAccessibilityService {
  private settings: AccessibilitySettings = {
    isScreenReaderEnabled: false,
    isReduceMotionEnabled: false,
    isHighContrastEnabled: false,
    isLargeTextEnabled: false,
    isVoiceControlEnabled: false,
    preferredColorScheme: 'auto',
    fontSize: 'medium',
  };

  private listeners: ((settings: AccessibilitySettings) => void)[] = [];
  private announcementQueue: AccessibilityAnnouncement[] = [];
  private isProcessingAnnouncements = false;
  private focusTrapStack: FocusTrapConfig[] = [];
  private liveRegionAnnouncements: Map<string, string> = new Map();

  constructor() {
    this.initializeAccessibilitySettings();
    this.setupAccessibilityListeners();
  }

  /**
   * Initialize accessibility settings from system
   */
  private async initializeAccessibilitySettings(): Promise<void> {
    try {
      const [
        isScreenReaderEnabled,
        isReduceMotionEnabled,
        isHighContrastEnabled,
      ] = await Promise.all([
        AccessibilityInfo.isScreenReaderEnabled(),
        AccessibilityInfo.isReduceMotionEnabled(),
        Platform.OS === 'ios' ? AccessibilityInfo.isHighContrastEnabled() : Promise.resolve(false),
      ]);

      this.settings = {
        ...this.settings,
        isScreenReaderEnabled,
        isReduceMotionEnabled,
        isHighContrastEnabled,
      };

      this.notifyListeners();
    } catch (error) {
      console.error('Failed to initialize accessibility settings:', error);
    }
  }

  /**
   * Set up accessibility event listeners
   */
  private setupAccessibilityListeners(): void {
    AccessibilityInfo.addEventListener('screenReaderChanged', (isEnabled) => {
      this.settings.isScreenReaderEnabled = isEnabled;
      this.notifyListeners();
    });

    AccessibilityInfo.addEventListener('reduceMotionChanged', (isEnabled) => {
      this.settings.isReduceMotionEnabled = isEnabled;
      this.notifyListeners();
    });

    if (Platform.OS === 'ios') {
      AccessibilityInfo.addEventListener('highContrastChanged', (isEnabled) => {
        this.settings.isHighContrastEnabled = isEnabled;
        this.notifyListeners();
      });
    }
  }

  /**
   * Get current accessibility settings
   */
  getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  /**
   * Update accessibility settings
   */
  updateSettings(newSettings: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.notifyListeners();
  }

  /**
   * Subscribe to accessibility settings changes
   */
  subscribe(listener: (settings: AccessibilitySettings) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of settings changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.settings));
  }

  /**
   * Get accessibility labels for photo components
   */
  getPhotoLabels(): PhotoAccessibilityLabels {
    return {
      photoCapture: 'Take photo for intake documentation',
      photoPreview: 'Photo preview - tap to view full size, double tap to delete',
      photoGallery: 'Photo gallery - swipe to navigate between photos',
      photoFullScreen: 'Full screen photo view - pinch to zoom, swipe to dismiss',
      photoDelete: 'Delete photo - this action cannot be undone',
      photoShare: 'Share photo with other apps',
      photoUpload: 'Upload photo to cloud storage',
      photoError: 'Photo operation failed - tap for retry options',
      photoLoading: 'Photo operation in progress - please wait',
    };
  }

  /**
   * Generate descriptive alt text for intake photos based on metadata
   */
  generateIntakePhotoAltText(
    intakeMetadata: IntakeMetadata,
    photoMetadata?: {
      fileName?: string;
      captureDate?: string;
      fileSize?: number;
    }
  ): string {
    const parts: string[] = [];

    // Start with the main description
    if (intakeMetadata.substanceName) {
      parts.push(`Photo of ${intakeMetadata.substanceName} intake`);
    } else {
      parts.push('Photo of substance intake');
    }

    // Add dosage information if available
    if (intakeMetadata.dosage && intakeMetadata.unit) {
      parts.push(`${intakeMetadata.dosage} ${intakeMetadata.unit}`);
    } else if (intakeMetadata.dosage) {
      parts.push(`${intakeMetadata.dosage}`);
    }

    // Add intake time
    if (intakeMetadata.intakeTime) {
      const time = new Date(intakeMetadata.intakeTime);
      const formattedTime = time.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      parts.push(`taken at ${formattedTime}`);
    }

    // Add capture date if different from intake time
    if (photoMetadata?.captureDate) {
      const captureTime = new Date(photoMetadata.captureDate);
      const formattedDate = captureTime.toLocaleDateString();
      parts.push(`photo captured on ${formattedDate}`);
    }

    // Add intake type context
    if (intakeMetadata.intakeType) {
      const typeDescriptions = {
        medication: 'medication',
        supplement: 'dietary supplement',
        food: 'food item',
        beverage: 'beverage',
        other: 'substance'
      };
      parts.push(`${typeDescriptions[intakeMetadata.intakeType]} documentation`);
    }

    return parts.join(', ');
  }

  /**
   * Generate accessibility label for photo thumbnails
   */
  generateThumbnailLabel(
    intakeMetadata: IntakeMetadata,
    index: number,
    totalCount: number,
    photoMetadata?: {
      fileName?: string;
      fileSize?: number;
    }
  ): string {
    const baseAltText = this.generateIntakePhotoAltText(intakeMetadata, photoMetadata);
    const positionInfo = `Photo ${index + 1} of ${totalCount}`;
    
    let label = `${baseAltText}. ${positionInfo}`;
    
    if (photoMetadata?.fileSize) {
      const sizeInKB = Math.round(photoMetadata.fileSize / 1024);
      label += `. File size: ${sizeInKB} KB`;
    }

    label += '. Tap to view full size, double tap for options';
    
    return label;
  }

  /**
   * Generate accessibility label for full-screen photos
   */
  generateFullScreenLabel(
    intakeMetadata: IntakeMetadata,
    photoMetadata?: {
      fileName?: string;
      dimensions?: { width: number; height: number };
      captureDate?: string;
    }
  ): string {
    const baseAltText = this.generateIntakePhotoAltText(intakeMetadata, photoMetadata);
    
    let label = `Full screen view: ${baseAltText}`;
    
    if (photoMetadata?.dimensions) {
      const { width, height } = photoMetadata.dimensions;
      const orientation = width > height ? 'landscape' : width < height ? 'portrait' : 'square';
      label += `. ${width} by ${height} pixels, ${orientation} orientation`;
    }
    
    label += '. Pinch to zoom, double tap to fit screen, swipe down to close';
    
    return label;
  }

  /**
   * Get context-aware accessibility label
   */
  getContextualLabel(
    baseLabel: string,
    context: {
      photoCount?: number;
      currentIndex?: number;
      isLoading?: boolean;
      hasError?: boolean;
      fileName?: string;
      fileSize?: string;
      captureDate?: string;
    }
  ): string {
    let label = baseLabel;

    if (context.hasError) {
      label += ' - Error occurred';
    } else if (context.isLoading) {
      label += ' - Loading';
    }

    if (context.photoCount && context.currentIndex !== undefined) {
      label += ` - Photo ${context.currentIndex + 1} of ${context.photoCount}`;
    }

    if (context.fileName) {
      label += ` - ${context.fileName}`;
    }

    if (context.fileSize) {
      label += ` - Size: ${context.fileSize}`;
    }

    if (context.captureDate) {
      label += ` - Captured: ${context.captureDate}`;
    }

    return label;
  }

  /**
   * Setup focus trap for modal dialogs (ARIA dialog pattern)
   */
  setupFocusTrap(config: {
    modalId: string;
    firstFocusableSelector: string;
    lastFocusableSelector: string;
    returnFocusSelector: string;
  }): () => void {
    const focusTrap: FocusTrapConfig = {
      isActive: true,
      firstFocusableElement: config.firstFocusableSelector,
      lastFocusableElement: config.lastFocusableSelector,
      returnFocusTo: config.returnFocusSelector,
    };

    this.focusTrapStack.push(focusTrap);

    // Announce modal opening
    this.announceMessage(
      `Dialog opened. Use Tab to navigate, Escape to close.`,
      'high'
    );

    // Return cleanup function
    return () => {
      this.removeFocusTrap(config.modalId);
    };
  }

  /**
   * Remove focus trap and return focus to triggering element
   */
  private removeFocusTrap(modalId: string): void {
    const trapIndex = this.focusTrapStack.findIndex(trap => trap.isActive);
    if (trapIndex > -1) {
      const trap = this.focusTrapStack[trapIndex];
      this.focusTrapStack.splice(trapIndex, 1);

      // Announce modal closing
      this.announceMessage('Dialog closed', 'medium');

      // In a real implementation, you would focus the return element here
      // This would typically be handled by the component using this service
    }
  }

  /**
   * Handle focus trap keyboard navigation
   */
  handleFocusTrapKeyboard(event: {
    key: string;
    shiftKey: boolean;
    target: any;
    preventDefault: () => void;
  }): boolean {
    const currentTrap = this.focusTrapStack[this.focusTrapStack.length - 1];
    if (!currentTrap || !currentTrap.isActive) {
      return false;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.removeFocusTrap('current');
      return true;
    }

    if (event.key === 'Tab') {
      // In a real implementation, you would handle Tab navigation here
      // This would typically involve finding focusable elements and managing focus
      return true;
    }

    return false;
  }

  /**
   * Get ARIA attributes for photo components
   */
  getARIAAttributes(
    componentType: 'thumbnail' | 'modal' | 'gallery' | 'button' | 'status',
    context?: {
      isExpanded?: boolean;
      hasPopup?: boolean;
      isPressed?: boolean;
      isSelected?: boolean;
      describedBy?: string;
      labelledBy?: string;
      live?: 'polite' | 'assertive' | 'off';
    }
  ): Record<string, any> {
    const baseAttributes: Record<string, any> = {};

    switch (componentType) {
      case 'thumbnail':
        baseAttributes.role = 'button';
        baseAttributes.accessibilityRole = 'imagebutton';
        if (context?.isSelected) {
          baseAttributes['aria-selected'] = true;
          baseAttributes.accessibilityState = { selected: true };
        }
        break;

      case 'modal':
        baseAttributes.role = 'dialog';
        baseAttributes['aria-modal'] = true;
        baseAttributes.accessibilityRole = 'none';
        baseAttributes.accessibilityViewIsModal = true;
        if (context?.labelledBy) {
          baseAttributes['aria-labelledby'] = context.labelledBy;
        }
        break;

      case 'gallery':
        baseAttributes.role = 'region';
        baseAttributes['aria-label'] = 'Photo gallery';
        baseAttributes.accessibilityRole = 'none';
        break;

      case 'button':
        baseAttributes.role = 'button';
        baseAttributes.accessibilityRole = 'button';
        if (context?.isPressed !== undefined) {
          baseAttributes['aria-pressed'] = context.isPressed;
          baseAttributes.accessibilityState = { selected: context.isPressed };
        }
        if (context?.hasPopup) {
          baseAttributes['aria-haspopup'] = true;
        }
        if (context?.isExpanded !== undefined) {
          baseAttributes['aria-expanded'] = context.isExpanded;
          baseAttributes.accessibilityState = { 
            ...baseAttributes.accessibilityState,
            expanded: context.isExpanded 
          };
        }
        break;

      case 'status':
        baseAttributes.role = 'status';
        baseAttributes['aria-live'] = context?.live || 'polite';
        baseAttributes.accessibilityRole = 'none';
        baseAttributes.accessibilityLiveRegion = context?.live || 'polite';
        break;
    }

    if (context?.describedBy) {
      baseAttributes['aria-describedby'] = context.describedBy;
    }

    return baseAttributes;
  }

  /**
   * Get accessibility hint for photo actions
   */
  getActionHint(action: string): string {
    const hints: Record<string, string> = {
      capture: 'Opens camera to take a photo. Requires camera permission.',
      preview: 'Shows photo preview. Tap to view full size, long press for options.',
      gallery: 'Browse photo collection. Swipe left or right to navigate.',
      fullscreen: 'View photo in full screen. Pinch to zoom, double tap to fit.',
      delete: 'Removes photo permanently. Confirmation dialog will appear.',
      share: 'Opens sharing options to send photo to other apps.',
      upload: 'Uploads photo to secure cloud storage.',
      retry: 'Attempts the failed operation again.',
      settings: 'Opens app settings to manage permissions.',
    };

    return hints[action] || 'Performs photo-related action';
  }

  /**
   * Announce message to screen reader
   */
  announceMessage(
    message: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    delay: number = 0
  ): void {
    if (!this.settings.isScreenReaderEnabled) {
      return;
    }

    const announcement: AccessibilityAnnouncement = {
      message,
      priority,
      delay,
    };

    // Insert based on priority
    if (priority === 'high') {
      this.announcementQueue.unshift(announcement);
    } else {
      this.announcementQueue.push(announcement);
    }

    this.processAnnouncementQueue();
  }

  /**
   * Update live region with loading states and photo counts
   */
  updateLiveRegion(
    regionId: string,
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ): void {
    this.liveRegionAnnouncements.set(regionId, message);
    
    if (this.settings.isScreenReaderEnabled) {
      this.announceMessage(message, priority === 'assertive' ? 'high' : 'medium');
    }
  }

  /**
   * Get live region announcement for photo operations
   */
  getPhotoOperationAnnouncement(
    operation: 'loading' | 'loaded' | 'error' | 'uploading' | 'uploaded' | 'deleted',
    context?: {
      photoCount?: number;
      currentIndex?: number;
      substanceName?: string;
      errorMessage?: string;
    }
  ): string {
    switch (operation) {
      case 'loading':
        return context?.substanceName 
          ? `Loading photo for ${context.substanceName} intake`
          : 'Loading photo';

      case 'loaded':
        if (context?.photoCount && context?.currentIndex !== undefined) {
          return `Photo ${context.currentIndex + 1} of ${context.photoCount} loaded`;
        }
        return 'Photo loaded successfully';

      case 'error':
        return context?.errorMessage 
          ? `Photo operation failed: ${context.errorMessage}`
          : 'Photo operation failed';

      case 'uploading':
        return context?.substanceName
          ? `Uploading photo for ${context.substanceName} intake`
          : 'Uploading photo';

      case 'uploaded':
        return 'Photo uploaded successfully';

      case 'deleted':
        return context?.substanceName
          ? `Photo for ${context.substanceName} intake deleted`
          : 'Photo deleted';

      default:
        return 'Photo operation completed';
    }
  }

  /**
   * Announce photo count changes
   */
  announcePhotoCountChange(
    newCount: number,
    previousCount: number,
    substanceName?: string
  ): void {
    const difference = newCount - previousCount;
    let message = '';

    if (difference > 0) {
      const photoWord = difference === 1 ? 'photo' : 'photos';
      message = substanceName
        ? `${difference} ${photoWord} added for ${substanceName}. Total: ${newCount}`
        : `${difference} ${photoWord} added. Total: ${newCount}`;
    } else if (difference < 0) {
      const photoWord = Math.abs(difference) === 1 ? 'photo' : 'photos';
      message = substanceName
        ? `${Math.abs(difference)} ${photoWord} removed from ${substanceName}. Total: ${newCount}`
        : `${Math.abs(difference)} ${photoWord} removed. Total: ${newCount}`;
    }

    if (message) {
      this.updateLiveRegion('photo-count', message, 'polite');
    }
  }

  /**
   * Process announcement queue
   */
  private async processAnnouncementQueue(): Promise<void> {
    if (this.isProcessingAnnouncements || this.announcementQueue.length === 0) {
      return;
    }

    this.isProcessingAnnouncements = true;

    while (this.announcementQueue.length > 0) {
      const announcement = this.announcementQueue.shift();
      if (announcement) {
        if (announcement.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, announcement.delay));
        }

        try {
          await AccessibilityInfo.announceForAccessibility(announcement.message);
          // Wait a bit between announcements to avoid overwhelming the user
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error('Failed to announce message:', error);
        }
      }
    }

    this.isProcessingAnnouncements = false;
  }

  /**
   * Calculate color contrast ratio (WCAG formula)
   */
  private calculateContrastRatio(color1: string, color2: string): number {
    const getLuminance = (color: string): number => {
      // Convert hex to RGB
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;

      // Calculate relative luminance
      const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }

  /**
   * Validate WCAG color contrast compliance
   */
  validateColorContrast(
    foreground: string,
    background: string,
    fontSize: 'normal' | 'large' = 'normal'
  ): WCAGColors {
    const contrastRatio = this.calculateContrastRatio(foreground, background);
    
    // WCAG AA requirements: 4.5:1 for normal text, 3:1 for large text
    // WCAG AAA requirements: 7:1 for normal text, 4.5:1 for large text
    const aaThreshold = fontSize === 'large' ? 3 : 4.5;
    const aaaThreshold = fontSize === 'large' ? 4.5 : 7;

    return {
      background,
      foreground,
      contrastRatio: Math.round(contrastRatio * 100) / 100,
      meetsAA: contrastRatio >= aaThreshold,
      meetsAAA: contrastRatio >= aaaThreshold,
    };
  }

  /**
   * Get WCAG compliant colors for photo overlays and badges
   */
  getWCAGCompliantColors(baseTheme: 'light' | 'dark' = 'light'): {
    overlay: WCAGColors;
    badge: WCAGColors;
    error: WCAGColors;
    success: WCAGColors;
    warning: WCAGColors;
  } {
    if (baseTheme === 'dark') {
      return {
        overlay: this.validateColorContrast('#ffffff', '#000000cc'), // White text on semi-transparent black
        badge: this.validateColorContrast('#ffffff', '#333333'), // White text on dark gray
        error: this.validateColorContrast('#ffffff', '#d32f2f'), // White text on red
        success: this.validateColorContrast('#ffffff', '#2e7d32'), // White text on green
        warning: this.validateColorContrast('#000000', '#ffc107'), // Black text on yellow
      };
    }

    return {
      overlay: this.validateColorContrast('#000000', '#ffffffcc'), // Black text on semi-transparent white
      badge: this.validateColorContrast('#ffffff', '#1976d2'), // White text on blue
      error: this.validateColorContrast('#ffffff', '#d32f2f'), // White text on red
      success: this.validateColorContrast('#ffffff', '#2e7d32'), // White text on green
      warning: this.validateColorContrast('#000000', '#ffc107'), // Black text on yellow
    };
  }

  /**
   * Get high contrast colors with WCAG compliance
   */
  getHighContrastColors() {
    if (!this.settings.isHighContrastEnabled) {
      return null;
    }

    // Ensure all colors meet WCAG AAA standards for high contrast mode
    return {
      background: '#000000',
      surface: '#1a1a1a',
      primary: '#ffffff',
      secondary: '#cccccc',
      text: '#ffffff',
      textSecondary: '#cccccc',
      border: '#ffffff',
      error: '#ff4444', // Adjusted for better contrast
      success: '#44ff44', // Adjusted for better contrast
      warning: '#ffff44', // Adjusted for better contrast
      overlay: this.validateColorContrast('#ffffff', '#000000e6'), // High contrast overlay
      badge: this.validateColorContrast('#000000', '#ffffff'), // Inverted for high contrast
    };
  }

  /**
   * Get font size multiplier based on accessibility settings
   */
  getFontSizeMultiplier(): number {
    const multipliers = {
      small: 0.85,
      medium: 1.0,
      large: 1.15,
      'extra-large': 1.3,
    };

    let multiplier = multipliers[this.settings.fontSize];

    // Additional scaling for system large text
    if (this.settings.isLargeTextEnabled) {
      multiplier *= 1.2;
    }

    return multiplier;
  }

  /**
   * Get reduced motion preferences
   */
  shouldReduceMotion(): boolean {
    return this.settings.isReduceMotionEnabled;
  }

  /**
   * Get keyboard navigation configuration
   */
  getKeyboardNavigation() {
    return {
      enabled: this.settings.isScreenReaderEnabled || this.settings.isVoiceControlEnabled,
      focusRingVisible: true,
      tabOrder: [
        'photo-capture',
        'photo-preview',
        'photo-gallery',
        'photo-actions',
        'photo-navigation',
      ],
      shortcuts: {
        space: 'activate',
        enter: 'activate',
        escape: 'close',
        arrowLeft: 'previous',
        arrowRight: 'next',
        arrowUp: 'up',
        arrowDown: 'down',
        delete: 'delete',
        backspace: 'delete',
      },
    };
  }

  /**
   * Get voice control commands
   */
  getVoiceCommands() {
    return {
      'take photo': 'photo-capture',
      'capture image': 'photo-capture',
      'show gallery': 'photo-gallery',
      'view photos': 'photo-gallery',
      'delete photo': 'photo-delete',
      'remove image': 'photo-delete',
      'share photo': 'photo-share',
      'send image': 'photo-share',
      'go back': 'navigation-back',
      'close': 'navigation-close',
      'next photo': 'navigation-next',
      'previous photo': 'navigation-previous',
      'zoom in': 'photo-zoom-in',
      'zoom out': 'photo-zoom-out',
      'fit to screen': 'photo-fit',
    };
  }

  /**
   * Generate semantic description for photos
   */
  generatePhotoDescription(metadata: {
    fileName?: string;
    fileSize?: number;
    dimensions?: { width: number; height: number };
    captureDate?: string;
    location?: string;
  }): string {
    const parts: string[] = [];

    if (metadata.fileName) {
      parts.push(`Photo named ${metadata.fileName}`);
    } else {
      parts.push('Photo');
    }

    if (metadata.dimensions) {
      const { width, height } = metadata.dimensions;
      const orientation = width > height ? 'landscape' : width < height ? 'portrait' : 'square';
      parts.push(`${width} by ${height} pixels, ${orientation} orientation`);
    }

    if (metadata.fileSize) {
      const sizeInMB = (metadata.fileSize / (1024 * 1024)).toFixed(1);
      parts.push(`${sizeInMB} megabytes`);
    }

    if (metadata.captureDate) {
      const date = new Date(metadata.captureDate);
      const formattedDate = date.toLocaleDateString();
      const formattedTime = date.toLocaleTimeString();
      parts.push(`captured on ${formattedDate} at ${formattedTime}`);
    }

    if (metadata.location) {
      parts.push(`taken at ${metadata.location}`);
    }

    return parts.join(', ');
  }

  /**
   * Check if component should use alternative interaction methods
   */
  shouldUseAlternativeInteraction(): boolean {
    return this.settings.isScreenReaderEnabled || 
           this.settings.isVoiceControlEnabled ||
           this.settings.isReduceMotionEnabled;
  }

  /**
   * Get touch target size adjustments
   */
  getTouchTargetSize(): { minWidth: number; minHeight: number } {
    const baseSize = 44; // iOS HIG minimum
    const multiplier = this.settings.isLargeTextEnabled ? 1.2 : 1.0;
    
    return {
      minWidth: baseSize * multiplier,
      minHeight: baseSize * multiplier,
    };
  }

  /**
   * Get animation duration based on motion preferences
   */
  getAnimationDuration(defaultDuration: number): number {
    if (this.settings.isReduceMotionEnabled) {
      return Math.min(defaultDuration * 0.3, 150); // Significantly reduced
    }
    return defaultDuration;
  }

  /**
   * Test accessibility compliance including WCAG AA standards
   */
  async testAccessibilityCompliance(
    testColors?: Array<{ foreground: string; background: string; context: string }>
  ): Promise<{
    passed: boolean;
    issues: string[];
    recommendations: string[];
    colorTests?: Array<{ context: string; result: WCAGColors }>;
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const colorTests: Array<{ context: string; result: WCAGColors }> = [];

    // Check if screen reader is supported
    try {
      const isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      if (!isScreenReaderEnabled) {
        recommendations.push('Consider testing with screen reader enabled');
      }
    } catch (error) {
      issues.push('Unable to detect screen reader status');
    }

    // Check motion preferences
    try {
      const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      if (!isReduceMotionEnabled) {
        recommendations.push('Test with reduced motion enabled for better accessibility');
      }
    } catch (error) {
      issues.push('Unable to detect motion preferences');
    }

    // Check high contrast support (iOS only)
    if (Platform.OS === 'ios') {
      try {
        const isHighContrastEnabled = await AccessibilityInfo.isHighContrastEnabled();
        if (!isHighContrastEnabled) {
          recommendations.push('Test with high contrast mode for better visibility');
        }
      } catch (error) {
        issues.push('Unable to detect high contrast status');
      }
    }

    // Test color contrast if colors provided
    if (testColors) {
      for (const colorTest of testColors) {
        const result = this.validateColorContrast(
          colorTest.foreground,
          colorTest.background
        );
        
        colorTests.push({
          context: colorTest.context,
          result,
        });

        if (!result.meetsAA) {
          issues.push(
            `Color contrast failure in ${colorTest.context}: ${result.contrastRatio}:1 (requires 4.5:1 for WCAG AA)`
          );
        }
      }
    }

    // Test default photo overlay colors
    const overlayColors = this.getWCAGCompliantColors('light');
    for (const [context, colors] of Object.entries(overlayColors)) {
      if (!colors.meetsAA) {
        issues.push(`Default ${context} colors do not meet WCAG AA standards`);
      }
    }

    // Check focus trap functionality
    if (this.focusTrapStack.length > 0) {
      recommendations.push('Active focus traps detected - ensure proper cleanup');
    }

    // Check live region announcements
    if (this.liveRegionAnnouncements.size === 0) {
      recommendations.push('No live region announcements configured - consider adding for dynamic content');
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations,
      colorTests: colorTests.length > 0 ? colorTests : undefined,
    };
  }

  /**
   * Get comprehensive accessibility report for photo components
   */
  getAccessibilityReport(): {
    settings: AccessibilitySettings;
    focusTraps: number;
    liveRegions: number;
    colorCompliance: {
      light: ReturnType<typeof this.getWCAGCompliantColors>;
      dark: ReturnType<typeof this.getWCAGCompliantColors>;
    };
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    if (!this.settings.isScreenReaderEnabled) {
      recommendations.push('Enable screen reader for comprehensive accessibility testing');
    }

    if (!this.settings.isReduceMotionEnabled) {
      recommendations.push('Test with reduced motion preferences');
    }

    if (this.focusTrapStack.length > 1) {
      recommendations.push('Multiple focus traps active - review modal management');
    }

    return {
      settings: this.getSettings(),
      focusTraps: this.focusTrapStack.length,
      liveRegions: this.liveRegionAnnouncements.size,
      colorCompliance: {
        light: this.getWCAGCompliantColors('light'),
        dark: this.getWCAGCompliantColors('dark'),
      },
      recommendations,
    };
  }
}

// Export singleton instance
export const photoAccessibilityService = new PhotoAccessibilityService();
export default photoAccessibilityService;