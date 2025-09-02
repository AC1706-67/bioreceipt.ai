/**
 * Progress Insights Hook
 * React hook for AI-powered progress insights and recommendations
 */
import { useEffect, useState, useCallback } from 'react';
import { 
  ProgressInsightsService, 
  ProgressInsight, 
  ProgressMetrics,
  ActionItem 
} from '../services/insights/progressInsightsService';
import { UserProfile } from '../models/UserProfile';

interface UseProgressInsightsOptions {
  userId: string;
  userProfile?: UserProfile;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  timeframe?: 'daily' | 'weekly' | 'monthly';
}

interface UseProgressInsightsReturn {
  // Data
  insights: ProgressInsight[];
  metrics: ProgressMetrics | null;
  // Loading states
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  // Actions
  refreshInsights: () => Promise<void>;
  recordFeedback: (insightId: string, feedback: {
    helpful: boolean;
    rating: number;
    comment?: string;
  }) => Promise<void>;
  completeAction: (insightId: string, actionId: string) => Promise<void>;
  dismissInsight: (insightId: string) => Promise<void>;
  // Filtered insights
  getInsightsByType: (type: ProgressInsight['type']) => ProgressInsight[];
  getInsightsByCategory: (category: ProgressInsight['category']) => ProgressInsight[];
  getInsightsByPriority: (priority: ProgressInsight['priority']) => ProgressInsight[];
  // Statistics
  totalInsights: number;
  aiGeneratedCount: number;
  completedActionsCount: number;
  averageConfidence: number;
}

export const useProgressInsights = (options: UseProgressInsightsOptions): UseProgressInsightsReturn => {
  const {
    userId,
    userProfile,
    autoRefresh = true,
    refreshInterval = 60 * 60 * 1000, // 1 hour
    timeframe = 'weekly'
  } = options;

  const progressInsightsService = ProgressInsightsService.getInstance();

  // State
  const [insights, setInsights] = useState<ProgressInsight[]>([]);
  const [metrics, setMetrics] = useState<ProgressMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load insights on mount and when dependencies change
  useEffect(() => {
    if (userId) {
      loadInsights();
    }
  }, [userId, timeframe]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !userId) return;

    const interval = setInterval(() => {
      refreshInsights();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, userId]);

  // Load insights from service
  const loadInsights = useCallback(async () => {
    try {
      setError(null);
      
      // Load existing insights first
      const existingInsights = await progressInsightsService.getInsights(userId);
      setInsights(existingInsights);

      // Generate new insights if user profile is available
      if (userProfile) {
        const newInsights = await progressInsightsService.generateProgressInsights(
          userId,
          userProfile,
          timeframe
        );
        setInsights(newInsights);
      }

      // Load metrics
      const progressMetrics = await progressInsightsService.calculateProgressMetrics(
        userId,
        timeframe
      );
      setMetrics(progressMetrics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load insights';
      setError(errorMessage);
      console.error('Failed to load progress insights:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, userProfile, timeframe]);

  // Refresh insights
  const refreshInsights = useCallback(async () => {
    if (!userProfile) return;

    try {
      setRefreshing(true);
      setError(null);

      const newInsights = await progressInsightsService.generateProgressInsights(
        userId,
        userProfile,
        timeframe
      );
      setInsights(newInsights);

      const progressMetrics = await progressInsightsService.calculateProgressMetrics(
        userId,
        timeframe
      );
      setMetrics(progressMetrics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh insights';
      setError(errorMessage);
      console.error('Failed to refresh progress insights:', err);
    } finally {
      setRefreshing(false);
    }
  }, [userId, userProfile, timeframe]);

  // Record feedback on insight
  const recordFeedback = useCallback(async (
    insightId: string,
    feedback: {
      helpful: boolean;
      rating: number;
      comment?: string;
    }
  ) => {
    try {
      await progressInsightsService.recordInsightFeedback(insightId, userId, feedback);
      
      // Update local state
      setInsights(prevInsights => 
        prevInsights.map(insight => 
          insight.id === insightId 
            ? { ...insight, userFeedback: { ...feedback, timestamp: new Date() } }
            : insight
        )
      );
    } catch (err) {
      console.error('Failed to record insight feedback:', err);
      throw err;
    }
  }, [userId]);

  // Complete action item
  const completeAction = useCallback(async (insightId: string, actionId: string) => {
    try {
      // Update local state
      setInsights(prevInsights => 
        prevInsights.map(insight => {
          if (insight.id === insightId) {
            const updatedActionItems = insight.metadata.actionItems.map(action =>
              action.id === actionId
                ? { ...action, completed: true, completedAt: new Date() }
                : action
            );
            return {
              ...insight,
              metadata: {
                ...insight.metadata,
                actionItems: updatedActionItems
              }
            };
          }
          return insight;
        })
      );

      // Save to storage
      const updatedInsights = insights.map(insight => {
        if (insight.id === insightId) {
          const updatedActionItems = insight.metadata.actionItems.map(action =>
            action.id === actionId
              ? { ...action, completed: true, completedAt: new Date() }
              : action
          );
          return {
            ...insight,
            metadata: {
              ...insight.metadata,
              actionItems: updatedActionItems
            }
          };
        }
        return insight;
      });

      await progressInsightsService.saveInsightsToStorage(userId, updatedInsights);
    } catch (err) {
      console.error('Failed to complete action:', err);
      throw err;
    }
  }, [userId, insights]);

  // Dismiss insight
  const dismissInsight = useCallback(async (insightId: string) => {
    try {
      // Remove from local state
      setInsights(prevInsights => 
        prevInsights.filter(insight => insight.id !== insightId)
      );

      // Save to storage
      const updatedInsights = insights.filter(insight => insight.id !== insightId);
      await progressInsightsService.saveInsightsToStorage(userId, updatedInsights);
    } catch (err) {
      console.error('Failed to dismiss insight:', err);
      throw err;
    }
  }, [userId, insights]);

  // Filter insights by type
  const getInsightsByType = useCallback((type: ProgressInsight['type']) => {
    return insights.filter(insight => insight.type === type);
  }, [insights]);

  // Filter insights by category
  const getInsightsByCategory = useCallback((category: ProgressInsight['category']) => {
    return insights.filter(insight => insight.category === category);
  }, [insights]);

  // Filter insights by priority
  const getInsightsByPriority = useCallback((priority: ProgressInsight['priority']) => {
    return insights.filter(insight => insight.priority === priority);
  }, [insights]);

  // Calculate statistics
  const totalInsights = insights.length;
  const aiGeneratedCount = insights.filter(insight => insight.aiGenerated).length;
  const completedActionsCount = insights.reduce((count, insight) => {
    return count + insight.metadata.actionItems.filter(action => action.completed).length;
  }, 0);
  const averageConfidence = insights.length > 0 
    ? insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length
    : 0;

  return {
    // Data
    insights,
    metrics,
    // Loading states
    loading,
    refreshing,
    error,
    // Actions
    refreshInsights,
    recordFeedback,
    completeAction,
    dismissInsight,
    // Filtered insights
    getInsightsByType,
    getInsightsByCategory,
    getInsightsByPriority,
    // Statistics
    totalInsights,
    aiGeneratedCount,
    completedActionsCount,
    averageConfidence
  };
};

// Hook for specific insight types
export const useInsightsByType = (
  userId: string,
  type: ProgressInsight['type'],
  userProfile?: UserProfile
) => {
  const { insights, loading, error, refreshInsights } = useProgressInsights({
    userId,
    userProfile
  });

  const filteredInsights = insights.filter(insight => insight.type === type);

  return {
    insights: filteredInsights,
    loading,
    error,
    refreshInsights,
    count: filteredInsights.length
  };
};

// Hook for high-priority insights
export const useHighPriorityInsights = (
  userId: string,
  userProfile?: UserProfile
) => {
  const { insights, loading, error, refreshInsights } = useProgressInsights({
    userId,
    userProfile
  });

  const highPriorityInsights = insights.filter(
    insight => insight.priority === 'high' || insight.priority === 'critical'
  );

  return {
    insights: highPriorityInsights,
    loading,
    error,
    refreshInsights,
    count: highPriorityInsights.length,
    hasCritical: highPriorityInsights.some(insight => insight.priority === 'critical')
  };
};

// Hook for actionable insights
export const useActionableInsights = (
  userId: string,
  userProfile?: UserProfile
) => {
  const { insights, loading, error, refreshInsights, completeAction } = useProgressInsights({
    userId,
    userProfile
  });

  const actionableInsights = insights.filter(
    insight => insight.metadata.actionItems.length > 0
  );

  const pendingActions = actionableInsights.reduce((actions, insight) => {
    const pendingActionItems = insight.metadata.actionItems.filter(action => !action.completed);
    return actions.concat(
      pendingActionItems.map(action => ({
        ...action,
        insightId: insight.id,
        insightTitle: insight.title
      }))
    );
  }, [] as Array<ActionItem & { insightId: string; insightTitle: string }>);

  return {
    insights: actionableInsights,
    pendingActions,
    loading,
    error,
    refreshInsights,
    completeAction,
    totalActions: actionableInsights.reduce(
      (count, insight) => count + insight.metadata.actionItems.length, 0
    ),
    completedActions: actionableInsights.reduce(
      (count, insight) => count + insight.metadata.actionItems.filter(action => action.completed).length, 0
    )
  };
};

// Hook for insight analytics
export const useInsightAnalytics = (
  userId: string,
  userProfile?: UserProfile
) => {
  const { 
    insights, 
    totalInsights, 
    aiGeneratedCount, 
    completedActionsCount,
    averageConfidence,
    loading,
    error 
  } = useProgressInsights({
    userId,
    userProfile
  });

  const analytics = {
    total: totalInsights,
    aiGenerated: aiGeneratedCount,
    ruleBasedGenerated: totalInsights - aiGeneratedCount,
    completedActions: completedActionsCount,
    averageConfidence,
    byType: {
      achievement: insights.filter(i => i.type === 'achievement').length,
      trend: insights.filter(i => i.type === 'trend').length,
      recommendation: insights.filter(i => i.type === 'recommendation').length,
      milestone: insights.filter(i => i.type === 'milestone').length,
      warning: insights.filter(i => i.type === 'warning').length,
      celebration: insights.filter(i => i.type === 'celebration').length
    },
    byPriority: {
      critical: insights.filter(i => i.priority === 'critical').length,
      high: insights.filter(i => i.priority === 'high').length,
      medium: insights.filter(i => i.priority === 'medium').length,
      low: insights.filter(i => i.priority === 'low').length
    },
    byCategory: {
      engagement: insights.filter(i => i.category === 'engagement').length,
      learning: insights.filter(i => i.category === 'learning').length,
      behavior: insights.filter(i => i.category === 'behavior').length,
      health: insights.filter(i => i.category === 'health').length,
      social: insights.filter(i => i.category === 'social').length,
      motivation: insights.filter(i => i.category === 'motivation').length
    },
    feedback: {
      helpful: insights.filter(i => i.userFeedback?.helpful === true).length,
      notHelpful: insights.filter(i => i.userFeedback?.helpful === false).length,
      averageRating: insights.filter(i => i.userFeedback?.rating).length > 0
        ? insights.reduce((sum, i) => sum + (i.userFeedback?.rating || 0), 0) / 
          insights.filter(i => i.userFeedback?.rating).length
        : 0
    }
  };

  return {
    analytics,
    loading,
    error,
    insights
  };
};