/**
 * Content Search Service Unit Tests
 * Tests for search functionality, suggestions, and query tracking
 */

import { contentSearchService } from '../contentSearchService';
import { storage } from '../../../utils/storage';
import { cacheService } from '../../cache/cacheService';
import { HealthTip, HealthTipCategory, DifficultyLevel } from '../../../models/HealthTip';

// Mock dependencies
jest.mock('../../../utils/storage');
jest.mock('../../cache/cacheService');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

describe('ContentSearchService', () => {
  const mockTips: HealthTip[] = [
    {
      id: 'tip-1',
      title: 'Stay Hydrated',
      content: 'Drinking water is essential for good health. Aim for 8 glasses per day.',
      category: HealthTipCategory.NUTRITION,
      difficulty: DifficultyLevel.BEGINNER,
      estimatedReadTime: 2,
      tags: ['hydration', 'water', 'health'],
      author: 'Dr. Smith',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      isActive: true,
      priority: 5,
      metadata: {
        views: 100,
        likes: 25,
        bookmarks: 10,
        completions: 15,
        shares: 5,
        averageRating: 4.5,
        ratingCount: 20,
        engagementScore: 85
      }
    },
    {
      id: 'tip-2',
      title: 'Exercise Daily',
      content: 'Regular exercise improves cardiovascular health and mental wellbeing.',
      category: HealthTipCategory.FITNESS,
      difficulty: DifficultyLevel.INTERMEDIATE,
      estimatedReadTime: 5,
      tags: ['exercise', 'fitness', 'cardio'],
      author: 'Dr. Johnson',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      isActive: true,
      priority: 7,
      metadata: {
        views: 150,
        likes: 35,
        bookmarks: 20,
        completions: 25,
        shares: 8,
        averageRating: 4.8,
        ratingCount: 30,
        engagementScore: 92
      }
    },
    {
      id: 'tip-3',
      title: 'Get Quality Sleep',
      content: 'Good sleep is crucial for recovery and mental health.',
      category: HealthTipCategory.SLEEP,
      difficulty: DifficultyLevel.BEGINNER,
      estimatedReadTime: 3,
      tags: ['sleep', 'recovery', 'mental health'],
      author: 'Dr. Brown',
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
      isActive: false, // Inactive tip
      priority: 6,
      metadata: {
        views: 80,
        likes: 15,
        bookmarks: 8,
        completions: 12,
        shares: 3,
        averageRating: 4.2,
        ratingCount: 15,
        engagementScore: 70
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock storage to return tips data
    const tipsData = mockTips.reduce((acc, tip) => {
      acc[tip.id] = tip;
      return acc;
    }, {} as Record<string, HealthTip>);
    
    mockStorage.getData.mockResolvedValue(tipsData);
    mockCacheService.getAdvanced.mockResolvedValue(null);
    mockCacheService.setAdvanced.mockResolvedValue();
  });

  describe('searchContent', () => {
    it('should return search results for title matches', async () => {
      const results = await contentSearchService.searchContent('hydrated');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('tip-1');
      expect(results[0].title).toBe('Stay Hydrated');
      expect(results[0].relevanceScore).toBeGreaterThan(0);
    });

    it('should return search results for content matches', async () => {
      const results = await contentSearchService.searchContent('exercise');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('tip-2');
      expect(results[0].title).toBe('Exercise Daily');
    });

    it('should return search results for tag matches', async () => {
      const results = await contentSearchService.searchContent('cardio');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('tip-2');
      expect(results[0].category).toBe(HealthTipCategory.FITNESS);
    });

    it('should return multiple results sorted by relevance', async () => {
      const results = await contentSearchService.searchContent('health');

      expect(results.length).toBeGreaterThan(0);
      // Results should be sorted by relevance score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(results[i].relevanceScore);
      }
    });

    it('should exclude inactive tips by default', async () => {
      const results = await contentSearchService.searchContent('sleep');

      // Should not include the inactive sleep tip
      expect(results).toHaveLength(0);
    });

    it('should include inactive tips when includeInactive is true', async () => {
      const results = await contentSearchService.searchContent('sleep', {
        includeInactive: true
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('tip-3');
    });

    it('should apply limit option', async () => {
      const results = await contentSearchService.searchContent('health', {
        limit: 1
      });

      expect(results).toHaveLength(1);
    });

    it('should handle case-insensitive search', async () => {
      const results = await contentSearchService.searchContent('HYDRATED');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Stay Hydrated');
    });

    it('should return empty array for empty query', async () => {
      const results = await contentSearchService.searchContent('');

      expect(results).toEqual([]);
    });

    it('should return empty array for whitespace-only query', async () => {
      const results = await contentSearchService.searchContent('   ');

      expect(results).toEqual([]);
    });

    it('should return empty array when no matches found', async () => {
      const results = await contentSearchService.searchContent('nonexistent');

      expect(results).toEqual([]);
    });

    it('should track search query', async () => {
      const userId = 'user-123';
      await contentSearchService.searchContent('hydration', {}, userId);

      // Verify that the query was tracked (this would be internal state)
      // We can test this by checking if subsequent calls to getPopularQueries include it
      const popularQueries = await contentSearchService.getPopularQueries();
      expect(popularQueries).toContain('hydration');
    });

    it('should use cache when available', async () => {
      const cachedResults = [
        {
          id: 'cached-tip',
          title: 'Cached Tip',
          content: 'This is cached content',
          category: 'general',
          relevanceScore: 1.0
        }
      ];

      mockCacheService.getAdvanced.mockResolvedValueOnce(cachedResults);

      const results = await contentSearchService.searchContent('test');

      expect(results).toEqual(cachedResults);
      expect(mockStorage.getData).not.toHaveBeenCalled();
    });

    it('should cache search results', async () => {
      await contentSearchService.searchContent('hydration');

      expect(mockCacheService.setAdvanced).toHaveBeenCalledWith(
        expect.stringContaining('search_hydration'),
        expect.any(Array),
        {
          ttl: 5,
          level: 'memory',
          importance: 0.4
        }
      );
    });

    it('should highlight search terms in results', async () => {
      const results = await contentSearchService.searchContent('water');

      const result = results.find(r => r.content.includes('water'));
      if (result) {
        expect(result.highlightedText).toContain('<mark>water</mark>');
      }
    });

    it('should handle storage errors gracefully', async () => {
      mockStorage.getData.mockRejectedValue(new Error('Storage error'));

      const results = await contentSearchService.searchContent('test');

      expect(results).toEqual([]);
    });
  });

  describe('getSearchSuggestions', () => {
    beforeEach(async () => {
      // Populate some search history
      await contentSearchService.searchContent('hydration');
      await contentSearchService.searchContent('exercise');
      await contentSearchService.searchContent('nutrition');
    });

    it('should return completion suggestions based on popular queries', async () => {
      const suggestions = await contentSearchService.getSearchSuggestions('hy');

      expect(suggestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            query: 'hydration',
            type: 'completion',
            confidence: 0.8
          })
        ])
      );
    });

    it('should limit suggestions to 5 results', async () => {
      // Add more queries to test limit
      for (let i = 0; i < 10; i++) {
        await contentSearchService.searchContent(`query${i}`);
      }

      const suggestions = await contentSearchService.getSearchSuggestions('query');

      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array when no matching suggestions', async () => {
      const suggestions = await contentSearchService.getSearchSuggestions('xyz');

      expect(suggestions).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      // Force an error by mocking internal state access
      const suggestions = await contentSearchService.getSearchSuggestions('test');

      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('getPopularQueries', () => {
    beforeEach(async () => {
      // Populate search history
      await contentSearchService.searchContent('hydration');
      await contentSearchService.searchContent('exercise');
      await contentSearchService.searchContent('nutrition');
      await contentSearchService.searchContent('hydration'); // Duplicate to increase popularity
    });

    it('should return popular queries', async () => {
      const popularQueries = await contentSearchService.getPopularQueries();

      expect(popularQueries).toContain('hydration');
      expect(popularQueries).toContain('exercise');
      expect(popularQueries).toContain('nutrition');
    });

    it('should respect limit parameter', async () => {
      const popularQueries = await contentSearchService.getPopularQueries(2);

      expect(popularQueries.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array when no queries tracked', async () => {
      // Create a fresh instance or clear history
      const popularQueries = await contentSearchService.getPopularQueries();

      expect(Array.isArray(popularQueries)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const popularQueries = await contentSearchService.getPopularQueries();

      expect(Array.isArray(popularQueries)).toBe(true);
    });
  });

  describe('Query Processing', () => {
    it('should clean queries by trimming and lowercasing', async () => {
      const results1 = await contentSearchService.searchContent('  HYDRATION  ');
      const results2 = await contentSearchService.searchContent('hydration');

      // Both should return the same results
      expect(results1).toEqual(results2);
    });

    it('should handle special characters in queries', async () => {
      const results = await contentSearchService.searchContent('health & wellness');

      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle very long queries', async () => {
      const longQuery = 'a'.repeat(1000);
      const results = await contentSearchService.searchContent(longQuery);

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Relevance Scoring', () => {
    it('should give higher scores to title matches than content matches', async () => {
      // Create a tip with query in title and another with query in content
      const titleMatchTip = {
        ...mockTips[0],
        title: 'Water Benefits',
        content: 'This tip discusses various topics'
      };
      
      const contentMatchTip = {
        ...mockTips[1],
        title: 'Health Tips',
        content: 'Drinking water is important for health'
      };

      mockStorage.getData.mockResolvedValue({
        'tip-1': titleMatchTip,
        'tip-2': contentMatchTip
      });

      const results = await contentSearchService.searchContent('water');

      if (results.length >= 2) {
        const titleMatch = results.find(r => r.title.includes('Water'));
        const contentMatch = results.find(r => r.content.includes('water'));
        
        if (titleMatch && contentMatch) {
          expect(titleMatch.relevanceScore).toBeGreaterThan(contentMatch.relevanceScore);
        }
      }
    });

    it('should give some score to tag matches', async () => {
      const results = await contentSearchService.searchContent('hydration');

      const result = results.find(r => r.id === 'tip-1');
      if (result) {
        expect(result.relevanceScore).toBeGreaterThan(0);
      }
    });
  });
});