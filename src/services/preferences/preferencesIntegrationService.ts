/**
 * Preferences Integration Service
 * Integrates user preferences with content delivery and other services
 */
import { userPreferencesService } from './userPreferencesService';
import { contentDeliveryService } from '../content/contentDeliveryService';
import { healthTipService } from '../content/healthTipService';
import { HealthTip } from '../../models/HealthTip';
import { UserPreferences } from '../../models/UserPreferences';

export class PreferencesIntegrationService {
  private static instance: PreferencesIntegrationService;

  static getInstance(): PreferencesIntegrationService {
    if (!PreferencesIntegrationService.instance) {
      PreferencesIntegrationService.instance = new PreferencesIntegrationService();
    }
    return PreferencesIntegrationService.instance;
  }

  /**
   * Get personalized health tips based on user preferences
   */
  async getPersonalizedTips(
    userId: string,
    count: number = 5,
    options: {
      excludeViewed?: boolean;
      forceRefresh?: boolean;
    } = {}
  ): Promise<HealthTip[]> {
    try {
      // Get user preferences
      const preferences = await userPreferencesService.getUserPreferences(userId);
      const contentFilter = await userPreferencesService.getContentFilter(userId);

      // Get tips based on preferences
      const tips = await healthTipService.getTipsByFilters({
        categories: contentFilter.categories,
        difficulty: contentFilter.difficulty,
        maxReadingTime: contentFilter.maxReadingTime,
        count,
        excludeViewed: options.excludeViewed,
        userId: contentFilter.personalizedContent ? userId : undefined
      });

      // Apply AI recommendations if enabled
      if (contentFilter.aiRecommendations && tips.length > 0) {
        return this.applyAIRecommendations(userId, tips, preferences);
      }

      return tips;
    } catch (error) {
      console.error('Error getting personalized tips:', error);
      // Fallback to general tips
      return await healthTipService.getTipsByFilters({
        categories: ['nutrition', 'fitness', 'mentalWellness', 'sleep'],
        count
      });
    }
  }

  /**
   * Check if content should be delivered based on user preferences
   */
  async shouldDeliverContent(
    userId: string,
    contentType: string,
    contentId: string
  ): Promise<boolean> {
    try {
      const preferences = await userPreferencesService.getUserPreferences(userId);

      // Check privacy settings
      if (!preferences.privacy.dataCollection && contentType === 'personalized') {
        return false;
      }

      // Check content preferences
      const contentFilter = await userPreferencesService.getContentFilter(userId);
      
      // If AI recommendations are disabled, don't deliver AI-generated content
      if (!contentFilter.aiRecommendations && contentType === 'ai_recommended') {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking content delivery permissions:', error);
      return true; // Default to allowing content
    }
  }

  /**
   * Get notification delivery preferences
   */
  async getNotificationPreferences(userId: string): Promise<{
    canSend: boolean;
    frequency: 'low' | 'medium' | 'high';
    quietHours: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
    types: {
      dailyTips: boolean;
      weeklyDigest: boolean;
      achievements: boolean;
      reminders: boolean;
    };
  }> {
    try {
      const preferences = await userPreferencesService.getUserPreferences(userId);
      
      return {
        canSend: preferences.notifications.enabled,
        frequency: preferences.notifications.frequency,
        quietHours: preferences.notifications.quietHours,
        types: {
          dailyTips: preferences.notifications.dailyTips,
          weeklyDigest: preferences.notifications.weeklyDigest,
          achievements: preferences.notifications.achievements,
          reminders: preferences.notifications.reminders
        }
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return {
        canSend: false,
        frequency: 'medium',
        quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' },
        types: { dailyTips: false, weeklyDigest: false, achievements: false, reminders: false }
      };
    }
  }

  /**
   * Apply theme and display preferences to content
   */
  async applyDisplayPreferences(
    userId: string,
    content: any
  ): Promise<any> {
    try {
      const preferences = await userPreferencesService.getUserPreferences(userId);
      
      return {
        ...content,
        displaySettings: {
          theme: preferences.display.theme,
          fontSize: preferences.display.fontSize,
          highContrast: preferences.display.highContrast,
          reduceMotion: preferences.display.reduceMotion,
          compactMode: preferences.display.compactMode
        },
        accessibilitySettings: {
          screenReader: preferences.accessibility.screenReader,
          voiceOver: preferences.accessibility.voiceOver,
          largeText: preferences.accessibility.largeText,
          buttonShapes: preferences.accessibility.buttonShapes,
          reduceTransparency: preferences.accessibility.reduceTransparency
        }
      };
    } catch (error) {
      console.error('Error applying display preferences:', error);
      return content;
    }
  }

  /**
   * Get analytics preferences for tracking
   */
  async getAnalyticsPreferences(userId: string): Promise<{
    allowAnalytics: boolean;
    allowPersonalization: boolean;
    allowDataSharing: boolean;
    allowLocationTracking: boolean;
    allowCrashReporting: boolean;
  }> {
    try {
      const preferences = await userPreferencesService.getUserPreferences(userId);
      
      return {
        allowAnalytics: preferences.privacy.analytics,
        allowPersonalization: preferences.privacy.personalization,
        allowDataSharing: preferences.privacy.dataSharing,
        allowLocationTracking: preferences.privacy.locationTracking,
        allowCrashReporting: preferences.privacy.crashReporting
      };
    } catch (error) {
      console.error('Error getting analytics preferences:', error);
      return {
        allowAnalytics: false,
        allowPersonalization: false,
        allowDataSharing: false,
        allowLocationTracking: false,
        allowCrashReporting: true // Default to allowing crash reports for app stability
      };
    }
  }

  /**
   * Update content delivery based on preference changes
   */
  async onPreferencesUpdated(
    userId: string,
    oldPreferences: UserPreferences,
    newPreferences: UserPreferences
  ): Promise<void> {
    try {
      // Check if content preferences changed
      const contentChanged = JSON.stringify(oldPreferences.content) !== 
                           JSON.stringify(newPreferences.content);
      
      if (contentChanged) {
        // Clear content cache to force refresh with new preferences
        await this.clearUserContentCache(userId);
        
        // Prefetch new content based on updated preferences
        await this.prefetchPersonalizedContent(userId);
      }

      // Check if notification preferences changed
      const notificationChanged = JSON.stringify(oldPreferences.notifications) !== 
                                JSON.stringify(newPreferences.notifications);
      
      if (notificationChanged) {
        // Update notification scheduling
        await this.updateNotificationSchedule(userId, newPreferences);
      }

      // Check if privacy preferences changed
      const privacyChanged = JSON.stringify(oldPreferences.privacy) !== 
                           JSON.stringify(newPreferences.privacy);
      
      if (privacyChanged) {
        // Handle privacy preference changes
        await this.handlePrivacyPreferenceChanges(userId, oldPreferences.privacy, newPreferences.privacy);
      }
    } catch (error) {
      console.error('Error handling preference updates:', error);
    }
  }

  /**
   * Private helper methods
   */
  private async applyAIRecommendations(
    userId: string,
    tips: HealthTip[],
    preferences: UserPreferences
  ): Promise<HealthTip[]> {
    // This would integrate with AI service to reorder/filter tips
    // For now, return tips as-is
    return tips;
  }

  private async clearUserContentCache(userId: string): Promise<void> {
    // Clear user-specific content cache
    console.log(`Clearing content cache for user ${userId}`);
  }

  private async prefetchPersonalizedContent(userId: string): Promise<void> {
    // Prefetch content based on new preferences
    console.log(`Prefetching personalized content for user ${userId}`);
  }

  private async updateNotificationSchedule(
    userId: string,
    preferences: UserPreferences
  ): Promise<void> {
    // Update notification scheduling based on new preferences
    console.log(`Updating notification schedule for user ${userId}`);
  }

  private async handlePrivacyPreferenceChanges(
    userId: string,
    oldPrivacy: UserPreferences['privacy'],
    newPrivacy: UserPreferences['privacy']
  ): Promise<void> {
    // Handle privacy preference changes
    if (oldPrivacy.dataCollection && !newPrivacy.dataCollection) {
      // User disabled data collection - stop collecting data
      console.log(`Data collection disabled for user ${userId}`);
    }

    if (oldPrivacy.analytics && !newPrivacy.analytics) {
      // User disabled analytics - stop analytics tracking
      console.log(`Analytics disabled for user ${userId}`);
    }

    if (oldPrivacy.personalization && !newPrivacy.personalization) {
      // User disabled personalization - clear personalization data
      console.log(`Personalization disabled for user ${userId}`);
    }
  }
}

// Export singleton instance
export const preferencesIntegrationService = PreferencesIntegrationService.getInstance();