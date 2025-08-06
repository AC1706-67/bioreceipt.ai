/**
 * Content Service
 * Handles health tip content management and CRUD operations
 * Integrates with the HealthTip Content Management System API
 */

import { HealthTip, HealthTipCategory, DifficultyLevel } from '../../models/HealthTip';
import { UserEngagement, TipInteraction } from '../../types';
import { HealthCategory, TipDifficulty } from '../../types';
import { CacheService } from '../cache/cacheService';
import { SyncService } from '../sync/syncService';
import { validateData, healthTipSchema } from '../../utils/validation';
import { tokenManager } from '../../utils/tokenManager';
import { loggingService } from '../logging/loggingService';

export interface ContentFilter {
  category?: HealthCategory;
  difficulty?: TipDifficulty;
  tags?: string[];
  searchQuery?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContentStats {
  totalTips: number;
  categoryCounts: Record<HealthCategory, number>;
  averageReadTime: number;
  mostPopularTags: string[];
}

export interface PaginatedTipsResponse {
  data: HealthTip[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

/**
 * Content Service Class
 */
export class ContentService {
  private static instance: ContentService;
  private cacheService: CacheService;
  private syncService: SyncService;
  private baseUrl: string;

  private constructor() {
    this.cacheService = CacheService.getInstance();
    this.syncService = SyncService.getInstance();
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  }

  public static getInstance(): ContentService {
    if (!ContentService.instance) {
      ContentService.instance = new ContentService();
    }
    return ContentService.instance;
  }

  /**
   * Get authentication headers for API requests
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const tokens = await tokenManager.getTokens();
      const token = tokens?.accessToken;
      return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      };
    } catch (error) {
      await loggingService.logWarning('Failed to get auth token for API request', { error });
      return {
        'Content-Type': 'application/json',
      };
    }
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${this.baseUrl}${endpoint}`;

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      await loggingService.logError('API request failed', error as Error, {
        endpoint,
        method: options.method || 'GET',
      });
      throw error;
    }
  }

  /**
   * Get all health tips with optional filtering and pagination
   */
  public async getHealthTips(filter?: ContentFilter): Promise<HealthTip[]> {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (filter?.category) params.append('category', filter.category);
      if (filter?.difficulty) params.append('difficulty', filter.difficulty);
      if (filter?.searchQuery) params.append('search', filter.searchQuery);
      if (filter?.sortBy) params.append('sortBy', filter.sortBy);
      if (filter?.sortOrder) params.append('sortOrder', filter.sortOrder);
      if (filter?.page) params.append('page', filter.page.toString());
      if (filter?.limit) params.append('limit', filter.limit.toString());

      const queryString = params.toString();
      const endpoint = `/health-tips${queryString ? `?${queryString}` : ''}`;

      // Try to get from cache first for simple requests
      const cacheKey = `health-tips-${queryString}`;
      if (!filter?.page && !filter?.limit) {
        const cachedTips = await this.cacheService.get<HealthTip[]>(cacheKey);
        if (cachedTips) {
          return cachedTips;
        }
      }

      // Fetch from API
      const response = await this.apiRequest<PaginatedTipsResponse>(endpoint);
      const tips = response.data;

      // Cache the results for simple requests
      if (!filter?.page && !filter?.limit && tips.length > 0) {
        await this.cacheService.set(cacheKey, tips, 300); // Cache for 5 minutes
      }

      await loggingService.logInfo('Health tips retrieved successfully', {
        count: tips.length,
        filter,
      });

      return tips;
    } catch (error) {
      await loggingService.logError('Error getting health tips', error as Error, { filter });
      
      // Fallback to cached data if API fails
      try {
        const cachedTips = await this.cacheService.getCachedHealthTips();
        if (cachedTips.length > 0) {
          const healthTips: HealthTip[] = cachedTips.map(({ cachedAt, viewCount, ...tip }) => tip);
          return filter ? this.applyFilters(healthTips, filter) : healthTips;
        }
      } catch (cacheError) {
        await loggingService.logWarning('Cache fallback also failed', { cacheError });
      }

      throw new Error('Failed to retrieve health tips');
    }
  }

  /**
   * Get paginated health tips
   */
  public async getPaginatedHealthTips(filter?: ContentFilter): Promise<PaginatedTipsResponse> {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (filter?.category) params.append('category', filter.category);
      if (filter?.difficulty) params.append('difficulty', filter.difficulty);
      if (filter?.searchQuery) params.append('search', filter.searchQuery);
      if (filter?.sortBy) params.append('sortBy', filter.sortBy);
      if (filter?.sortOrder) params.append('sortOrder', filter.sortOrder);
      params.append('page', (filter?.page || 1).toString());
      params.append('limit', (filter?.limit || 10).toString());

      const queryString = params.toString();
      const endpoint = `/health-tips?${queryString}`;

      const response = await this.apiRequest<PaginatedTipsResponse>(endpoint);

      await loggingService.logInfo('Paginated health tips retrieved successfully', {
        page: filter?.page || 1,
        limit: filter?.limit || 10,
        total: response.pagination.total,
      });

      return response;
    } catch (error) {
      await loggingService.logError('Error getting paginated health tips', error as Error, { filter });
      throw new Error('Failed to retrieve paginated health tips');
    }
  }

  /**
   * Get a specific health tip by ID
   */
  public async getHealthTipById(tipId: string): Promise<HealthTip | null> {
    try {
      // Try cache first
      const cacheKey = `health-tip-${tipId}`;
      const cachedTip = await this.cacheService.get<HealthTip>(cacheKey);
      if (cachedTip) {
        return cachedTip;
      }

      // Fetch from API
      const response = await this.apiRequest<ApiResponse<HealthTip>>(`/health-tips/${tipId}`);
      
      if (response.success && response.data) {
        // Cache the tip
        await this.cacheService.set(cacheKey, response.data, 300);
        
        await loggingService.logInfo('Health tip retrieved by ID', { tipId });
        return response.data;
      }

      return null;
    } catch (error) {
      await loggingService.logError('Error getting health tip by ID', error as Error, { tipId });
      
      // Fallback to cache or local search
      try {
        const tips = await this.cacheService.getCachedHealthTips();
        const tip = tips.find(t => t.id === tipId);
        return tip ? { ...tip } : null;
      } catch (fallbackError) {
        await loggingService.logWarning('Fallback search also failed', { fallbackError });
      }

      return null;
    }
  }

  /**
   * Get daily personalized tips
   */
  public async getDailyTips(userId: string, count: number = 3): Promise<HealthTip[]> {
    try {
      // First check cached daily tips
      let dailyTips = await this.cacheService.getCachedDailyTips();
      
      if (dailyTips.length === 0) {
        // Get personalized tips (mock personalization for now)
        const allTips = await this.getHealthTips();
        dailyTips = this.selectPersonalizedTips(allTips, userId, count);
        
        // Cache the daily tips
        await this.cacheService.cacheDailyTips(dailyTips);
      }

      return dailyTips.slice(0, count);
    } catch (error) {
      console.error('Error getting daily tips:', error);
      throw new Error('Failed to retrieve daily tips');
    }
  }

  /**
   * Record user engagement with a tip
   */
  public async recordEngagement(
    userId: string,
    tipId: string,
    action: UserEngagement['action']
  ): Promise<void> {
    try {
      const engagement: Omit<UserEngagement, 'id'> = {
        tipId,
        userId,
        action,
        timestamp: new Date(),
        sessionId: `session_${Date.now()}`,
      };

      // For view actions, increment view count via API
      if (action === 'view') {
        try {
          await this.apiRequest(`/health-tips/${tipId}/view`, {
            method: 'POST',
          });
        } catch (apiError) {
          await loggingService.logWarning('Failed to increment view count via API', { 
            tipId, 
            error: apiError 
          });
        }
      }

      // Handle offline/online sync for all engagements
      await this.syncService.handleOfflineAction('engagement', engagement);

      // Update progress tracking for completed tips
      if (action === 'complete') {
        const { progressService } = await import('../progress/progressService');
        // progressService is already imported as singleton
        await progressService.updateUserProgress(userId, tipId);
      }

      await loggingService.logInfo('User engagement recorded', {
        userId,
        tipId,
        action,
      });
    } catch (error) {
      await loggingService.logError('Error recording engagement', error as Error, {
        userId,
        tipId,
        action,
      });
      throw new Error('Failed to record engagement');
    }
  }

  /**
   * Get user's tip interactions
   */
  public async getUserTipInteractions(userId: string): Promise<Record<string, TipInteraction>> {
    try {
      // This would typically come from API/cache
      // For now, return mock data
      return {};
    } catch (error) {
      console.error('Error getting user tip interactions:', error);
      return {};
    }
  }

  /**
   * Search tips by query
   */
  public async searchTips(query: string): Promise<HealthTip[]> {
    try {
      const allTips = await this.getHealthTips();
      const lowercaseQuery = query.toLowerCase();

      return allTips.filter(tip => 
        tip.title.toLowerCase().includes(lowercaseQuery) ||
        tip.content.toLowerCase().includes(lowercaseQuery) ||
        tip.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
      );
    } catch (error) {
      console.error('Error searching tips:', error);
      throw new Error('Failed to search tips');
    }
  }

  /**
   * Get tips by category
   */
  public async getTipsByCategory(category: HealthCategory): Promise<HealthTip[]> {
    try {
      return await this.getHealthTips({ category });
    } catch (error) {
      console.error('Error getting tips by category:', error);
      throw new Error('Failed to retrieve tips by category');
    }
  }

  /**
   * Get content statistics
   */
  public async getContentStats(): Promise<ContentStats> {
    try {
      const tips = await this.getHealthTips();
      
      const categoryCounts: Record<HealthCategory, number> = {
        nutrition: 0,
        mental_wellness: 0,
        fitness: 0,
        sleep: 0,
        recovery: 0,
        hygiene: 0,
      };

      const allTags: string[] = [];
      let totalReadTime = 0;

      tips.forEach(tip => {
        categoryCounts[tip.category]++;
        allTags.push(...tip.tags);
        totalReadTime += tip.estimatedReadTime;
      });

      // Count tag frequency
      const tagCounts: Record<string, number> = {};
      allTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });

      // Get most popular tags
      const mostPopularTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag]) => tag);

      return {
        totalTips: tips.length,
        categoryCounts,
        averageReadTime: tips.length > 0 ? Math.round(totalReadTime / tips.length) : 0,
        mostPopularTags,
      };
    } catch (error) {
      console.error('Error getting content stats:', error);
      throw new Error('Failed to retrieve content statistics');
    }
  }

  /**
   * Create a new health tip (admin function)
   */
  public async createHealthTip(tipData: Omit<HealthTip, 'id' | 'createdAt' | 'updatedAt'>): Promise<HealthTip> {
    try {
      // Create via API
      const response = await this.apiRequest<ApiResponse<HealthTip>>('/health-tips', {
        method: 'POST',
        body: JSON.stringify(tipData),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to create health tip');
      }

      // Clear relevant caches
      await this.clearTipsCache();

      await loggingService.logInfo('Health tip created successfully', {
        tipId: response.data.id,
        title: response.data.title,
      });

      return response.data;
    } catch (error) {
      await loggingService.logError('Error creating health tip', error as Error, { tipData });
      throw new Error('Failed to create health tip');
    }
  }

  /**
   * Update an existing health tip (admin function)
   */
  public async updateHealthTip(tipId: string, updates: Partial<HealthTip>): Promise<HealthTip> {
    try {
      // Update via API
      const response = await this.apiRequest<ApiResponse<HealthTip>>(`/health-tips/${tipId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update health tip');
      }

      // Clear relevant caches
      await this.clearTipsCache();
      await this.cacheService.delete(`health-tip-${tipId}`);

      await loggingService.logInfo('Health tip updated successfully', {
        tipId,
        title: response.data.title,
      });

      return response.data;
    } catch (error) {
      await loggingService.logError('Error updating health tip', error as Error, { tipId, updates });
      throw new Error('Failed to update health tip');
    }
  }

  /**
   * Delete a health tip (admin function)
   */
  public async deleteHealthTip(tipId: string): Promise<void> {
    try {
      // Delete via API
      const response = await this.apiRequest<ApiResponse<null>>(`/health-tips/${tipId}`, {
        method: 'DELETE',
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete health tip');
      }

      // Clear relevant caches
      await this.clearTipsCache();
      await this.cacheService.delete(`health-tip-${tipId}`);

      await loggingService.logInfo('Health tip deleted successfully', { tipId });
    } catch (error) {
      await loggingService.logError('Error deleting health tip', error as Error, { tipId });
      throw new Error('Failed to delete health tip');
    }
  }

  /**
   * Get health tip analytics
   */
  public async getHealthTipAnalytics(tipId: string): Promise<any> {
    try {
      const response = await this.apiRequest<ApiResponse<any>>(`/health-tips/${tipId}/analytics`);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to get health tip analytics');
      }

      await loggingService.logInfo('Health tip analytics retrieved', { tipId });
      return response.data;
    } catch (error) {
      await loggingService.logError('Error getting health tip analytics', error as Error, { tipId });
      throw new Error('Failed to get health tip analytics');
    }
  }

  /**
   * Clear tips cache
   */
  private async clearTipsCache(): Promise<void> {
    try {
      // Clear all health tips related cache entries
      await this.cacheService.deletePattern('health-tips-*');
      await this.cacheService.delete('cached-health-tips');
      await this.cacheService.delete('cached-daily-tips');
    } catch (error) {
      await loggingService.logWarning('Failed to clear tips cache', { error });
    }
  }

  // Private helper methods

  /**
   * Fetch tips from API (mock implementation)
   */
  private async fetchTipsFromAPI(): Promise<HealthTip[]> {
    // Mock API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock health tips data
    const mockTips: HealthTip[] = [
      {
        id: 'tip_1',
        title: 'Stay Hydrated Throughout the Day',
        content: 'Drinking adequate water is essential for maintaining good health. Aim for 8 glasses of water daily to keep your body properly hydrated and support optimal organ function.',
        category: HealthTipCategory.NUTRITION,
        tags: ['hydration', 'water', 'health', 'daily'],
        difficulty: DifficultyLevel.BEGINNER,
        estimatedReadTime: 2,
        author: 'admin',
        priority: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        isActive: true,
        metadata: {
          views: 0,
          likes: 0,
          bookmarks: 0,
          completions: 0,
          shares: 0,
          averageRating: 0,
          ratingCount: 0,
          engagementScore: 0
        },
      },
      {
        id: 'tip_2',
        title: 'Practice Deep Breathing for Stress Relief',
        content: 'Take 5 minutes each day to practice deep breathing exercises. Inhale slowly for 4 counts, hold for 4 counts, then exhale for 6 counts. This simple technique can significantly reduce stress and anxiety.',
        category: HealthTipCategory.MENTAL_WELLNESS,
        tags: ['breathing', 'stress', 'relaxation', 'mindfulness'],
        difficulty: DifficultyLevel.BEGINNER,
        estimatedReadTime: 3,
        author: 'admin',
        priority: 5,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        isActive: true,
        metadata: {
          views: 0,
          likes: 0,
          bookmarks: 0,
          completions: 0,
          shares: 0,
          averageRating: 0,
          ratingCount: 0,
          engagementScore: 0
        },
      },
      {
        id: 'tip_3',
        title: 'Take a 10-Minute Walk After Meals',
        content: 'A short walk after eating can help improve digestion, regulate blood sugar levels, and boost your energy. Even a gentle 10-minute stroll can make a significant difference in how you feel.',
        category: HealthTipCategory.FITNESS,
        tags: ['walking', 'exercise', 'digestion', 'energy'],
        difficulty: DifficultyLevel.BEGINNER,
        estimatedReadTime: 2,
        author: 'admin',
        priority: 5,
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-03'),
        isActive: true,
        metadata: {
          views: 0,
          likes: 0,
          bookmarks: 0,
          completions: 0,
          shares: 0,
          averageRating: 0,
          ratingCount: 0,
          engagementScore: 0
        },
      },
      {
        id: 'tip_4',
        title: 'Establish a Consistent Sleep Schedule',
        content: 'Going to bed and waking up at the same time every day helps regulate your circadian rhythm. This consistency can improve sleep quality, boost mood, and enhance overall health.',
        category: HealthTipCategory.SLEEP,
        tags: ['sleep', 'routine', 'circadian', 'health'],
        difficulty: DifficultyLevel.INTERMEDIATE,
        estimatedReadTime: 3,
        author: 'admin',
        priority: 5,
        createdAt: new Date('2024-01-04'),
        updatedAt: new Date('2024-01-04'),
        isActive: true,
        metadata: {
          views: 0,
          likes: 0,
          bookmarks: 0,
          completions: 0,
          shares: 0,
          averageRating: 0,
          ratingCount: 0,
          engagementScore: 0
        },
      },
      {
        id: 'tip_5',
        title: 'Wash Your Hands Properly',
        content: 'Proper handwashing is one of the most effective ways to prevent illness. Wash with soap and warm water for at least 20 seconds, especially before eating and after using the restroom.',
        category: HealthTipCategory.HYGIENE,
        tags: ['handwashing', 'hygiene', 'prevention', 'health'],
        difficulty: DifficultyLevel.BEGINNER,
        estimatedReadTime: 2,
        author: 'admin',
        priority: 5,
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-05'),
        isActive: true,
        metadata: {
          views: 0,
          likes: 0,
          bookmarks: 0,
          completions: 0,
          shares: 0,
          averageRating: 0,
          ratingCount: 0,
          engagementScore: 0
        },
      },
    ];

    return mockTips;
  }

  /**
   * Apply filters to tips array
   */
  private applyFilters(tips: HealthTip[], filter: ContentFilter): HealthTip[] {
    let filteredTips = tips;

    if (filter.category) {
      filteredTips = filteredTips.filter(tip => tip.category === filter.category);
    }

    if (filter.difficulty) {
      filteredTips = filteredTips.filter(tip => tip.difficulty === filter.difficulty);
    }

    if (filter.tags && filter.tags.length > 0) {
      filteredTips = filteredTips.filter(tip => 
        filter.tags!.some(tag => tip.tags.includes(tag))
      );
    }

    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      filteredTips = filteredTips.filter(tip =>
        tip.title.toLowerCase().includes(query) ||
        tip.content.toLowerCase().includes(query) ||
        tip.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filteredTips;
  }

  /**
   * Select personalized tips for user (mock implementation)
   */
  private selectPersonalizedTips(tips: HealthTip[], userId: string, count: number): HealthTip[] {
    // Mock personalization - in real implementation, this would use user preferences and AI
    const shuffled = [...tips].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}

// Export singleton instance
export const contentService = ContentService.getInstance();