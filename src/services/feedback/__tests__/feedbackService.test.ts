/**
 * Feedback Service Tests
 * Comprehensive tests for the feedback service functionality
 */

import { feedbackService } from '../feedbackService';
import {
  FeedbackCategory,
  FeedbackPriority,
  FeedbackStatus,
  FeedbackFormData,
  UserFeedback
} from '../../../models/Feedback';
import { storage } from '../../../utils/storage';
import { cacheService } from '../../cache/cacheService';
import { analyticsService } from '../../analytics/analyticsService';

// Mock dependencies
jest.mock('../../../utils/storage');
jest.mock('../../cache/cacheService');
jest.mock('../../analytics/analyticsService');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;

describe('FeedbackService', () => {
  const mockUserId = 'user-123';
  const mockFeedbackData: FeedbackFormData = {
    category: FeedbackCategory.BUG_REPORT,
    title: 'App crashes on startup',
    description: 'The app crashes immediately when I try to open it on my iPhone 12.',
    userEmail: 'user@example.com',
    isPublic: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockStorage.getData.mockResolvedValue({});
    mockStorage.storeData.mockResolvedValue(undefined);
    mockCacheService.getAdvanced.mockResolvedValue(null);
    mockCacheService.setAdvanced.mockResolvedValue(undefined);
    mockCacheService.invalidatePattern.mockResolvedValue(undefined);
    mockAnalyticsService.trackEvent.mockResolvedValue(undefined);
  });

  describe('submitFeedback', () => {
    it('should successfully submit feedback', async () => {
      const result = await feedbackService.submitFeedback(mockUserId, mockFeedbackData);

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.title).toBe(mockFeedbackData.title);
      expect(result.description).toBe(mockFeedbackData.description);
      expect(result.category).toBe(mockFeedbackData.category);
      expect(result.status).toBe(FeedbackStatus.SUBMITTED);
      expect(result.referenceNumber).toMatch(/^FB-\d{4}-\d{6}$/);
      
      // Verify storage was called
      expect(mockStorage.storeData).toHaveBeenCalledWith('USER_FEEDBACK', expect.any(Object));
      
      // Verify analytics was tracked
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('feedback_submitted', {
        userId: mockUserId,
        category: mockFeedbackData.category,
        priority: expect.any(String),
        submissionMethod: 'online'
      });
    });

    it('should validate feedback data before submission', async () => {
      const invalidData: FeedbackFormData = {
        category: FeedbackCategory.BUG_REPORT,
        title: 'Too short', // Less than 5 characters
        description: 'Short', // Less than 10 characters
        userEmail: 'invalid-email',
        isPublic: false
      };

      await expect(feedbackService.submitFeedback(mockUserId, invalidData))
        .rejects.toThrow('Validation failed');
    });

    it('should handle offline submission when online fails', async () => {
      // Mock storage to fail on first call (simulating network failure)
      mockStorage.storeData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined); // Second call for offline queue

      const result = await feedbackService.submitFeedback(mockUserId, mockFeedbackData);

      expect(result).toBeDefined();
      expect(mockStorage.storeData).toHaveBeenCalledTimes(2); // Once for online (failed), once for offline
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('feedback_queued_offline', expect.any(Object));
    });

    it('should determine priority correctly for bug reports', async () => {
      const crashData: FeedbackFormData = {
        ...mockFeedbackData,
        description: 'The app crashes when I tap the submit button'
      };

      const result = await feedbackService.submitFeedback(mockUserId, crashData);
      expect(result.priority).toBe(FeedbackPriority.HIGH);
    });

    it('should set high priority for accessibility feedback', async () => {
      const accessibilityData: FeedbackFormData = {
        ...mockFeedbackData,
        category: FeedbackCategory.ACCESSIBILITY,
        description: 'Screen reader cannot access the main menu'
      };

      const result = await feedbackService.submitFeedback(mockUserId, accessibilityData);
      expect(result.priority).toBe(FeedbackPriority.HIGH);
    });
  });

  describe('getUserFeedback', () => {
    const mockFeedback: UserFeedback = {
      id: 'feedback-1',
      referenceNumber: 'FB-2024-123456',
      userId: mockUserId,
      category: FeedbackCategory.BUG_REPORT,
      title: 'Test feedback',
      description: 'Test description',
      deviceInfo: {
        platform: 'ios',
        osVersion: '15.0',
        deviceModel: 'iPhone 12',
        appVersion: '1.0.0',
        buildNumber: '1'
      },
      appVersion: '1.0.0',
      priority: FeedbackPriority.MEDIUM,
      status: FeedbackStatus.SUBMITTED,
      createdAt: new Date(),
      updatedAt: new Date(),
      upvotes: 0,
      isPublic: false
    };

    beforeEach(() => {
      mockStorage.getData.mockResolvedValue({
        'feedback-1': mockFeedback,
        'feedback-2': { ...mockFeedback, id: 'feedback-2', userId: 'other-user' }
      });
    });

    it('should return user feedback filtered by userId', async () => {
      const result = await feedbackService.getUserFeedback(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(mockUserId);
      expect(result[0].id).toBe('feedback-1');
    });

    it('should apply category filter', async () => {
      const filter = { category: FeedbackCategory.FEATURE_REQUEST };
      const result = await feedbackService.getUserFeedback(mockUserId, filter);

      expect(result).toHaveLength(0); // No feature requests in mock data
    });

    it('should apply status filter', async () => {
      const filter = { status: FeedbackStatus.SUBMITTED };
      const result = await feedbackService.getUserFeedback(mockUserId, filter);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(FeedbackStatus.SUBMITTED);
    });

    it('should apply search query filter', async () => {
      const filter = { searchQuery: 'test' };
      const result = await feedbackService.getUserFeedback(mockUserId, filter);

      expect(result).toHaveLength(1);
      expect(result[0].title.toLowerCase()).toContain('test');
    });

    it('should cache results', async () => {
      await feedbackService.getUserFeedback(mockUserId);

      expect(mockCacheService.setAdvanced).toHaveBeenCalledWith(
        expect.stringContaining('user_feedback_'),
        expect.any(Array),
        expect.any(Object)
      );
    });

    it('should return cached results when available', async () => {
      const cachedData = [mockFeedback];
      mockCacheService.getAdvanced.mockResolvedValueOnce(cachedData);

      const result = await feedbackService.getUserFeedback(mockUserId);

      expect(result).toBe(cachedData);
      expect(mockStorage.getData).not.toHaveBeenCalled();
    });
  });

  describe('getFeedbackByReference', () => {
    const mockFeedback: UserFeedback = {
      id: 'feedback-1',
      referenceNumber: 'FB-2024-123456',
      userId: mockUserId,
      category: FeedbackCategory.BUG_REPORT,
      title: 'Test feedback',
      description: 'Test description',
      deviceInfo: {
        platform: 'ios',
        osVersion: '15.0',
        deviceModel: 'iPhone 12',
        appVersion: '1.0.0',
        buildNumber: '1'
      },
      appVersion: '1.0.0',
      priority: FeedbackPriority.MEDIUM,
      status: FeedbackStatus.SUBMITTED,
      createdAt: new Date(),
      updatedAt: new Date(),
      upvotes: 0,
      isPublic: false
    };

    it('should find feedback by reference number', async () => {
      mockStorage.getData.mockResolvedValue({
        'feedback-1': mockFeedback
      });

      const result = await feedbackService.getFeedbackByReference('FB-2024-123456');

      expect(result).toBeDefined();
      expect(result?.referenceNumber).toBe('FB-2024-123456');
    });

    it('should return null for non-existent reference', async () => {
      mockStorage.getData.mockResolvedValue({});

      const result = await feedbackService.getFeedbackByReference('FB-2024-999999');

      expect(result).toBeNull();
    });
  });

  describe('updateFeedbackStatus', () => {
    const mockFeedback: UserFeedback = {
      id: 'feedback-1',
      referenceNumber: 'FB-2024-123456',
      userId: mockUserId,
      category: FeedbackCategory.BUG_REPORT,
      title: 'Test feedback',
      description: 'Test description',
      deviceInfo: {
        platform: 'ios',
        osVersion: '15.0',
        deviceModel: 'iPhone 12',
        appVersion: '1.0.0',
        buildNumber: '1'
      },
      appVersion: '1.0.0',
      priority: FeedbackPriority.MEDIUM,
      status: FeedbackStatus.SUBMITTED,
      createdAt: new Date(),
      updatedAt: new Date(),
      upvotes: 0,
      isPublic: false
    };

    beforeEach(() => {
      mockStorage.getData.mockResolvedValue({
        'feedback-1': mockFeedback
      });
    });

    it('should update feedback status', async () => {
      const adminResponse = 'Thank you for reporting this issue. We are working on a fix.';
      const adminUserId = 'admin-123';

      const result = await feedbackService.updateFeedbackStatus(
        'feedback-1',
        FeedbackStatus.IN_PROGRESS,
        adminResponse,
        adminUserId
      );

      expect(result.status).toBe(FeedbackStatus.IN_PROGRESS);
      expect(result.adminResponse).toBe(adminResponse);
      expect(result.adminUserId).toBe(adminUserId);
      expect(result.updatedAt).toBeInstanceOf(Date);

      expect(mockStorage.storeData).toHaveBeenCalledWith('USER_FEEDBACK', expect.any(Object));
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('feedback_status_updated', {
        feedbackId: 'feedback-1',
        newStatus: FeedbackStatus.IN_PROGRESS,
        adminUserId,
        hasResponse: true
      });
    });

    it('should set resolvedAt when status is resolved', async () => {
      const result = await feedbackService.updateFeedbackStatus(
        'feedback-1',
        FeedbackStatus.RESOLVED
      );

      expect(result.status).toBe(FeedbackStatus.RESOLVED);
      expect(result.resolvedAt).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent feedback', async () => {
      mockStorage.getData.mockResolvedValue({});

      await expect(feedbackService.updateFeedbackStatus('non-existent', FeedbackStatus.RESOLVED))
        .rejects.toThrow('Feedback not found');
    });
  });

  describe('deleteFeedback', () => {
    const mockFeedback: UserFeedback = {
      id: 'feedback-1',
      referenceNumber: 'FB-2024-123456',
      userId: mockUserId,
      category: FeedbackCategory.BUG_REPORT,
      title: 'Test feedback',
      description: 'Test description',
      deviceInfo: {
        platform: 'ios',
        osVersion: '15.0',
        deviceModel: 'iPhone 12',
        appVersion: '1.0.0',
        buildNumber: '1'
      },
      appVersion: '1.0.0',
      priority: FeedbackPriority.MEDIUM,
      status: FeedbackStatus.SUBMITTED,
      createdAt: new Date(),
      updatedAt: new Date(),
      upvotes: 0,
      isPublic: false
    };

    beforeEach(() => {
      mockStorage.getData.mockResolvedValue({
        'feedback-1': mockFeedback
      });
    });

    it('should soft delete feedback by setting status to closed', async () => {
      const result = await feedbackService.deleteFeedback('feedback-1', mockUserId);

      expect(result).toBe(true);
      expect(mockStorage.storeData).toHaveBeenCalled();
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('feedback_deleted', {
        feedbackId: 'feedback-1',
        userId: mockUserId,
        category: mockFeedback.category
      });
    });

    it('should not allow deletion of feedback being processed', async () => {
      const processingFeedback = { ...mockFeedback, status: FeedbackStatus.IN_PROGRESS };
      mockStorage.getData.mockResolvedValue({
        'feedback-1': processingFeedback
      });

      await expect(feedbackService.deleteFeedback('feedback-1', mockUserId))
        .rejects.toThrow('Cannot delete feedback that is being processed');
    });

    it('should not allow deletion by wrong user', async () => {
      await expect(feedbackService.deleteFeedback('feedback-1', 'wrong-user'))
        .rejects.toThrow('Feedback not found or access denied');
    });
  });

  describe('getFeedbackStats', () => {
    const mockFeedbackData = {
      'feedback-1': {
        id: 'feedback-1',
        userId: 'user-1',
        category: FeedbackCategory.BUG_REPORT,
        status: FeedbackStatus.SUBMITTED,
        priority: FeedbackPriority.HIGH,
        createdAt: new Date(),
        resolvedAt: null
      },
      'feedback-2': {
        id: 'feedback-2',
        userId: 'user-2',
        category: FeedbackCategory.FEATURE_REQUEST,
        status: FeedbackStatus.RESOLVED,
        priority: FeedbackPriority.MEDIUM,
        createdAt: new Date(),
        resolvedAt: new Date()
      }
    };

    beforeEach(() => {
      mockStorage.getData.mockResolvedValue(mockFeedbackData);
    });

    it('should calculate overall statistics', async () => {
      const stats = await feedbackService.getFeedbackStats();

      expect(stats.totalSubmissions).toBe(2);
      expect(stats.byCategory[FeedbackCategory.BUG_REPORT]).toBe(1);
      expect(stats.byCategory[FeedbackCategory.FEATURE_REQUEST]).toBe(1);
      expect(stats.byStatus[FeedbackStatus.SUBMITTED]).toBe(1);
      expect(stats.byStatus[FeedbackStatus.RESOLVED]).toBe(1);
      expect(stats.byPriority[FeedbackPriority.HIGH]).toBe(1);
      expect(stats.byPriority[FeedbackPriority.MEDIUM]).toBe(1);
      expect(stats.resolutionRate).toBe(50); // 1 out of 2 resolved
    });

    it('should calculate user-specific statistics', async () => {
      const stats = await feedbackService.getFeedbackStats('user-1');

      expect(stats.totalSubmissions).toBe(1);
      expect(stats.byCategory[FeedbackCategory.BUG_REPORT]).toBe(1);
      expect(stats.byCategory[FeedbackCategory.FEATURE_REQUEST]).toBe(0);
    });

    it('should cache statistics', async () => {
      await feedbackService.getFeedbackStats();

      expect(mockCacheService.setAdvanced).toHaveBeenCalledWith(
        expect.stringContaining('feedback_stats_'),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('processOfflineQueue', () => {
    const mockOfflineFeedback: UserFeedback = {
      id: 'offline-feedback-1',
      referenceNumber: 'FB-2024-123456',
      userId: mockUserId,
      category: FeedbackCategory.BUG_REPORT,
      title: 'Offline feedback',
      description: 'This was submitted offline',
      deviceInfo: {
        platform: 'ios',
        osVersion: '15.0',
        deviceModel: 'iPhone 12',
        appVersion: '1.0.0',
        buildNumber: '1'
      },
      appVersion: '1.0.0',
      priority: FeedbackPriority.MEDIUM,
      status: FeedbackStatus.SUBMITTED,
      createdAt: new Date(),
      updatedAt: new Date(),
      upvotes: 0,
      isPublic: false
    };

    it('should process offline feedback queue', async () => {
      mockStorage.getData
        .mockResolvedValueOnce([mockOfflineFeedback]) // Offline queue
        .mockResolvedValueOnce({}); // USER_FEEDBACK storage

      await feedbackService.processOfflineQueue();

      expect(mockStorage.storeData).toHaveBeenCalledWith('USER_FEEDBACK', expect.any(Object));
      expect(mockStorage.storeData).toHaveBeenCalledWith('OFFLINE_FEEDBACK_QUEUE', []);
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('offline_feedback_submitted', {
        feedbackId: mockOfflineFeedback.id,
        category: mockOfflineFeedback.category,
        queueTime: expect.any(Number)
      });
    });

    it('should handle empty offline queue', async () => {
      mockStorage.getData.mockResolvedValueOnce([]);

      await feedbackService.processOfflineQueue();

      expect(mockStorage.storeData).not.toHaveBeenCalled();
    });

    it('should handle failed offline submissions gracefully', async () => {
      mockStorage.getData
        .mockResolvedValueOnce([mockOfflineFeedback])
        .mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw
      await expect(feedbackService.processOfflineQueue()).resolves.not.toThrow();
    });
  });

  describe('getFeedbackTemplates', () => {
    it('should return all templates when no category specified', async () => {
      const templates = await feedbackService.getFeedbackTemplates();

      expect(templates).toHaveLength(3);
      expect(templates.map(t => t.category)).toContain(FeedbackCategory.BUG_REPORT);
      expect(templates.map(t => t.category)).toContain(FeedbackCategory.FEATURE_REQUEST);
      expect(templates.map(t => t.category)).toContain(FeedbackCategory.CONTENT_QUALITY);
    });

    it('should filter templates by category', async () => {
      const templates = await feedbackService.getFeedbackTemplates(FeedbackCategory.BUG_REPORT);

      expect(templates).toHaveLength(1);
      expect(templates[0].category).toBe(FeedbackCategory.BUG_REPORT);
      expect(templates[0].title).toBe('Report a Bug');
    });

    it('should return templates with required fields and questions', async () => {
      const templates = await feedbackService.getFeedbackTemplates(FeedbackCategory.BUG_REPORT);

      expect(templates[0].suggestedQuestions).toBeInstanceOf(Array);
      expect(templates[0].suggestedQuestions.length).toBeGreaterThan(0);
      expect(templates[0].requiredFields).toContain('title');
      expect(templates[0].requiredFields).toContain('description');
    });
  });
});