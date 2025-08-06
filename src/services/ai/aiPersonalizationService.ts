/**
 * AI Personalization Service
 * Service layer for KIRO AI integration with personalization algorithms
 */

import { kiroAIService } from './kiroAIService';
import { healthTipService } from '../content/healthTipService';
import { HealthTip, HealthTipCategory, DifficultyLevel, UserHealthTipInteraction } from '../../models/HealthTip';
import { storage } from '../../utils/storage';
import { cacheService } from '../cache/cacheService';
import { analyticsService } from '../analytics/analyticsService';

interface UserPersonalizationData {
  userId: string;
  profile: UserProfile;
  interactions: UserHealthTipInteraction[];
  preferences: UserPreferences;
  behaviorPatterns: BehaviorPattern[];
  lastUpdated: Date;
}

interface UserProfile {
  age?: number;
  gender?: string;
  healthGoals: string[];
  interests: string[];
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredContentTypes: string[];
  timePreferences: string[];
}

interface UserPreferences {
  categories: Record<HealthTipCategory, number>; // 0-1 preference score
  difficulty: DifficultyLevel | 'adaptive';
  contentLength: 'short' | 'medium' | 'long' | 'mixed';
  visualContent: boolean;
  interactiveContent: boolean;
  notificationFrequency: 'low' | 'medium' | 'high';
}

interface BehaviorPattern {
  pattern: string;
  frequency: number;
  confidence: number;
  context: string;
  lastObserved: Date;
}

interface PersonalizationRecommendation {
  tipId: string;
  score: number;
  confidence: number;
  reasoning: string[];
  category: HealthTipCategory;
  personalizedRank: number;
}

interface AIPersonalizationConfig {
  enableAI: boolean;
  fallbackToGeneral: boolean;
  minInteractionsForAI: number;
  confidenceThreshold: number;
  maxRecommendations: number;
  refreshInterval: number; // minutes
}

class AIPersonalizationService {
  private static instance: AIPersonalizationService;
  private config: AIPersonalizationConfig;
  private userDataCache: Map<string, UserPersonalizationData>;
  private processingQueue: Set<string>;

  private constructor() {
    this.config = {
      enableAI: true,
      fallbackToGeneral: true,
      minInteractionsForAI: 5,
      confidenceThreshold: 0.6,
      maxRecommendations: 20,
      refreshInterval: 30
    };
    this.userDataCache = new Map();
    this.processingQueue = new Set();
  }

  static getInstance(): AIPersonalizationService {
    if (!AIPersonalizationService.instance) {
      AIPersonalizationService.instance = new AIPersonalizationService();
    }
    return AIPersonalizationService.instance;
  }

  /**
   * Get personalized recommendations using AI
   */
  async getPersonalizedRecommendations(
    userId: string,
    limit: number = 10,
    context?: any
  ): Promise<PersonalizationRecommendation[]> {
    try {
      const cacheKey = `ai_recommendations_${userId}_${limit}`;
      const cached = await cacheService.getAdvanced<PersonalizationRecommendation[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Get user personalization data
      const userData = await this.getUserPersonalizationData(userId);
      
      // Check if we have enough data for AI personalization
      if (!this.config.enableAI || userData.interactions.length < this.config.minInteractionsForAI) {
        return this.getFallbackRecommendations(userId, limit);
      }

      // Get AI-powered recommendations
      const aiRecommendations = await this.getAIRecommendations(userData, limit, context);
      
      // Validate AI recommendations confidence
      const validRecommendations = aiRecommendations.filter(
        rec => rec.confidence >= this.config.confidenceThreshold
      );

      // If not enough confident recommendations, supplement with fallback
      let finalRecommendations = validRecommendations;
      if (validRecommendations.length < limit && this.config.fallbackToGeneral) {
        const fallbackCount = limit - validRecommendations.length;
        const fallbackRecs = await this.getFallbackRecommendations(userId, fallbackCount);
        
        // Adjust ranks for fallback recommendations
        const adjustedFallbackRecs = fallbackRecs.map((rec, index) => ({
          ...rec,
          personalizedRank: validRecommendations.length + index + 1
        }));
        
        finalRecommendations = [...validRecommendations, ...adjustedFallbackRecs];
      }

      // Cache recommendations for configured interval
      await cacheService.setAdvanced(cacheKey, finalRecommendations, {
        ttl: this.config.refreshInterval,
        level: 'memory',
        importance: 0.9
      });

      // Track analytics
      analyticsService.trackEvent('ai_personalization_served', {
        userId,
        recommendationCount: finalRecommendations.length,
        aiRecommendations: validRecommendations.length,
        fallbackRecommendations: finalRecommendations.length - validRecommendations.length,
        averageConfidence: finalRecommendations.reduce((sum, r) => sum + r.confidence, 0) / finalRecommendations.length
      });

      return finalRecommendations;
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      
      // Fallback to general recommendations on error
      if (this.config.fallbackToGeneral) {
        return this.getFallbackRecommendations(userId, limit);
      }
      
      throw new Error('Failed to get personalized recommendations');
    }
  }

  /**
   * Learn from user interaction and update personalization
   */
  async learnFromInteraction(interaction: UserHealthTipInteraction): Promise<void> {
    try {
      // Prevent duplicate processing
      const processingKey = `${interaction.userId}_${interaction.tipId}_${interaction.timestamp.getTime()}`;
      if (this.processingQueue.has(processingKey)) {
        return;
      }
      this.processingQueue.add(processingKey);

      // Get current user data
      const userData = await this.getUserPersonalizationData(interaction.userId);
      
      // Add new interaction
      userData.interactions.push(interaction);
      
      // Keep only recent interactions (last 1000)
      if (userData.interactions.length > 1000) {
        userData.interactions = userData.interactions.slice(-1000);
      }

      // Update preferences based on interaction
      await this.updateUserPreferencesFromInteraction(userData, interaction);
      
      // Update behavior patterns using AI
      if (userData.interactions.length >= this.config.minInteractionsForAI) {
        await this.updateBehaviorPatterns(userData);
      }

      // Save updated data
      userData.lastUpdated = new Date();
      await this.saveUserPersonalizationData(userData);

      // Invalidate related caches
      await this.invalidateUserCaches(interaction.userId);

      // Track learning event
      analyticsService.trackEvent('ai_personalization_learning', {
        userId: interaction.userId,
        interactionType: interaction.interactionType,
        totalInteractions: userData.interactions.length
      });

      // Remove from processing queue
      this.processingQueue.delete(processingKey);
    } catch (error) {
      console.error('Error learning from interaction:', error);
      // Remove from processing queue on error
      const processingKey = `${interaction.userId}_${interaction.tipId}_${interaction.timestamp.getTime()}`;
      this.processingQueue.delete(processingKey);
    }
  }

  /**
   * Update user preferences explicitly
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    try {
      const userData = await this.getUserPersonalizationData(userId);
      
      // Merge preferences
      userData.preferences = {
        ...userData.preferences,
        ...preferences
      };

      userData.lastUpdated = new Date();
      await this.saveUserPersonalizationData(userData);

      // Invalidate caches
      await this.invalidateUserCaches(userId);

      // Track preference update
      analyticsService.trackEvent('ai_personalization_preferences_updated', {
        userId,
        updatedFields: Object.keys(preferences)
      });
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw new Error('Failed to update user preferences');
    }
  }

  /**
   * Get user personalization insights
   */
  async getPersonalizationInsights(userId: string): Promise<{
    dataQuality: number;
    topCategories: Array<{ category: HealthTipCategory; score: number }>;
    behaviorPatterns: BehaviorPattern[];
    recommendationAccuracy: number;
    learningProgress: number;
  }> {
    try {
      const userData = await this.getUserPersonalizationData(userId);
      
      // Calculate data quality score
      const dataQuality = this.calculateDataQuality(userData);
      
      // Get top categories
      const topCategories = Object.entries(userData.preferences.categories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category, score]) => ({ 
          category: category as HealthTipCategory, 
          score 
        }));

      // Calculate recommendation accuracy (simplified)
      const recommendationAccuracy = await this.calculateRecommendationAccuracy(userData);
      
      // Calculate learning progress
      const learningProgress = Math.min(userData.interactions.length / 100, 1.0);

      return {
        dataQuality,
        topCategories,
        behaviorPatterns: userData.behaviorPatterns.slice(0, 5),
        recommendationAccuracy,
        learningProgress
      };
    } catch (error) {
      console.error('Error getting personalization insights:', error);
      throw new Error('Failed to get personalization insights');
    }
  }

  // Private helper methods
  private async getUserPersonalizationData(userId: string): Promise<UserPersonalizationData> {
    try {
      // Check cache first
      const cached = this.userDataCache.get(userId);
      if (cached && Date.now() - cached.lastUpdated.getTime() < 5 * 60 * 1000) { // 5 minutes
        return cached;
      }

      // Load from storage
      const personalizationData = await storage.getData('USER_PERSONALIZATION_DATA') || {};
      const userData = personalizationData[userId];

      if (userData) {
        const parsedData = {
          ...userData,
          lastUpdated: new Date(userData.lastUpdated),
          interactions: userData.interactions.map((i: any) => ({
            ...i,
            timestamp: new Date(i.timestamp)
          })),
          behaviorPatterns: userData.behaviorPatterns.map((p: any) => ({
            ...p,
            lastObserved: new Date(p.lastObserved)
          }))
        };
        
        this.userDataCache.set(userId, parsedData);
        return parsedData;
      }

      // Create new user data
      const newUserData = await this.createNewUserPersonalizationData(userId);
      this.userDataCache.set(userId, newUserData);
      return newUserData;
    } catch (error) {
      console.error('Error getting user personalization data:', error);
      throw error;
    }
  }

  private async createNewUserPersonalizationData(userId: string): Promise<UserPersonalizationData> {
    try {
      // Get user profile data if available
      const userProfiles = await storage.getData('USER_PROFILES') || {};
      const userProfile = userProfiles[userId] || {};

      const newData: UserPersonalizationData = {
        userId,
        profile: {
          age: userProfile.age,
          gender: userProfile.gender,
          healthGoals: userProfile.healthGoals || [],
          interests: userProfile.interests || [],
          fitnessLevel: userProfile.fitnessLevel || 'beginner',
          preferredContentTypes: ['tips', 'articles'],
          timePreferences: ['morning', 'evening']
        },
        interactions: [],
        preferences: {
          categories: {
            [HealthTipCategory.NUTRITION]: 0.5,
            [HealthTipCategory.FITNESS]: 0.5,
            [HealthTipCategory.MENTAL_WELLNESS]: 0.5,
            [HealthTipCategory.SLEEP]: 0.5,
            [HealthTipCategory.RECOVERY]: 0.5,
            [HealthTipCategory.HYGIENE]: 0.5,
            [HealthTipCategory.GENERAL]: 0.5
          },
          difficulty: 'adaptive',
          contentLength: 'mixed',
          visualContent: true,
          interactiveContent: true,
          notificationFrequency: 'medium'
        },
        behaviorPatterns: [],
        lastUpdated: new Date()
      };

      await this.saveUserPersonalizationData(newData);
      return newData;
    } catch (error) {
      console.error('Error creating new user personalization data:', error);
      throw error;
    }
  }

  private async saveUserPersonalizationData(userData: UserPersonalizationData): Promise<void> {
    try {
      const personalizationData = await storage.getData('USER_PERSONALIZATION_DATA') || {};
      personalizationData[userData.userId] = userData;
      await storage.storeData('USER_PERSONALIZATION_DATA', personalizationData);
      
      // Update cache
      this.userDataCache.set(userData.userId, userData);
    } catch (error) {
      console.error('Error saving user personalization data:', error);
      throw error;
    }
  }

  private async getAIRecommendations(
    userData: UserPersonalizationData,
    limit: number,
    context?: any
  ): Promise<PersonalizationRecommendation[]> {
    try {
      // Prepare data for AI service
      const aiInput = {
        userProfile: userData.profile,
        interactions: userData.interactions.slice(-50), // Last 50 interactions
        preferences: userData.preferences,
        behaviorPatterns: userData.behaviorPatterns,
        context: context || {}
      };

      // Get AI recommendations
      const aiResponse = await kiroAIService.getPersonalizedRecommendations(aiInput, limit);
      
      if (!aiResponse || !aiResponse.recommendations) {
        throw new Error('Invalid AI response');
      }

      // Process AI recommendations
      const recommendations: PersonalizationRecommendation[] = [];
      
      for (let i = 0; i < aiResponse.recommendations.length; i++) {
        const rec = aiResponse.recommendations[i];
        
        // Validate recommendation
        if (!rec.tipId || !rec.score || !rec.confidence) {
          continue;
        }

        // Get tip details to validate it exists
        const tip = await healthTipService.getHealthTipById(rec.tipId);
        if (!tip || !tip.isActive) {
          continue;
        }

        recommendations.push({
          tipId: rec.tipId,
          score: Math.max(0, Math.min(1, rec.score)), // Clamp to 0-1
          confidence: Math.max(0, Math.min(1, rec.confidence)), // Clamp to 0-1
          reasoning: rec.reasoning || ['AI recommendation'],
          category: tip.category,
          personalizedRank: i + 1
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      throw error;
    }
  }

  private async getFallbackRecommendations(userId: string, limit: number): Promise<PersonalizationRecommendation[]> {
    try {
      // Get trending tips as fallback
      const trendingTips = await healthTipService.getTrendingTips(limit * 2);
      
      // Get user interactions to avoid recommending seen content
      const userData = await this.getUserPersonalizationData(userId);
      const seenTipIds = new Set(userData.interactions.map(i => i.tipId));
      
      // Filter out seen tips
      const unseenTips = trendingTips.filter(tip => !seenTipIds.has(tip.id));
      
      // Convert to PersonalizationRecommendation format
      return unseenTips.slice(0, limit).map((tip, index) => ({
        tipId: tip.id,
        score: 0.5 - (index * 0.01), // Decreasing score
        confidence: 0.5,
        reasoning: ['Trending content fallback'],
        category: tip.category,
        personalizedRank: index + 1
      }));
    } catch (error) {
      console.error('Error getting fallback recommendations:', error);
      // Return empty array as last resort
      return [];
    }
  }

  private async updateUserPreferencesFromInteraction(
    userData: UserPersonalizationData,
    interaction: UserHealthTipInteraction
  ): Promise<void> {
    try {
      // Get tip details
      const tip = await healthTipService.getHealthTipById(interaction.tipId);
      if (!tip) return;

      // Update category preferences based on interaction type
      const currentCategoryScore = userData.preferences.categories[tip.category];
      let adjustment = 0;

      switch (interaction.interactionType) {
        case 'like':
          adjustment = 0.05;
          break;
        case 'bookmark':
          adjustment = 0.08;
          break;
        case 'complete':
          adjustment = 0.1;
          break;
        case 'share':
          adjustment = 0.07;
          break;
        case 'skip':
          adjustment = -0.03;
          break;
        case 'rate':
          const rating = interaction.metadata?.rating || 3;
          adjustment = (rating - 3) * 0.02; // -0.04 to +0.04
          break;
        default:
          adjustment = 0.01; // Small positive for view
      }

      // Apply adjustment with bounds checking
      userData.preferences.categories[tip.category] = Math.max(
        0,
        Math.min(1, currentCategoryScore + adjustment)
      );

      // Update difficulty preference if adaptive
      if (userData.preferences.difficulty === 'adaptive') {
        // This would involve more complex logic to determine optimal difficulty
        // For now, we'll keep it simple
      }
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  } 
 private async updateBehaviorPatterns(userData: UserPersonalizationData): Promise<void> {
    try {
      // Use AI to identify behavior patterns
      const recentInteractions = userData.interactions.slice(-100); // Last 100 interactions
      
      const aiInput = {
        interactions: recentInteractions,
        existingPatterns: userData.behaviorPatterns
      };

      const aiResponse = await kiroAIService.identifyBehaviorPatterns(aiInput);
      
      if (aiResponse && aiResponse.patterns) {
        // Update behavior patterns
        const newPatterns: BehaviorPattern[] = [];
        
        for (const pattern of aiResponse.patterns) {
          if (pattern.confidence >= 0.5) { // Only keep confident patterns
            newPatterns.push({
              pattern: pattern.description,
              frequency: pattern.frequency,
              confidence: pattern.confidence,
              context: pattern.context || 'general',
              lastObserved: new Date()
            });
          }
        }

        // Keep top 10 patterns
        userData.behaviorPatterns = newPatterns
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 10);
      }
    } catch (error) {
      console.error('Error updating behavior patterns:', error);
      // Continue without updating patterns on error
    }
  }

  private calculateDataQuality(userData: UserPersonalizationData): number {
    let score = 0;

    // Profile completeness (30%)
    const profileFields = ['age', 'gender', 'healthGoals', 'interests', 'fitnessLevel'];
    const completedFields = profileFields.filter(field => {
      const value = userData.profile[field as keyof UserProfile];
      return value !== undefined && value !== null && 
             (Array.isArray(value) ? value.length > 0 : true);
    });
    score += (completedFields.length / profileFields.length) * 0.3;

    // Interaction history (40%)
    const interactionScore = Math.min(userData.interactions.length / 50, 1); // Normalize to 50 interactions
    score += interactionScore * 0.4;

    // Behavior patterns (20%)
    const patternScore = Math.min(userData.behaviorPatterns.length / 5, 1); // Normalize to 5 patterns
    score += patternScore * 0.2;

    // Data recency (10%)
    const daysSinceUpdate = (Date.now() - userData.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - (daysSinceUpdate / 30)); // Decay over 30 days
    score += recencyScore * 0.1;

    return Math.min(score, 1.0);
  }

  private async calculateRecommendationAccuracy(userData: UserPersonalizationData): Promise<number> {
    try {
      // This is a simplified accuracy calculation
      // In a real implementation, you'd track recommendation outcomes
      
      const recentInteractions = userData.interactions.slice(-20);
      const positiveInteractions = recentInteractions.filter(i => 
        ['like', 'bookmark', 'complete', 'share'].includes(i.interactionType)
      );

      return recentInteractions.length > 0 
        ? positiveInteractions.length / recentInteractions.length 
        : 0.5; // Default to 50% if no data
    } catch (error) {
      console.error('Error calculating recommendation accuracy:', error);
      return 0.5;
    }
  }

  private async invalidateUserCaches(userId: string): Promise<void> {
    try {
      const patterns = [
        new RegExp(`ai_recommendations_${userId}`),
        new RegExp(`personalization_insights_${userId}`),
        new RegExp(`recommendations_${userId}`)
      ];

      for (const pattern of patterns) {
        await cacheService.invalidatePattern(pattern);
      }

      // Remove from local cache
      this.userDataCache.delete(userId);
    } catch (error) {
      console.error('Error invalidating user caches:', error);
    }
  }

  /**
   * Configuration methods
   */
  updateConfig(newConfig: Partial<AIPersonalizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): AIPersonalizationConfig {
    return { ...this.config };
  }

  /**
   * Health check for AI service
   */
  async healthCheck(): Promise<{
    aiServiceAvailable: boolean;
    cacheServiceAvailable: boolean;
    storageAvailable: boolean;
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    try {
      const [aiHealth, cacheHealth, storageHealth] = await Promise.allSettled([
        kiroAIService.healthCheck(),
        cacheService.healthCheck(),
        storage.getData('health_check')
      ]);

      const aiServiceAvailable = aiHealth.status === 'fulfilled';
      const cacheServiceAvailable = cacheHealth.status === 'fulfilled';
      const storageAvailable = storageHealth.status === 'fulfilled';

      let overallHealth: 'healthy' | 'degraded' | 'unhealthy';
      
      if (aiServiceAvailable && cacheServiceAvailable && storageAvailable) {
        overallHealth = 'healthy';
      } else if (storageAvailable) {
        overallHealth = 'degraded'; // Can still function with fallbacks
      } else {
        overallHealth = 'unhealthy';
      }

      return {
        aiServiceAvailable,
        cacheServiceAvailable,
        storageAvailable,
        overallHealth
      };
    } catch (error) {
      console.error('Error performing health check:', error);
      return {
        aiServiceAvailable: false,
        cacheServiceAvailable: false,
        storageAvailable: false,
        overallHealth: 'unhealthy'
      };
    }
  }
}

export const aiPersonalizationService = AIPersonalizationService.getInstance();