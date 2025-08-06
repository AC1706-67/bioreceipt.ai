/**
 * AI Personalization Integration Service
 * Integrates with KIRO AI for personalized health tip recommendations
 */
import { HealthTip } from '../../models/HealthTip';
import { UserPreferences } from '../../models/UserPreferences';
import { userPreferencesService } from '../preferences/userPreferencesService';
import { healthTipService } from '../content/healthTipService';
import { engagementTrackingService } from './engagementTrackingService';
import { aiPersonalizationService } from './aiPersonalizationService';
import { analyticsService } from '../analytics/analyticsService';

export interface PersonalizationContext {
  userId: string;
  userProfile: {
    age?: number;
    gender?: string;
    healthInterests: string[];
    fitnessLevel?: string;
  };
  engagementHistory: {
    viewedTips: string[];
    likedTips: string[];
    completedTips: string[];
    bookmarkedTips: string[];
    skipCount: number;
    averageEngagementTime: number;
  };
  preferences: UserPreferences;
  contextualFactors: {
    timeOfDay: string;
    dayOfWeek: string;
    season: string;
    recentActivity?: string;
  };
}

export interface PersonalizationResult {
  tips: HealthTip[];
  confidence: number;
  reasoning: string[];
  fallbackUsed: boolean;
  personalizationVersion: string;
}

export interface AIPersonalizationConfig {
  maxTipsPerRequest: number;
  minConfidenceThreshold: number;
  fallbackEnabled: boolean;
  learningEnabled: boolean;
  contextualFactorsEnabled: boolean;
}

class AIPersonalizationIntegrationService {
  private static instance: AIPersonalizationIntegrationService;
  private config: AIPersonalizationConfig;
  private isKiroAIAvailable: boolean = true;

  private constructor() {
    this.config = {
      maxTipsPerRequest: 10,
      minConfidenceThreshold: 0.6,
      fallbackEnabled: true,
      learningEnabled: true,
      contextualFactorsEnabled: true
    };
  }

  static getInstance(): AIPersonalizationIntegrationService {
    if (!AIPersonalizationIntegrationService.instance) {
      AIPersonalizationIntegrationService.instance = new AIPersonalizationIntegrationService();
    }
    return AIPersonalizationIntegrationService.instance;
  }

  /**
   * Get personalized health tips using KIRO AI
   * Requirement 3.1: Use KIRO AI basic version to personalize content
   */
  async getPersonalizedTips(
    userId: string,
    requestedCount: number = 5,
    options: {
      excludeViewed?: boolean;
      includeContextualFactors?: boolean;
      forceRefresh?: boolean;
    } = {}
  ): Promise<PersonalizationResult> {
    try {
      // Build personalization context
      const context = await this.buildPersonalizationContext(userId, options);
      
      // Check if AI personalization should be used
      if (!this.shouldUseAIPersonalization(context)) {
        return await this.getFallbackTips(userId, requestedCount, 'ai_disabled');
      }

      // Attempt AI personalization
      const aiResult = await this.performAIPersonalization(context, requestedCount);
      
      // Validate AI result quality
      if (aiResult.confidence < this.config.minConfidenceThreshold) {
        console.warn(`AI confidence ${aiResult.confidence} below threshold ${this.config.minConfidenceThreshold}`);
        return await this.getFallbackTips(userId, requestedCount, 'low_confidence');
      }

      // Track successful personalization
      await this.trackPersonalizationSuccess(userId, aiResult);
      
      return aiResult;

    } catch (error) {
      console.error('AI personalization failed:', error);
      
      // Requirement 3.5: Fall back to curated general health tips
      if (this.config.fallbackEnabled) {
        return await this.getFallbackTips(userId, requestedCount, 'ai_error');
      }
      
      throw error;
    }
  }

  /**
   * Update personalization based on user engagement
   * Requirement 3.3: Update personalization algorithms based on interactions
   */
  async updatePersonalizationFromEngagement(
    userId: string,
    tipId: string,
    engagementType: 'view' | 'like' | 'complete' | 'bookmark' | 'skip' | 'share',
    engagementData: {
      timeSpent?: number;
      rating?: number;
      feedback?: string;
      context?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      if (!this.config.learningEnabled) {
        return;
      }

      // Record engagement
      await engagementTrackingService.recordEngagement(userId, tipId, engagementType, engagementData);

      // Update AI personalization model
      await aiPersonalizationService.updateUserModel(userId, {
        tipId,
        engagementType,
        ...engagementData,
        timestamp: new Date()
      });

      // Track analytics
      analyticsService.trackEvent('personalization_learning', {
        userId,
        tipId,
        engagementType,
        hasRating: !!engagementData.rating,
        hasFeedback: !!engagementData.feedback
      });

    } catch (error) {
      console.error('Failed to update personalization from engagement:', error);
      // Don't throw - engagement tracking failures shouldn't break the app
    }
  }

  /**
   * Get personalization insights for user
   */
  async getPersonalizationInsights(userId: string): Promise<{
    profileCompleteness: number;
    engagementScore: number;
    preferredCategories: string[];
    recommendedImprovements: string[];
    personalizationAccuracy: number;
  }> {
    try {
      const context = await this.buildPersonalizationContext(userId);
      const engagementStats = await engagementTrackingService.getUserEngagementStats(userId);
      
      return {
        profileCompleteness: this.calculateProfileCompleteness(context.userProfile),
        engagementScore: engagementStats.overallScore,
        preferredCategories: this.extractPreferredCategories(context.engagementHistory),
        recommendedImprovements: this.generateImprovementRecommendations(context),
        personalizationAccuracy: await this.calculatePersonalizationAccuracy(userId)
      };

    } catch (error) {
      console.error('Failed to get personalization insights:', error);
      return {
        profileCompleteness: 0,
        engagementScore: 0,
        preferredCategories: [],
        recommendedImprovements: [],
        personalizationAccuracy: 0
      };
    }
  }

  /**
   * Configure AI personalization settings
   */
  updateConfiguration(newConfig: Partial<AIPersonalizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Check AI service health
   */
  async checkAIServiceHealth(): Promise<{
    available: boolean;
    responseTime: number;
    version: string;
    capabilities: string[];
  }> {
    try {
      const startTime = Date.now();
      const healthCheck = await aiPersonalizationService.healthCheck();
      const responseTime = Date.now() - startTime;

      this.isKiroAIAvailable = healthCheck.status === 'healthy';

      return {
        available: this.isKiroAIAvailable,
        responseTime,
        version: healthCheck.version || 'unknown',
        capabilities: healthCheck.capabilities || []
      };

    } catch (error) {
      console.error('AI service health check failed:', error);
      this.isKiroAIAvailable = false;
      
      return {
        available: false,
        responseTime: -1,
        version: 'unknown',
        capabilities: []
      };
    }
  }

  /**
   * Private helper methods
   */
  private async buildPersonalizationContext(
    userId: string,
    options: { includeContextualFactors?: boolean } = {}
  ): Promise<PersonalizationContext> {
    const [preferences, engagementHistory, userProfile] = await Promise.all([
      userPreferencesService.getUserPreferences(userId),
      engagementTrackingService.getUserEngagementHistory(userId),
      this.getUserProfile(userId) // This would come from user service
    ]);

    const context: PersonalizationContext = {
      userId,
      userProfile,
      engagementHistory,
      preferences,
      contextualFactors: {
        timeOfDay: this.getTimeOfDay(),
        dayOfWeek: this.getDayOfWeek(),
        season: this.getSeason()
      }
    };

    if (options.includeContextualFactors && this.config.contextualFactorsEnabled) {
      context.contextualFactors.recentActivity = await this.getRecentActivity(userId);
    }

    return context;
  }

  private shouldUseAIPersonalization(context: PersonalizationContext): boolean {
    // Check if AI is available
    if (!this.isKiroAIAvailable) {
      return false;
    }

    // Check if user has opted out of AI recommendations
    if (!context.preferences.content.aiRecommendations) {
      return false;
    }

    // Check if user has opted out of personalization
    if (!context.preferences.content.personalizedContent) {
      return false;
    }

    // Check if we have sufficient data for personalization
    const hasMinimalProfile = context.userProfile.healthInterests.length > 0;
    const hasEngagementData = context.engagementHistory.viewedTips.length > 0;

    return hasMinimalProfile || hasEngagementData;
  }

  private async performAIPersonalization(
    context: PersonalizationContext,
    requestedCount: number
  ): Promise<PersonalizationResult> {
    try {
      // Call KIRO AI service for personalization
      const aiResponse = await aiPersonalizationService.getPersonalizedRecommendations({
        userId: context.userId,
        userProfile: context.userProfile,
        preferences: context.preferences.content,
        engagementHistory: context.engagementHistory,
        contextualFactors: context.contextualFactors,
        requestedCount,
        excludeViewed: true
      });

      // Fetch the actual tip content
      const tips = await this.fetchTipsByIds(aiResponse.recommendedTipIds);

      return {
        tips,
        confidence: aiResponse.confidence,
        reasoning: aiResponse.reasoning,
        fallbackUsed: false,
        personalizationVersion: aiResponse.version
      };

    } catch (error) {
      console.error('AI personalization request failed:', error);
      throw error;
    }
  }

  private async getFallbackTips(
    userId: string,
    requestedCount: number,
    reason: string
  ): Promise<PersonalizationResult> {
    try {
      // Requirement 3.4: Provide general wellness tips appropriate for user's basic profile
      const preferences = await userPreferencesService.getUserPreferences(userId);
      const contentFilter = await userPreferencesService.getContentFilter(userId);

      const tips = await healthTipService.getTipsByFilters({
        categories: contentFilter.categories,
        difficulty: contentFilter.difficulty,
        count: requestedCount,
        excludeViewed: true,
        userId
      });

      // Track fallback usage
      analyticsService.trackEvent('personalization_fallback', {
        userId,
        reason,
        tipCount: tips.length
      });

      return {
        tips,
        confidence: 0.5, // Medium confidence for fallback
        reasoning: [`Fallback used: ${reason}`, 'Using preference-based filtering'],
        fallbackUsed: true,
        personalizationVersion: 'fallback_v1'
      };

    } catch (error) {
      console.error('Fallback tip generation failed:', error);
      
      // Last resort: get any available tips
      const tips = await healthTipService.getTipsByFilters({
        categories: ['nutrition', 'fitness', 'mentalWellness'],
        count: requestedCount
      });

      return {
        tips,
        confidence: 0.3,
        reasoning: ['Emergency fallback: basic tip selection'],
        fallbackUsed: true,
        personalizationVersion: 'emergency_fallback'
      };
    }
  }

  private async fetchTipsByIds(tipIds: string[]): Promise<HealthTip[]> {
    const tips = await Promise.all(
      tipIds.map(id => healthTipService.getTipById(id))
    );
    return tips.filter(tip => tip !== null) as HealthTip[];
  }

  private async trackPersonalizationSuccess(
    userId: string,
    result: PersonalizationResult
  ): Promise<void> {
    analyticsService.trackEvent('personalization_success', {
      userId,
      confidence: result.confidence,
      tipCount: result.tips.length,
      version: result.personalizationVersion,
      reasoningCount: result.reasoning.length
    });
  }

  private calculateProfileCompleteness(profile: PersonalizationContext['userProfile']): number {
    let completeness = 0;
    const fields = ['age', 'gender', 'healthInterests', 'fitnessLevel'];
    
    if (profile.age) completeness += 0.25;
    if (profile.gender) completeness += 0.25;
    if (profile.healthInterests.length > 0) completeness += 0.25;
    if (profile.fitnessLevel) completeness += 0.25;

    return completeness;
  }

  private extractPreferredCategories(engagementHistory: PersonalizationContext['engagementHistory']): string[] {
    // This would analyze engagement patterns to identify preferred categories
    // For now, return a placeholder
    return ['nutrition', 'fitness'];
  }

  private generateImprovementRecommendations(context: PersonalizationContext): string[] {
    const recommendations: string[] = [];
    
    if (this.calculateProfileCompleteness(context.userProfile) < 0.5) {
      recommendations.push('Complete your profile for better personalization');
    }
    
    if (context.engagementHistory.viewedTips.length < 10) {
      recommendations.push('Engage with more tips to improve recommendations');
    }

    if (!context.preferences.content.personalizedContent) {
      recommendations.push('Enable personalized content for better recommendations');
    }

    return recommendations;
  }

  private async calculatePersonalizationAccuracy(userId: string): Promise<number> {
    // This would calculate accuracy based on user feedback and engagement patterns
    // For now, return a placeholder
    return 0.75;
  }

  private async getUserProfile(userId: string): Promise<PersonalizationContext['userProfile']> {
    // This would fetch user profile from user service
    // For now, return a placeholder
    return {
      healthInterests: ['nutrition', 'fitness'],
      age: 30,
      gender: 'other',
      fitnessLevel: 'intermediate'
    };
  }

  private async getRecentActivity(userId: string): Promise<string> {
    // This would fetch recent user activity
    return 'viewed_fitness_tips';
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'early_morning';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }

  private getDayOfWeek(): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  }

  private getSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }
}

// Export singleton instance
export const aiPersonalizationIntegrationService = AIPersonalizationIntegrationService.getInstance();