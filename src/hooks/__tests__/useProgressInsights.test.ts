/**
 * Progress Insights Hook Tests
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { 
  useProgressInsights, 
  useInsightsByType, 
  useHighPriorityInsights,
  useActionableInsights,
  useInsightAnalytics
} from '../useProgressInsights';
import { ProgressInsightsService, ProgressInsight, ProgressMetrics } from '../../services/insights/progressInsightsService';
import { UserProfile } from '../../models/UserProfile';

// Mock the service
jest.mock('../../services/insights/progressInsightsService');

describe('useProgressInsights', () => {
  let mockService: jest.Mocked<ProgressInsightsService>;
  
  const mockUserProfile: UserProfile = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    age: 30,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockInsights: ProgressInsight[] = [
    {
      id: 'insight1',
      userId: 'user123',
      type: 'achievement',
      title: 'Great Progress!',
      description: 'You are doing well',
      aiGenerated: true,
      confidence: 0.9,
      priority: 'high',
      category: 'engagement',
      timestamp: new Date(),
      metadata: {
        dataPoints: {},
        recommendations: ['Keep it up'],
        actionItems: [
          {
            id: 'action1',
            title: 'Complete daily goal',
            description: 'Finish your daily health goal',
            type: 'immediate',
            difficulty: 'easy',
            estimatedTime: 10,
            completed: false
          }
        ],
        relatedTips: []
      }
    },
    {
      id: 'insight2',
      userId: 'user123',
      type: 'warning',
      title: 'Low Activity',
      description: 'Your activity has decreased',
      aiGenerated: false,
      confidence: 0.8,
      priority: 'critical',
      category: 'behavior',
      timestamp: new Date(),
      metadata: {
        dataPoints: {},
        recommendations: ['Increase activity'],
        actionItems: [],
        relatedTips: []
      }
    },
    {
      id: 'insight3',
      userId: 'user123',
      type: 'recommendation',
      title: 'Try New Category',
      description: 'Explore fitness tips',
      aiGenerated: true,
      confidence: 0.7,
      priority: 'medium',
      category: 'learning',
      timestamp: new Date(),
      metadata: {
        dataPoints: {},
        recommendations: ['Start with basics'],
        actionItems: [
          {
            id: 'action2',
            title: 'Browse fitness tips',
            description: 'Look at fitness category',
            type: 'short_term',
            difficulty: 'medium',
            estimatedTime: 15,
            completed: true,
            completedAt: new Date()
          }
        ],
        relatedTips: []
      }
    }
  ];

  const mockMetrics: ProgressMetrics = {
    userId: 'user123',
    timeframe: 'weekly',
    metrics: {
      engagement: {
        tipsViewed: 50,
        tipsCompleted: 40,
        streakDays: 7,
        averageSessionTime: 5,
        completionRate: 80
      },
      learning: {
        categoriesExplored: 3,
        knowledgeRetention: 85,
        skillProgression: 75,
        conceptsMastered: ['Nutrition', 'Exercise']
      },
      behavior: {
        habitsFormed: 2,
        consistencyScore: 90,
        improvementAreas: ['Time management'],
        positiveChanges: ['Better sleep']
      },
      social: {
        sharesCount: 5,
        communityEngagement: 70,
        helpfulnessRating: 4.5
      }
    },
    trends: {
      direction: 'improving',
      velocity: 0.3,
      predictions: {
        nextWeekEngagement: 85,
        monthlyGoalCompletion: 90
      }
    },
    timestamp: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockService = {
      generateProgressInsights: jest.fn().mockResolvedValue(mockInsights),
      calculateProgressMetrics: jest.fn().mockResolvedValue(mockMetrics),
      getInsights: jest.fn().mockResolvedValue(mockInsights),
      recordInsightFeedback: jest.fn().mockResolvedValue(undefined),
      saveInsightsToStorage: jest.fn().mockResolvedValue(undefined),
      loadInsightsFromStorage: jest.fn().mockResolvedValue(mockInsights),
      getInstance: jest.fn()
    } as any;

    (ProgressInsightsService.getInstance as jest.Mock).mockReturnValue(mockService);
  });

  describe('useProgressInsights', () => {
    it('should load insights on mount', async () => {
      const { result } = renderHook(() =>
        useProgressInsights({
          userId: 'user123',
          userProfile: mockUserProfile
        })
      );

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.insights).toEqual(mockInsights);
      expect(result.current.metrics).toEqual(mockMetrics);
      expect(result.current.error).toBeNull();
      expect(mockService.generateProgressInsights).toHaveBeenCalledWith(
        'user123',
        mockUserProfile,
        'weekly'
      );
    });

    it('should handle different timeframes', async () => {
      const { result } = renderHook(() =>
        useProgressInsights({
          userId: 'user123',
          userProfile: mockUserProfile,
          timeframe: 'monthly'
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockService.generateProgressInsights).toHaveBeenCalledWith(
        'user123',
        mockUserProfile,
        'monthly'
      );
    });

    it('should refresh insights when requested', async () => {
      const { result } = renderHook(() =>
        useProgressInsights({
          userId: 'user123',
          userProfile: mockUserProfile
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshInsights();
      });

      expect(mockService.generateProgressInsights).toHaveBeenCalledTimes(2);
    });

    it('should record feedback on insights', async () => {
      const { result } = renderHook(() =>
        useProgressInsights({
          userId: 'user123',
          userProfile: mockUserProfile
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const feedback = {
        helpful: true,
        rating: 5,
        comment: 'Very helpful!'
      };

      await act(async () => {
        await result.current.recordFeedback('insight1', feedback);
      });

      expect(mockService.recordInsightFeedback).toHaveBeenCalledWith(
        'insight1',
        'user123',
        feedback
      );

      // Check that local state was updated
      const updatedInsight = result.current.insights.find(i => i.id === 'insight1');
      expect(updatedInsight?.userFeedback).toMatchObject(feedback);
    });

    it('should complete action items', async () => {
      const { result } = renderHook(() =>
        useProgressInsights({
          userId: 'user123',
          userProfile: mockUserProfile
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.completeAction('insight1', 'action1');
      });

      // Check that action was marked as completed
      const updatedInsight = result.current.insights.find(i => i.id === 'insight1');
      const updatedAction = updatedInsight?.metadata.actionItems.find(a => a.id === 'action1');
      expect(updatedAction?.completed).toBe(true);
      expect(updatedAction?.completedAt).toBeInstanceOf(Date);
    });

    it('should dismiss insights', async () => {
      const { result } = renderHook(() =>
        useProgressInsights({
          userId: 'user123',
          userProfile: mockUserProfile
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCount = result.current.insights.length;

      await act(async () => {
        await result.current.dismissInsight('insight1');
      });

      expect(result.current.insights.length).toBe(initialCount - 1);
      expect(result.current.insights.find(i => i.id === 'insight1')).toBeUndefined();
    });

    it('should filter insights by type', async () => {
      const { result } = renderHook(() =>
        useProgressInsights({
          userId: 'user123',
          userProfile: mockUserProfile
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const achievementInsights = result.current.getInsightsByType('achievement');
      expect(achievementInsights).toHaveLength(1);
      expect(achievementInsights[0].id).toBe('insight1');

      const warningInsights = result.current.getInsightsByType('warning');
      expect(warningInsights).toHaveLength(1);
      expect(warningInsights[0].id).toBe('insight2');
    });

    it('should filter insights by category', async () => {
      const { result } = renderHook(() =>
        useProgressInsights({
          userId: 'user123',
          userProfile: mockUserProfile
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const engagementInsights = result.current.getInsightsByCategory('engagement');
      expect(engagementInsights).toHaveLength(1);
      expect(engagementInsights[0].id).toBe('insight1');
    });

    it('should filter insights by priority', async () => {
      const { result } = renderHook(() =>
        useProgressInsights({
          userId: 'user123',
          userProfile: mockUserProfile
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const highPriorityInsights = result.current.getInsightsByPriority('high');
      expect(highPriorityInsights).toHaveLength(1);
      expect(highPriorityInsights[0].id).toBe('insight1');

      const criticalInsights = result.current.getInsightsByPriority('critical');
      expect(criticalInsights).toHaveLength(1);
      expect(criticalInsights[0].id).toBe('insight2');
    });

    it('should calculate statistics correctly', async () => {
      const { result } = renderHook(() =>
        useProgressInsights({
          userId: 'user123',
          userProfile: mockUserProfile
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.totalInsights).toBe(3);
      expect(result.current.aiGeneratedCount).toBe(2); // insight1 and insight3
      expect(result.current.completedActionsCount).toBe(1); // action2 is completed
      expect(result.current.averageConfidence).toBe((0.9 + 0.8 + 0.7) / 3);
    });

    it('should handle errors gracefully', async () => {
      mockService.generateProgressInsights.mockRejectedValue(new Error('Service error'));

      const { result } = renderHook(() =>
        useProgressInsights({
          userId: 'user123',
          userProfile: mockUserProfile
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Service error');
      expect(result.current.insights).toEqual([]);
    });

    it('should not generate insights without user profile', async () => {
      const { result } = renderHook(() =>
        useProgressInsights({
          userId: 'user123'
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockService.generateProgressInsights).not.toHaveBeenCalled();
      expect(mockService.getInsights).toHaveBeenCalledWith('user123');
    });
  });

  describe('useInsightsByType', () => {
    it('should return insights filtered by type', async () => {
      const { result } = renderHook(() =>
        useInsightsByType('user123', 'achievement', mockUserProfile)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.insights).toHaveLength(1);
      expect(result.current.insights[0].type).toBe('achievement');
      expect(result.current.count).toBe(1);
    });
  });

  describe('useHighPriorityInsights', () => {
    it('should return high and critical priority insights', async () => {
      const { result } = renderHook(() =>
        useHighPriorityInsights('user123', mockUserProfile)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.insights).toHaveLength(2); // high and critical
      expect(result.current.count).toBe(2);
      expect(result.current.hasCritical).toBe(true);
    });
  });

  describe('useActionableInsights', () => {
    it('should return insights with action items', async () => {
      const { result } = renderHook(() =>
        useActionableInsights('user123', mockUserProfile)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.insights).toHaveLength(2); // insight1 and insight3 have actions
      expect(result.current.totalActions).toBe(2);
      expect(result.current.completedActions).toBe(1);
      expect(result.current.pendingActions).toHaveLength(1);
    });

    it('should complete actions', async () => {
      const { result } = renderHook(() =>
        useActionableInsights('user123', mockUserProfile)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.completeAction('insight1', 'action1');
      });

      expect(result.current.completedActions).toBe(2);
      expect(result.current.pendingActions).toHaveLength(0);
    });
  });

  describe('useInsightAnalytics', () => {
    it('should return comprehensive analytics', async () => {
      // Add feedback to one insight
      const insightsWithFeedback = [...mockInsights];
      insightsWithFeedback[0].userFeedback = {
        helpful: true,
        rating: 5,
        timestamp: new Date()
      };
      insightsWithFeedback[1].userFeedback = {
        helpful: false,
        rating: 2,
        timestamp: new Date()
      };

      mockService.generateProgressInsights.mockResolvedValue(insightsWithFeedback);

      const { result } = renderHook(() =>
        useInsightAnalytics('user123', mockUserProfile)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.analytics.total).toBe(3);
      expect(result.current.analytics.aiGenerated).toBe(2);
      expect(result.current.analytics.ruleBasedGenerated).toBe(1);
      expect(result.current.analytics.completedActions).toBe(1);

      // Check type breakdown
      expect(result.current.analytics.byType.achievement).toBe(1);
      expect(result.current.analytics.byType.warning).toBe(1);
      expect(result.current.analytics.byType.recommendation).toBe(1);

      // Check priority breakdown
      expect(result.current.analytics.byPriority.high).toBe(1);
      expect(result.current.analytics.byPriority.critical).toBe(1);
      expect(result.current.analytics.byPriority.medium).toBe(1);

      // Check category breakdown
      expect(result.current.analytics.byCategory.engagement).toBe(1);
      expect(result.current.analytics.byCategory.behavior).toBe(1);
      expect(result.current.analytics.byCategory.learning).toBe(1);

      // Check feedback analytics
      expect(result.current.analytics.feedback.helpful).toBe(1);
      expect(result.current.analytics.feedback.notHelpful).toBe(1);
      expect(result.current.analytics.feedback.averageRating).toBe(3.5);
    });
  });

  describe('auto-refresh functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should auto-refresh insights at specified interval', async () => {
      const { result } = renderHook(() =>
        useProgressInsights({
          userId: 'user123',
          userProfile: mockUserProfile,
          autoRefresh: true,
          refreshInterval: 5000 // 5 seconds
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockService.generateProgressInsights).toHaveBeenCalledTimes(1);

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockService.generateProgressInsights).toHaveBeenCalledTimes(2);
      });
    });

    it('should not auto-refresh when disabled', async () => {
      const { result } = renderHook(() =>
        useProgressInsights({
          userId: 'user123',
          userProfile: mockUserProfile,
          autoRefresh: false
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockService.generateProgressInsights).toHaveBeenCalledTimes(1);

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(60000); // 1 minute
      });

      // Should still be called only once
      expect(mockService.generateProgressInsights).toHaveBeenCalledTimes(1);
    });
  });
});