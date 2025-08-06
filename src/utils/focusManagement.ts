/**
 * Focus Management Utilities
 * Helper functions for managing focus in complex UI components
 */

import { AccessibilityInfo } from 'react-native';

/**
 * Focus trap for modals and overlays
 */
export class FocusTrap {
  private container: any;
  private previouslyFocusedElement: any;
  private focusableElements: any[] = [];

  constructor(container: any) {
    this.container = container;
  }

  /**
   * Activate the focus trap
   */
  activate() {
    // Store the currently focused element
    this.previouslyFocusedElement = document.activeElement;
    
    // Find all focusable elements within the container
    this.updateFocusableElements();
    
    // Focus the first focusable element
    if (this.focusableElements.length > 0) {
      AccessibilityInfo.setAccessibilityFocus(this.focusableElements[0]);
    }
    
    // Add event listeners for keyboard navigation
    this.addEventListeners();
  }

  /**
   * Deactivate the focus trap
   */
  deactivate() {
    // Remove event listeners
    this.removeEventListeners();
    
    // Return focus to the previously focused element
    if (this.previouslyFocusedElement) {
      AccessibilityInfo.setAccessibilityFocus(this.previouslyFocusedElement);
    }
  }

  /**
   * Update the list of focusable elements
   */
  private updateFocusableElements() {
    if (!this.container) return;
    
    // In React Native, we would need to track focusable components differently
    // This is a simplified version for demonstration
    this.focusableElements = [];
  }

  /**
   * Add keyboard event listeners
   */
  private addEventListeners() {
    // In React Native, keyboard handling would be different
    // This is a web-focused implementation for reference
  }

  /**
   * Remove keyboard event listeners
   */
  private removeEventListeners() {
    // Remove listeners when deactivating
  }

  /**
   * Handle Tab key navigation
   */
  private handleTabKey(event: KeyboardEvent) {
    if (this.focusableElements.length === 0) return;

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab (backward)
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab (forward)
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }
}

/**
 * Focus management hook for React Native components
 */
export interface FocusManager {
  setFocus: (element: any) => void;
  restoreFocus: () => void;
  trapFocus: (container: any) => () => void;
  announceFocus: (message: string) => void;
}

/**
 * Create a focus manager instance
 */
export function createFocusManager(): FocusManager {
  let previousFocus: any = null;
  let currentTrap: FocusTrap | null = null;

  return {
    setFocus: (element: any) => {
      if (element) {
        AccessibilityInfo.setAccessibilityFocus(element);
      }
    },

    restoreFocus: () => {
      if (previousFocus) {
        AccessibilityInfo.setAccessibilityFocus(previousFocus);
        previousFocus = null;
      }
    },

    trapFocus: (container: any) => {
      // Store current focus
      previousFocus = document.activeElement;
      
      // Create and activate focus trap
      currentTrap = new FocusTrap(container);
      currentTrap.activate();

      // Return cleanup function
      return () => {
        if (currentTrap) {
          currentTrap.deactivate();
          currentTrap = null;
        }
      };
    },

    announceFocus: (message: string) => {
      AccessibilityInfo.announceForAccessibility(message);
    },
  };
}

/**
 * Focus management for modal components
 */
export interface ModalFocusProps {
  isVisible: boolean;
  onShow?: () => void;
  onHide?: () => void;
  initialFocusRef?: React.RefObject<any>;
  finalFocusRef?: React.RefObject<any>;
}

/**
 * Hook for managing modal focus
 */
export function useModalFocus({
  isVisible,
  onShow,
  onHide,
  initialFocusRef,
  finalFocusRef,
}: ModalFocusProps) {
  const focusManager = createFocusManager();
  const previousFocusRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (isVisible) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement;
      
      // Focus the initial element or first focusable element
      setTimeout(() => {
        if (initialFocusRef?.current) {
          focusManager.setFocus(initialFocusRef.current);
        }
        onShow?.();
      }, 100);

      // Announce modal opening
      focusManager.announceFocus('Modal opened');
    } else {
      // Return focus to the final focus element or previous element
      setTimeout(() => {
        if (finalFocusRef?.current) {
          focusManager.setFocus(finalFocusRef.current);
        } else if (previousFocusRef.current) {
          focusManager.setFocus(previousFocusRef.current);
        }
        onHide?.();
      }, 100);

      // Announce modal closing
      focusManager.announceFocus('Modal closed');
    }
  }, [isVisible]);

  return focusManager;
}

/**
 * Utility to find focusable elements (React Native adaptation)
 */
export function findFocusableElements(container: any): any[] {
  // In React Native, focusable elements are those with:
  // - accessible={true}
  // - onPress, onFocus, or other interaction handlers
  // - TextInput components
  // This would need to be implemented based on the component tree
  return [];
}

/**
 * Check if an element is focusable
 */
export function isFocusable(element: any): boolean {
  if (!element) return false;
  
  // Check React Native accessibility props
  if (element.props) {
    return (
      element.props.accessible !== false &&
      (element.props.onPress ||
       element.props.onFocus ||
       element.props.onBlur ||
       element.type === 'TextInput')
    );
  }
  
  return false;
}

/**
 * Get the next focusable element
 */
export function getNextFocusableElement(
  currentElement: any,
  direction: 'forward' | 'backward' = 'forward'
): any | null {
  // Implementation would depend on the component hierarchy
  // This is a placeholder for the actual implementation
  return null;
}

/**
 * Announce content changes for screen readers
 */
export function announceContentChange(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  // Use AccessibilityInfo to announce changes
  AccessibilityInfo.announceForAccessibility(message);
  
  // Log for development
  console.log(`[Accessibility Announcement - ${priority}]: ${message}`);
}

/**
 * Set accessibility focus with error handling
 */
export function setAccessibilityFocusSafe(element: any, fallbackMessage?: string) {
  try {
    if (element) {
      AccessibilityInfo.setAccessibilityFocus(element);
    } else if (fallbackMessage) {
      announceContentChange(fallbackMessage, 'polite');
    }
  } catch (error) {
    console.warn('Failed to set accessibility focus:', error);
    if (fallbackMessage) {
      announceContentChange(fallbackMessage, 'polite');
    }
  }
}

/**
 * Create accessible loading state
 */
export function createLoadingAccessibility(isLoading: boolean, loadingText: string = 'Loading') {
  return {
    accessible: true,
    accessibilityRole: 'progressbar' as const,
    accessibilityLabel: isLoading ? loadingText : 'Content loaded',
    accessibilityLiveRegion: 'polite' as const,
    accessibilityState: {
      busy: isLoading,
    },
  };
}

/**
 * Create accessible error state
 */
export function createErrorAccessibility(error: string | null) {
  if (!error) return {};
  
  return {
    accessible: true,
    accessibilityRole: 'alert' as const,
    accessibilityLabel: `Error: ${error}`,
    accessibilityLiveRegion: 'assertive' as const,
    importantForAccessibility: 'yes' as const,
  };
}