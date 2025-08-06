/**
 * Content Management Service
 * Enhanced content management with advanced features like bulk operations,
 * content scheduling, analytics, and workflow management
 */

import { HealthTip, HealthCategory, TipDifficulty } from '../../types/healthTip';
import { supabase } from '../../config/supabase';
import { cacheService } from '../cache/cacheService';
import { loggingService } from '../logging/loggingService';
import { validateData, healthTipSchema } from '../../validation/schemas';
import { AppError } from '../../utils/errorHandler';

export interface ContentFilter {
  category?: HealthCategory;
  difficulty?: TipDifficulty;
  tags?: string[];
  searchQuery?: string;
  status?: ContentStatus;
  createdBy?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContentStats {
  totalTips: number;
  activeTips: number;
  draftTips: number;
  scheduledTips: number;
  categoryCounts: Record<HealthCategory, number>;
  averageReadTime: number;
  mostPopularTags: string[];
  engagementStats: {
    totalViews: number;
    totalLikes: number;
    totalBookmarks: number;
    totalCompletions: number;
  };
}

export interface BulkOperation {
  action: 'activate' | 'deactivate' | 'delete' | 'update_category' | 'add_tags' | 'remove_tags';
  tipIds: string[];
  data?: any;
}

export interface ContentSchedule {
  id: string;
  tipId: string;
  scheduledFor: Date;
  status: 'pending' | 'published' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentWorkflow {
  id: string;
  tipId: string;
  status: ContentStatus;
  assignedTo?: string;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ContentStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';

export interface CreateContentData {
  title: string;
  content: string;
  category: HealthCategory;
  difficulty: TipDifficulty;
  estimatedReadTime: number;
  tags?: string[];
  imageUrl?: string;
  status?: ContentStatus;
  scheduledFor?: Date;
  createdBy: string;
}

export interface UpdateContentData extends Partial<CreateContentData> {
  id: string;
}

export interface ContentAnalytics {
  tipId: string;
  views: number;
  likes: number;
  bookmarks: number;
  completions: number;
  averageRating: number;
  engagementRate: number;
  retentionRate: number;
  lastViewed: Date;
  topUserSegments: string[];
}

class ContentManagementService {
  private static instance: ContentManagementService;
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = 'content:';

  private constructor() {}

  public static getInstance(): ContentManagementService {
    if (!ContentManagementService.instance) {
      ContentManagementService.instance = new ContentManagementService();
    }
    return ContentManagementService.instance;
  }

  /**
   * Get content with advanced filtering and pagination
   */
  async getContent(filter: ContentFilter = {}): Promise<{
    data: HealthTip[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        difficulty,
        tags,
        searchQuery,
        status,
        createdBy,
        dateRange,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = filter;

      const offset = (page - 1) * limit;
      const cacheKey = `${this.CACHE_PREFIX}list:${JSON.stringify(filter)}`;

      // Try cache first for simple queries
      if (page === 1 && limit <= 20) {
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Build query
      let query = supabase
        .from('health_tips_extended')
        .select('*, view_count, like_count, bookmark_count, completion_count', { count: 'exact' });

      // Apply filters
      if (category) {
        query = query.eq('category', category);
      }

      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }

      if (status) {
        query = query.eq('status', status);
      } else {
        // Default to active content for public queries
        query = query.neq('status', 'archived');
      }

      if (createdBy) {
        query = query.eq('created_by', createdBy);
      }

      if (tags && tags.length > 0) {
        // Use PostgreSQL array contains operator
        query = query.contains('tags', tags);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      // Apply sorting
      const ascending = sortOrder === 'asc';
      query = query.order(sortBy, { ascending });

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new AppError('Failed to fetch content', 500, 'DATABASE_ERROR', error);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      const result = {
        data: (data || []).map(this.transformDatabaseRecord),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };

      // Cache simple queries
      if (page === 1 && limit <= 20) {
        await cacheService.set(cacheKey, result, this.CACHE_TTL);
      }

      await loggingService.logInfo('Content retrieved successfully', {
        count: result.data.length,
        filter,
      });

      return result;
    } catch (error) {
      await loggingService.logError('Failed to get content', error as Error, { filter });
      throw error;
    }
  }

  /**
   * Create new content with workflow support
   */
  async createContent(contentData: CreateContentData): Promise<HealthTip> {
    try {
      // Validate input
      const validation = await validateData(healthTipSchema, {
        ...contentData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: contentData.status === 'published',
      });

      if (!validation.isValid) {
        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', validation.errors);
      }

      const validatedData = validation.data!;

      // Insert content
      const { data, error } = await supabase
        .from('health_tips')
        .insert([{
          id: validatedData.id,
          title: validatedData.title,
          content: validatedData.content,
          category: validatedData.category,
          difficulty: validatedData.difficulty,
          estimated_read_time: validatedData.estimatedReadTime,
          tags: JSON.stringify(validatedData.tags || []),
          image_url: validatedData.imageUrl,
          status: contentData.status || 'draft',
          created_by: validatedData.createdBy,
          is_active: validatedData.isActive,
          created_at: validatedData.createdAt.toISOString(),
          updated_at: validatedData.updatedAt.toISOString(),
        }])
        .select()
        .single();

      if (error) {
        throw new AppError('Failed to create content', 500, 'DATABASE_ERROR', error);
      }

      const createdTip = this.transformDatabaseRecord(data);

      // Create workflow entry
      await this.createWorkflowEntry(createdTip.id, contentData.status || 'draft', contentData.createdBy);

      // Schedule if needed
      if (contentData.scheduledFor) {
        await this.scheduleContent(createdTip.id, contentData.scheduledFor);
      }

      // Clear cache
      await this.clearContentCache();

      await loggingService.logInfo('Content created successfully', {
        tipId: createdTip.id,
        title: createdTip.title,
        status: contentData.status,
      });

      return createdTip;
    } catch (error) {
      await loggingService.logError('Failed to create content', error as Error, { contentData });
      throw error;
    }
  }

  /**
   * Update content with workflow tracking
   */
  async updateContent(updateData: UpdateContentData): Promise<HealthTip> {
    try {
      const { id, ...contentData } = updateData;

      if (!id) {
        throw new AppError('Content ID is required', 400, 'VALIDATION_ERROR');
      }

      // Get existing content
      const existing = await this.getContentById(id);
      if (!existing) {
        throw new AppError('Content not found', 404, 'NOT_FOUND');
      }

      // Validate update data
      const validation = await validateData(healthTipSchema.partial(), {
        ...contentData,
        updatedAt: new Date(),
      });

      if (!validation.isValid) {
        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', validation.errors);
      }

      const validatedData = validation.data!;

      // Prepare update object
      const updateObject: any = {
        updated_at: new Date().toISOString(),
      };

      if (validatedData.title) updateObject.title = validatedData.title;
      if (validatedData.content) updateObject.content = validatedData.content;
      if (validatedData.category) updateObject.category = validatedData.category;
      if (validatedData.difficulty) updateObject.difficulty = validatedData.difficulty;
      if (validatedData.estimatedReadTime) updateObject.estimated_read_time = validatedData.estimatedReadTime;
      if (validatedData.tags) updateObject.tags = JSON.stringify(validatedData.tags);
      if (validatedData.imageUrl !== undefined) updateObject.image_url = validatedData.imageUrl;
      if (contentData.status) {
        updateObject.status = contentData.status;
        updateObject.is_active = contentData.status === 'published';
      }

      // Update in database
      const { data, error } = await supabase
        .from('health_tips')
        .update(updateObject)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new AppError('Failed to update content', 500, 'DATABASE_ERROR', error);
      }

      const updatedTip = this.transformDatabaseRecord(data);

      // Update workflow if status changed
      if (contentData.status) {
        await this.updateWorkflowStatus(id, contentData.status);
      }

      // Handle scheduling
      if (contentData.scheduledFor) {
        await this.scheduleContent(id, contentData.scheduledFor);
      }

      // Clear cache
      await this.clearContentCache();
      await cacheService.delete(`${this.CACHE_PREFIX}${id}`);

      await loggingService.logInfo('Content updated successfully', {
        tipId: id,
        title: updatedTip.title,
        changes: Object.keys(contentData),
      });

      return updatedTip;
    } catch (error) {
      await loggingService.logError('Failed to update content', error as Error, { updateData });
      throw error;
    }
  }

  /**
   * Get content by ID with caching
   */
  async getContentById(id: string): Promise<HealthTip | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${id}`;
      const cached = await cacheService.get<HealthTip>(cacheKey);
      if (cached) {
        return cached;
      }

      const { data, error } = await supabase
        .from('health_tips_extended')
        .select('*, view_count, like_count, bookmark_count, completion_count')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new AppError('Failed to fetch content', 500, 'DATABASE_ERROR', error);
      }

      const tip = this.transformDatabaseRecord(data);
      await cacheService.set(cacheKey, tip, this.CACHE_TTL);

      return tip;
    } catch (error) {
      await loggingService.logError('Failed to get content by ID', error as Error, { id });
      throw error;
    }
  }

  /**
   * Bulk operations on content
   */
  async bulkOperation(operation: BulkOperation): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      const { action, tipIds, data } = operation;
      const results = { success: 0, failed: 0, errors: [] as string[] };

      for (const tipId of tipIds) {
        try {
          switch (action) {
            case 'activate':
              await this.updateContent({ id: tipId, status: 'published' });
              break;
            case 'deactivate':
              await this.updateContent({ id: tipId, status: 'draft' });
              break;
            case 'delete':
              await this.deleteContent(tipId);
              break;
            case 'update_category':
              if (data?.category) {
                await this.updateContent({ id: tipId, category: data.category });
              }
              break;
            case 'add_tags':
              if (data?.tags) {
                const existing = await this.getContentById(tipId);
                if (existing) {
                  const newTags = [...new Set([...existing.tags, ...data.tags])];
                  await this.updateContent({ id: tipId, tags: newTags });
                }
              }
              break;
            case 'remove_tags':
              if (data?.tags) {
                const existing = await this.getContentById(tipId);
                if (existing) {
                  const newTags = existing.tags.filter(tag => !data.tags.includes(tag));
                  await this.updateContent({ id: tipId, tags: newTags });
                }
              }
              break;
          }
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`${tipId}: ${(error as Error).message}`);
        }
      }

      await loggingService.logInfo('Bulk operation completed', {
        action,
        totalItems: tipIds.length,
        success: results.success,
        failed: results.failed,
      });

      return results;
    } catch (error) {
      await loggingService.logError('Bulk operation failed', error as Error, { operation });
      throw error;
    }
  }

  /**
   * Get content statistics
   */
  async getContentStats(): Promise<ContentStats> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}stats`;
      const cached = await cacheService.get<ContentStats>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get basic counts
      const { data: tipCounts, error: countError } = await supabase
        .from('health_tips')
        .select('status, category')
        .neq('status', 'archived');

      if (countError) {
        throw new AppError('Failed to get content stats', 500, 'DATABASE_ERROR', countError);
      }

      // Get engagement stats
      const { data: engagementData, error: engagementError } = await supabase
        .from('health_tips_extended')
        .select('view_count, like_count, bookmark_count, completion_count, estimated_read_time, tags')
        .eq('is_active', true);

      if (engagementError) {
        throw new AppError('Failed to get engagement stats', 500, 'DATABASE_ERROR', engagementError);
      }

      // Process data
      const categoryCounts: Record<HealthCategory, number> = {
        nutrition: 0,
        mental_wellness: 0,
        fitness: 0,
        sleep: 0,
        recovery: 0,
        hygiene: 0,
      };

      let activeTips = 0;
      let draftTips = 0;
      let scheduledTips = 0;

      tipCounts?.forEach(tip => {
        categoryCounts[tip.category as HealthCategory]++;
        switch (tip.status) {
          case 'published':
            activeTips++;
            break;
          case 'draft':
          case 'review':
            draftTips++;
            break;
          case 'scheduled':
            scheduledTips++;
            break;
        }
      });

      // Calculate engagement stats
      let totalViews = 0;
      let totalLikes = 0;
      let totalBookmarks = 0;
      let totalCompletions = 0;
      let totalReadTime = 0;
      const allTags: string[] = [];

      engagementData?.forEach(tip => {
        totalViews += tip.view_count || 0;
        totalLikes += tip.like_count || 0;
        totalBookmarks += tip.bookmark_count || 0;
        totalCompletions += tip.completion_count || 0;
        totalReadTime += tip.estimated_read_time || 0;
        
        if (tip.tags) {
          const tags = JSON.parse(tip.tags);
          allTags.push(...tags);
        }
      });

      // Get most popular tags
      const tagCounts: Record<string, number> = {};
      allTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });

      const mostPopularTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag]) => tag);

      const stats: ContentStats = {
        totalTips: tipCounts?.length || 0,
        activeTips,
        draftTips,
        scheduledTips,
        categoryCounts,
        averageReadTime: engagementData?.length ? Math.round(totalReadTime / engagementData.length) : 0,
        mostPopularTags,
        engagementStats: {
          totalViews,
          totalLikes,
          totalBookmarks,
          totalCompletions,
        },
      };

      await cacheService.set(cacheKey, stats, this.CACHE_TTL);

      return stats;
    } catch (error) {
      await loggingService.logError('Failed to get content stats', error as Error);
      throw error;
    }
  }

  /**
   * Get content analytics for a specific tip
   */
  async getContentAnalytics(tipId: string): Promise<ContentAnalytics> {
    try {
      const { data, error } = await supabase
        .from('health_tips_analytics')
        .select('*')
        .eq('tip_id', tipId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Return default analytics if none exist
          return {
            tipId,
            views: 0,
            likes: 0,
            bookmarks: 0,
            completions: 0,
            averageRating: 0,
            engagementRate: 0,
            retentionRate: 0,
            lastViewed: new Date(),
            topUserSegments: [],
          };
        }
        throw new AppError('Failed to get content analytics', 500, 'DATABASE_ERROR', error);
      }

      return {
        tipId: data.tip_id,
        views: data.views || 0,
        likes: data.likes || 0,
        bookmarks: data.bookmarks || 0,
        completions: data.completions || 0,
        averageRating: data.average_rating || 0,
        engagementRate: data.engagement_rate || 0,
        retentionRate: data.retention_rate || 0,
        lastViewed: new Date(data.last_viewed),
        topUserSegments: data.top_user_segments || [],
      };
    } catch (error) {
      await loggingService.logError('Failed to get content analytics', error as Error, { tipId });
      throw error;
    }
  }

  /**
   * Schedule content for future publication
   */
  async scheduleContent(tipId: string, scheduledFor: Date): Promise<ContentSchedule> {
    try {
      const scheduleId = crypto.randomUUID();
      
      const { data, error } = await supabase
        .from('content_schedule')
        .insert([{
          id: scheduleId,
          tip_id: tipId,
          scheduled_for: scheduledFor.toISOString(),
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        throw new AppError('Failed to schedule content', 500, 'DATABASE_ERROR', error);
      }

      await loggingService.logInfo('Content scheduled successfully', {
        tipId,
        scheduledFor,
        scheduleId,
      });

      return {
        id: data.id,
        tipId: data.tip_id,
        scheduledFor: new Date(data.scheduled_for),
        status: data.status,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    } catch (error) {
      await loggingService.logError('Failed to schedule content', error as Error, { tipId, scheduledFor });
      throw error;
    }
  }

  /**
   * Delete content (soft delete)
   */
  async deleteContent(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('health_tips')
        .update({
          status: 'archived',
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new AppError('Failed to delete content', 500, 'DATABASE_ERROR', error);
      }

      // Clear cache
      await this.clearContentCache();
      await cacheService.delete(`${this.CACHE_PREFIX}${id}`);

      await loggingService.logInfo('Content deleted successfully', { tipId: id });
    } catch (error) {
      await loggingService.logError('Failed to delete content', error as Error, { id });
      throw error;
    }
  }

  /**
   * Create workflow entry
   */
  private async createWorkflowEntry(tipId: string, status: ContentStatus, assignedTo?: string): Promise<void> {
    try {
      await supabase
        .from('content_workflow')
        .insert([{
          id: crypto.randomUUID(),
          tip_id: tipId,
          status,
          assigned_to: assignedTo,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);
    } catch (error) {
      await loggingService.logWarning('Failed to create workflow entry', { tipId, status, error });
    }
  }

  /**
   * Update workflow status
   */
  private async updateWorkflowStatus(tipId: string, status: ContentStatus): Promise<void> {
    try {
      await supabase
        .from('content_workflow')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('tip_id', tipId);
    } catch (error) {
      await loggingService.logWarning('Failed to update workflow status', { tipId, status, error });
    }
  }

  /**
   * Clear content cache
   */
  private async clearContentCache(): Promise<void> {
    try {
      await cacheService.deletePattern(`${this.CACHE_PREFIX}*`);
    } catch (error) {
      await loggingService.logWarning('Failed to clear content cache', { error });
    }
  }

  /**
   * Transform database record to HealthTip
   */
  private transformDatabaseRecord(record: any): HealthTip {
    return {
      id: record.id,
      title: record.title,
      content: record.content,
      category: record.category,
      difficulty: record.difficulty,
      estimatedReadTime: record.estimated_read_time,
      tags: record.tags ? JSON.parse(record.tags) : [],
      imageUrl: record.image_url,
      createdBy: record.created_by,
      isActive: record.is_active,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      // Additional analytics fields if available
      viewCount: record.view_count || 0,
      likeCount: record.like_count || 0,
      bookmarkCount: record.bookmark_count || 0,
      completionCount: record.completion_count || 0,
    };
  }
}

export const contentManagementService = ContentManagementService.getInstance();