/**
 * Health Tip Controller
 * Enhanced REST API endpoints for health tip content management
 */

import { Request, Response, NextFunction } from 'express';
import { healthTipService, PaginationOptions } from '../services/healthTipService';
import { contentManagementService } from '../services/content/contentManagementService';
import { AppError } from '../utils/errorHandler';
import { validateData } from '../validation/schemas';
import { loggingService } from '../services/logging/loggingService';
import * as yup from 'yup';

// Request validation schemas
const createHealthTipSchema = yup.object({
  title: yup.string().required().min(5).max(100),
  content: yup.string().required().min(20).max(2000),
  category: yup.string().required().oneOf(['nutrition', 'exercise', 'mental-health', 'sleep', 'wellness']),
  difficulty: yup.string().required().oneOf(['easy', 'medium', 'hard']),
  estimatedReadTime: yup.number().required().positive().max(60),
  tags: yup.array().of(yup.string().max(30)).max(10).optional(),
  imageUrl: yup.string().url().nullable().optional(),
  isActive: yup.boolean().optional(),
});

const updateHealthTipSchema = createHealthTipSchema.partial();

const paginationSchema = yup.object({
  page: yup.number().positive().integer().default(1),
  limit: yup.number().positive().integer().max(100).default(10),
  category: yup.string().oneOf(['nutrition', 'exercise', 'mental-health', 'sleep', 'wellness']).optional(),
  difficulty: yup.string().oneOf(['easy', 'medium', 'hard']).optional(),
  search: yup.string().max(100).optional(),
});

export class HealthTipController {
  /**
   * GET /api/health-tips
   * Get paginated list of health tips with optional filtering
   */
  async getHealthTips(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate query parameters
      const validation = await validateData(paginationSchema, req.query);
      if (!validation.isValid) {
        throw new AppError('Invalid query parameters', 400, 'VALIDATION_ERROR', validation.errors);
      }

      const options: PaginationOptions = validation.data!;
      const result = await healthTipService.getHealthTips(options);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Health tips retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/health-tips/:id
   * Get a single health tip by ID
   */
  async getHealthTipById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Health tip ID is required', 400, 'VALIDATION_ERROR');
      }

      const healthTip = await healthTipService.getHealthTipById(id);

      res.status(200).json({
        success: true,
        data: healthTip,
        message: 'Health tip retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/health-tips
   * Create a new health tip
   */
  async createHealthTip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const validation = await validateData(createHealthTipSchema, req.body);
      if (!validation.isValid) {
        throw new AppError('Invalid request data', 400, 'VALIDATION_ERROR', validation.errors);
      }

      const tipData = validation.data!;

      // Add creator information (from authenticated user)
      const createData = {
        ...tipData,
        createdBy: req.user?.id || 'system', // Assuming user info is available in req.user
      };

      const healthTip = await healthTipService.createHealthTip(createData);

      res.status(201).json({
        success: true,
        data: healthTip,
        message: 'Health tip created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/health-tips/:id
   * Update an existing health tip
   */
  async updateHealthTip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Health tip ID is required', 400, 'VALIDATION_ERROR');
      }

      // Validate request body
      const validation = await validateData(updateHealthTipSchema, req.body);
      if (!validation.isValid) {
        throw new AppError('Invalid request data', 400, 'VALIDATION_ERROR', validation.errors);
      }

      const updateData = {
        id,
        ...validation.data!,
      };

      const healthTip = await healthTipService.updateHealthTip(updateData);

      res.status(200).json({
        success: true,
        data: healthTip,
        message: 'Health tip updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/health-tips/:id
   * Delete a health tip (soft delete)
   */
  async deleteHealthTip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Health tip ID is required', 400, 'VALIDATION_ERROR');
      }

      await healthTipService.deleteHealthTip(id);

      res.status(200).json({
        success: true,
        message: 'Health tip deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/health-tips/category/:category
   * Get health tips by category
   */
  async getHealthTipsByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!category) {
        throw new AppError('Category is required', 400, 'VALIDATION_ERROR');
      }

      const validCategories = ['nutrition', 'exercise', 'mental-health', 'sleep', 'wellness'];
      if (!validCategories.includes(category)) {
        throw new AppError('Invalid category', 400, 'VALIDATION_ERROR');
      }

      const healthTips = await healthTipService.getHealthTipsByCategory(category, limit);

      res.status(200).json({
        success: true,
        data: healthTips,
        message: `Health tips for category '${category}' retrieved successfully`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/health-tips/search
   * Search health tips
   */
  async searchHealthTips(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q: query } = req.query;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!query || typeof query !== 'string') {
        throw new AppError('Search query is required', 400, 'VALIDATION_ERROR');
      }

      if (query.length < 2) {
        throw new AppError('Search query must be at least 2 characters', 400, 'VALIDATION_ERROR');
      }

      const healthTips = await healthTipService.searchHealthTips(query, limit);

      res.status(200).json({
        success: true,
        data: healthTips,
        message: `Search results for '${query}' retrieved successfully`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/health-tips/stats
   * Get content statistics
   */
  async getContentStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await contentManagementService.getContentStats();

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Content statistics retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/health-tips/:id/analytics
   * Get analytics for a specific health tip
   */
  async getContentAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Health tip ID is required', 400, 'VALIDATION_ERROR');
      }

      const analytics = await contentManagementService.getContentAnalytics(id);

      res.status(200).json({
        success: true,
        data: analytics,
        message: 'Content analytics retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/health-tips/bulk
   * Perform bulk operations on health tips
   */
  async bulkOperation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { action, tipIds, data } = req.body;

      if (!action || !tipIds || !Array.isArray(tipIds)) {
        throw new AppError('Action and tipIds array are required', 400, 'VALIDATION_ERROR');
      }

      const validActions = ['activate', 'deactivate', 'delete', 'update_category', 'add_tags', 'remove_tags'];
      if (!validActions.includes(action)) {
        throw new AppError('Invalid bulk action', 400, 'VALIDATION_ERROR');
      }

      const result = await contentManagementService.bulkOperation({
        action,
        tipIds,
        data,
      });

      res.status(200).json({
        success: true,
        data: result,
        message: `Bulk ${action} operation completed`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/health-tips/:id/schedule
   * Schedule content for future publication
   */
  async scheduleContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { scheduledFor } = req.body;

      if (!id) {
        throw new AppError('Health tip ID is required', 400, 'VALIDATION_ERROR');
      }

      if (!scheduledFor) {
        throw new AppError('scheduledFor date is required', 400, 'VALIDATION_ERROR');
      }

      const scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime())) {
        throw new AppError('Invalid scheduledFor date format', 400, 'VALIDATION_ERROR');
      }

      if (scheduledDate <= new Date()) {
        throw new AppError('scheduledFor date must be in the future', 400, 'VALIDATION_ERROR');
      }

      const schedule = await contentManagementService.scheduleContent(id, scheduledDate);

      res.status(200).json({
        success: true,
        data: schedule,
        message: 'Content scheduled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/health-tips/:id/view
   * Increment view count for a health tip
   */
  async incrementViewCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!id) {
        throw new AppError('Health tip ID is required', 400, 'VALIDATION_ERROR');
      }

      if (userId) {
        // Record view engagement using content service
        const { ContentService } = await import('../services/content/contentService');
        const contentService = ContentService.getInstance();
        await contentService.recordEngagement(userId, id, 'view');
      }

      res.status(200).json({
        success: true,
        message: 'View count updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/health-tips/:id/engage
   * Record user engagement with a health tip
   */
  async recordEngagement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { action } = req.body;
      const userId = req.user?.id;

      if (!id) {
        throw new AppError('Health tip ID is required', 400, 'VALIDATION_ERROR');
      }

      if (!userId) {
        throw new AppError('User authentication required', 401, 'UNAUTHORIZED');
      }

      if (!action) {
        throw new AppError('Action is required', 400, 'VALIDATION_ERROR');
      }

      const validActions = ['view', 'like', 'bookmark', 'complete', 'share', 'rate'];
      if (!validActions.includes(action)) {
        throw new AppError('Invalid engagement action', 400, 'VALIDATION_ERROR');
      }

      // Record engagement using content service
      const { ContentService } = await import('../services/content/contentService');
      const contentService = ContentService.getInstance();
      await contentService.recordEngagement(userId, id, action);

      res.status(200).json({
        success: true,
        message: 'Engagement recorded successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/health-tips/daily
   * Get daily personalized tips for the authenticated user
   */
  async getDailyTips(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const count = parseInt(req.query.count as string) || 3;

      if (!userId) {
        throw new AppError('User authentication required', 401, 'UNAUTHORIZED');
      }

      if (count < 1 || count > 10) {
        throw new AppError('Count must be between 1 and 10', 400, 'VALIDATION_ERROR');
      }

      const { ContentService } = await import('../services/content/contentService');
      const contentService = ContentService.getInstance();
      const tips = await contentService.getDailyTips(userId, count);

      res.status(200).json({
        success: true,
        data: tips,
        message: 'Daily tips retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

// Create controller instance
export const healthTipController = new HealthTipController();

// Export individual methods for easier testing and route binding
export const {
  getHealthTips,
  getHealthTipById,
  createHealthTip,
  updateHealthTip,
  deleteHealthTip,
  getHealthTipsByCategory,
  searchHealthTips,
  getContentStats,
  getContentAnalytics,
  bulkOperation,
  scheduleContent,
  incrementViewCount,
  recordEngagement,
  getDailyTips,
} = healthTipController;