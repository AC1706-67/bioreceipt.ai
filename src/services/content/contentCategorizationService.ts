/**
 * Content Categorization Service
 * Advanced categorization and filtering for health tips
 */

import { HealthTip, HealthTipCategory, DifficultyLevel } from '../../models/HealthTip';
import { storage } from '../../utils/storage';
import { cacheService } from '../cache/cacheService';

interface CategoryMetrics {
  category: HealthTipCategory;
  count: number;
  averageRating: number;
  totalEngagement: number;
  popularTags: string[];
  difficultyDistribution: Record<DifficultyLevel, number>;
}

interface ContentRecommendation {
  tipId: string;
  score: number;
  reasons: string[];
}

interface UserCategoryPreferences {
  userId: string;
  preferences: Record<HealthTipCategory, number>; // 0-1 preference score
  lastUpdated: Date;
}

class ContentCategorizationService {
  private static instance: ContentCategorizationService;
  private categoryCache: Map<string, CategoryMetrics[]>;

  private constructor() {
    this.categoryCache = new Map();
  }

  static getInstance(): ContentCategorizationService {
    if (!ContentCategorizationService.instance) {
      ContentCategorizationService.instance = new ContentCategorizationService();
    }
    return ContentCategorizationService.instance;
  }

  /**
   * Get category metrics and statistics
   */
  async getCategoryMetrics(): Promise<CategoryMetrics[]> {
    try {
      const cacheKey = 'category_metrics';
      const cached = await cacheService.getAdvanced<CategoryMetrics[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Get all tips
      const tipsData = await storage.getData('HEALTH_TIPS') || {};
      const tips: HealthTip[] = Object.values(tipsData);

      // Calculate metrics for each category
      const metrics: CategoryMetrics[] = [];
      
      for (const category of Object.values(HealthTipCategory)) {
        const categoryTips = tips.filter(tip => tip.category === category && tip.isActive);
        
        if (categoryTips.length === 0) {
          metrics.push({
            category,
            count: 0,
            averageRating: 0,
            totalEngagement: 0,
            popularTags: [],
            difficultyDistribution: {
              [DifficultyLevel.BEGINNER]: 0,
              [DifficultyLevel.INTERMEDIATE]: 0,
              [DifficultyLevel.ADVANCED]: 0
            }
          });
          continue;
        }

        // Calculate average rating
        const totalRating = categoryTips.reduce((sum, tip) => sum + tip.metadata.averageRating, 0);
        const averageRating = totalRating / categoryTips.length;

        // Calculate total engagement
        const totalEngagement = categoryTips.reduce((sum, tip) => sum + tip.metadata.engagementScore, 0);

        // Get popular tags
        const tagCounts: Record<string, number> = {};
        categoryTips.forEach(tip => {
          tip.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        });
        
        const popularTags = Object.entries(tagCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([tag]) => tag);

        // Calculate difficulty distribution
        const difficultyDistribution = {
          [DifficultyLevel.BEGINNER]: 0,
          [DifficultyLevel.INTERMEDIATE]: 0,
          [DifficultyLevel.ADVANCED]: 0
        };
        
        categoryTips.forEach(tip => {
          difficultyDistribution[tip.difficulty]++;
        });

        metrics.push({
          category,
          count: categoryTips.length,
          averageRating,
          totalEngagement,
          popularTags,
          difficultyDistribution
        });
      }

      // Cache for 1 hour
      await cacheService.setAdvanced(cacheKey, metrics, {
        ttl: 60,
        level: 'memory',
        importance: 0.8
      });

      return metrics;
    } catch (error) {
      console.error('Error getting category metrics:', error);
      throw new Error('Failed to get category metrics');
    }
  }

  /**
   * Get recommended categories for user
   */
  async getRecommendedCategories(userId: string): Promise<{
    category: HealthTipCategory;
    score: number;
    reason: string;
  }[]> {
    try {
      const cacheKey = `recommended_categories_${userId}`;
      const cached = await cacheService.getAdvanced(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Get user preferences
      const preferences = await this.getUserCategoryPreferences(userId);
      
      // Get user interactions
      const interactionsData = await storage.getData('USER_INTERACTIONS') || {};
      const userInteractions = interactionsData[userId] || [];

      // Analyze interaction patterns
      const categoryInteractions: Record<HealthTipCategory, number> = {};
      const categoryEngagement: Record<HealthTipCategory, number> = {};

      // Get tips to map interactions to categories
      const tipsData = await storage.getData('HEALTH_TIPS') || {};
      const tips: HealthTip[] = Object.values(tipsData);
      const tipCategoryMap = new Map(tips.map(tip => [tip.id, tip.category]));

      userInteractions.forEach((interaction: any) => {
        const category = tipCategoryMap.get(interaction.tipId);
        if (category) {
          categoryInteractions[category] = (categoryInteractions[category] || 0) + 1;
          
          // Weight positive interactions more
          const weight = ['like', 'bookmark', 'complete', 'share'].includes(interaction.interactionType) ? 2 : 1;
          categoryEngagement[category] = (categoryEngagement[category] || 0) + weight;
        }
      });

      // Calculate recommendation scores
      const recommendations = Object.values(HealthTipCategory).map(category => {
        let score = 0;
        let reason = '';

        // Base preference score
        const preferenceScore = preferences.preferences[category] || 0.5;
        score += preferenceScore * 0.4;

        // Interaction frequency score
        const interactions = categoryInteractions[category] || 0;
        const interactionScore = Math.min(interactions / 10, 1); // Normalize to max 10 interactions
        score += interactionScore * 0.3;

        // Engagement score
        const engagement = categoryEngagement[category] || 0;
        const engagementScore = Math.min(engagement / 20, 1); // Normalize to max 20 engagement points
        score += engagementScore * 0.3;

        // Generate reason
        if (preferenceScore > 0.7) {
          reason = 'Based on your stated preferences';
        } else if (interactions > 5) {
          reason = 'You frequently engage with this category';
        } else if (engagement > 10) {
          reason = 'You show high engagement with this content';
        } else {
          reason = 'Recommended for exploration';
        }

        return {
          category,
          score,
          reason
        };
      });

      // Sort by score
      const sortedRecommendations = recommendations.sort((a, b) => b.score - a.score);

      // Cache for 30 minutes
      await cacheService.setAdvanced(cacheKey, sortedRecommendations, {
        ttl: 30,
        level: 'memory',
        importance: 0.7
      });

      return sortedRecommendations;
    } catch (error) {
      console.error('Error getting recommended categories:', error);
      throw new Error('Failed to get recommended categories');
    }
  }

  /**
   * Auto-categorize content based on text analysis
   */
  async autoCategorizeContent(title: string, content: string, tags: string[]): Promise<{
    suggestedCategory: HealthTipCategory;
    confidence: number;
    alternativeCategories: { category: HealthTipCategory; confidence: number }[];
  }> {
    try {
      const text = `${title} ${content} ${tags.join(' ')}`.toLowerCase();
      
      // Category keywords mapping
      const categoryKeywords: Record<HealthTipCategory, string[]> = {
        [HealthTipCategory.NUTRITION]: [
          'food', 'eat', 'diet', 'nutrition', 'vitamin', 'protein', 'carb', 'fat',
          'meal', 'recipe', 'ingredient', 'calorie', 'nutrient', 'supplement'
        ],
        [HealthTipCategory.FITNESS]: [
          'exercise', 'workout', 'fitness', 'training', 'muscle', 'strength',
          'cardio', 'run', 'walk', 'gym', 'sport', 'activity', 'movement'
        ],
        [HealthTipCategory.MENTAL_WELLNESS]: [
          'mental', 'stress', 'anxiety', 'depression', 'mood', 'mindfulness',
          'meditation', 'therapy', 'emotional', 'psychological', 'wellbeing'
        ],
        [HealthTipCategory.SLEEP]: [
          'sleep', 'rest', 'bed', 'insomnia', 'dream', 'nap', 'tired',
          'fatigue', 'circadian', 'melatonin', 'bedroom'
        ],
        [HealthTipCategory.RECOVERY]: [
          'recovery', 'heal', 'injury', 'pain', 'rehabilitation', 'therapy',
          'massage', 'stretch', 'rest', 'recuperate'
        ],
        [HealthTipCategory.HYGIENE]: [
          'hygiene', 'clean', 'wash', 'brush', 'sanitize', 'bacteria',
          'germs', 'soap', 'dental', 'oral', 'skin'
        ]
      };

      // Calculate scores for each category
      const categoryScores: Record<HealthTipCategory, number> = {};
      
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        let score = 0;
        
        keywords.forEach(keyword => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          const matches = text.match(regex);
          if (matches) {
            score += matches.length;
          }
        });
        
        // Normalize score by keyword count
        categoryScores[category as HealthTipCategory] = score / keywords.length;
      }

      // Find best match
      const sortedCategories = Object.entries(categoryScores)
        .sort(([, a], [, b]) => b - a)
        .map(([category, score]) => ({
          category: category as HealthTipCategory,
          confidence: Math.min(score, 1) // Cap at 1.0
        }));

      const suggestedCategory = sortedCategories[0]?.category || HealthTipCategory.GENERAL;
      const confidence = sortedCategories[0]?.confidence || 0.1;
      const alternativeCategories = sortedCategories.slice(1, 4); // Top 3 alternatives

      return {
        suggestedCategory,
        confidence,
        alternativeCategories
      };
    } catch (error) {
      console.error('Error auto-categorizing content:', error);
      return {
        suggestedCategory: HealthTipCategory.GENERAL,
        confidence: 0.1,
        alternativeCategories: []
      };
    }
  }

  /**
   * Get content recommendations based on category preferences
   */
  async getCategoryBasedRecommendations(
    userId: string,
    targetCategory: HealthTipCategory,
    limit: number = 10
  ): Promise<ContentRecommendation[]> {
    try {
      const cacheKey = `category_recommendations_${userId}_${targetCategory}_${limit}`;
      const cached = await cacheService.getAdvanced<ContentRecommendation[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Get tips in target category
      const tipsData = await storage.getData('HEALTH_TIPS') || {};
      const tips: HealthTip[] = Object.values(tipsData);
      const categoryTips = tips.filter(tip => 
        tip.category === targetCategory && tip.isActive
      );

      // Get user interactions to avoid recommending seen content
      const interactionsData = await storage.getData('USER_INTERACTIONS') || {};
      const userInteractions = interactionsData[userId] || [];
      const seenTipIds = new Set(userInteractions.map((i: any) => i.tipId));

      // Score and rank tips
      const recommendations = categoryTips
        .filter(tip => !seenTipIds.has(tip.id))
        .map(tip => {
          let score = 0;
          const reasons: string[] = [];

          // Base engagement score
          score += tip.metadata.engagementScore * 0.4;
          if (tip.metadata.engagementScore > 50) {
            reasons.push('Popular content');
          }

          // Rating score
          score += tip.metadata.averageRating * 10;
          if (tip.metadata.averageRating > 4) {
            reasons.push('Highly rated');
          }

          // Priority score
          score += tip.priority * 5;
          if (tip.priority > 7) {
            reasons.push('High priority content');
          }

          // Recency bonus
          const daysSinceCreated = (Date.now() - new Date(tip.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceCreated < 7) {
            score += 10;
            reasons.push('Recently added');
          }

          return {
            tipId: tip.id,
            score,
            reasons
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Cache for 20 minutes
      await cacheService.setAdvanced(cacheKey, recommendations, {
        ttl: 20,
        level: 'memory',
        importance: 0.7
      });

      return recommendations;
    } catch (error) {
      console.error('Error getting category-based recommendations:', error);
      throw new Error('Failed to get category-based recommendations');
    }
  }

  /**
   * Update user category preferences based on interactions
   */
  async updateUserCategoryPreferences(userId: string): Promise<void> {
    try {
      // Get user interactions
      const interactionsData = await storage.getData('USER_INTERACTIONS') || {};
      const userInteractions = interactionsData[userId] || [];

      if (userInteractions.length === 0) {
        return;
      }

      // Get tips to map interactions to categories
      const tipsData = await storage.getData('HEALTH_TIPS') || {};
      const tips: HealthTip[] = Object.values(tipsData);
      const tipCategoryMap = new Map(tips.map(tip => [tip.id, tip.category]));

      // Calculate category preferences
      const categoryScores: Record<HealthTipCategory, number> = {};
      const categoryInteractions: Record<HealthTipCategory, number> = {};

      userInteractions.forEach((interaction: any) => {
        const category = tipCategoryMap.get(interaction.tipId);
        if (category) {
          categoryInteractions[category] = (categoryInteractions[category] || 0) + 1;
          
          // Weight interactions based on type
          let weight = 1;
          switch (interaction.interactionType) {
            case 'like': weight = 2; break;
            case 'bookmark': weight = 3; break;
            case 'complete': weight = 4; break;
            case 'share': weight = 3; break;
            case 'rate': weight = interaction.metadata?.rating || 2; break;
            case 'skip': weight = -1; break;
          }
          
          categoryScores[category] = (categoryScores[category] || 0) + weight;
        }
      });

      // Normalize scores to 0-1 range
      const maxScore = Math.max(...Object.values(categoryScores));
      const preferences: Record<HealthTipCategory, number> = {};
      
      for (const category of Object.values(HealthTipCategory)) {
        const score = categoryScores[category] || 0;
        preferences[category] = maxScore > 0 ? Math.max(0, score / maxScore) : 0.5;
      }

      // Save preferences
      const userPreferences: UserCategoryPreferences = {
        userId,
        preferences,
        lastUpdated: new Date()
      };

      const preferencesData = await storage.getData('USER_CATEGORY_PREFERENCES') || {};
      preferencesData[userId] = userPreferences;
      await storage.storeData('USER_CATEGORY_PREFERENCES', preferencesData);

      // Invalidate related caches
      await this.invalidateUserCaches(userId);

    } catch (error) {
      console.error('Error updating user category preferences:', error);
    }
  }

  // Private helper methods
  private async getUserCategoryPreferences(userId: string): Promise<UserCategoryPreferences> {
    try {
      const preferencesData = await storage.getData('USER_CATEGORY_PREFERENCES') || {};
      const userPreferences = preferencesData[userId];

      if (userPreferences) {
        return userPreferences;
      }

      // Create default preferences
      const defaultPreferences: Record<HealthTipCategory, number> = {};
      for (const category of Object.values(HealthTipCategory)) {
        defaultPreferences[category] = 0.5; // Neutral preference
      }

      return {
        userId,
        preferences: defaultPreferences,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting user category preferences:', error);
      throw error;
    }
  }

  private async invalidateUserCaches(userId: string): Promise<void> {
    try {
      const patterns = [
        new RegExp(`recommended_categories_${userId}`),
        new RegExp(`category_recommendations_${userId}`),
        new RegExp(`recommendations_${userId}`)
      ];

      for (const pattern of patterns) {
        await cacheService.invalidatePattern(pattern);
      }
    } catch (error) {
      console.error('Error invalidating user caches:', error);
    }
  }
}

export const contentCategorizationService = ContentCategorizationService.getInstance();