/**
 * Progress Insights Screen
 * AI-powered progress insights and personalized recommendations
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProgressInsights, useHighPriorityInsights, useActionableInsights } from '../../hooks/useProgressInsights';
import { UserProfile } from '../../models/UserProfile';
import { ProgressInsight, ActionItem } from '../../services/insights/progressInsightsService';
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';

interface ProgressInsightsScreenProps {
  userId: string;
  userProfile: UserProfile;
  onNavigateToTip?: (tipId: string) => void;
  onNavigateToSettings?: () => void;
}

const { width } = Dimensions.get('window');

export const ProgressInsightsScreen: React.FC<ProgressInsightsScreenProps> = ({
  userId,
  userProfile,
  onNavigateToTip,
  onNavigateToSettings
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [showFeedbackModal, setShowFeedbackModal] = useState<string | null>(null);

  // Main insights hook
  const {
    insights,
    metrics,
    loading,
    refreshing,
    error,
    refreshInsights,
    recordFeedback,
    completeAction,
    dismissInsight,
    getInsightsByType,
    getInsightsByPriority,
    totalInsights,
    aiGeneratedCount,
    averageConfidence
  } = useProgressInsights({
    userId,
    userProfile,
    timeframe: selectedTimeframe
  });

  // High priority insights
  const {
    insights: highPriorityInsights,
    hasCritical
  } = useHighPriorityInsights(userId, userProfile);

  // Actionable insights
  const {
    pendingActions,
    totalActions,
    completedActions
  } = useActionableInsights(userId, userProfile);

  // Handle action completion
  const handleCompleteAction = useCallback(async (insightId: string, actionId: string) => {
    try {
      await completeAction(insightId, actionId);
      Alert.alert('Success', 'Action completed successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to complete action. Please try again.');
    }
  }, [completeAction]);

  // Handle insight feedback
  const handleInsightFeedback = useCallback(async (
    insightId: string,
    helpful: boolean,
    rating: number,
    comment?: string
  ) => {
    try {
      await recordFeedback(insightId, { helpful, rating, comment });
      setShowFeedbackModal(null);
      Alert.alert('Thank you!', 'Your feedback helps us improve your insights.');
    } catch (error) {
      Alert.alert('Error', 'Failed to record feedback. Please try again.');
    }
  }, [recordFeedback]);

  // Handle insight dismissal
  const handleDismissInsight = useCallback(async (insightId: string) => {
    Alert.alert(
      'Dismiss Insight',
      'Are you sure you want to dismiss this insight?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          style: 'destructive',
          onPress: async () => {
            try {
              await dismissInsight(insightId);
            } catch (error) {
              Alert.alert('Error', 'Failed to dismiss insight. Please try again.');
            }
          }
        }
      ]
    );
  }, [dismissInsight]);

  // Render insight card
  const renderInsightCard = (insight: ProgressInsight) => {
    const priorityColor = getPriorityColor(insight.priority);
    const typeIcon = getTypeIcon(insight.type);

    return (
      <View key={insight.id} style={[styles.insightCard, { borderLeftColor: priorityColor }]}>
        <View style={styles.insightHeader}>
          <View style={styles.insightTitleRow}>
            <Text style={styles.typeIcon}>{typeIcon}</Text>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            {insight.aiGenerated && (
              <View style={styles.aiTag}>
                <Text style={styles.aiTagText}>AI</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => handleDismissInsight(insight.id)}
            style={styles.dismissButton}
          >
            <Text style={styles.dismissButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.insightDescription}>{insight.description}</Text>

        {/* Confidence indicator */}
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>Confidence: </Text>
          <View style={styles.confidenceBar}>
            <View 
              style={[
                styles.confidenceFill, 
                { width: `${insight.confidence * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.confidenceText}>{Math.round(insight.confidence * 100)}%</Text>
        </View>

        {/* Recommendations */}
        {insight.metadata.recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>Recommendations:</Text>
            {insight.metadata.recommendations.map((rec, index) => (
              <Text key={index} style={styles.recommendationItem}>• {rec}</Text>
            ))}
          </View>
        )}

        {/* Action items */}
        {insight.metadata.actionItems.length > 0 && (
          <View style={styles.actionsContainer}>
            <Text style={styles.actionsTitle}>Action Items:</Text>
            {insight.metadata.actionItems.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionItem,
                  action.completed && styles.actionItemCompleted
                ]}
                onPress={() => !action.completed && handleCompleteAction(insight.id, action.id)}
                disabled={action.completed}
              >
                <View style={styles.actionItemContent}>
                  <Text style={[
                    styles.actionItemTitle,
                    action.completed && styles.actionItemTitleCompleted
                  ]}>
                    {action.completed ? '✓' : '○'} {action.title}
                  </Text>
                  <Text style={styles.actionItemDescription}>{action.description}</Text>
                  <View style={styles.actionItemMeta}>
                    <Text style={styles.actionItemDifficulty}>
                      {getDifficultyIcon(action.difficulty)} {action.difficulty}
                    </Text>
                    <Text style={styles.actionItemTime}>~{action.estimatedTime}min</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Feedback section */}
        <View style={styles.feedbackContainer}>
          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={() => setShowFeedbackModal(insight.id)}
          >
            <Text style={styles.feedbackButtonText}>
              {insight.userFeedback ? 'Update Feedback' : 'Rate This Insight'}
            </Text>
          </TouchableOpacity>
          {insight.userFeedback && (
            <Text style={styles.feedbackStatus}>
              {insight.userFeedback.helpful ? '👍' : '👎'} 
              {insight.userFeedback.rating}/5 stars
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Render metrics summary
  const renderMetricsSummary = () => {
    if (!metrics) return null;

    return (
      <View style={styles.metricsContainer}>
        <Text style={styles.metricsTitle}>Your Progress Summary</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.metrics.engagement.streakDays}</Text>
            <Text style={styles.metricLabel}>Day Streak</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {Math.round(metrics.metrics.engagement.completionRate)}%
            </Text>
            <Text style={styles.metricLabel}>Completion Rate</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.metrics.learning.categoriesExplored}</Text>
            <Text style={styles.metricLabel}>Categories</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {Math.round(metrics.metrics.behavior.consistencyScore)}%
            </Text>
            <Text style={styles.metricLabel}>Consistency</Text>
          </View>
        </View>
      </View>
    );
  };

  // Render timeframe selector
  const renderTimeframeSelector = () => (
    <View style={styles.timeframeContainer}>
      {(['daily', 'weekly', 'monthly'] as const).map((timeframe) => (
        <TouchableOpacity
          key={timeframe}
          style={[
            styles.timeframeButton,
            selectedTimeframe === timeframe && styles.timeframeButtonActive
          ]}
          onPress={() => setSelectedTimeframe(timeframe)}
        >
          <Text style={[
            styles.timeframeButtonText,
            selectedTimeframe === timeframe && styles.timeframeButtonTextActive
          ]}>
            {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render insights summary
  const renderInsightsSummary = () => (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>Insights Overview</Text>
      <View style={styles.summaryStats}>
        <View style={styles.summaryStatItem}>
          <Text style={styles.summaryStatValue}>{totalInsights}</Text>
          <Text style={styles.summaryStatLabel}>Total Insights</Text>
        </View>
        <View style={styles.summaryStatItem}>
          <Text style={styles.summaryStatValue}>{aiGeneratedCount}</Text>
          <Text style={styles.summaryStatLabel}>AI Generated</Text>
        </View>
        <View style={styles.summaryStatItem}>
          <Text style={styles.summaryStatValue}>{highPriorityInsights.length}</Text>
          <Text style={styles.summaryStatLabel}>High Priority</Text>
        </View>
        <View style={styles.summaryStatItem}>
          <Text style={styles.summaryStatValue}>{pendingActions.length}</Text>
          <Text style={styles.summaryStatLabel}>Pending Actions</Text>
        </View>
      </View>
    </View>
  );

  if (loading && insights.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Generating your personalized insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load insights</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshInsights}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshInsights} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Progress Insights</Text>
          <Text style={styles.headerSubtitle}>
            AI-powered recommendations for your health journey
          </Text>
        </View>

        {/* Timeframe selector */}
        {renderTimeframeSelector()}

        {/* Metrics summary */}
        {renderMetricsSummary()}

        {/* Insights summary */}
        {renderInsightsSummary()}

        {/* Critical insights first */}
        {hasCritical && (
          <View style={styles.criticalSection}>
            <Text style={styles.sectionTitle}>🚨 Critical Insights</Text>
            {getInsightsByPriority('critical').map(renderInsightCard)}
          </View>
        )}

        {/* High priority insights */}
        {highPriorityInsights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ High Priority</Text>
            {getInsightsByPriority('high').map(renderInsightCard)}
          </View>
        )}

        {/* Achievements and celebrations */}
        {(getInsightsByType('achievement').length > 0 || getInsightsByType('celebration').length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎉 Achievements</Text>
            {[...getInsightsByType('achievement'), ...getInsightsByType('celebration')].map(renderInsightCard)}
          </View>
        )}

        {/* Recommendations */}
        {getInsightsByType('recommendation').length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Recommendations</Text>
            {getInsightsByType('recommendation').map(renderInsightCard)}
          </View>
        )}

        {/* Trends and milestones */}
        {(getInsightsByType('trend').length > 0 || getInsightsByType('milestone').length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 Trends & Milestones</Text>
            {[...getInsightsByType('trend'), ...getInsightsByType('milestone')].map(renderInsightCard)}
          </View>
        )}

        {/* Warnings */}
        {getInsightsByType('warning').length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Areas for Improvement</Text>
            {getInsightsByType('warning').map(renderInsightCard)}
          </View>
        )}

        {/* Empty state */}
        {insights.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No insights yet</Text>
            <Text style={styles.emptyStateText}>
              Keep using the app to generate personalized insights about your progress!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// Helper functions
const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'critical': return '#FF4444';
    case 'high': return '#FF8800';
    case 'medium': return '#4CAF50';
    case 'low': return '#2196F3';
    default: return '#666666';
  }
};

const getTypeIcon = (type: string): string => {
  switch (type) {
    case 'achievement': return '🏆';
    case 'celebration': return '🎉';
    case 'milestone': return '🎯';
    case 'trend': return '📈';
    case 'recommendation': return '💡';
    case 'warning': return '⚠️';
    default: return '📊';
  }
};

const getDifficultyIcon = (difficulty: string): string => {
  switch (difficulty) {
    case 'easy': return '🟢';
    case 'medium': return '🟡';
    case 'hard': return '🔴';
    default: return '⚪';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BioReceiptTheme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: BioReceiptTheme.colors.text,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BioReceiptTheme.colors.error,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: BioReceiptTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: BioReceiptTheme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: BioReceiptTheme.colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: BioReceiptTheme.colors.textSecondary,
  },
  timeframeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: BioReceiptTheme.colors.surface,
    alignItems: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: BioReceiptTheme.colors.primary,
  },
  timeframeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BioReceiptTheme.colors.text,
  },
  timeframeButtonTextActive: {
    color: 'white',
  },
  metricsContainer: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    backgroundColor: BioReceiptTheme.colors.surface,
    borderRadius: 12,
  },
  metricsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BioReceiptTheme.colors.text,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    padding: 12,
    backgroundColor: BioReceiptTheme.colors.background,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BioReceiptTheme.colors.primary,
  },
  metricLabel: {
    fontSize: 12,
    color: BioReceiptTheme.colors.textSecondary,
    textAlign: 'center',
  },
  summaryContainer: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    backgroundColor: BioReceiptTheme.colors.surface,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BioReceiptTheme.colors.text,
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BioReceiptTheme.colors.primary,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: BioReceiptTheme.colors.textSecondary,
    textAlign: 'center',
  },
  criticalSection: {
    margin: 20,
    marginTop: 0,
  },
  section: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BioReceiptTheme.colors.text,
    marginBottom: 16,
  },
  insightCard: {
    backgroundColor: BioReceiptTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  insightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BioReceiptTheme.colors.text,
    flex: 1,
  },
  aiTag: {
    backgroundColor: BioReceiptTheme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  dismissButton: {
    padding: 4,
  },
  dismissButtonText: {
    fontSize: 20,
    color: BioReceiptTheme.colors.textSecondary,
  },
  insightDescription: {
    fontSize: 14,
    color: BioReceiptTheme.colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  confidenceLabel: {
    fontSize: 12,
    color: BioReceiptTheme.colors.textSecondary,
  },
  confidenceBar: {
    flex: 1,
    height: 4,
    backgroundColor: BioReceiptTheme.colors.background,
    borderRadius: 2,
    marginHorizontal: 8,
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: BioReceiptTheme.colors.primary,
    borderRadius: 2,
  },
  confidenceText: {
    fontSize: 12,
    color: BioReceiptTheme.colors.textSecondary,
  },
  recommendationsContainer: {
    marginBottom: 12,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BioReceiptTheme.colors.text,
    marginBottom: 8,
  },
  recommendationItem: {
    fontSize: 13,
    color: BioReceiptTheme.colors.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  actionsContainer: {
    marginBottom: 12,
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BioReceiptTheme.colors.text,
    marginBottom: 8,
  },
  actionItem: {
    backgroundColor: BioReceiptTheme.colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
  },
  actionItemCompleted: {
    backgroundColor: BioReceiptTheme.colors.success + '20',
    borderColor: BioReceiptTheme.colors.success,
  },
  actionItemContent: {
    flex: 1,
  },
  actionItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BioReceiptTheme.colors.text,
    marginBottom: 4,
  },
  actionItemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: BioReceiptTheme.colors.textSecondary,
  },
  actionItemDescription: {
    fontSize: 12,
    color: BioReceiptTheme.colors.textSecondary,
    marginBottom: 8,
  },
  actionItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionItemDifficulty: {
    fontSize: 11,
    color: BioReceiptTheme.colors.textSecondary,
  },
  actionItemTime: {
    fontSize: 11,
    color: BioReceiptTheme.colors.textSecondary,
  },
  feedbackContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BioReceiptTheme.colors.border,
  },
  feedbackButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: BioReceiptTheme.colors.primary + '20',
    borderRadius: 6,
  },
  feedbackButtonText: {
    fontSize: 12,
    color: BioReceiptTheme.colors.primary,
    fontWeight: '600',
  },
  feedbackStatus: {
    fontSize: 12,
    color: BioReceiptTheme.colors.textSecondary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BioReceiptTheme.colors.text,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: BioReceiptTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ProgressInsightsScreen;