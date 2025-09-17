/**
 * HealthTip Management Integration Tests
 * End-to-end tests for the complete health tip management system
 */
import request from 'supertest';
import express from 'express';
import { healthTipRoutes } from '../../src/routes/healthTipRoutes';
import { healthTipService } from '../../src/services/healthTipService';
import { authService } from '../../src/services/auth/authService';
import { tokenManager } from '../../src/utils/tokenManager';
import { loggingService } from '../../src/services/logging/loggingService';

// Mock dependencies
jest.mock('../../src/services/healthTipService');
jest.mock('../../src/services/auth/authService');
jest.mock('../../src/utils/tokenManager');
jest.mock('../../src/services/logging/loggingService');

const mockHealthTipService = healthTipService as jest.Mocked<
  typeof healthTipService
>;
const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockTokenManager = tokenManager as jest.Mocked<typeof tokenManager>;
const mockLoggingService = loggingService as jest.Mocked<typeof loggingService>;

// Create test Express app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/health-tips', healthTipRoutes);
  return app;
};

describe('HealthTip Management Integration Tests', () => {
  let app: express.Application;
  let authToken: string;
  let testUser: any;

  beforeEach(() => {
    app = createTestApp();
    authToken = 'valid-jwt-token';
    testUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'user',
      permissions: ['read:health-tips', 'write:health-tips'],
      isActive: true,
    };

    jest.clearAllMocks();

    // Setup default mock implementations
    mockLoggingService.logInfo.mockResolvedValue(undefined);
    mockLoggingService.logError.mockResolvedValue(undefined);
    mockLoggingService.logWarning.mockResolvedValue(undefined);

    // Setup authentication mocks
    mockTokenManager.validateToken.mockResolvedValue({
      isValid: true,
      payload: { userId: testUser.id, email: testUser.email },
    });
    mockAuthService.getUserById.mockResolvedValue(testUser);
  });

  describe('Complete CRUD Flow', () => {
    it('should handle complete health tip lifecycle', async () => {
      const healthTipData = {
        title: 'Complete Lifecycle Test Tip',
        content:
          'This is a comprehensive test of the health tip management system with sufficient content.',
        category: 'nutrition',
        difficulty: 'easy',
        estimatedReadTime: 5,
        tags: ['test', 'integration'],
        imageUrl: 'https://example.com/test-image.jpg',
      };

      const createdTip = {
        id: 'created-tip-id',
        ...healthTipData,
        authorId: testUser.id,
        viewCount: 0,
        likeCount: 0,
        completionCount: 0,
        shareCount: 0,
        isActive: true,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      };

      const updatedTip = {
        ...createdTip,
        title: 'Updated Lifecycle Test Tip',
        content:
          'This is updated content for the comprehensive test with sufficient length.',
        updatedAt: '2024-01-15T12:00:00Z',
      };

      // Mock service responses
      mockHealthTipService.createHealthTip.mockResolvedValue(createdTip);
      mockHealthTipService.getHealthTipById.mockResolvedValue(createdTip);
      mockHealthTipService.updateHealthTip.mockResolvedValue(updatedTip);
      mockHealthTipService.deleteHealthTip.mockResolvedValue(undefined);
      mockHealthTipService.getHealthTips.mockResolvedValue({
        data: [createdTip],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      // 1. Create health tip
      const createResponse = await request(app)
        .post('/api/health-tips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(healthTipData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.title).toBe(healthTipData.title);
      expect(createResponse.body.data.id).toBe('created-tip-id');

      // 2. Get health tip by ID
      const getResponse = await request(app)
        .get('/api/health-tips/created-tip-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.id).toBe('created-tip-id');

      // 3. Update health tip
      const updateData = {
        title: 'Updated Lifecycle Test Tip',
        content:
          'This is updated content for the comprehensive test with sufficient length.',
        category: 'exercise',
        difficulty: 'medium',
        estimatedReadTime: 8,
        tags: ['updated', 'integration'],
      };

      const updateResponse = await request(app)
        .put('/api/health-tips/created-tip-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.title).toBe('Updated Lifecycle Test Tip');

      // 4. List health tips
      const listResponse = await request(app)
        .get('/api/health-tips')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.data).toHaveLength(1);
      expect(listResponse.body.pagination.total).toBe(1);

      // 5. Delete health tip
      const deleteResponse = await request(app)
        .delete('/api/health-tips/created-tip-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toBe(
        'Health tip deleted successfully',
      );

      // Verify all service methods were called correctly
      expect(mockHealthTipService.createHealthTip).toHaveBeenCalledWith({
        ...healthTipData,
        authorId: testUser.id,
      });
      expect(mockHealthTipService.getHealthTipById).toHaveBeenCalledWith(
        'created-tip-id',
      );
      expect(mockHealthTipService.updateHealthTip).toHaveBeenCalledWith(
        'created-tip-id',
        updateData,
      );
      expect(mockHealthTipService.deleteHealthTip).toHaveBeenCalledWith(
        'created-tip-id',
      );
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication token', async () => {
      const response = await request(app).get('/api/health-tips').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should reject requests with invalid token', async () => {
      mockTokenManager.validateToken.mockResolvedValue({
        isValid: false,
        payload: null,
      });

      const response = await request(app)
        .get('/api/health-tips')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject requests for inactive users', async () => {
      mockAuthService.getUserById.mockResolvedValue({
        ...testUser,
        isActive: false,
      });

      const response = await request(app)
        .get('/api/health-tips')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_INACTIVE');
    });

    it('should reject requests when user not found', async () => {
      mockAuthService.getUserById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/health-tips')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('Validation and Error Handling', () => {
    it('should validate health tip data on creation', async () => {
      const invalidData = {
        title: 'Bad', // Too short
        content: 'Short', // Too short
        category: 'invalid-category',
        difficulty: 'invalid-difficulty',
        estimatedReadTime: -1,
      };

      const response = await request(app)
        .post('/api/health-tips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
    });

    it('should handle service errors gracefully', async () => {
      mockHealthTipService.getHealthTips.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const response = await request(app)
        .get('/api/health-tips')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should handle duplicate title errors', async () => {
      const error = new Error('Duplicate title');
      (error as any).code = 'DUPLICATE_TITLE';
      mockHealthTipService.createHealthTip.mockRejectedValue(error);

      const validData = {
        title: 'Duplicate Title Test',
        content:
          'This is a test for duplicate title handling with sufficient content length.',
        category: 'nutrition',
        difficulty: 'easy',
        estimatedReadTime: 5,
        tags: ['test'],
      };

      const response = await request(app)
        .post('/api/health-tips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DUPLICATE_TITLE');
    });
  });

  describe('Analytics Integration', () => {
    it('should retrieve health tip analytics', async () => {
      const mockAnalytics = {
        id: 'test-tip-id',
        title: 'Analytics Test Tip',
        viewCount: 150,
        likeCount: 30,
        completionCount: 20,
        shareCount: 8,
        averageRating: 4.2,
        engagementRate: 33.33,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        lastViewedAt: new Date('2024-01-15T16:00:00Z'),
        popularityScore: 244,
      };

      mockHealthTipService.getHealthTipAnalytics.mockResolvedValue(
        mockAnalytics,
      );

      const response = await request(app)
        .get('/api/health-tips/test-tip-id/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAnalytics);
      expect(response.body.data.viewCount).toBe(150);
      expect(response.body.data.engagementRate).toBe(33.33);
    });

    it('should handle analytics for non-existent tips', async () => {
      mockHealthTipService.getHealthTipAnalytics.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/health-tips/nonexistent/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Filtering and Pagination', () => {
    it('should handle complex filtering and pagination', async () => {
      const mockResults = {
        data: [
          {
            id: '1',
            title: 'Nutrition Tip 1',
            category: 'nutrition',
            difficulty: 'easy',
          },
          {
            id: '2',
            title: 'Nutrition Tip 2',
            category: 'nutrition',
            difficulty: 'medium',
          },
        ],
        pagination: {
          page: 2,
          limit: 5,
          total: 15,
          totalPages: 3,
          hasNext: true,
          hasPrev: true,
        },
      };

      mockHealthTipService.getHealthTips.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/health-tips')
        .query({
          page: '2',
          limit: '5',
          category: 'nutrition',
          difficulty: 'easy',
          search: 'vitamin',
          sortBy: 'title',
          sortOrder: 'asc',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.hasNext).toBe(true);
      expect(response.body.pagination.hasPrev).toBe(true);

      expect(mockHealthTipService.getHealthTips).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        category: 'nutrition',
        difficulty: 'easy',
        search: 'vitamin',
        sortBy: 'title',
        sortOrder: 'asc',
      });
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/health-tips')
        .query({
          page: '0',
          limit: '101',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PAGINATION');
    });
  });
});
