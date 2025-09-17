/**
 * Health Tip Service Unit Tests
 * Tests for CRUD operations, validation, and error handling
 */

import {
  healthTipService,
  CreateHealthTipData,
  UpdateHealthTipData,
} from '../../src/services/healthTipService';
import { AppError } from '../../src/utils/errorHandler';
import { supabase } from '../../src/config/supabase';

// Mock Supabase
jest.mock('../../src/config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-123'),
  },
});

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('HealthTipService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHealthTips', () => {
    it('should return paginated health tips successfully', async () => {
      const mockData = [
        {
          id: '1',
          title: 'Test Tip',
          content:
            'This is a test health tip content that is long enough to pass validation.',
          category: 'wellness',
          difficulty: 'easy',
          estimated_read_time: 5,
          tags: '["health", "wellness"]',
          image_url: null,
          created_by: 'admin',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
          count: 1,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await healthTipService.getHealthTips({
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(mockSupabase.from).toHaveBeenCalledWith('health_tips');
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
          count: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await expect(
        healthTipService.getHealthTips({ page: 1, limit: 10 }),
      ).rejects.toThrow(AppError);
    });

    it('should apply filters correctly', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await healthTipService.getHealthTips({
        page: 1,
        limit: 10,
        category: 'wellness',
        difficulty: 'easy',
        search: 'test',
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'wellness');
      expect(mockQuery.eq).toHaveBeenCalledWith('difficulty', 'easy');
      expect(mockQuery.or).toHaveBeenCalledWith(
        'title.ilike.%test%,content.ilike.%test%',
      );
    });
  });

  describe('getHealthTipById', () => {
    it('should return a health tip by ID successfully', async () => {
      const mockData = {
        id: '1',
        title: 'Test Tip',
        content:
          'This is a test health tip content that is long enough to pass validation.',
        category: 'wellness',
        difficulty: 'easy',
        estimated_read_time: 5,
        tags: '["health", "wellness"]',
        image_url: null,
        created_by: 'admin',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await healthTipService.getHealthTipById('1');

      expect(result.id).toBe('1');
      expect(result.title).toBe('Test Tip');
      expect(result.tags).toEqual(['health', 'wellness']);
      expect(mockSupabase.from).toHaveBeenCalledWith('health_tips');
    });

    it('should throw error for missing ID', async () => {
      await expect(healthTipService.getHealthTipById('')).rejects.toThrow(
        new AppError('Health tip ID is required', 400, 'VALIDATION_ERROR'),
      );
    });

    it('should throw not found error when tip does not exist', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await expect(
        healthTipService.getHealthTipById('nonexistent'),
      ).rejects.toThrow(new AppError('Health tip not found', 404, 'NOT_FOUND'));
    });
  });

  describe('createHealthTip', () => {
    const validTipData: CreateHealthTipData = {
      title: 'New Health Tip',
      content:
        'This is a new health tip with sufficient content to pass validation requirements.',
      category: 'wellness',
      difficulty: 'easy',
      estimatedReadTime: 5,
      tags: ['health', 'wellness'],
      createdBy: 'admin',
    };

    it('should create a health tip successfully', async () => {
      const mockInsertedData = {
        id: 'test-uuid-123',
        title: validTipData.title,
        content: validTipData.content,
        category: validTipData.category,
        difficulty: validTipData.difficulty,
        estimated_read_time: validTipData.estimatedReadTime,
        tags: JSON.stringify(validTipData.tags),
        image_url: null,
        created_by: validTipData.createdBy,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
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

      const result = await healthTipService.createHealthTip(validTipData);

      expect(result.id).toBe('test-uuid-123');
      expect(result.title).toBe(validTipData.title);
      expect(result.tags).toEqual(validTipData.tags);
      expect(mockSupabase.from).toHaveBeenCalledWith('health_tips');
    });

    it('should throw validation error for invalid data', async () => {
      const invalidTipData = {
        ...validTipData,
        title: 'Too', // Too short
      };

      await expect(
        healthTipService.createHealthTip(invalidTipData),
      ).rejects.toThrow(AppError);
    });

    it('should throw validation error for missing required fields', async () => {
      const incompleteTipData = {
        title: 'Valid Title',
        // Missing required fields
      } as CreateHealthTipData;

      await expect(
        healthTipService.createHealthTip(incompleteTipData),
      ).rejects.toThrow(AppError);
    });

    it('should handle database insertion errors', async () => {
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database insertion failed' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await expect(
        healthTipService.createHealthTip(validTipData),
      ).rejects.toThrow(AppError);
    });
  });

  describe('updateHealthTip', () => {
    const updateData: UpdateHealthTipData = {
      id: '1',
      title: 'Updated Health Tip Title',
      content:
        'This is updated content that meets the minimum length requirements for validation.',
    };

    beforeEach(() => {
      // Mock getHealthTipById for existence check
      const mockExistingTip = {
        id: '1',
        title: 'Original Title',
        content:
          'Original content that is long enough to pass validation requirements.',
        category: 'wellness',
        difficulty: 'easy',
        estimatedReadTime: 5,
        tags: ['health'],
        createdBy: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(healthTipService, 'getHealthTipById')
        .mockResolvedValue(mockExistingTip);
    });

    it('should update a health tip successfully', async () => {
      const mockUpdatedData = {
        id: '1',
        title: updateData.title,
        content: updateData.content,
        category: 'wellness',
        difficulty: 'easy',
        estimated_read_time: 5,
        tags: '["health"]',
        image_url: null,
        created_by: 'admin',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
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

      const result = await healthTipService.updateHealthTip(updateData);

      expect(result.id).toBe('1');
      expect(result.title).toBe(updateData.title);
      expect(result.content).toBe(updateData.content);
      expect(mockSupabase.from).toHaveBeenCalledWith('health_tips');
    });

    it('should throw error for missing ID', async () => {
      const invalidUpdateData = { ...updateData, id: '' };

      await expect(
        healthTipService.updateHealthTip(invalidUpdateData),
      ).rejects.toThrow(
        new AppError('Health tip ID is required', 400, 'VALIDATION_ERROR'),
      );
    });

    it('should handle database update errors', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database update failed' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await expect(
        healthTipService.updateHealthTip(updateData),
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteHealthTip', () => {
    beforeEach(() => {
      // Mock getHealthTipById for existence check
      const mockExistingTip = {
        id: '1',
        title: 'Tip to Delete',
        content:
          'Content of the tip that will be deleted with sufficient length.',
        category: 'wellness',
        difficulty: 'easy',
        estimatedReadTime: 5,
        tags: ['health'],
        createdBy: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(healthTipService, 'getHealthTipById')
        .mockResolvedValue(mockExistingTip);
    });

    it('should delete a health tip successfully (soft delete)', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await healthTipService.deleteHealthTip('1');

      expect(mockQuery.update).toHaveBeenCalledWith({
        is_active: false,
        updated_at: expect.any(String),
      });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should throw error for missing ID', async () => {
      await expect(healthTipService.deleteHealthTip('')).rejects.toThrow(
        new AppError('Health tip ID is required', 400, 'VALIDATION_ERROR'),
      );
    });

    it('should handle database deletion errors', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Database deletion failed' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await expect(healthTipService.deleteHealthTip('1')).rejects.toThrow(
        AppError,
      );
    });
  });

  describe('getHealthTipsByCategory', () => {
    it('should return health tips by category successfully', async () => {
      const mockData = [
        {
          id: '1',
          title: 'Wellness Tip',
          content:
            'This is a wellness tip with sufficient content length for validation.',
          category: 'wellness',
          difficulty: 'easy',
          estimated_read_time: 5,
          tags: '["wellness"]',
          image_url: null,
          created_by: 'admin',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await healthTipService.getHealthTipsByCategory(
        'wellness',
        5,
      );

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('wellness');
      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'wellness');
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('searchHealthTips', () => {
    it('should return search results successfully', async () => {
      const mockData = [
        {
          id: '1',
          title: 'Hydration Tips',
          content:
            'Stay hydrated with these helpful tips that provide sufficient content length.',
          category: 'wellness',
          difficulty: 'easy',
          estimated_read_time: 3,
          tags: '["hydration", "water"]',
          image_url: null,
          created_by: 'admin',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await healthTipService.searchHealthTips('hydration', 10);

      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('Hydration');
      expect(mockQuery.or).toHaveBeenCalledWith(
        'title.ilike.%hydration%,content.ilike.%hydration%,tags.ilike.%hydration%',
      );
    });

    it('should return empty array for empty query', async () => {
      const result = await healthTipService.searchHealthTips('', 10);
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only query', async () => {
      const result = await healthTipService.searchHealthTips('   ', 10);
      expect(result).toEqual([]);
    });
  });
});
