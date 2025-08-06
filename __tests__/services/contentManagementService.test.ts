/**
 * Content Management Service Tests
 * Tests for enhanced content management functionality
 */

import { contentManagementService } from '../../src/services/content/contentManagementService';
import { supabase } from '../../src/config/supabase';
import { cacheService } from '../../src/services/cache/cacheService';
import { loggingService } from '../../src/services/logging/loggingService';
import { HealthTip, HealthCategory, TipDifficulty } from '../../src/types/healthTip';

// Mock dependencies
jest.mock('../../src/config/supabase');
jest.mock('../../src/services/cache/cacheService');
jest.mock('../../src/services/logging/loggingService');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockLoggingService = loggingService as jest.Mocked<typeof loggingService>;

describe('ContentManagementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.delete.mockResolvedValue(undefined);
    mockCacheService.deletePattern.mockResolvedValue(undefined);
    mockLoggingService.logInfo.mockResolvedValue(undefined);
    mockLoggingService.logError.mockResolvedValue(undefined);
    mockLoggingService.logWarning.mockResolvedValue(undefined);
  });

  describe('getContent', () => {
    const mockContentData = [
      {
        id: 'tip_1',
        title: 'Test Tip 1',
        content: 'Test content 1',
        category: 'nutrition',
        difficulty: 'easy',
        estimated_read_time: 2,
        tags: '["health", "nutrition"]',
        image_url: null,
        status: 'published',
        created_by: 'admin',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        view_count: 100,
        like_count: 10,
        bookmark_count: 5,
        completion_count: 8,
      },
    ];

    it('should get content with filtering and pagination', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockContentData,
          error: null,
          count: 1,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const filter = {
        page: 1,
        limit: 10,
        category: 'nutrition' as HealthCategory,
        difficulty: 'easy' as TipDifficulty,
        status: 'published' as any,
      };

      const result = await contentManagementService.getContent(filter);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('health_tips_extended');
    });

    it('should return cached content when available', async () => {
      const cachedResult = {
        data: [{ id: 'cached_tip' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
      };

      mockCacheService.get.mockResolvedValue(cachedResult);

      const result = await contentManagementService.getContent({ page: 1, limit: 10 });

      expect(result).toEqual(cachedResult);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
          count: 0,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await expect(contentManagementService.getContent())
        .rejects.toThrow('Failed to fetch content');
    });
  });

  describe('createContent', () => {
    const mockContentData = {
      title: 'New Health Tip',
      content: 'This is a new health tip content',
      category: 'nutrition' as HealthCategory,
      difficulty: 'easy' as TipDifficulty,
      estimatedReadTime: 3,
      tags: ['health', 'nutrition'],
      createdBy: 'admin',
      status: 'draft' as any,
    };

    it('should create content successfully', async () => {
      const mockInsertedData = {
        id: 'new_tip_id',
        ...mockContentData,
        tags: JSON.stringify(mockContentData.tags),
        estimated_read_time: mockContentData.estimatedReadTime,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        is_active: false,
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockInsertedData,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await contentManagementService.createContent(mockContentData);

      expect(result.id).toBe('new_tip_id');
      expect(result.title).toBe(mockContentData.title);
      expect(mockSupabase.from).toHaveBeenCalledWith('health_tips');
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('content:*');
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        title: 'A', // Too short
        content: 'Short', // Too short
        category: 'invalid' as any,
        difficulty: 'invalid' as any,
        estimatedReadTime: -1, // Invalid
        createdBy: 'admin',
      };

      await expect(contentManagementService.createContent(invalidData))
        .rejects.toThrow('Validation failed');
    });

    it('should handle database insertion errors', async () => {
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insertion failed' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await expect(contentManagementService.createContent(mockContentData))
        .rejects.toThrow('Failed to create content');
    });
  });

  describe('updateContent', () => {
    const updateData = {
      id: 'tip_1',
      title: 'Updated Title',
      status: 'published' as any,
    };

    it('should update content successfully', async () => {
      // Mock getContentById
      const existingContent = {
        id: 'tip_1',
        title: 'Original Title',
        content: 'Original content',
        category: 'nutrition' as HealthCategory,
        difficulty: 'easy' as TipDifficulty,
        estimatedReadTime: 2,
        tags: ['health'],
        createdBy: 'admin',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(contentManagementService, 'getContentById').mockResolvedValue(existingContent);

      const mockUpdatedData = {
        ...existingContent,
        title: 'Updated Title',
        status: 'published',
        is_active: true,
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUpdatedData,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await contentManagementService.updateContent(updateData);

      expect(result.title).toBe('Updated Title');
      expect(mockSupabase.from).toHaveBeenCalledWith('health_tips');
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('content:*');
    });

    it('should handle content not found', async () => {
      jest.spyOn(contentManagementService, 'getContentById').mockResolvedValue(null);

      await expect(contentManagementService.updateContent(updateData))
        .rejects.toThrow('Content not found');
    });
  });

  describe('getContentById', () => {
    const mockTipId = 'tip_1';
    const mockTipData = {
      id: mockTipId,
      title: 'Test Tip',
      content: 'Test content',
      category: 'nutrition',
      difficulty: 'easy',
      estimated_read_time: 2,
      tags: '["health"]',
      image_url: null,
      created_by: 'admin',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      view_count: 10,
      like_count: 2,
      bookmark_count: 1,
      completion_count: 3,
    };

    it('should return cached content when available', async () => {
      const cachedTip = {
        id: mockTipId,
        title: 'Cached Tip',
        content: 'Cached content',
        category: 'nutrition' as HealthCategory,
        difficulty: 'easy' as TipDifficulty,
        estimatedReadTime: 2,
        tags: ['health'],
        createdBy: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCacheService.get.mockResolvedValue(cachedTip);

      const result = await contentManagementService.getContentById(mockTipId);

      expect(result).toEqual(cachedTip);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch from database when not cached', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockTipData,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await contentManagementService.getContentById(mockTipId);

      expect(result).toBeDefined();
      expect(result!.id).toBe(mockTipId);
      expect(result!.title).toBe('Test Tip');
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should return null when content not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await contentManagementService.getContentById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('bulkOperation', () => {
    const tipIds = ['tip_1', 'tip_2', 'tip_3'];

    it('should perform bulk activate operation', async () => {
      jest.spyOn(contentManagementService, 'updateContent')
        .mockResolvedValueOnce({ id: 'tip_1' } as any)
        .mockResolvedValueOnce({ id: 'tip_2' } as any)
        .mockResolvedValueOnce({ id: 'tip_3' } as any);

      const result = await contentManagementService.bulkOperation({
        action: 'activate',
        tipIds,
      });

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial failures in bulk operations', async () => {
      jest.spyOn(contentManagementService, 'updateContent')
        .mockResolvedValueOnce({ id: 'tip_1' } as any)
        .mockRejectedValueOnce(new Error('Update failed'))
        .mockResolvedValueOnce({ id: 'tip_3' } as any);

      const result = await contentManagementService.bulkOperation({
        action: 'activate',
        tipIds,
      });

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('tip_2: Update failed');
    });

    it('should handle add_tags operation', async () => {
      const existingTip = {
        id: 'tip_1',
        tags: ['existing'],
      } as any;

      jest.spyOn(contentManagementService, 'getContentById').mockResolvedValue(existingTip);
      jest.spyOn(contentManagementService, 'updateContent').mockResolvedValue(existingTip);

      const result = await contentManagementService.bulkOperation({
        action: 'add_tags',
        tipIds: ['tip_1'],
        data: { tags: ['new', 'tag'] },
      });

      expect(result.success).toBe(1);
      expect(contentManagementService.updateContent).toHaveBeenCalledWith({
        id: 'tip_1',
        tags: ['existing', 'new', 'tag'],
      });
    });
  });

  describe('getContentStats', () => {
    it('should return cached stats when available', async () => {
      const cachedStats = {
        totalTips: 10,
        activeTips: 8,
        draftTips: 2,
        scheduledTips: 0,
        categoryCounts: {
          nutrition: 5,
          mental_wellness: 2,
          fitness: 2,
          sleep: 1,
          recovery: 0,
          hygiene: 0,
        },
        averageReadTime: 3,
        mostPopularTags: ['health', 'wellness'],
        engagementStats: {
          totalViews: 1000,
          totalLikes: 100,
          totalBookmarks: 50,
          totalCompletions: 80,
        },
      };

      mockCacheService.get.mockResolvedValue(cachedStats);

      const result = await contentManagementService.getContentStats();

      expect(result).toEqual(cachedStats);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should calculate stats from database when not cached', async () => {
      const mockTipCounts = [
        { status: 'published', category: 'nutrition' },
        { status: 'published', category: 'fitness' },
        { status: 'draft', category: 'nutrition' },
      ];

      const mockEngagementData = [
        {
          view_count: 100,
          like_count: 10,
          bookmark_count: 5,
          completion_count: 8,
          estimated_read_time: 3,
          tags: '["health", "nutrition"]',
        },
        {
          view_count: 50,
          like_count: 5,
          bookmark_count: 2,
          completion_count: 4,
          estimated_read_time: 2,
          tags: '["fitness", "health"]',
        },
      ];

      const mockCountQuery = {
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({
          data: mockTipCounts,
          error: null,
        }),
      };

      const mockEngagementQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: mockEngagementData,
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockCountQuery as any) // health_tips
        .mockReturnValueOnce(mockEngagementQuery as any); // health_tips_extended

      const result = await contentManagementService.getContentStats();

      expect(result.totalTips).toBe(3);
      expect(result.activeTips).toBe(2);
      expect(result.draftTips).toBe(1);
      expect(result.categoryCounts.nutrition).toBe(2);
      expect(result.categoryCounts.fitness).toBe(1);
      expect(result.engagementStats.totalViews).toBe(150);
      expect(result.mostPopularTags).toContain('health');
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('scheduleContent', () => {
    const tipId = 'tip_1';
    const scheduledFor = new Date('2024-12-31T23:59:59Z');

    it('should schedule content successfully', async () => {
      const mockScheduleData = {
        id: 'schedule_1',
        tip_id: tipId,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockScheduleData,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await contentManagementService.scheduleContent(tipId, scheduledFor);

      expect(result.tipId).toBe(tipId);
      expect(result.scheduledFor).toEqual(scheduledFor);
      expect(result.status).toBe('pending');
      expect(mockSupabase.from).toHaveBeenCalledWith('content_schedule');
    });

    it('should handle scheduling errors', async () => {
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Scheduling failed' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await expect(contentManagementService.scheduleContent(tipId, scheduledFor))
        .rejects.toThrow('Failed to schedule content');
    });
  });

  describe('deleteContent', () => {
    const tipId = 'tip_1';

    it('should soft delete content successfully', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await contentManagementService.deleteContent(tipId);

      expect(mockQuery.update).toHaveBeenCalledWith({
        status: 'archived',
        is_active: false,
        updated_at: expect.any(String),
      });
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('content:*');
      expect(mockCacheService.delete).toHaveBeenCalledWith(`content:${tipId}`);
    });

    it('should handle deletion errors', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Deletion failed' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await expect(contentManagementService.deleteContent(tipId))
        .rejects.toThrow('Failed to delete content');
    });
  });

  describe('getContentAnalytics', () => {
    const tipId = 'tip_1';

    it('should return analytics for existing tip', async () => {
      const mockAnalyticsData = {
        tip_id: tipId,
        views: 100,
        likes: 10,
        bookmarks: 5,
        completions: 8,
        average_rating: 4.5,
        engagement_rate: 23.0,
        retention_rate: 8.0,
        last_viewed: '2024-01-01T00:00:00Z',
        top_user_segments: ['health_enthusiasts', 'beginners'],
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAnalyticsData,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await contentManagementService.getContentAnalytics(tipId);

      expect(result.tipId).toBe(tipId);
      expect(result.views).toBe(100);
      expect(result.engagementRate).toBe(23.0);
      expect(result.topUserSegments).toEqual(['health_enthusiasts', 'beginners']);
    });

    it('should return default analytics when none exist', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await contentManagementService.getContentAnalytics(tipId);

      expect(result.tipId).toBe(tipId);
      expect(result.views).toBe(0);
      expect(result.likes).toBe(0);
      expect(result.engagementRate).toBe(0);
      expect(result.topUserSegments).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should log errors appropriately', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await expect(contentManagementService.getContent())
        .rejects.toThrow('Database connection failed');

      expect(mockLoggingService.logError).toHaveBeenCalledWith(
        'Failed to get content',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should handle cache failures gracefully', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache unavailable'));

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await contentManagementService.getContent();

      expect(result.data).toEqual([]);
      // Should continue despite cache failure
    });
  });
});