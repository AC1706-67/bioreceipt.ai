/**
 * HealthTip Controller Integration Tests
 * Tests for REST API endpoints
 */
import request from 'supertest';
import express from 'express';
import { healthTipController } from '../../src/controllers/healthTipController';
import { healthTipService } from '../../src/services/healthTipService';
import { loggingService } from '../../src/services/logging/loggingService';

// Mock dependencies
jest.mock('../../src/services/healthTipService');
jest.mock('../../src/services/logging/loggingService');

const mockHealthTipService = healthTipService as jest.Mocked<
  typeof healthTipService
>;
const mockLoggingService = loggingService as jest.Mocked<typeof loggingService>;

// Create Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Add mock user middleware for testing
  app.use((req, res, next) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  });

  // Define routes
  app.get(
    '/api/health-tips',
    healthTipController.getHealthTips.bind(healthTipController),
  );
  app.get(
    '/api/health-tips/:id',
    healthTipController.getHealthTipById.bind(healthTipController),
  );
  app.post(
    '/api/health-tips',
    healthTipController.createHealthTip.bind(healthTipController),
  );
  app.put(
    '/api/health-tips/:id',
    healthTipController.updateHealthTip.bind(healthTipController),
  );
  app.delete(
    '/api/health-tips/:id',
    healthTipController.deleteHealthTip.bind(healthTipController),
  );
  app.get(
    '/api/health-tips/:id/analytics',
    healthTipController.getHealthTipAnalytics.bind(healthTipController),
  );

  return app;
};

describe('HealthTipController Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();

    // Setup default mock implementations
    mockLoggingService.logInfo.mockResolvedValue(undefined);
    mockLoggingService.logError.mockResolvedValue(undefined);
    mockLoggingService.logWarning.mockResolvedValue(undefined);
  });

  describe('GET /api/health-tips', () => {
    it('should return paginated health tips with 200 status', async () => {
      const mockResult = {
        data: [
          {
            id: '1',
            title: 'Test Health Tip',
            content:
              'This is a test health tip with sufficient content for validation.',
            category: 'nutrition',
            difficulty: 'easy',
            estimatedReadTime: 5,
            tags: ['test', 'nutrition'],
            isActive: true,
            viewCount: 10,
            likeCount: 5,
            completionCount: 3,
            shareCount: 2,
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockHealthTipService.getHealthTips.mockResolvedValue(mockResult);

      const response = await request(app).get('/api/health-tips').expect(200);

      expect(response.body).toEqual({
        data: mockResult.data,
        pagination: mockResult.pagination,
      });
      expect(mockHealthTipService.getHealthTips).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        category: undefined,
        difficulty: undefined,
        search: undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('should handle query parameters correctly', async () => {
      const mockResult = {
        data: [],
        pagination: {
          page: 2,
          limit: 5,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: true,
        },
      };

      mockHealthTipService.getHealthTips.mockResolvedValue(mockResult);

      await request(app)
        .get('/api/health-tips')
        .query({
          page: '2',
          limit: '5',
          category: 'nutrition',
          difficulty: 'easy',
          search: 'test',
          sortBy: 'title',
          sortOrder: 'asc',
        })
        .expect(200);

      expect(mockHealthTipService.getHealthTips).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        category: 'nutrition',
        difficulty: 'easy',
        search: 'test',
        sortBy: 'title',
        sortOrder: 'asc',
      });
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/health-tips')
        .query({ page: '0', limit: '101' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_PAGINATION',
          message: 'Page must be >= 1 and limit must be between 1 and 100',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 500 when service throws error', async () => {
      mockHealthTipService.getHealthTips.mockRejectedValue(
        new Error('Database error'),
      );

      const response = await request(app).get('/api/health-tips').expect(500);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve health tips',
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('GET /api/health-tips/:id', () => {
    it('should return health tip by ID with 200 status', async () => {
      const mockHealthTip = {
        id: '1',
        title: 'Test Health Tip',
        content:
          'This is a test health tip with sufficient content for validation.',
        category: 'nutrition',
        difficulty: 'easy',
        estimatedReadTime: 5,
        tags: ['test', 'nutrition'],
        isActive: true,
        viewCount: 10,
        likeCount: 5,
        completionCount: 3,
        shareCount: 2,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      };

      mockHealthTipService.getHealthTipById.mockResolvedValue(mockHealthTip);

      const response = await request(app).get('/api/health-tips/1').expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockHealthTip,
        timestamp: expect.any(String),
      });
      expect(mockHealthTipService.getHealthTipById).toHaveBeenCalledWith('1');
    });

    it('should return 404 when health tip not found', async () => {
      mockHealthTipService.getHealthTipById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/health-tips/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Health tip not found',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 500 when service throws error', async () => {
      mockHealthTipService.getHealthTipById.mockRejectedValue(
        new Error('Database error'),
      );

      const response = await request(app).get('/api/health-tips/1').expect(500);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve health tip',
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('POST /api/health-tips', () => {
    const validHealthTipData = {
      title: 'New Health Tip',
      content:
        'This is a new health tip with sufficient content to pass validation requirements.',
      category: 'nutrition',
      difficulty: 'easy',
      estimatedReadTime: 5,
      tags: ['new', 'test'],
      imageUrl: 'https://example.com/image.jpg',
    };

    it('should create health tip successfully with 201 status', async () => {
      const mockCreatedTip = {
        id: 'new-tip-id',
        ...validHealthTipData,
        viewCount: 0,
        likeCount: 0,
        completionCount: 0,
        shareCount: 0,
        isActive: true,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      };

      mockHealthTipService.createHealthTip.mockResolvedValue(mockCreatedTip);

      const response = await request(app)
        .post('/api/health-tips')
        .send(validHealthTipData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockCreatedTip,
        message: 'Health tip created successfully',
        timestamp: expect.any(String),
      });
      expect(mockHealthTipService.createHealthTip).toHaveBeenCalledWith({
        ...validHealthTipData,
        authorId: 'test-user-id',
      });
    });

    it('should return 409 for duplicate title', async () => {
      const error = new Error('Duplicate title');
      (error as any).code = 'DUPLICATE_TITLE';
      mockHealthTipService.createHealthTip.mockRejectedValue(error);

      const response = await request(app)
        .post('/api/health-tips')
        .send(validHealthTipData)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'DUPLICATE_TITLE',
          message: 'A health tip with this title already exists',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 500 for service errors', async () => {
      mockHealthTipService.createHealthTip.mockRejectedValue(
        new Error('Database error'),
      );

      const response = await request(app)
        .post('/api/health-tips')
        .send(validHealthTipData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create health tip',
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('PUT /api/health-tips/:id', () => {
    const updateData = {
      title: 'Updated Health Tip',
      content:
        'This is updated content that meets the minimum length requirements for validation.',
      category: 'exercise',
      difficulty: 'medium',
      estimatedReadTime: 10,
      tags: ['updated', 'test'],
    };

    it('should update health tip successfully with 200 status', async () => {
      const mockExistingTip = {
        id: '1',
        title: 'Original Title',
        content: 'Original content',
      };

      const mockUpdatedTip = {
        id: '1',
        ...updateData,
        viewCount: 5,
        likeCount: 2,
        completionCount: 1,
        shareCount: 0,
        isActive: true,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T12:00:00Z',
      };

      mockHealthTipService.getHealthTipById.mockResolvedValue(
        mockExistingTip as any,
      );
      mockHealthTipService.updateHealthTip.mockResolvedValue(mockUpdatedTip);

      const response = await request(app)
        .put('/api/health-tips/1')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUpdatedTip,
        message: 'Health tip updated successfully',
        timestamp: expect.any(String),
      });
      expect(mockHealthTipService.updateHealthTip).toHaveBeenCalledWith(
        '1',
        updateData,
      );
    });

    it('should return 404 when health tip not found', async () => {
      mockHealthTipService.getHealthTipById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/health-tips/nonexistent')
        .send(updateData)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Health tip not found',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 409 for duplicate title', async () => {
      const mockExistingTip = { id: '1', title: 'Existing' };
      mockHealthTipService.getHealthTipById.mockResolvedValue(
        mockExistingTip as any,
      );

      const error = new Error('Duplicate title');
      (error as any).code = 'DUPLICATE_TITLE';
      mockHealthTipService.updateHealthTip.mockRejectedValue(error);

      const response = await request(app)
        .put('/api/health-tips/1')
        .send(updateData)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'DUPLICATE_TITLE',
          message: 'A health tip with this title already exists',
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('DELETE /api/health-tips/:id', () => {
    it('should delete health tip successfully with 200 status', async () => {
      const mockExistingTip = {
        id: '1',
        title: 'Tip to Delete',
        content: 'Content to delete',
      };

      mockHealthTipService.getHealthTipById.mockResolvedValue(
        mockExistingTip as any,
      );
      mockHealthTipService.deleteHealthTip.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/health-tips/1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Health tip deleted successfully',
        timestamp: expect.any(String),
      });
      expect(mockHealthTipService.deleteHealthTip).toHaveBeenCalledWith('1');
    });

    it('should return 404 when health tip not found', async () => {
      mockHealthTipService.getHealthTipById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/health-tips/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Health tip not found',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 500 when service throws error', async () => {
      const mockExistingTip = { id: '1', title: 'Existing' };
      mockHealthTipService.getHealthTipById.mockResolvedValue(
        mockExistingTip as any,
      );
      mockHealthTipService.deleteHealthTip.mockRejectedValue(
        new Error('Database error'),
      );

      const response = await request(app)
        .delete('/api/health-tips/1')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete health tip',
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('GET /api/health-tips/:id/analytics', () => {
    it('should return analytics successfully with 200 status', async () => {
      const mockAnalytics = {
        id: '1',
        title: 'Test Tip',
        viewCount: 100,
        likeCount: 25,
        completionCount: 15,
        shareCount: 5,
        averageRating: 4.5,
        engagementRate: 40.0,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        lastViewedAt: new Date('2024-01-15T15:00:00Z'),
        popularityScore: 185,
      };

      mockHealthTipService.getHealthTipAnalytics.mockResolvedValue(
        mockAnalytics,
      );

      const response = await request(app)
        .get('/api/health-tips/1/analytics')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockAnalytics,
        timestamp: expect.any(String),
      });
      expect(mockHealthTipService.getHealthTipAnalytics).toHaveBeenCalledWith(
        '1',
      );
    });

    it('should return 404 when health tip not found', async () => {
      mockHealthTipService.getHealthTipAnalytics.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/health-tips/nonexistent/analytics')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Health tip not found',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 500 when service throws error', async () => {
      mockHealthTipService.getHealthTipAnalytics.mockRejectedValue(
        new Error('Analytics error'),
      );

      const response = await request(app)
        .get('/api/health-tips/1/analytics')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve health tip analytics',
        },
        timestamp: expect.any(String),
      });
    });
  });
});
