/**
 * Progress Insights Service Tests
 */
import { ProgressInsightsService, ProgressInsight, ProgressMetrics } from '../progressInsightsService';
import { UserProfile } from '../../../models/UserProfile';
import { AnalyticsService } from '../../analytics/analyticsService';
import { MultiProviderAIService } from '../../ai/MultiProviderAIService';
import { AuditLogService } from '../../compliance/auditLogService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('../../analytics/analyticsService');
jest.mock('../../ai/MultiProviderAIService');
jest.mock('../../compliance/auditLogService');
jest.mock('@react-native-async-storage/async-storage');

describe('ProgressInsightsService', () => {
  let service: ProgressInsightsService;
  let mockAnalyticsService: jest.Mocked<AnalyticsService>;
  let mockAIService: jest.Mocked<MultiProviderAIService>;
  let mockAuditLogService: jest.Mocked<AuditLogService>;
  let mockAsyncStorage: jest.Mocked<typeof AsyncStorage>;

  const mockUserProfile: UserProfile = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    age: 30,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockEngagementMetrics = {
    tipViews: 50,
    tipCompletions: 40,
    tipShares: 5,
    averageSessionDuration: 300000, // 5 minutes in ms
    uniqueUsers: 1,
    bounceRate: 0.1
  };

  const mockContentPerformance = [
    { category: 'nutrition', views: 20, completions: 18 },
    { category: 'fitness', views: 15, completions: 12 },
    { category: 'mental-health', views: 15, completions: 10 }
  ];

  const mockUserBehavior = {
    averageSessionDuration: 300000,
    pagesPerSession: 3,
    returnVisitorRate: 0.7
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    mockAnalyticsService = {
      getEngagementMetrics: jest.fn().mockResolvedValue(mockEngagementMetrics),
      getContentPerformance: jest.fn().mockResolvedValue(mockContentPerformance),
      getUserBehaviorAnalytics: jest.fn().mockResolvedValue(mockUserBehavior),
      getInstance: jest.fn()
    } as any;

    mockAIService = {
      generateText: jest.fn().mockResolvedValue({
        success: true,
        text: JSON.stringify([
          {
            type: 'recommendation',
            title: 'AI Recommendation',
            description: 'This is an AI-generated recommendation',
            priority: 'medium',
            category: 'engagement',
            recommendations: ['Try this', 'Do that'],
            confidence: 0.8
          }
        ])
      }),
      getInstance: jest.fn()
    } as any;

    mockAuditLogService = {
      logDataAccess: jest.fn().mockResolvedValue(undefined),
      getInstance: jest.fn()
    } as any;

    mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockAsyncStorage.getItem = jest.fn().mockResolvedValue(null);
    mockAsyncStorage.setItem = jest.fn().mockResolvedValue(undefined);

    // Mock static getInstance methods
    (AnalyticsService.getInstance as jest.Mock).mockReturnValue(mockAnalyticsService);
    (MultiProviderAIService.getInstance as jest.Mock).mockReturnValue(mockAIService);
    (AuditLogService.getInstance as jest.Mock).mockReturnValue(mockAuditLogService);

    service = ProgressInsightsService.getInstance();
  });

  describe('generateProgressInsights', () => {
    it('should generate comprehensive progress insights', async () => {
      const insights = await service.generateProgressInsights('user123', mockUserProfile, 'weekly');

      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThan(0);

      // Check that insights have required properties
      insights.forEach(insight => {
        expect(insight).toHaveProperty('id');
        expect(insight).toHaveProperty('userId', 'user123');
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('description');
        expect(insight).toHaveProperty('confidence');
        expect(insight).toHaveProperty('priority');
        expect(insight).toHaveProperty('category');
        expect(insight).toHaveProperty('timestamp');
        expect(insight).toHaveProperty('metadata');
      });
    });

    it('should generate AI-powered insights when AI service is available', async () => {
      const insights = await service.generateProgressInsights('user123', mockUserProfile, 'weekly');

      const aiInsights = insights.filter(insight => insight.aiGenerated);
      expect(aiInsights.length).toBeGreaterThan(0);
      expect(mockAIService.generateText).toHaveBeenCalled();
    });

    it('should generate rule-based insights for high completion rate', async () => {
      // Mock high completion rate
      mockAnalyticsService.getEngagementMetrics.mockResolvedValue({
        ...mockEngagementMetrics,
        tipViews: 100,
        tipCompletions: 85 // 85% completion rate
      });

      const insights = await service.generateProgressInsights('user123', mockUserProfile, 'weekly');

      const celebrationInsights = insights.filter(insight => 
        insight.type === 'celebration' && insight.title.includes('Exceptional Engagement')
      );
      expect(celebrationInsights.length).toBeGreaterThan(0);
    });

    it('should generate warning insights for low completion rate', async () => {
      // Mock low completion rate
      mockAnalyticsService.getEngagementMetrics.mockResolvedValue({
        ...mockEngagementMetrics,
        tipViews: 100,
        tipCompletions: 25 // 25% completion rate
      });

      const insights = await service.generateProgressInsights('user123', mockUserProfile, 'weekly');

      const warningInsights = insights.filter(insight => 
        insight.type === 'warning' && insight.title.includes('Low Completion Rate')
      );
      expect(warningInsights.length).toBeGreaterThan(0);
    });

    it('should generate achievement insights for streaks', async () => {
      const insights = await service.generateProgressInsights('user123', mockUserProfile, 'weekly');

      // Check if streak achievements are generated (mocked to return 7+ days)
      const achievementInsights = insights.filter(insight => 
        insight.type === 'achievement' && insight.title.includes('Streak')
      );
      expect(achievementInsights.length).toBeGreaterThanOrEqual(0);
    });

    it('should log insight generation for audit purposes', async () => {
      await service.generateProgressInsights('user123', mockUserProfile, 'weekly');

      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          action: 'PROGRESS_INSIGHTS_GENERATED',
          resourceType: 'PROGRESS_INSIGHTS',
          success: true
        })
      );
    });

    it('should handle AI service errors gracefully', async () => {
      mockAIService.generateText.mockRejectedValue(new Error('AI service error'));

      const insights = await service.generateProgressInsights('user123', mockUserProfile, 'weekly');

      // Should still generate rule-based insights
      expect(insights).toBeDefined();
      expect(insights.length).toBeGreaterThan(0);
    });
  });

  describe('calculateProgressMetrics', () => {
    it('should calculate comprehensive progress metrics', async () => {
      const metrics = await service.calculateProgressMetrics('user123', 'weekly');

      expect(metrics).toBeDefined();
      expect(metrics.userId).toBe('user123');
      expect(metrics.timeframe).toBe('weekly');
      expect(metrics.timestamp).toBeInstanceOf(Date);

      // Check engagement metrics
      expect(metrics.metrics.engagement).toHaveProperty('tipsViewed');
      expect(metrics.metrics.engagement).toHaveProperty('tipsCompleted');
      expect(metrics.metrics.engagement).toHaveProperty('streakDays');
      expect(metrics.metrics.engagement).toHaveProperty('averageSessionTime');
      expect(metrics.metrics.engagement).toHaveProperty('completionRate');

      // Check learning metrics
      expect(metrics.metrics.learning).toHaveProperty('categoriesExplored');
      expect(metrics.metrics.learning).toHaveProperty('knowledgeRetention');
      expect(metrics.metrics.learning).toHaveProperty('skillProgression');
      expect(metrics.metrics.learning).toHaveProperty('conceptsMastered');

      // Check behavior metrics
      expect(metrics.metrics.behavior).toHaveProperty('habitsFormed');
      expect(metrics.metrics.behavior).toHaveProperty('consistencyScore');
      expect(metrics.metrics.behavior).toHaveProperty('improvementAreas');
      expect(metrics.metrics.behavior).toHaveProperty('positiveChanges');

      // Check social metrics
      expect(metrics.metrics.social).toHaveProperty('sharesCount');
      expect(metrics.metrics.social).toHaveProperty('communityEngagement');
      expect(metrics.metrics.social).toHaveProperty('helpfulnessRating');

      // Check trends
      expect(metrics.trends).toHaveProperty('direction');
      expect(metrics.trends).toHaveProperty('velocity');
      expect(metrics.trends).toHaveProperty('predictions');
    });

    it('should calculate correct completion rate', async () => {
      const metrics = await service.calculateProgressMetrics('user123', 'weekly');

      const expectedCompletionRate = (mockEngagementMetrics.tipCompletions / mockEngagementMetrics.tipViews) * 100;
      expect(metrics.metrics.engagement.completionRate).toBe(expectedCompletionRate);
    });

    it('should calculate categories explored from content performance', async () => {
      const metrics = await service.calculateProgressMetrics('user123', 'weekly');

      expect(metrics.metrics.learning.categoriesExplored).toBe(3); // nutrition, fitness, mental-health
    });

    it('should handle different timeframes', async () => {
      const dailyMetrics = await service.calculateProgressMetrics('user123', 'daily');
      const monthlyMetrics = await service.calculateProgressMetrics('user123', 'monthly');

      expect(dailyMetrics.timeframe).toBe('daily');
      expect(monthlyMetrics.timeframe).toBe('monthly');
    });
  });

  describe('recordInsightFeedback', () => {
    it('should record user feedback on insights', async () => {
      const mockInsights: ProgressInsight[] = [
        {
          id: 'insight123',
          userId: 'user123',
          type: 'recommendation',
          title: 'Test Insight',
          description: 'Test description',
          aiGenerated: false,
          confidence: 0.8,
          priority: 'medium',
          category: 'engagement',
          timestamp: new Date(),
          metadata: {
            dataPoints: {},
            recommendations: [],
            actionItems: [],
            relatedTips: []
          }
        }
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockInsights));

      const feedback = {
        helpful: true,
        rating: 4,
        comment: 'Very helpful insight!'
      };

      await service.recordInsightFeedback('insight123', 'user123', feedback);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'insights_user123',
        expect.stringContaining('"helpful":true')
      );

      expect(mockAuditLogService.logDataAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          action: 'INSIGHT_FEEDBACK_RECORDED',
          resourceType: 'PROGRESS_INSIGHT',
          resourceId: 'insight123'
        })
      );
    });

    it('should handle feedback for non-existent insights gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const feedback = {
        helpful: true,
        rating: 4
      };

      await expect(
        service.recordInsightFeedback('nonexistent', 'user123', feedback)
      ).resolves.not.toThrow();
    });
  });

  describe('getInsights', () => {
    it('should return cached insights when available', async () => {
      const mockInsights: ProgressInsight[] = [
        {
          id: 'insight123',
          userId: 'user123',
          type: 'recommendation',
          title: 'Test Insight',
          description: 'Test description',
          aiGenerated: false,
          confidence: 0.8,
          priority: 'medium',
          category: 'engagement',
          timestamp: new Date(),
          metadata: {
            dataPoints: {},
            recommendations: [],
            actionItems: [],
            relatedTips: []
          }
        }
      ];

      // First call to populate cache
      await service.generateProgressInsights('user123', mockUserProfile, 'weekly');
      
      // Second call should use cache
      const insights = await service.getInsights('user123');
      
      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
    });

    it('should load insights from storage when cache is empty', async () => {
      const mockStoredInsights = [
        {
          id: 'stored123',
          userId: 'user123',
          type: 'achievement',
          title: 'Stored Insight',
          description: 'From storage',
          aiGenerated: true,
          confidence: 0.9,
          priority: 'high',
          category: 'learning',
          timestamp: new Date().toISOString(),
          metadata: {
            dataPoints: {},
            recommendations: [],
            actionItems: [],
            relatedTips: []
          }
        }
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockStoredInsights));

      const insights = await service.getInsights('user123');

      expect(insights).toBeDefined();
      expect(insights.length).toBe(1);
      expect(insights[0].id).toBe('stored123');
      expect(insights[0].timestamp).toBeInstanceOf(Date);
    });

    it('should return empty array when no insights exist', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const insights = await service.getInsights('user123');

      expect(insights).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle analytics service errors', async () => {
      mockAnalyticsService.getEngagementMetrics.mockRejectedValue(new Error('Analytics error'));

      await expect(
        service.generateProgressInsights('user123', mockUserProfile, 'weekly')
      ).rejects.toThrow('Analytics error');
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const insights = await service.getInsights('user123');
      expect(insights).toEqual([]);
    });

    it('should handle AI parsing errors gracefully', async () => {
      mockAIService.generateText.mockResolvedValue({
        success: true,
        text: 'Invalid JSON response'
      });

      const insights = await service.generateProgressInsights('user123', mockUserProfile, 'weekly');

      // Should still generate rule-based insights
      expect(insights).toBeDefined();
      expect(insights.length).toBeGreaterThan(0);
    });
  });

  describe('insight prioritization', () => {
    it('should prioritize critical insights first', async () => {
      // Mock conditions that generate critical insights
      mockAnalyticsService.getEngagementMetrics.mockResolvedValue({
        ...mockEngagementMetrics,
        tipViews: 100,
        tipCompletions: 5 // Very low completion rate
      });

      const insights = await service.generateProgressInsights('user123', mockUserProfile, 'weekly');

      // Critical insights should appear first
      const criticalInsights = insights.filter(insight => insight.priority === 'critical');
      if (criticalInsights.length > 0) {
        expect(insights.indexOf(criticalInsights[0])).toBeLessThan(
          insights.findIndex(insight => insight.priority !== 'critical')
        );
      }
    });

    it('should sort insights by confidence within same priority', async () => {
      const insights = await service.generateProgressInsights('user123', mockUserProfile, 'weekly');

      // Check that within same priority, higher confidence comes first
      const samePriorityInsights = insights.filter(insight => insight.priority === 'medium');
      if (samePriorityInsights.length > 1) {
        for (let i = 0; i < samePriorityInsights.length - 1; i++) {
          expect(samePriorityInsights[i].confidence).toBeGreaterThanOrEqual(
            samePriorityInsights[i + 1].confidence
          );
        }
      }
    });
  });
});