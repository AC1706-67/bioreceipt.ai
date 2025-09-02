/**
 * Substance Navigation Service
 * Handles navigation flows for substance-related operations
 */

import { NavigationProp } from '@react-navigation/native';
import { Database } from '../../config/supabase';

type Substance = Database['public']['Tables']['substances']['Row'] & {
  substance_categories: { id: string; name: string };
};

interface NavigationParams {
  preSelectedSubstance?: Substance;
  autoFocusQuantity?: boolean;
  fromCustomSubstanceCreation?: boolean;
}

class SubstanceNavigationService {
  private navigation: NavigationProp<any> | null = null;

  /**
   * Set the navigation instance
   */
  setNavigation(navigation: NavigationProp<any>) {
    this.navigation = navigation;
  }

  /**
   * Navigate to logging screen with pre-selected substance
   */
  navigateToLoggingWithSubstance(
    substance: Substance,
    options: {
      autoFocusQuantity?: boolean;
      fromCustomCreation?: boolean;
      showSuccessMessage?: boolean;
    } = {}
  ) {
    if (!this.navigation) {
      console.warn('Navigation not set in SubstanceNavigationService');
      return;
    }

    const params: NavigationParams = {
      preSelectedSubstance: substance,
      autoFocusQuantity: options.autoFocusQuantity ?? true,
      fromCustomSubstanceCreation: options.fromCustomCreation ?? false,
    };

    try {
      // Navigate to the logging screen with parameters
      this.navigation.navigate('LoggingScreen', params);

      // Log analytics event for tracking
      this.logNavigationEvent('substance_auto_selected', {
        substanceId: substance.id,
        substanceName: substance.name,
        category: substance.substance_categories.name,
        fromCustomCreation: options.fromCustomCreation,
      });

    } catch (error) {
      console.error('Error navigating to logging screen:', error);
    }
  }

  /**
   * Handle post-creation navigation flow
   */
  handlePostCreationFlow(
    substance: Substance,
    currentScreen: string
  ) {
    if (currentScreen === 'LoggingScreen') {
      // Already on logging screen, no navigation needed
      // The parent component will handle the auto-selection
      return;
    }

    // Navigate to logging screen with the new substance
    this.navigateToLoggingWithSubstance(substance, {
      autoFocusQuantity: true,
      fromCustomCreation: true,
      showSuccessMessage: true,
    });
  }

  /**
   * Check if we can navigate to logging screen
   */
  canNavigateToLogging(): boolean {
    return this.navigation !== null;
  }

  /**
   * Get current route name
   */
  getCurrentRouteName(): string | undefined {
    if (!this.navigation) {
      return undefined;
    }

    try {
      return this.navigation.getCurrentRoute()?.name;
    } catch (error) {
      console.error('Error getting current route name:', error);
      return undefined;
    }
  }

  /**
   * Navigate back with substance selection
   */
  navigateBackWithSubstance(substance: Substance) {
    if (!this.navigation) {
      console.warn('Navigation not set in SubstanceNavigationService');
      return;
    }

    try {
      // Go back to previous screen and pass the substance
      this.navigation.goBack();
      
      // Use setParams to update the previous screen
      setTimeout(() => {
        this.navigation?.setParams({
          selectedSubstance: substance,
          autoFocusQuantity: true,
        });
      }, 100);

    } catch (error) {
      console.error('Error navigating back with substance:', error);
    }
  }

  /**
   * Reset navigation state
   */
  reset() {
    this.navigation = null;
  }

  /**
   * Log navigation events for analytics
   */
  private logNavigationEvent(
    eventName: string,
    properties: Record<string, any>
  ) {
    try {
      // This would integrate with your analytics service
      console.log('Navigation Event:', eventName, properties);
      
      // Example: analytics.track(eventName, properties);
    } catch (error) {
      console.error('Error logging navigation event:', error);
    }
  }

  /**
   * Handle deep link navigation to substance logging
   */
  handleDeepLinkToSubstance(substanceId: string) {
    if (!this.navigation) {
      console.warn('Navigation not set for deep link handling');
      return;
    }

    // This would be used for deep links like: app://log-substance/123
    this.navigation.navigate('LoggingScreen', {
      preSelectedSubstanceId: substanceId,
      autoFocusQuantity: true,
    });
  }

  /**
   * Handle navigation state changes
   */
  onNavigationStateChange(state: any) {
    try {
      // Track navigation state changes for analytics
      const currentRoute = state?.routes?.[state.index];
      if (currentRoute) {
        this.logNavigationEvent('screen_view', {
          screenName: currentRoute.name,
          params: currentRoute.params,
        });
      }
    } catch (error) {
      console.error('Error handling navigation state change:', error);
    }
  }
}

// Export singleton instance
export const substanceNavigationService = new SubstanceNavigationService();

// Export types for use in components
export type { NavigationParams, Substance };