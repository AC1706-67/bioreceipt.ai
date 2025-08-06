/**
 * Content Search Service
 * Simplified version to fix compilation errors
 */

import { HealthTip } from '../../models/HealthTip';
import { storage } from '../../utils/storage';
import { cacheService } from '../cache/cacheService';

interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  includeInactive?: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  relevanceScore: number;
  highlightedText?: string;
}

interface SearchSuggestion {
  query: string;
  type: 'correction' | 'related' | 'completion';
  confidence: number;
}

class ContentSearchService {
  private static instance: ContentSearchService;
  private queryHistory: Map<string, number>;
  private popularQueries: string[];

  private constructor() {
    this.queryHistory = new Map();
    this.popularQueries = [];
  }

  static getInstance(): ContentSearchService {
    if (!ContentSearchService.instance) {
      ContentSearchService.instance = new ContentSearchService();
    }
    return ContentSearchService.instance;
  }

  /**
   * Search content with various strategies
   */
  async searchContent(
    query: string,
    options: SearchOptions = {},
    userId?: string
  ): Promise<SearchResult[]> {
    try {
      const cacheKey = `search_${query}_${JSON.stringify(options)}`;
      const cached = await cacheService.getAdvanced<SearchResult[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Clean and prepare query
      const cleanQuery = this.cleanQuery(query);
      
      // Track search query
      await this.trackSearchQuery(cleanQuery, userId);

      // Perform search
      const results = await this.performSearch(cleanQuery, options);

      // Cache results for 5 minutes
      await cacheService.setAdvanced(cacheKey, results, {
        ttl: 5,
        level: 'memory',
        importance: 0.4
      });

      return results;
    } catch (error) {
      console.error('Error searching content:', error);
      return [];
    }
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
    try {
      const suggestions: SearchSuggestion[] = [];
      
      // Add popular queries as suggestions
      const popularMatches = this.popularQueries
        .filter(q => q.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
        .map(q => ({
          query: q,
          type: 'completion' as const,
          confidence: 0.8
        }));

      suggestions.push(...popularMatches);

      return suggestions;
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  /**
   * Get popular search queries
   */
  async getPopularQueries(limit: number = 10): Promise<string[]> {
    try {
      return this.popularQueries.slice(0, limit);
    } catch (error) {
      console.error('Error getting popular queries:', error);
      return [];
    }
  }

  // Private helper methods
  private cleanQuery(query: string): string {
    return query.trim().toLowerCase();
  }

  private async trackSearchQuery(query: string, userId?: string): Promise<void> {
    try {
      const currentCount = this.queryHistory.get(query) || 0;
      this.queryHistory.set(query, currentCount + 1);

      // Update popular queries
      if (!this.popularQueries.includes(query)) {
        this.popularQueries.push(query);
      }

      // Keep only top 100 popular queries
      if (this.popularQueries.length > 100) {
        this.popularQueries = this.popularQueries.slice(0, 100);
      }
    } catch (error) {
      console.error('Error tracking search query:', error);
    }
  }

  private async performSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      // Get all health tips
      const tipsData = await storage.getData('HEALTH_TIPS') || {};
      const tips: HealthTip[] = Object.values(tipsData);

      // Filter active tips
      const activeTips = tips.filter(tip => options.includeInactive || tip.isActive);

      // Search in title and content
      const results = activeTips
        .map(tip => {
          const titleMatch = tip.title.toLowerCase().includes(query);
          const contentMatch = tip.content.toLowerCase().includes(query);
          const tagMatch = tip.tags.some(tag => tag.toLowerCase().includes(query));

          let relevanceScore = 0;
          if (titleMatch) relevanceScore += 0.6;
          if (contentMatch) relevanceScore += 0.3;
          if (tagMatch) relevanceScore += 0.1;

          if (relevanceScore > 0) {
            return {
              id: tip.id,
              title: tip.title,
              content: tip.content,
              category: tip.category,
              relevanceScore,
              highlightedText: this.highlightText(tip.content, query)
            };
          }
          return null;
        })
        .filter(result => result !== null)
        .sort((a, b) => b!.relevanceScore - a!.relevanceScore);

      // Apply limit
      const limit = options.limit || 20;
      return results.slice(0, limit) as SearchResult[];
    } catch (error) {
      console.error('Error performing search:', error);
      return [];
    }
  }

  private highlightText(text: string, query: string): string {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
}

export const contentSearchService = ContentSearchService.getInstance();