/**
 * Profile Service
 * Business logic for user profile and onboarding management
 */

import { supabase } from '../../config/supabase';
import { 
  UserProfile, 
  OnboardingData, 
  ProfileUpdateData, 
  HealthInterest,
  OnboardingStep,
  DEFAULT_USER_PREFERENCES,
  CommonGoal,
  COMMON_GOALS
} from '../../types/userProfile';
import { validateData } from '../../validation/schemas';
import { userProfileSchema, onboardingDataSchema, profileUpdateSchema } from '../../validation/schemas';
import { loggingService } from '../logging/loggingService';
import { cacheService } from '../cache/cacheService';
import { v4 as uuidv4 } from 'uuid';

export class ProfileService {
  private static instance: ProfileService;
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = 'profile:';

  private constructor() {}

  public static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  /**
   * Get complete user profile with all related data
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Try cache first
      const cacheKey = `${this.CACHE_PREFIX}${userId}`;
      const cachedProfile = await cacheService.get<UserProfile>(cacheKey);
      if (cachedProfile) {
        return cachedProfile;
      }

      // Get main profile data
      const { data: profileData, error: profileError } = await supabase
        .from('user_profile_complete')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          return null; // User not found
        }
        throw new Error(`Failed to get profile: ${profileError.message}`);
      }

      // Get health interests
      const healthInterests = await this.getHealthInterests(userId);

      // Get user goals
      const goals = await this.getUserGoals(userId);

      // Construct complete profile
      const profile: UserProfile = {
        id: profileData.id,
        name: profileData.name || profileData.display_name,
        email: profileData.email,
        phoneNumber: profileData.phone_number,
        avatar: profileData.avatar,
        age: profileData.age,
        gender: profileData.gender,
        healthInterests,
        goals,
        timezone: profileData.timezone,
        language: profileData.language,
        preferences: {
          notificationsEnabled: profileData.notifications_enabled,
          dailyTipTime: profileData.daily_tip_time,
          weeklyGoal: profileData.weekly_goal,
          preferredCategories: profileData.preferred_categories ? 
            JSON.parse(profileData.preferred_categories) : [],
          difficulty: profileData.difficulty,
          enableAIPersonalization: profileData.enable_ai_personalization,
          shareDataForPersonalization: profileData.share_data_for_personalization,
          privacySettings: {
            shareProgress: profileData.share_progress,
            allowAnalytics: profileData.allow_analytics,
            allowPersonalization: profileData.allow_personalization,
            dataRetentionConsent: profileData.data_retention_consent,
          },
          accessibilitySettings: {
            fontSize: profileData.font_size,
            highContrast: profileData.high_contrast,
            reduceMotion: profileData.reduce_motion,
            screenReaderOptimized: profileData.screen_reader_optimized,
          },
        },
        onboardingCompleted: profileData.onboarding_completed,
        onboardingStep: profileData.onboarding_step,
        isActive: profileData.is_active,
        lastLoginAt: profileData.last_login_at ? new Date(profileData.last_login_at) : undefined,
        createdAt: new Date(profileData.created_at),
        updatedAt: new Date(profileData.updated_at),
      };

      // Cache the profile
      await cacheService.set(cacheKey, profile, this.CACHE_TTL);

      await loggingService.logInfo('User profile retrieved successfully', {
        userId,
        onboardingCompleted: profile.onboardingCompleted,
      });

      return profile;
    } catch (error) {
      await loggingService.logError('Failed to get user profile', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updateData: ProfileUpdateData): Promise<UserProfile> {
    try {
      // Validate update data
      const validation = await validateData(profileUpdateSchema, updateData);
      if (!validation.isValid) {
        const error = new Error('Profile validation failed');
        (error as any).code = 'VALIDATION_ERROR';
        (error as any).details = validation.errors;
        throw error;
      }

      const validatedData = validation.data!;

      // Start transaction
      const updates: any = {};
      
      // Basic profile updates
      if (validatedData.name) updates.name = validatedData.name;
      if (validatedData.age !== undefined) updates.age = validatedData.age;
      if (validatedData.gender !== undefined) updates.gender = validatedData.gender;

      // Update main profile if there are basic field changes
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update(updates)
          .eq('id', userId);

        if (profileError) {
          throw new Error(`Failed to update profile: ${profileError.message}`);
        }
      }

      // Update health interests if provided
      if (validatedData.healthInterests) {
        await this.updateHealthInterests(userId, validatedData.healthInterests);
      }

      // Update goals if provided
      if (validatedData.goals) {
        await this.updateUserGoals(userId, validatedData.goals);
      }

      // Update preferences if provided
      if (validatedData.preferences) {
        await this.updateUserPreferences(userId, validatedData.preferences);
      }

      // Clear cache
      await this.clearUserCache(userId);

      // Return updated profile
      const updatedProfile = await this.getUserProfile(userId);
      if (!updatedProfile) {
        throw new Error('Failed to retrieve updated profile');
      }

      await loggingService.logInfo('User profile updated successfully', {
        userId,
        updatedFields: Object.keys(validatedData),
      });

      return updatedProfile;
    } catch (error) {
      await loggingService.logError('Failed to update user profile', error as Error, {
        userId,
        updateData,
      });
      throw error;
    }
  }

  /**
   * Get onboarding progress
   */
  async getOnboardingProgress(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Create initial onboarding progress
          return await this.createOnboardingProgress(userId);
        }
        throw new Error(`Failed to get onboarding progress: ${error.message}`);
      }

      return {
        currentStep: data.current_step,
        completedSteps: JSON.parse(data.completed_steps || '[]'),
        startedAt: new Date(data.started_at),
        completedAt: data.completed_at ? new Date(data.completed_at) : null,
        data: data.data ? JSON.parse(data.data) : {},
      };
    } catch (error) {
      await loggingService.logError('Failed to get onboarding progress', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Update onboarding progress
   */
  async updateOnboardingProgress(userId: string, onboardingData: OnboardingData): Promise<any> {
    try {
      // Validate onboarding data
      const validation = await validateData(onboardingDataSchema, onboardingData);
      if (!validation.isValid) {
        const error = new Error('Onboarding validation failed');
        (error as any).code = 'VALIDATION_ERROR';
        (error as any).details = validation.errors;
        throw error;
      }

      const validatedData = validation.data!;

      // Update onboarding progress
      const { error: progressError } = await supabase
        .from('onboarding_progress')
        .update({
          current_step: validatedData.currentStep,
          completed_steps: JSON.stringify(validatedData.completedSteps),
          data: JSON.stringify(validatedData),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (progressError) {
        throw new Error(`Failed to update onboarding progress: ${progressError.message}`);
      }

      // Update user profile onboarding step
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          onboarding_step: validatedData.currentStep,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileError) {
        throw new Error(`Failed to update profile onboarding step: ${profileError.message}`);
      }

      // If we have complete data for a step, save it to the appropriate tables
      await this.saveOnboardingStepData(userId, validatedData);

      // Clear cache
      await this.clearUserCache(userId);

      await loggingService.logInfo('Onboarding progress updated', {
        userId,
        currentStep: validatedData.currentStep,
        completedSteps: validatedData.completedSteps,
      });

      return await this.getOnboardingProgress(userId);
    } catch (error) {
      await loggingService.logError('Failed to update onboarding progress', error as Error, {
        userId,
        onboardingData,
      });
      throw error;
    }
  }

  /**
   * Complete onboarding process
   */
  async completeOnboarding(userId: string): Promise<UserProfile> {
    try {
      // Get current onboarding progress
      const progress = await this.getOnboardingProgress(userId);
      
      // Validate that all required steps are completed
      const requiredSteps: OnboardingStep[] = ['basic_info', 'health_interests', 'goals', 'preferences'];
      const missingSteps = requiredSteps.filter(step => !progress.completedSteps.includes(step));
      
      if (missingSteps.length > 0) {
        const error = new Error('Onboarding incomplete');
        (error as any).code = 'ONBOARDING_INCOMPLETE';
        (error as any).missingSteps = missingSteps;
        throw error;
      }

      // Mark onboarding as complete
      const completedAt = new Date().toISOString();
      
      const { error: progressError } = await supabase
        .from('onboarding_progress')
        .update({
          current_step: 'complete',
          completed_steps: JSON.stringify([...progress.completedSteps, 'complete']),
          completed_at: completedAt,
          updated_at: completedAt,
        })
        .eq('user_id', userId);

      if (progressError) {
        throw new Error(`Failed to complete onboarding progress: ${progressError.message}`);
      }

      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          onboarding_completed: true,
          onboarding_step: 'complete',
          updated_at: completedAt,
        })
        .eq('id', userId);

      if (profileError) {
        throw new Error(`Failed to complete profile onboarding: ${profileError.message}`);
      }

      // Clear cache
      await this.clearUserCache(userId);

      // Get updated profile
      const completedProfile = await this.getUserProfile(userId);
      if (!completedProfile) {
        throw new Error('Failed to retrieve completed profile');
      }

      await loggingService.logInfo('Onboarding completed successfully', {
        userId,
        completedAt,
      });

      return completedProfile;
    } catch (error) {
      await loggingService.logError('Failed to complete onboarding', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get user's health interests
   */
  async getHealthInterests(userId: string): Promise<HealthInterest[]> {
    try {
      const { data, error } = await supabase
        .from('health_interests')
        .select('*')
        .eq('user_id', userId)
        .order('priority', { ascending: true });

      if (error) {
        throw new Error(`Failed to get health interests: ${error.message}`);
      }

      return (data || []).map(item => ({
        category: item.category,
        level: item.level,
        priority: item.priority,
      }));
    } catch (error) {
      await loggingService.logError('Failed to get health interests', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Update user's health interests
   */
  async updateHealthInterests(userId: string, healthInterests: HealthInterest[]): Promise<HealthInterest[]> {
    try {
      // Delete existing interests
      const { error: deleteError } = await supabase
        .from('health_interests')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        throw new Error(`Failed to delete existing health interests: ${deleteError.message}`);
      }

      // Insert new interests
      if (healthInterests.length > 0) {
        const interestsToInsert = healthInterests.map(interest => ({
          id: uuidv4(),
          user_id: userId,
          category: interest.category,
          level: interest.level,
          priority: interest.priority,
        }));

        const { error: insertError } = await supabase
          .from('health_interests')
          .insert(interestsToInsert);

        if (insertError) {
          throw new Error(`Failed to insert health interests: ${insertError.message}`);
        }
      }

      await loggingService.logInfo('Health interests updated', {
        userId,
        interestCount: healthInterests.length,
        categories: healthInterests.map(hi => hi.category),
      });

      return healthInterests;
    } catch (error) {
      await loggingService.logError('Failed to update health interests', error as Error, {
        userId,
        healthInterests,
      });
      throw error;
    }
  }

  /**
   * Get user's goals
   */
  async getUserGoals(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_goals')
        .select('goal_type')
        .eq('user_id', userId)
        .order('priority', { ascending: true });

      if (error) {
        throw new Error(`Failed to get user goals: ${error.message}`);
      }

      return (data || []).map(item => item.goal_type);
    } catch (error) {
      await loggingService.logError('Failed to get user goals', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Update user's goals
   */
  async updateUserGoals(userId: string, goals: string[]): Promise<string[]> {
    try {
      // Validate goals
      const validGoals = goals.filter(goal => COMMON_GOALS.includes(goal as CommonGoal));
      if (validGoals.length !== goals.length) {
        throw new Error('Invalid goal types provided');
      }

      // Delete existing goals
      const { error: deleteError } = await supabase
        .from('user_goals')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        throw new Error(`Failed to delete existing goals: ${deleteError.message}`);
      }

      // Insert new goals
      if (validGoals.length > 0) {
        const goalsToInsert = validGoals.map((goal, index) => ({
          id: uuidv4(),
          user_id: userId,
          goal_type: goal,
          priority: index + 1,
        }));

        const { error: insertError } = await supabase
          .from('user_goals')
          .insert(goalsToInsert);

        if (insertError) {
          throw new Error(`Failed to insert goals: ${insertError.message}`);
        }
      }

      await loggingService.logInfo('User goals updated', {
        userId,
        goalCount: validGoals.length,
        goals: validGoals,
      });

      return validGoals;
    } catch (error) {
      await loggingService.logError('Failed to update user goals', error as Error, {
        userId,
        goals,
      });
      throw error;
    }
  }

  /**
   * Delete user profile (GDPR compliance)
   */
  async deleteUserProfile(userId: string): Promise<void> {
    try {
      // Soft delete - mark as inactive
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_active: false,
          email: null, // Remove PII
          phone_number: null,
          name: 'Deleted User',
          avatar: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        throw new Error(`Failed to delete user profile: ${error.message}`);
      }

      // Clear all caches
      await this.clearUserCache(userId);

      await loggingService.logInfo('User profile deleted', {
        userId,
        deletedAt: new Date(),
      });
    } catch (error) {
      await loggingService.logError('Failed to delete user profile', error as Error, { userId });
      throw error;
    }
  }

  // Private helper methods

  /**
   * Create initial onboarding progress
   */
  private async createOnboardingProgress(userId: string): Promise<any> {
    const initialProgress = {
      id: uuidv4(),
      user_id: userId,
      current_step: 'welcome',
      completed_steps: '[]',
      started_at: new Date().toISOString(),
      data: '{}',
    };

    const { error } = await supabase
      .from('onboarding_progress')
      .insert([initialProgress]);

    if (error) {
      throw new Error(`Failed to create onboarding progress: ${error.message}`);
    }

    return {
      currentStep: 'welcome',
      completedSteps: [],
      startedAt: new Date(initialProgress.started_at),
      completedAt: null,
      data: {},
    };
  }

  /**
   * Save onboarding step data to appropriate tables
   */
  private async saveOnboardingStepData(userId: string, onboardingData: OnboardingData): Promise<void> {
    try {
      // Save basic info to user profile
      if (onboardingData.name || onboardingData.age !== undefined || onboardingData.gender !== undefined) {
        const updates: any = {};
        if (onboardingData.name) updates.name = onboardingData.name;
        if (onboardingData.age !== undefined) updates.age = onboardingData.age;
        if (onboardingData.gender !== undefined) updates.gender = onboardingData.gender;
        
        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          
          const { error } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('id', userId);

          if (error) {
            throw new Error(`Failed to save basic info: ${error.message}`);
          }
        }
      }

      // Save health interests
      if (onboardingData.healthInterests) {
        await this.updateHealthInterests(userId, onboardingData.healthInterests);
      }

      // Save goals
      if (onboardingData.goals) {
        await this.updateUserGoals(userId, onboardingData.goals);
      }

      // Save preferences
      if (onboardingData.preferences) {
        await this.updateUserPreferences(userId, onboardingData.preferences);
      }
    } catch (error) {
      await loggingService.logError('Failed to save onboarding step data', error as Error, {
        userId,
        onboardingData,
      });
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  private async updateUserPreferences(userId: string, preferences: any): Promise<void> {
    try {
      const updates: any = {};
      
      if (preferences.notificationsEnabled !== undefined) {
        updates.notifications_enabled = preferences.notificationsEnabled;
      }
      if (preferences.dailyTipTime) {
        updates.daily_tip_time = preferences.dailyTipTime;
      }
      if (preferences.weeklyGoal !== undefined) {
        updates.weekly_goal = preferences.weeklyGoal;
      }
      if (preferences.preferredCategories) {
        updates.preferred_categories = JSON.stringify(preferences.preferredCategories);
      }
      if (preferences.difficulty) {
        updates.difficulty = preferences.difficulty;
      }
      if (preferences.enableAIPersonalization !== undefined) {
        updates.enable_ai_personalization = preferences.enableAIPersonalization;
      }
      if (preferences.shareDataForPersonalization !== undefined) {
        updates.share_data_for_personalization = preferences.shareDataForPersonalization;
      }

      // Privacy settings
      if (preferences.privacySettings) {
        const privacy = preferences.privacySettings;
        if (privacy.shareProgress !== undefined) updates.share_progress = privacy.shareProgress;
        if (privacy.allowAnalytics !== undefined) updates.allow_analytics = privacy.allowAnalytics;
        if (privacy.allowPersonalization !== undefined) updates.allow_personalization = privacy.allowPersonalization;
        if (privacy.dataRetentionConsent !== undefined) updates.data_retention_consent = privacy.dataRetentionConsent;
      }

      // Accessibility settings
      if (preferences.accessibilitySettings) {
        const accessibility = preferences.accessibilitySettings;
        if (accessibility.fontSize) updates.font_size = accessibility.fontSize;
        if (accessibility.highContrast !== undefined) updates.high_contrast = accessibility.highContrast;
        if (accessibility.reduceMotion !== undefined) updates.reduce_motion = accessibility.reduceMotion;
        if (accessibility.screenReaderOptimized !== undefined) updates.screen_reader_optimized = accessibility.screenReaderOptimized;
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from('user_preferences')
          .update(updates)
          .eq('user_id', userId);

        if (error) {
          throw new Error(`Failed to update preferences: ${error.message}`);
        }
      }
    } catch (error) {
      await loggingService.logError('Failed to update user preferences', error as Error, {
        userId,
        preferences,
      });
      throw error;
    }
  }

  /**
   * Clear user-related caches
   */
  private async clearUserCache(userId: string): Promise<void> {
    try {
      await cacheService.delete(`${this.CACHE_PREFIX}${userId}`);
      await cacheService.deletePattern(`personalized-tips-${userId}-*`);
      await cacheService.deletePattern(`personalization-profile-${userId}`);
    } catch (error) {
      await loggingService.logWarning('Failed to clear user cache', { userId, error });
    }
  }
}

// Export singleton instance
export const profileService = ProfileService.getInstance();