/**
 * Health Tip Service
 * Comprehensive service for managing health tips with CRUD operations,
 * error handling, retry logic, and caching
 */

import { 
  HealthTip, 
  HealthTipCategory, 
  DifficultyLevel, 
  HealthTipFilter, 
  HealthTipSortOptions,
  UserHealthTipInteraction,
  HealthTipEngagement,
  HealthTipValidator
} from '../../models/HealthTip';
import { storage } from '../../utils/storage';
import { cacheService } from '../cache/cacheService';
import { analyticsService } from '../analytics/analyticsService';
import { aiPersonalizationService } from '../ai/aiPersonalizationService';

interface HealthTipServiceConfig {
  maxRetries: number;
  retryDelay: number;
  cacheTimeout: number;
  batchSize: number;
}

class HealthTipService {
  private static instance: HealthTipService;
  private config: HealthTipServiceConfig;
  private retryQueue: Map<string, number>;

  private constructor() {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      cacheTimeout: 30 * 60 * 1000, // 30 minutes
      batchSize: 20
    };
    this.retryQueue = new Map();
  }

  static getInstance(): HealthTipService {
    if (!HealthTipService.instance) {
      HealthTipService.instance = new HealthTipService();
    }
    return HealthTipService.instance;
  }

  /**
   * Get all health tips with optional filtering and sorting
   */
  async getHealthTips(
    filter?: HealthTipFilter,
    sort?: HealthTipSortOptions,
    limit?: number,
    offset?: number
  ): Promise<{ tips: HealthTip[]; total: number; hasMore: boolean }> {
    try {
      const cacheKey = this.generateCacheKey('tips', filter, sort, limit, offset);
      const cached = await cacheService.getAdvanced<{ tips: HealthTip[]; total: number; hasMore: boolean }>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Get tips from storage
      let tips = await this.getAllTipsFromStorage();

      // Apply filters
      if (filter) {
        tips = this.applyFilters(tips, filter);
      }

      // Apply sorting
      if (sort) {
        tips = this.applySorting(tips, sort);
      }

      // Calculate pagination
      const total = tips.length;
      const startIndex = offset || 0;
      const endIndex = limit ? startIndex + limit : tips.length;
      const paginatedTips = tips.slice(startIndex, endIndex);
      const hasMore = endIndex < total;

      const result = {
        tips: paginatedTips,
        total,
        hasMore
      };

      // Cache the result
      await cacheService.setAdvanced(cacheKey, result, {
        ttl: 15, // 15 minutes
        level: 'memory',
        importance: 0.7
      });

      return result;
    } catch (error) {
      console.error('Error getting health tips:', error);
      throw new Error('Failed to retrieve health tips');
    }
  }

  /**
   * Get a single health tip by ID
   */
  async getHealthTipById(id: string): Promise<HealthTip | null> {
    try {
      const cacheKey = `tip_${id}`;
      const cached = await cacheService.getAdvanced<HealthTip>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const tips = await this.getAllTipsFromStorage();
      const tip = tips.find(t => t.id === id);

      if (tip) {
        // Cache individual tip for 1 hour
        await cacheService.setAdvanced(cacheKey, tip, {
          ttl: 60,
          level: 'memory',
          importance: 0.8
        });
      }

      return tip || null;
    } catch (error) {
      console.error('Error getting health tip by ID:', error);
      throw new Error('Failed to retrieve health tip');
    }
  }

  /**
   * Create a new health tip
   */
  async createHealthTip(tipData: Omit<HealthTip, 'id' | 'createdAt' | 'updatedAt' | 'metadata'>): Promise<HealthTip> {
    try {
      // Generate ID and timestamps
      const id = this.generateId();
      const now = new Date();

      const newTip: HealthTip = {
        ...tipData,
        id,
        createdAt: now,
        updatedAt: now,
        content: HealthTipValidator.sanitizeContent(tipData.content),
        metadata: {
          views: 0,
          likes: 0,
          bookmarks: 0,
          completions: 0,
          shares: 0,
          averageRating: 0,
          ratingCount: 0,
          engagementScore: 0
        }
      };

      // Validate the tip
      const validation = HealthTipValidator.validate(newTip);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Save to storage
      await this.saveTipToStorage(newTip);

      // Invalidate related caches
      await this.invalidateRelatedCaches();

      // Track analytics
      analyticsService.trackEvent('health_tip_created', {
        tipId: id,
        category: newTip.category,
        difficulty: newTip.difficulty
      });

      return newTip;
    } catch (error) {
      console.error('Error creating health tip:', error);
      throw new Error('Failed to create health tip');
    }
  }

  /**
   * Update an existing health tip
   */
  async updateHealthTip(id: string, updates: Partial<HealthTip>): Promise<HealthTip> {
    try {
      const existingTip = await this.getHealthTipById(id);
      if (!existingTip) {
        throw new Error('Health tip not found');
      }

      const updatedTip: HealthTip = {
        ...existingTip,
        ...updates,
        id, // Ensure ID cannot be changed
        updatedAt: new Date(),
        content: updates.content ? HealthTipValidator.sanitizeContent(updates.content) : existingTip.content
      };

      // Validate the updated tip
      const validation = HealthTipValidator.validate(updatedTip);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Save to storage
      await this.saveTipToStorage(updatedTip);

      // Invalidate related caches
      await this.invalidateRelatedCaches(id);

      // Track analytics
      analyticsService.trackEvent('health_tip_updated', {
        tipId: id,
        updatedFields: Object.keys(updates)
      });

      return updatedTip;
    } catch (error) {
      console.error('Error updating health tip:', error);
      throw new Error('Failed to update health tip');
    }
  }

  /**
   * Delete a health tip (soft delete by setting isActive to false)
   */
  async deleteHealthTip(id: string): Promise<boolean> {
    try {
      const tip = await this.getHealthTipById(id);
      if (!tip) {
        throw new Error('Health tip not found');
      }

      // Soft delete by setting isActive to false
      await this.updateHealthTip(id, { isActive: false });

      // Track analytics
      analyticsService.trackEvent('health_tip_deleted', {
        tipId: id,
        category: tip.category
      });

      return true;
    } catch (error) {
      console.error('Error deleting health tip:', error);
      throw new Error('Failed to delete health tip');
    }
  }  /**

   * Get tips by category
   */
  async getTipsByCategory(category: HealthTipCategory, limit?: number): Promise<HealthTip[]> {
    try {
      const filter: HealthTipFilter = { category, isActive: true };
      const result = await this.getHealthTips(filter, { field: 'priority', direction: 'desc' }, limit);
      return result.tips;
    } catch (error) {
      console.error('Error getting tips by category:', error);
      throw new Error('Failed to retrieve tips by category');
    }
  }

  /**
   * Search tips by query
   */
  async searchTips(query: string, limit?: number): Promise<HealthTip[]> {
    try {
      const cacheKey = `search_${query}_${limit || 'all'}`;
      const cached = await cacheService.getAdvanced<HealthTip[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const filter: HealthTipFilter = { searchQuery: query, isActive: true };
      const result = await this.getHealthTips(filter, { field: 'engagementScore', direction: 'desc' }, limit);

      // Cache search results for 10 minutes
      await cacheService.setAdvanced(cacheKey, result.tips, {
        ttl: 10,
        level: 'memory',
        importance: 0.6
      });

      return result.tips;
    } catch (error) {
      console.error('Error searching tips:', error);
      throw new Error('Failed to search tips');
    }
  }

  /**
   * Record user interaction with a tip
   */
  async recordInteraction(interaction: UserHealthTipInteraction): Promise<void> {
    try {
      // Store interaction
      await this.storeInteraction(interaction);

      // Update tip metadata
      await this.updateTipMetadata(interaction);

      // Feed interaction to AI personalization service for learning
      try {
        await aiPersonalizationService.learnFromInteraction(interaction);
      } catch (aiError) {
        console.warn('AI personalization learning failed:', aiError);
        // Don't fail the entire interaction recording if AI learning fails
      }

      // Track analytics
      analyticsService.trackEvent('tip_interaction', {
        userId: interaction.userId,
        tipId: interaction.tipId,
        interactionType: interaction.interactionType,
        timestamp: interaction.timestamp
      });

      // Invalidate related caches
      await this.invalidateRelatedCaches(interaction.tipId);

    } catch (error) {
      console.error('Error recording interaction:', error);
      throw new Error('Failed to record interaction');
    }
  }

  /**
   * Get user's bookmarked tips
   */
  async getUserBookmarks(userId: string): Promise<HealthTip[]> {
    try {
      const cacheKey = `bookmarks_${userId}`;
      const cached = await cacheService.getAdvanced<HealthTip[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Get user interactions
      const interactions = await this.getUserInteractions(userId);
      const bookmarkedTipIds = interactions
        .filter(i => i.interactionType === 'bookmark')
        .map(i => i.tipId);

      // Get bookmarked tips
      const allTips = await this.getAllTipsFromStorage();
      const bookmarkedTips = allTips.filter(tip => 
        bookmarkedTipIds.includes(tip.id) && tip.isActive
      );

      // Cache for 30 minutes
      await cacheService.setAdvanced(cacheKey, bookmarkedTips, {
        ttl: 30,
        level: 'memory',
        importance: 0.7
      });

      return bookmarkedTips;
    } catch (error) {
      console.error('Error getting user bookmarks:', error);
      throw new Error('Failed to retrieve bookmarks');
    }
  }

  /**
   * Get trending tips based on engagement
   */
  async getTrendingTips(limit: number = 10): Promise<HealthTip[]> {
    try {
      const cacheKey = `trending_${limit}`;
      const cached = await cacheService.getAdvanced<HealthTip[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const result = await this.getHealthTips(
        { isActive: true },
        { field: 'engagementScore', direction: 'desc' },
        limit
      );

      // Cache trending tips for 1 hour
      await cacheService.setAdvanced(cacheKey, result.tips, {
        ttl: 60,
        level: 'memory',
        importance: 0.9
      });

      return result.tips;
    } catch (error) {
      console.error('Error getting trending tips:', error);
      throw new Error('Failed to retrieve trending tips');
    }
  }

  /**
   * Get AI-powered personalized recommendations for user
   */
  async getPersonalizedTips(userId: string, limit: number = 10): Promise<HealthTip[]> {
    try {
      const cacheKey = `ai_personalized_tips_${userId}_${limit}`;
      const cached = await cacheService.getAdvanced<HealthTip[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Get AI-powered personalized recommendations
      const recommendations = await aiPersonalizationService.getPersonalizedRecommendations(userId, limit);
      
      // Convert recommendations to HealthTip objects
      const personalizedTips: HealthTip[] = [];
      
      for (const rec of recommendations) {
        const tip = await this.getHealthTipById(rec.tipId);
        if (tip) {
          // Enhance tip with personalization metadata
          const enhancedTip = {
            ...tip,
            personalizationScore: rec.score,
            personalizationReason: rec.reasoning.join(', '),
            personalizedRank: rec.personalizedRank,
            aiConfidence: rec.confidence
          };
          personalizedTips.push(enhancedTip);
        }
      }

      // Cache for 30 minutes
      await cacheService.setAdvanced(cacheKey, personalizedTips, {
        ttl: 30,
        level: 'memory',
        importance: 0.9
      });

      return personalizedTips;
    } catch (error) {
      console.error('Error getting AI personalized tips:', error);
      // Fallback to rule-based recommendations
      return this.getRecommendedTips(userId, limit);
    }
  }

  /**
   * Get recommended tips for user (rule-based fallback)
   */
  async getRecommendedTips(userId: string, limit: number = 10): Promise<HealthTip[]> {
    try {
      const cacheKey = `recommendations_${userId}_${limit}`;
      const cached = await cacheService.getAdvanced<HealthTip[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Get user's interaction history
      const interactions = await this.getUserInteractions(userId);
      
      // Analyze user preferences
      const preferences = this.analyzeUserPreferences(interactions);
      
      // Get tips based on preferences
      const allTips = await this.getAllTipsFromStorage();
      const recommendedTips = this.scoreAndRankTips(allTips, preferences, interactions)
        .filter(tip => tip.isActive)
        .slice(0, limit);

      // Cache for 20 minutes
      await cacheService.setAdvanced(cacheKey, recommendedTips, {
        ttl: 20,
        level: 'memory',
        importance: 0.8
      });

      return recommendedTips;
    } catch (error) {
      console.error('Error getting recommended tips:', error);
      // Fallback to trending tips
      return this.getTrendingTips(limit);
    }
  }

  // Private helper methods
  private async getAllTipsFromStorage(): Promise<HealthTip[]> {
    try {
      const tipsData = await storage.getData('HEALTH_TIPS');
      return tipsData ? Object.values(tipsData) : [];
    } catch (error) {
      console.error('Error getting tips from storage:', error);
      return [];
    }
  }

  private async saveTipToStorage(tip: HealthTip): Promise<void> {
    try {
      const tipsData = await storage.getData('HEALTH_TIPS') || {};
      tipsData[tip.id] = tip;
      await storage.storeData('HEALTH_TIPS', tipsData);
    } catch (error) {
      console.error('Error saving tip to storage:', error);
      throw error;
    }
  }

  private applyFilters(tips: HealthTip[], filter: HealthTipFilter): HealthTip[] {
    return tips.filter(tip => {
      // Category filter
      if (filter.category && tip.category !== filter.category) {
        return false;
      }

      // Difficulty filter
      if (filter.difficulty && tip.difficulty !== filter.difficulty) {
        return false;
      }

      // Tags filter
      if (filter.tags && filter.tags.length > 0) {
        const hasMatchingTag = filter.tags.some(tag => 
          tip.tags.some(tipTag => tipTag.toLowerCase().includes(tag.toLowerCase()))
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Read time filter
      if (filter.maxReadTime && tip.estimatedReadTime > filter.maxReadTime) {
        return false;
      }

      // Rating filter
      if (filter.minRating && tip.metadata.averageRating < filter.minRating) {
        return false;
      }

      // Active filter
      if (filter.isActive !== undefined && tip.isActive !== filter.isActive) {
        return false;
      }

      // Search query filter
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const searchableText = `${tip.title} ${tip.content} ${tip.tags.join(' ')}`.toLowerCase();
        if (!searchableText.includes(query)) {
          return false;
        }
      }

      // Date range filter
      if (filter.dateRange) {
        const tipDate = new Date(tip.createdAt);
        if (tipDate < filter.dateRange.start || tipDate > filter.dateRange.end) {
          return false;
        }
      }

      return true;
    });
  }

  private applySorting(tips: HealthTip[], sort: HealthTipSortOptions): HealthTip[] {
    return tips.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sort.field) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'priority':
          aValue = a.priority;
          bValue = b.priority;
          break;
        case 'engagementScore':
          aValue = a.metadata.engagementScore;
          bValue = b.metadata.engagementScore;
          break;
        case 'averageRating':
          aValue = a.metadata.averageRating;
          bValue = b.metadata.averageRating;
          break;
        default:
          return 0;
      }

      if (sort.direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  }

  private async storeInteraction(interaction: UserHealthTipInteraction): Promise<void> {
    try {
      const interactionsData = await storage.getData('USER_INTERACTIONS') || {};
      const userInteractions = interactionsData[interaction.userId] || [];
      
      userInteractions.push(interaction);
      interactionsData[interaction.userId] = userInteractions;
      
      await storage.storeData('USER_INTERACTIONS', interactionsData);
    } catch (error) {
      console.error('Error storing interaction:', error);
      throw error;
    }
  }

  private async getUserInteractions(userId: string): Promise<UserHealthTipInteraction[]> {
    try {
      const interactionsData = await storage.getData('USER_INTERACTIONS') || {};
      return interactionsData[userId] || [];
    } catch (error) {
      console.error('Error getting user interactions:', error);
      return [];
    }
  }

  private async updateTipMetadata(interaction: UserHealthTipInteraction): Promise<void> {
    try {
      const tip = await this.getHealthTipById(interaction.tipId);
      if (!tip) return;

      const metadata = { ...tip.metadata };

      switch (interaction.interactionType) {
        case 'view':
          metadata.views += 1;
          break;
        case 'like':
          metadata.likes += 1;
          break;
        case 'bookmark':
          metadata.bookmarks += 1;
          break;
        case 'complete':
          metadata.completions += 1;
          break;
        case 'share':
          metadata.shares += 1;
          break;
        case 'rate':
          if (interaction.metadata?.rating) {
            const newRating = interaction.metadata.rating;
            const totalRating = metadata.averageRating * metadata.ratingCount + newRating;
            metadata.ratingCount += 1;
            metadata.averageRating = totalRating / metadata.ratingCount;
          }
          break;
      }

      // Update engagement score
      metadata.engagementScore = this.calculateEngagementScore(metadata);
      metadata.lastInteractionDate = interaction.timestamp;

      // Update the tip
      await this.updateHealthTip(interaction.tipId, { metadata });
    } catch (error) {
      console.error('Error updating tip metadata:', error);
    }
  }

  private calculateEngagementScore(metadata: any): number {
    // Weighted engagement score calculation
    const weights = {
      views: 1,
      likes: 3,
      bookmarks: 4,
      completions: 5,
      shares: 6,
      ratings: 2
    };

    const score = 
      (metadata.views * weights.views) +
      (metadata.likes * weights.likes) +
      (metadata.bookmarks * weights.bookmarks) +
      (metadata.completions * weights.completions) +
      (metadata.shares * weights.shares) +
      (metadata.ratingCount * weights.ratings * metadata.averageRating);

    // Normalize to 0-100 scale
    return Math.min(100, Math.max(0, score / 10));
  }

  private analyzeUserPreferences(interactions: UserHealthTipInteraction[]): any {
    const preferences = {
      categories: {} as Record<string, number>,
      difficulties: {} as Record<string, number>,
      tags: {} as Record<string, number>
    };

    // Count positive interactions by category, difficulty, etc.
    for (const interaction of interactions) {
      if (['like', 'bookmark', 'complete', 'share'].includes(interaction.interactionType)) {
        // This would need tip data to analyze categories/difficulties
        // For now, we'll use a simplified approach
      }
    }

    return preferences;
  }

  private scoreAndRankTips(
    tips: HealthTip[], 
    preferences: any, 
    interactions: UserHealthTipInteraction[]
  ): HealthTip[] {
    // Get IDs of tips user has already interacted with
    const interactedTipIds = new Set(interactions.map(i => i.tipId));

    return tips
      .filter(tip => !interactedTipIds.has(tip.id)) // Exclude already seen tips
      .map(tip => ({
        ...tip,
        recommendationScore: this.calculateRecommendationScore(tip, preferences)
      }))
      .sort((a: any, b: any) => b.recommendationScore - a.recommendationScore);
  }

  private calculateRecommendationScore(tip: HealthTip, preferences: any): number {
    let score = tip.metadata.engagementScore * 0.3; // Base engagement score

    // Add preference bonuses (simplified)
    score += tip.priority * 5; // Priority bonus
    score += tip.metadata.averageRating * 10; // Rating bonus

    return score;
  }

  private generateCacheKey(...parts: any[]): string {
    return parts
      .map(part => typeof part === 'object' ? JSON.stringify(part) : String(part))
      .join('_')
      .replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private generateId(): string {
    return `tip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get AI personalization health status
   */
  async getAIPersonalizationHealth(): Promise<{
    aiServiceAvailable: boolean;
    personalizationEnabled: boolean;
    fallbackActive: boolean;
    lastError?: string;
  }> {
    try {
      const healthStatus = await aiPersonalizationService.healthCheck();
      
      return {
        aiServiceAvailable: healthStatus.aiServiceAvailable,
        personalizationEnabled: healthStatus.overallHealth !== 'unhealthy',
        fallbackActive: healthStatus.overallHealth === 'degraded',
        lastError: healthStatus.overallHealth === 'unhealthy' ? 'AI service unavailable' : undefined
      };
    } catch (error) {
      console.error('Error checking AI personalization health:', error);
      return {
        aiServiceAvailable: false,
        personalizationEnabled: false,
        fallbackActive: true,
        lastError: (error as Error).message
      };
    }
  }

  private async invalidateRelatedCaches(tipId?: string): Promise<void> {
    try {
      const patterns = [
        /^tips_/,
        /^trending_/,
        /^recommendations_/,
        /^ai_personalized_tips_/,
        /^search_/,
        /^bookmarks_/
      ];

      if (tipId) {
        patterns.push(new RegExp(`^tip_${tipId}$`));
      }

      for (const pattern of patterns) {
        await cacheService.invalidatePattern(pattern);
      }
    } catch (error) {
      console.error('Error invalidating caches:', error);
    }
  }
}

export const healthTipService = HealthTipService.getInstance();