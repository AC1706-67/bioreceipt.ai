/**
 * Admin Content Management Service
 * Comprehensive content management system for admin users
 */

import { HealthTip, HealthTipCategory, DifficultyLevel } from '../../models/HealthTip';
import { healthTipService } from '../content/healthTipService';
import { AdminAuthService } from './adminAuthService';
import { AuditLogService } from '../compliance/auditLogService';
import { SecureStorageService } from '../security/secureStorage';

export interface ContentUploadRequest {
  title: string;
  content: string;
  category: HealthTipCategory;
  difficulty: DifficultyLevel;
  tags: string[];
  imageUrl?: string;
  estimatedReadTime?: number;
  priority?: number;
  isActive?: boolean;
  scheduledPublishDate?: Date;
}

export interface ContentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ContentAnalytics {
  tipId: string;
  title: string;
  views: number;
  likes: number;
  bookmarks: number;
  completions: number;
  shares: number;
  averageRating: number;
  engagementScore: number;
  createdAt: Date;
  lastInteraction?: Date;
  categoryPerformance: number;
  userFeedback: ContentFeedback[];
}

export interface ContentFeedback {
  id: string;
  tipId: string;
  userId: string;
  rating: number;
  comment?: string;
  timestamp: Date;
  isPublic: boolean;
}

export interface ContentBulkOperation {
  operation: 'activate' | 'deactivate' | 'delete' | 'update_category' | 'update_tags';
  tipIds: string[];
  parameters?: Record<string, any>;
}

export interface ContentSearchFilters {
  query?: string;
  category?: HealthTipCategory;
  difficulty?: DifficultyLevel;
  isActive?: boolean;
  createdBy?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  engagementRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
}

export interface ContentDashboardStats {
  totalTips: number;
  activeTips: number;
  draftTips: number;
  scheduledTips: number;
  totalViews: number;
  totalEngagements: number;
  averageEngagementScore: number;
  topPerformingTips: HealthTip[];
  categoryBreakdown: Record<HealthTipCategory, number>;
  recentActivity: ContentActivity[];
}

export interface ContentActivity {
  id: string;
  type: 'created' | 'updated' | 'published' | 'unpublished' | 'deleted';
  tipId: string;
  tipTitle: string;
  adminId: string;
  adminUsername: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export class AdminContentService {
  private static instance: AdminContentService;
  private secureStorage: SecureStorageService;
  private auditLogService: AuditLogService;
  private adminAuthService: AdminAuthService;

  private constructor() {
    this.secureStorage = SecureStorageService.getInstance();
    this.auditLogService = AuditLogService.getInstance();
    this.adminAuthService = AdminAuthService.getInstance();
  }

  public static getInstance(): AdminContentService {
    if (!AdminContentService.instance) {
      AdminContentService.instance = new AdminContentService();
    }
    return AdminContentService.instance;
  }

  /**
   * Upload new health tip content
   */
  public async uploadContent(
    request: ContentUploadRequest,
    adminId: string
  ): Promise<HealthTip> {
    try {
      // Validate admin permissions
      const hasPermission = await this.adminAuthService.hasPermission(adminId, 'content.create');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to create content');
      }

      // Validate content
      const validation = await this.validateContent(request);
      if (!validation.isValid) {
        throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
      }

      // Create health tip
      const tipId = this.generateTipId();
      const now = new Date();

      const healthTip: HealthTip = {
        id: tipId,
        title: request.title,
        content: request.content,
        category: request.category,
        difficulty: request.difficulty,
        tags: request.tags,
        imageUrl: request.imageUrl,
        estimatedReadTime: request.estimatedReadTime || this.calculateReadTime(request.content),
        isActive: request.isActive !== false,
        createdAt: now,
        updatedAt: now,
        createdBy: adminId,
        priority: request.priority || 0,
        scheduledPublishDate: request.scheduledPublishDate
      };

      // Store the tip
      await this.storeTip(healthTip);

      // Log content creation
      await this.auditLogService.logDataAccess({
        userId: adminId,
        action: 'CONTENT_CREATED',
        resourceType: 'HEALTH_TIP',
        resourceId: tipId,
        timestamp: now,
        ipAddress: 'admin_panel',
        userAgent: 'Admin Panel',
        details: {
          title: request.title,
          category: request.category,
          difficulty: request.difficulty
        }
      });

      // Record activity
      await this.recordActivity({
        type: 'created',
        tipId,
        tipTitle: request.title,
        adminId,
        timestamp: now
      });

      return healthTip;
    } catch (error) {
      console.error('Failed to upload content:', error);
      throw error;
    }
  }

  /**
   * Update existing health tip content
   */
  public async updateContent(
    tipId: string,
    updates: Partial<ContentUploadRequest>,
    adminId: string
  ): Promise<HealthTip> {
    try {
      // Validate admin permissions
      const hasPermission = await this.adminAuthService.hasPermission(adminId, 'content.update');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to update content');
      }

      // Get existing tip
      const existingTip = await this.getTipById(tipId);
      if (!existingTip) {
        throw new Error('Health tip not found');
      }

      // Validate updates
      if (Object.keys(updates).length > 0) {
        const validation = await this.validateContent({ ...existingTip, ...updates });
        if (!validation.isValid) {
          throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Apply updates
      const updatedTip: HealthTip = {
        ...existingTip,
        ...updates,
        updatedAt: new Date(),
        estimatedReadTime: updates.content 
          ? this.calculateReadTime(updates.content) 
          : existingTip.estimatedReadTime
      };

      // Store updated tip
      await this.storeTip(updatedTip);

      // Log content update
      await this.auditLogService.logDataAccess({
        userId: adminId,
        action: 'CONTENT_UPDATED',
        resourceType: 'HEALTH_TIP',
        resourceId: tipId,
        timestamp: new Date(),
        ipAddress: 'admin_panel',
        userAgent: 'Admin Panel',
        details: {
          updates: Object.keys(updates),
          title: updatedTip.title
        }
      });

      // Record activity
      await this.recordActivity({
        type: 'updated',
        tipId,
        tipTitle: updatedTip.title,
        adminId,
        timestamp: new Date()
      });

      return updatedTip;
    } catch (error) {
      console.error('Failed to update content:', error);
      throw error;
    }
  }

  /**
   * Delete health tip content
   */
  public async deleteContent(tipId: string, adminId: string): Promise<boolean> {
    try {
      // Validate admin permissions
      const hasPermission = await this.adminAuthService.hasPermission(adminId, 'content.delete');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to delete content');
      }

      // Get existing tip
      const existingTip = await this.getTipById(tipId);
      if (!existingTip) {
        throw new Error('Health tip not found');
      }

      // Remove tip
      await this.secureStorage.removeItem(`health_tip_${tipId}`);

      // Log content deletion
      await this.auditLogService.logDataAccess({
        userId: adminId,
        action: 'CONTENT_DELETED',
        resourceType: 'HEALTH_TIP',
        resourceId: tipId,
        timestamp: new Date(),
        ipAddress: 'admin_panel',
        userAgent: 'Admin Panel',
        details: {
          title: existingTip.title,
          category: existingTip.category
        }
      });

      // Record activity
      await this.recordActivity({
        type: 'deleted',
        tipId,
        tipTitle: existingTip.title,
        adminId,
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      console.error('Failed to delete content:', error);
      throw error;
    }
  }

  /**
   * Get health tip by ID
   */
  public async getTipById(tipId: string): Promise<HealthTip | null> {
    try {
      const stored = await this.secureStorage.getItem(`health_tip_${tipId}`);
      if (!stored) return null;

      const tip = JSON.parse(stored);
      return {
        ...tip,
        createdAt: new Date(tip.createdAt),
        updatedAt: new Date(tip.updatedAt),
        scheduledPublishDate: tip.scheduledPublishDate ? new Date(tip.scheduledPublishDate) : undefined
      };
    } catch (error) {
      console.error('Failed to get tip by ID:', error);
      return null;
    }
  }

  /**
   * Search and filter content
   */
  public async searchContent(
    filters: ContentSearchFilters,
    adminId: string
  ): Promise<HealthTip[]> {
    try {
      // Validate admin permissions
      const hasPermission = await this.adminAuthService.hasPermission(adminId, 'content.read');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to read content');
      }

      const allTips = await this.getAllTips();
      let filteredTips = allTips;

      // Apply filters
      if (filters.query) {
        const query = filters.query.toLowerCase();
        filteredTips = filteredTips.filter(tip =>
          tip.title.toLowerCase().includes(query) ||
          tip.content.toLowerCase().includes(query) ||
          tip.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }

      if (filters.category) {
        filteredTips = filteredTips.filter(tip => tip.category === filters.category);
      }

      if (filters.difficulty) {
        filteredTips = filteredTips.filter(tip => tip.difficulty === filters.difficulty);
      }

      if (filters.isActive !== undefined) {
        filteredTips = filteredTips.filter(tip => tip.isActive === filters.isActive);
      }

      if (filters.createdBy) {
        filteredTips = filteredTips.filter(tip => tip.createdBy === filters.createdBy);
      }

      if (filters.dateRange) {
        filteredTips = filteredTips.filter(tip =>
          tip.createdAt >= filters.dateRange!.start &&
          tip.createdAt <= filters.dateRange!.end
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        filteredTips = filteredTips.filter(tip =>
          filters.tags!.some(tag => tip.tags.includes(tag))
        );
      }

      // Sort by creation date (newest first)
      filteredTips.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return filteredTips;
    } catch (error) {
      console.error('Failed to search content:', error);
      return [];
    }
  }

  /**
   * Get content analytics
   */
  public async getContentAnalytics(
    tipId: string,
    adminId: string
  ): Promise<ContentAnalytics | null> {
    try {
      // Validate admin permissions
      const hasPermission = await this.adminAuthService.hasPermission(adminId, 'analytics.read');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to read analytics');
      }

      const tip = await this.getTipById(tipId);
      if (!tip) return null;

      // Get analytics data (simplified - in real app would come from analytics service)
      const analytics: ContentAnalytics = {
        tipId,
        title: tip.title,
        views: Math.floor(Math.random() * 1000),
        likes: Math.floor(Math.random() * 100),
        bookmarks: Math.floor(Math.random() * 50),
        completions: Math.floor(Math.random() * 80),
        shares: Math.floor(Math.random() * 20),
        averageRating: 4.2 + Math.random() * 0.8,
        engagementScore: Math.random() * 100,
        createdAt: tip.createdAt,
        categoryPerformance: Math.random() * 100,
        userFeedback: []
      };

      return analytics;
    } catch (error) {
      console.error('Failed to get content analytics:', error);
      return null;
    }
  }

  /**
   * Get dashboard statistics
   */
  public async getDashboardStats(adminId: string): Promise<ContentDashboardStats> {
    try {
      // Validate admin permissions
      const hasPermission = await this.adminAuthService.hasPermission(adminId, 'content.read');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to read dashboard stats');
      }

      const allTips = await this.getAllTips();
      const recentActivity = await this.getRecentActivity();

      const activeTips = allTips.filter(tip => tip.isActive);
      const draftTips = allTips.filter(tip => !tip.isActive);
      const scheduledTips = allTips.filter(tip => tip.scheduledPublishDate && tip.scheduledPublishDate > new Date());

      // Category breakdown
      const categoryBreakdown: Record<HealthTipCategory, number> = {} as any;
      allTips.forEach(tip => {
        categoryBreakdown[tip.category] = (categoryBreakdown[tip.category] || 0) + 1;
      });

      // Top performing tips (simplified)
      const topPerformingTips = allTips
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);

      const stats: ContentDashboardStats = {
        totalTips: allTips.length,
        activeTips: activeTips.length,
        draftTips: draftTips.length,
        scheduledTips: scheduledTips.length,
        totalViews: Math.floor(Math.random() * 10000),
        totalEngagements: Math.floor(Math.random() * 5000),
        averageEngagementScore: 65 + Math.random() * 30,
        topPerformingTips,
        categoryBreakdown,
        recentActivity
      };

      return stats;
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Perform bulk operations on content
   */
  public async performBulkOperation(
    operation: ContentBulkOperation,
    adminId: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      // Validate admin permissions based on operation
      const requiredPermission = operation.operation === 'delete' ? 'content.delete' : 'content.update';
      const hasPermission = await this.adminAuthService.hasPermission(adminId, requiredPermission);
      if (!hasPermission) {
        throw new Error(`Insufficient permissions for ${operation.operation} operation`);
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const tipId of operation.tipIds) {
        try {
          switch (operation.operation) {
            case 'activate':
              await this.updateContent(tipId, { isActive: true }, adminId);
              break;
            case 'deactivate':
              await this.updateContent(tipId, { isActive: false }, adminId);
              break;
            case 'delete':
              await this.deleteContent(tipId, adminId);
              break;
            case 'update_category':
              if (operation.parameters?.category) {
                await this.updateContent(tipId, { category: operation.parameters.category }, adminId);
              }
              break;
            case 'update_tags':
              if (operation.parameters?.tags) {
                await this.updateContent(tipId, { tags: operation.parameters.tags }, adminId);
              }
              break;
          }
          success++;
        } catch (error) {
          failed++;
          errors.push(`${tipId}: ${(error as Error).message}`);
        }
      }

      // Log bulk operation
      await this.auditLogService.logDataAccess({
        userId: adminId,
        action: 'BULK_CONTENT_OPERATION',
        resourceType: 'HEALTH_TIP',
        resourceId: 'bulk',
        timestamp: new Date(),
        ipAddress: 'admin_panel',
        userAgent: 'Admin Panel',
        details: {
          operation: operation.operation,
          totalTips: operation.tipIds.length,
          success,
          failed
        }
      });

      return { success, failed, errors };
    } catch (error) {
      console.error('Failed to perform bulk operation:', error);
      throw error;
    }
  }

  /**
   * Validate content before upload/update
   */
  public async validateContent(request: ContentUploadRequest): Promise<ContentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required field validation
    if (!request.title || request.title.trim().length === 0) {
      errors.push('Title is required');
    } else if (request.title.length > 200) {
      errors.push('Title must be 200 characters or less');
    }

    if (!request.content || request.content.trim().length === 0) {
      errors.push('Content is required');
    } else if (request.content.length < 50) {
      warnings.push('Content is quite short - consider adding more detail');
    } else if (request.content.length > 5000) {
      warnings.push('Content is very long - consider breaking into multiple tips');
    }

    if (!request.category) {
      errors.push('Category is required');
    }

    if (!request.difficulty) {
      errors.push('Difficulty level is required');
    }

    // Tags validation
    if (!request.tags || request.tags.length === 0) {
      warnings.push('Adding tags will help with content discovery');
    } else if (request.tags.length > 10) {
      warnings.push('Too many tags - consider using 3-5 most relevant tags');
    }

    // Image validation
    if (request.imageUrl) {
      if (!this.isValidImageUrl(request.imageUrl)) {
        errors.push('Invalid image URL format');
      }
    } else {
      suggestions.push('Adding an image can improve engagement');
    }

    // Read time validation
    const calculatedReadTime = this.calculateReadTime(request.content || '');
    if (request.estimatedReadTime && Math.abs(request.estimatedReadTime - calculatedReadTime) > 2) {
      warnings.push(`Estimated read time seems off - calculated time is ${calculatedReadTime} minutes`);
    }

    // Content quality suggestions
    if (request.content) {
      if (!request.content.includes('?') && !request.content.includes('!')) {
        suggestions.push('Consider adding questions or exclamations to make content more engaging');
      }

      const sentences = request.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length < 3) {
        suggestions.push('Consider expanding content with more detailed explanations');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  // Private helper methods
  private async getAllTips(): Promise<HealthTip[]> {
    try {
      const keys = await this.secureStorage.getAllKeys();
      const tipKeys = keys.filter(key => key.startsWith('health_tip_'));
      
      const tips: HealthTip[] = [];
      for (const key of tipKeys) {
        const stored = await this.secureStorage.getItem(key);
        if (stored) {
          const tip = JSON.parse(stored);
          tips.push({
            ...tip,
            createdAt: new Date(tip.createdAt),
            updatedAt: new Date(tip.updatedAt),
            scheduledPublishDate: tip.scheduledPublishDate ? new Date(tip.scheduledPublishDate) : undefined
          });
        }
      }

      return tips;
    } catch (error) {
      console.error('Failed to get all tips:', error);
      return [];
    }
  }

  private async storeTip(tip: HealthTip): Promise<void> {
    await this.secureStorage.setItem(`health_tip_${tip.id}`, JSON.stringify(tip));
  }

  private async recordActivity(activity: Omit<ContentActivity, 'id' | 'adminUsername'>): Promise<void> {
    try {
      // Get admin username
      const adminUser = await this.adminAuthService.getCurrentUser();
      const adminUsername = adminUser?.username || 'Unknown';

      const fullActivity: ContentActivity = {
        ...activity,
        id: this.generateActivityId(),
        adminUsername
      };

      // Store activity
      await this.secureStorage.setItem(`content_activity_${fullActivity.id}`, JSON.stringify(fullActivity));
    } catch (error) {
      console.error('Failed to record activity:', error);
    }
  }

  private async getRecentActivity(): Promise<ContentActivity[]> {
    try {
      const keys = await this.secureStorage.getAllKeys();
      const activityKeys = keys.filter(key => key.startsWith('content_activity_'));
      
      const activities: ContentActivity[] = [];
      for (const key of activityKeys) {
        const stored = await this.secureStorage.getItem(key);
        if (stored) {
          const activity = JSON.parse(stored);
          activities.push({
            ...activity,
            timestamp: new Date(activity.timestamp)
          });
        }
      }

      // Sort by timestamp (newest first) and limit to 20
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 20);
    } catch (error) {
      console.error('Failed to get recent activity:', error);
      return [];
    }
  }

  private calculateReadTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.max(1, Math.round(wordCount / wordsPerMinute));
  }

  private isValidImageUrl(url: string): boolean {
    try {
      new URL(url);
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    } catch {
      return false;
    }
  }

  private generateTipId(): string {
    return `tip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateActivityId(): string {
    return `activity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}