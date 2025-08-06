/**
 * Feedback Service
 * Comprehensive feedback and support system with offline support
 */

import {
  UserFeedback,
  FeedbackFormData,
  FeedbackCategory,
  FeedbackPriority,
  FeedbackStatus,
  FeedbackFilter,
  FeedbackStats,
  FeedbackValidator,
  DeviceInfo,
  SupportTicket,
  SupportMessage
} from '../../models/Feedback';
import { storage } from '../../utils/storage';
import { cacheService } from '../cache/cacheService';
import { analyticsService } from '../analytics/analyticsService';
import { Platform } from 'react-native';

interface FeedbackServiceConfig {
  enableOfflineSupport: boolean;
  maxAttachmentSize: number; // in MB
  maxAttachments: number;
  autoSubmitWhenOnline: boolean;
  notifyAdminForCritical: boolean;
}

class FeedbackService {
  private static instance: FeedbackService;
  private config: FeedbackServiceConfig;
  private offlineQueue: UserFeedback[];

  private constructor() {
    this.config = {
      enableOfflineSupport: true,
      maxAttachmentSize: 10, // 10MB
      maxAttachments: 5,
      autoSubmitWhenOnline: true,
      notifyAdminForCritical: true
    };
    this.offlineQueue = [];
    this.initializeOfflineSupport();
  }

  static getInstance(): FeedbackService {
    if (!FeedbackService.instance) {
      FeedbackService.instance = new FeedbackService();
    }
    return FeedbackService.instance;
  }

  /**
   * Submit user feedback with offline support
   */
  async submitFeedback(userId: string, formData: FeedbackFormData): Promise<UserFeedback> {
    try {
      // Validate form data
      const validation = FeedbackValidator.validate(formData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Create feedback object
      const feedback = await this.createFeedbackObject(userId, formData);

      // Try to submit online first
      try {
        const submittedFeedback = await this.submitOnline(feedback);
        
        // Track successful submission
        analyticsService.trackEvent('feedback_submitted', {
          userId,
          category: feedback.category,
          priority: feedback.priority,
          submissionMethod: 'online'
        });

        return submittedFeedback;
      } catch (onlineError) {
        console.warn('Online submission failed, queuing for offline:', onlineError);
        
        if (this.config.enableOfflineSupport) {
          return await this.queueForOfflineSubmission(feedback);
        } else {
          throw onlineError;
        }
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw new Error('Failed to submit feedback');
    }
  }

  /**
   * Get user's feedback history
   */
  async getUserFeedback(userId: string, filter?: FeedbackFilter): Promise<UserFeedback[]> {
    try {
      const cacheKey = `user_feedback_${userId}_${JSON.stringify(filter)}`;
      const cached = await cacheService.getAdvanced<UserFeedback[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Get feedback from storage
      const feedbackData = await storage.getData('USER_FEEDBACK') || {};
      const userFeedback = Object.values(feedbackData)
        .filter((feedback: any) => feedback.userId === userId)
        .map(this.parseFeedbackDates);

      // Apply filters
      const filteredFeedback = filter ? this.applyFilters(userFeedback, filter) : userFeedback;

      // Sort by creation date (newest first)
      const sortedFeedback = filteredFeedback.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Cache for 10 minutes
      await cacheService.setAdvanced(cacheKey, sortedFeedback, {
        ttl: 10,
        level: 'memory',
        importance: 0.6
      });

      return sortedFeedback;
    } catch (error) {
      console.error('Error getting user feedback:', error);
      throw new Error('Failed to retrieve feedback history');
    }
  }

  /**
   * Get feedback by reference number
   */
  async getFeedbackByReference(referenceNumber: string): Promise<UserFeedback | null> {
    try {
      const feedbackData = await storage.getData('USER_FEEDBACK') || {};
      const feedback = Object.values(feedbackData)
        .find((f: any) => f.referenceNumber === referenceNumber);

      return feedback ? this.parseFeedbackDates(feedback as any) : null;
    } catch (error) {
      console.error('Error getting feedback by reference:', error);
      return null;
    }
  }

  /**
   * Update feedback status (admin function)
   */
  async updateFeedbackStatus(
    feedbackId: string,
    status: FeedbackStatus,
    adminResponse?: string,
    adminUserId?: string
  ): Promise<UserFeedback> {
    try {
      const feedbackData = await storage.getData('USER_FEEDBACK') || {};
      const feedback = feedbackData[feedbackId];

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      // Update feedback
      feedback.status = status;
      feedback.updatedAt = new Date();
      
      if (adminResponse) {
        feedback.adminResponse = adminResponse;
        feedback.adminUserId = adminUserId;
      }

      if (status === FeedbackStatus.RESOLVED || status === FeedbackStatus.CLOSED) {
        feedback.resolvedAt = new Date();
      }

      // Save updated feedback
      feedbackData[feedbackId] = feedback;
      await storage.storeData('USER_FEEDBACK', feedbackData);

      // Invalidate related caches
      await this.invalidateFeedbackCaches(feedback.userId);

      // Track status update
      analyticsService.trackEvent('feedback_status_updated', {
        feedbackId,
        newStatus: status,
        adminUserId,
        hasResponse: !!adminResponse
      });

      return this.parseFeedbackDates(feedback);
    } catch (error) {
      console.error('Error updating feedback status:', error);
      throw new Error('Failed to update feedback status');
    }
  }

  /**
   * Delete feedback (soft delete)
   */
  async deleteFeedback(feedbackId: string, userId: string): Promise<boolean> {
    try {
      const feedbackData = await storage.getData('USER_FEEDBACK') || {};
      const feedback = feedbackData[feedbackId];

      if (!feedback || feedback.userId !== userId) {
        throw new Error('Feedback not found or access denied');
      }

      // Only allow deletion of submitted feedback
      if (feedback.status !== FeedbackStatus.SUBMITTED) {
        throw new Error('Cannot delete feedback that is being processed');
      }

      // Soft delete by updating status
      feedback.status = FeedbackStatus.CLOSED;
      feedback.updatedAt = new Date();
      feedback.internalNotes = feedback.internalNotes || [];
      feedback.internalNotes.push('Deleted by user');

      // Save updated feedback
      feedbackData[feedbackId] = feedback;
      await storage.storeData('USER_FEEDBACK', feedbackData);

      // Invalidate caches
      await this.invalidateFeedbackCaches(userId);

      // Track deletion
      analyticsService.trackEvent('feedback_deleted', {
        feedbackId,
        userId,
        category: feedback.category
      });

      return true;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      throw new Error('Failed to delete feedback');
    }
  } 
 /**
   * Get feedback statistics
   */
  async getFeedbackStats(userId?: string): Promise<FeedbackStats> {
    try {
      const cacheKey = `feedback_stats_${userId || 'all'}`;
      const cached = await cacheService.getAdvanced<FeedbackStats>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const feedbackData = await storage.getData('USER_FEEDBACK') || {};
      let feedbackList = Object.values(feedbackData) as UserFeedback[];

      // Filter by user if specified
      if (userId) {
        feedbackList = feedbackList.filter(f => f.userId === userId);
      }

      // Calculate statistics
      const stats: FeedbackStats = {
        totalSubmissions: feedbackList.length,
        byCategory: this.calculateCategoryStats(feedbackList),
        byStatus: this.calculateStatusStats(feedbackList),
        byPriority: this.calculatePriorityStats(feedbackList),
        averageResolutionTime: this.calculateAverageResolutionTime(feedbackList),
        resolutionRate: this.calculateResolutionRate(feedbackList),
        trendingIssues: await this.calculateTrendingIssues(feedbackList)
      };

      // Cache for 30 minutes
      await cacheService.setAdvanced(cacheKey, stats, {
        ttl: 30,
        level: 'memory',
        importance: 0.7
      });

      return stats;
    } catch (error) {
      console.error('Error getting feedback stats:', error);
      throw new Error('Failed to get feedback statistics');
    }
  }

  /**
   * Process offline feedback queue
   */
  async processOfflineQueue(): Promise<void> {
    try {
      const offlineQueue = await storage.getData('OFFLINE_FEEDBACK_QUEUE') || [];
      
      if (offlineQueue.length === 0) {
        return;
      }

      const processedIds: string[] = [];
      
      for (const feedback of offlineQueue) {
        try {
          await this.submitOnline(feedback);
          processedIds.push(feedback.id);
          
          // Track successful offline submission
          analyticsService.trackEvent('offline_feedback_submitted', {
            feedbackId: feedback.id,
            category: feedback.category,
            queueTime: Date.now() - new Date(feedback.createdAt).getTime()
          });
        } catch (error) {
          console.warn(`Failed to submit offline feedback ${feedback.id}:`, error);
        }
      }

      // Remove successfully processed feedback from queue
      if (processedIds.length > 0) {
        const remainingQueue = offlineQueue.filter(f => !processedIds.includes(f.id));
        await storage.storeData('OFFLINE_FEEDBACK_QUEUE', remainingQueue);
      }
    } catch (error) {
      console.error('Error processing offline feedback queue:', error);
    }
  }

  /**
   * Get feedback templates for categories
   */
  async getFeedbackTemplates(category?: FeedbackCategory): Promise<any[]> {
    try {
      const templates = [
        {
          category: FeedbackCategory.BUG_REPORT,
          title: 'Report a Bug',
          description: 'Help us fix issues by providing detailed information about the problem.',
          suggestedQuestions: [
            'What were you trying to do when the bug occurred?',
            'What did you expect to happen?',
            'What actually happened?',
            'Can you reproduce this issue?'
          ],
          requiredFields: ['title', 'description'],
          isActive: true
        },
        {
          category: FeedbackCategory.FEATURE_REQUEST,
          title: 'Request a Feature',
          description: 'Suggest new features or improvements to make the app better.',
          suggestedQuestions: [
            'What feature would you like to see added?',
            'How would this feature help you?',
            'Are there any similar features in other apps you like?'
          ],
          requiredFields: ['title', 'description'],
          isActive: true
        },
        {
          category: FeedbackCategory.CONTENT_QUALITY,
          title: 'Content Feedback',
          description: 'Help us improve the quality and relevance of health tips.',
          suggestedQuestions: [
            'Which health tip are you providing feedback about?',
            'What specific aspect needs improvement?',
            'Do you have suggestions for better content?'
          ],
          requiredFields: ['title', 'description'],
          isActive: true
        }
      ];

      return category ? templates.filter(t => t.category === category) : templates;
    } catch (error) {
      console.error('Error getting feedback templates:', error);
      return [];
    }
  }

  // Private helper methods
  private async createFeedbackObject(userId: string, formData: FeedbackFormData): Promise<UserFeedback> {
    const id = this.generateFeedbackId();
    const referenceNumber = this.generateReferenceNumber();
    const deviceInfo = await this.getDeviceInfo();
    const priority = this.determinePriority(formData);

    return {
      id,
      referenceNumber,
      userId,
      category: formData.category,
      title: FeedbackValidator.sanitizeInput(formData.title),
      description: FeedbackValidator.sanitizeInput(formData.description),
      userEmail: formData.userEmail,
      deviceInfo,
      appVersion: '1.0.0', // Would get from app config
      priority,
      status: FeedbackStatus.SUBMITTED,
      attachments: [], // Would handle file attachments
      tags: this.generateTags(formData),
      createdAt: new Date(),
      updatedAt: new Date(),
      upvotes: 0,
      isPublic: formData.isPublic || false
    };
  }

  private async submitOnline(feedback: UserFeedback): Promise<UserFeedback> {
    // In a real app, this would make an API call
    // For now, we'll simulate by storing locally
    const feedbackData = await storage.getData('USER_FEEDBACK') || {};
    feedbackData[feedback.id] = feedback;
    await storage.storeData('USER_FEEDBACK', feedbackData);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return feedback;
  }

  private async queueForOfflineSubmission(feedback: UserFeedback): Promise<UserFeedback> {
    try {
      // Add to offline queue
      const offlineQueue = await storage.getData('OFFLINE_FEEDBACK_QUEUE') || [];
      offlineQueue.push(feedback);
      await storage.storeData('OFFLINE_FEEDBACK_QUEUE', offlineQueue);

      // Also store locally for immediate access
      const feedbackData = await storage.getData('USER_FEEDBACK') || {};
      feedbackData[feedback.id] = feedback;
      await storage.storeData('USER_FEEDBACK', feedbackData);

      // Track offline submission
      analyticsService.trackEvent('feedback_queued_offline', {
        userId: feedback.userId,
        category: feedback.category,
        priority: feedback.priority
      });

      return feedback;
    } catch (error) {
      console.error('Error queuing feedback for offline submission:', error);
      throw error;
    }
  }

  private generateFeedbackId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReferenceNumber(): string {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `FB-${year}-${randomNum}`;
  }

  private async getDeviceInfo(): Promise<DeviceInfo> {
    // In a real app, you'd use react-native-device-info
    return {
      platform: Platform.OS,
      osVersion: Platform.Version.toString(),
      deviceModel: 'Unknown', // Would get from device-info
      appVersion: '1.0.0',
      buildNumber: '1'
    };
  }

  private determinePriority(formData: FeedbackFormData): FeedbackPriority {
    // Simple priority determination logic
    if (formData.category === FeedbackCategory.BUG_REPORT) {
      if (formData.description.toLowerCase().includes('crash') || 
          formData.description.toLowerCase().includes('error')) {
        return FeedbackPriority.HIGH;
      }
    }
    
    if (formData.category === FeedbackCategory.ACCESSIBILITY) {
      return FeedbackPriority.HIGH;
    }

    return FeedbackPriority.MEDIUM;
  }

  private generateTags(formData: FeedbackFormData): string[] {
    const tags: string[] = [];
    
    // Add category as tag
    tags.push(formData.category);
    
    // Extract keywords from description
    const keywords = formData.description.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const commonKeywords = ['crash', 'slow', 'bug', 'feature', 'improvement', 'accessibility'];
    
    keywords.forEach(keyword => {
      if (commonKeywords.includes(keyword) && !tags.includes(keyword)) {
        tags.push(keyword);
      }
    });

    return tags.slice(0, 5); // Limit to 5 tags
  }

  private parseFeedbackDates(feedback: any): UserFeedback {
    return {
      ...feedback,
      createdAt: new Date(feedback.createdAt),
      updatedAt: new Date(feedback.updatedAt),
      resolvedAt: feedback.resolvedAt ? new Date(feedback.resolvedAt) : undefined
    };
  }

  private applyFilters(feedback: UserFeedback[], filter: FeedbackFilter): UserFeedback[] {
    return feedback.filter(f => {
      if (filter.category && f.category !== filter.category) return false;
      if (filter.status && f.status !== filter.status) return false;
      if (filter.priority && f.priority !== filter.priority) return false;
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const searchText = `${f.title} ${f.description}`.toLowerCase();
        if (!searchText.includes(query)) return false;
      }
      if (filter.dateRange) {
        const createdAt = new Date(f.createdAt);
        if (createdAt < filter.dateRange.start || createdAt > filter.dateRange.end) {
          return false;
        }
      }
      return true;
    });
  }

  private calculateCategoryStats(feedback: UserFeedback[]): Record<FeedbackCategory, number> {
    const stats = {} as Record<FeedbackCategory, number>;
    
    Object.values(FeedbackCategory).forEach(category => {
      stats[category] = feedback.filter(f => f.category === category).length;
    });

    return stats;
  }

  private calculateStatusStats(feedback: UserFeedback[]): Record<FeedbackStatus, number> {
    const stats = {} as Record<FeedbackStatus, number>;
    
    Object.values(FeedbackStatus).forEach(status => {
      stats[status] = feedback.filter(f => f.status === status).length;
    });

    return stats;
  }

  private calculatePriorityStats(feedback: UserFeedback[]): Record<FeedbackPriority, number> {
    const stats = {} as Record<FeedbackPriority, number>;
    
    Object.values(FeedbackPriority).forEach(priority => {
      stats[priority] = feedback.filter(f => f.priority === priority).length;
    });

    return stats;
  }

  private calculateAverageResolutionTime(feedback: UserFeedback[]): number {
    const resolvedFeedback = feedback.filter(f => f.resolvedAt);
    
    if (resolvedFeedback.length === 0) return 0;

    const totalTime = resolvedFeedback.reduce((sum, f) => {
      const resolutionTime = new Date(f.resolvedAt!).getTime() - new Date(f.createdAt).getTime();
      return sum + resolutionTime;
    }, 0);

    return totalTime / resolvedFeedback.length / (1000 * 60 * 60); // Convert to hours
  }

  private calculateResolutionRate(feedback: UserFeedback[]): number {
    if (feedback.length === 0) return 0;
    
    const resolvedCount = feedback.filter(f => 
      f.status === FeedbackStatus.RESOLVED || f.status === FeedbackStatus.CLOSED
    ).length;

    return (resolvedCount / feedback.length) * 100;
  }

  private async calculateTrendingIssues(feedback: UserFeedback[]): Promise<FeedbackStats['trendingIssues']> {
    // Simple trending calculation based on recent submissions
    const recentFeedback = feedback.filter(f => {
      const daysSinceCreated = (Date.now() - new Date(f.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreated <= 7; // Last 7 days
    });

    const categoryCount: Record<string, number> = {};
    recentFeedback.forEach(f => {
      categoryCount[f.category] = (categoryCount[f.category] || 0) + 1;
    });

    return Object.entries(categoryCount)
      .map(([category, count]) => ({
        category: category as FeedbackCategory,
        count,
        trend: 'stable' as const // Would calculate actual trend
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private async invalidateFeedbackCaches(userId: string): Promise<void> {
    try {
      const patterns = [
        new RegExp(`user_feedback_${userId}`),
        new RegExp('feedback_stats'),
        new RegExp('feedback_templates')
      ];

      for (const pattern of patterns) {
        await cacheService.invalidatePattern(pattern);
      }
    } catch (error) {
      console.error('Error invalidating feedback caches:', error);
    }
  }

  private async initializeOfflineSupport(): Promise<void> {
    if (this.config.autoSubmitWhenOnline) {
      // Check for network connectivity and process queue
      // In a real app, you'd use NetInfo to detect connectivity changes
      setInterval(() => {
        this.processOfflineQueue();
      }, 30000); // Check every 30 seconds
    }
  }
}

export const feedbackService = FeedbackService.getInstance();