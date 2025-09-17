/**
 * Content Management Integration Tests
 * End-to-end tests for enhanced content management functionality
 */

import request from 'supertest';
import { app } from '../../src/app';
import { supabase } from '../../src/config/supabase';
import { contentManagementService } from '../../src/services/content/contentManagementService';
import { cacheService } from '../../src/services/cache/cacheService';

// Mock dependencies
jest.mock('../../src/config/supabase');
jest.mock('../../src/services/cache/cacheService');
jest.mock('../../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-123', email: 'test@example.com' };
    next();
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

describe('Content Management Integration Tests', () => {
  const mockUserId = 'test-user-123';
  const mockUserEmail = 'test@example.com';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.delete.mockResolvedValue(undefined);
    mockCacheService.deletePattern.mockResolvedValue(undefined);
  });

  describe('GET /api/health-tips', () => {
    it('should return paginated health tips with filtering', async () => {
      const mockTipsData = [
        {
          id: 'tip_1',
          title: 'Healthy Eating Tips',
          content: 'Eat more vegetables and fruits for better health.',
          category: 'nutrition',
          difficulty: 'easy',
          estimated_read_time: 3,
          tags: '["nutrition", "health"]',
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

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockTipsData,
          error: null,
          count: 1,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const response = await request(app)
        .get('/api/health-tips')
        .query({
          page: 1,
          limit: 10,
          category: 'nutrition',
          difficulty: 'easy',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Healthy Eating Tips');
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.total).toBe(1);
    });

    it('should handle search queries', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const response = await request(app)
        .get('/api/health-tips')
        .query({
          search: 'nutrition tips',
          limit: 5,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(mockQuery.or).toHaveBeenCalled();
    });
  });

  describe('POST /api/health-tips', () => {
    it('should create a new health tip with workflow', async () => {
      const newTipData = {
        title: 'New Health Tip',
        content:
          'This is a comprehensive health tip about staying hydrated throughout the day.',
        category: 'nutrition',
        difficulty: 'easy',
        estimatedReadTime: 2,
        tags: ['hydration', 'health'],
        status: 'draft',
      };

      const mockInsertedData = {
        id: 'new_tip_id',
        ...newTipData,
        tags: JSON.stringify(newTipData.tags),
        estimated_read_time: newTipData.estimatedReadTime,
        created_by: mockUserId,
        is_active: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockInsertedData,
          error: null,
        }),
      };

      // Mock workflow creation
      const mockWorkflowQuery = {
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockInsertQuery as any) // health_tips insert
        .mockReturnValueOnce(mockWorkflowQuery as any); // content_workflow insert

      const response = await request(app)
        .post('/api/health-tips')
        .send(newTipData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(newTipData.title);
      expect(response.body.data.id).toBe('new_tip_id');
      expect(response.body.message).toBe('Health tip created successfully');
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        title: 'A', // Too short
        content: 'Short', // Too short
        category: 'invalid',
        difficulty: 'invalid',
        estimatedReadTime: -1,
      };

      const response = await request(app)
        .post('/api/health-tips')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/health-tips/:id', () => {
    it('should update health tip with workflow tracking', async () => {
      const tipId = 'tip_1';
      const updateData = {
        title: 'Updated Health Tip',
        status: 'published',
      };

      // Mock getContentById
      const existingTip = {
        id: tipId,
        title: 'Original Title',
        content: 'Original content',
        category: 'nutrition',
        difficulty: 'easy',
        estimatedReadTime: 2,
        tags: ['health'],
        createdBy: 'admin',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(contentManagementService, 'getContentById')
        .mockResolvedValue(existingTip);

      const mockUpdatedData = {
        ...existingTip,
        title: updateData.title,
        status: updateData.status,
        is_active: true,
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUpdatedData,
          error: null,
        }),
      };

      // Mock workflow update
      const mockWorkflowUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockUpdateQuery as any) // health_tips update
        .mockReturnValueOnce(mockWorkflowUpdateQuery as any); // content_workflow update

      const response = await request(app)
        .put(`/api/health-tips/${tipId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.message).toBe('Health tip updated successfully');
    });
  });

  describe('GET /api/health-tips/stats', () => {
    it('should return content statistics', async () => {
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
        .mockReturnValueOnce(mockCountQuery as any)
        .mockReturnValueOnce(mockEngagementQuery as any);

      const response = await request(app)
        .get('/api/health-tips/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalTips).toBe(3);
      expect(response.body.data.activeTips).toBe(2);
      expect(response.body.data.draftTips).toBe(1);
      expect(response.body.data.engagementStats.totalViews).toBe(100);
    });
  });

  describe('GET /api/health-tips/:id/analytics', () => {
    it('should return analytics for a specific tip', async () => {
      const tipId = 'tip_1';
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
        top_user_segments: ['health_enthusiasts'],
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

      const response = await request(app)
        .get(`/api/health-tips/${tipId}/analytics`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tipId).toBe(tipId);
      expect(response.body.data.views).toBe(100);
      expect(response.body.data.engagementRate).toBe(23.0);
    });
  });

  describe('POST /api/health-tips/bulk', () => {
    it('should perform bulk activate operation', async () => {
      const bulkData = {
        action: 'activate',
        tipIds: ['tip_1', 'tip_2'],
      };

      // Mock successful updates
      jest
        .spyOn(contentManagementService, 'updateContent')
        .mockResolvedValueOnce({ id: 'tip_1' } as any)
        .mockResolvedValueOnce({ id: 'tip_2' } as any);

      const response = await request(app)
        .post('/api/health-tips/bulk')
        .send(bulkData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(2);
      expect(response.body.data.failed).toBe(0);
      expect(response.body.message).toBe('Bulk activate operation completed');
    });

    it('should handle validation errors for bulk operations', async () => {
      const invalidBulkData = {
        action: 'invalid_action',
        tipIds: ['tip_1'],
      };

      const response = await request(app)
        .post('/api/health-tips/bulk')
        .send(invalidBulkData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid bulk action');
    });
  });

  describe('POST /api/health-tips/:id/schedule', () => {
    it('should schedule content for future publication', async () => {
      const tipId = 'tip_1';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

      const scheduleData = {
        scheduledFor: futureDate.toISOString(),
      };

      const mockScheduleResponse = {
        id: 'schedule_1',
        tip_id: tipId,
        scheduled_for: futureDate.toISOString(),
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockScheduleResponse,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const response = await request(app)
        .post(`/api/health-tips/${tipId}/schedule`)
        .send(scheduleData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tipId).toBe(tipId);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.message).toBe('Content scheduled successfully');
    });

    it('should reject scheduling for past dates', async () => {
      const tipId = 'tip_1';
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      const scheduleData = {
        scheduledFor: pastDate.toISOString(),
      };

      const response = await request(app)
        .post(`/api/health-tips/${tipId}/schedule`)
        .send(scheduleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe(
        'scheduledFor date must be in the future',
      );
    });
  });

  describe('POST /api/health-tips/:id/engage', () => {
    it('should record user engagement', async () => {
      const tipId = 'tip_1';
      const engagementData = {
        action: 'like',
      };

      // Mock ContentService
      const mockContentService = {
        recordEngagement: jest.fn().mockResolvedValue(undefined),
      };

      jest.doMock('../../src/services/content/contentService', () => ({
        ContentService: {
          getInstance: () => mockContentService,
        },
      }));

      const response = await request(app)
        .post(`/api/health-tips/${tipId}/engage`)
        .send(engagementData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Engagement recorded successfully');
    });

    it('should validate engagement actions', async () => {
      const tipId = 'tip_1';
      const invalidEngagementData = {
        action: 'invalid_action',
      };

      const response = await request(app)
        .post(`/api/health-tips/${tipId}/engage`)
        .send(invalidEngagementData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid engagement action');
    });
  });

  describe('GET /api/health-tips/daily', () => {
    it('should return daily personalized tips', async () => {
      const mockDailyTips = [
        {
          id: 'tip_1',
          title: 'Daily Tip 1',
          content: 'Content 1',
          category: 'nutrition',
          difficulty: 'easy',
          estimatedReadTime: 2,
          tags: ['health'],
          createdBy: 'admin',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock ContentService
      const mockContentService = {
        getDailyTips: jest.fn().mockResolvedValue(mockDailyTips),
      };

      jest.doMock('../../src/services/content/contentService', () => ({
        ContentService: {
          getInstance: () => mockContentService,
        },
      }));

      const response = await request(app)
        .get('/api/health-tips/daily')
        .query({ count: 3 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.message).toBe('Daily tips retrieved successfully');
    });

    it('should validate count parameter', async () => {
      const response = await request(app)
        .get('/api/health-tips/daily')
        .query({ count: 15 }) // Too high
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe(
        'Count must be between 1 and 10',
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest
          .fn()
          .mockRejectedValue(new Error('Database connection failed')),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const response = await request(app).get('/api/health-tips').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle rate limiting', async () => {
      // Make multiple requests quickly to trigger rate limiting
      const requests = Array(110)
        .fill(null)
        .map(() => request(app).get('/api/health-tips'));

      const responses = await Promise.allSettled(requests);
      const rateLimitedResponses = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 429,
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Content Workflow Integration', () => {
    it('should create workflow entry when creating content', async () => {
      const newTipData = {
        title: 'Workflow Test Tip',
        content: 'This tip tests the workflow integration.',
        category: 'nutrition',
        difficulty: 'easy',
        estimatedReadTime: 2,
        status: 'review',
      };

      const mockInsertedData = {
        id: 'workflow_tip_id',
        ...newTipData,
        created_by: mockUserId,
        is_active: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockTipInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockInsertedData,
          error: null,
        }),
      };

      const mockWorkflowInsertQuery = {
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTipInsertQuery as any) // health_tips
        .mockReturnValueOnce(mockWorkflowInsertQuery as any); // content_workflow

      const response = await request(app)
        .post('/api/health-tips')
        .send(newTipData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockWorkflowInsertQuery.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          tip_id: 'workflow_tip_id',
          status: 'review',
        }),
      ]);
    });

    it('should update workflow when content status changes', async () => {
      const tipId = 'tip_1';
      const updateData = {
        status: 'published',
      };

      // Mock existing content
      jest.spyOn(contentManagementService, 'getContentById').mockResolvedValue({
        id: tipId,
        title: 'Test Tip',
        content: 'Test content',
        category: 'nutrition',
        difficulty: 'easy',
        estimatedReadTime: 2,
        tags: [],
        createdBy: 'admin',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockTipUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: tipId, status: 'published' },
          error: null,
        }),
      };

      const mockWorkflowUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTipUpdateQuery as any) // health_tips
        .mockReturnValueOnce(mockWorkflowUpdateQuery as any); // content_workflow

      const response = await request(app)
        .put(`/api/health-tips/${tipId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockWorkflowUpdateQuery.update).toHaveBeenCalledWith({
        status: 'published',
        updated_at: expect.any(String),
      });
    });
  });
});
