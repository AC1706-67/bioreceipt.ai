import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ScrollView
} from 'react-native';
import { ProgressAnalytics, UserProgress } from '../../types/progress';

interface ProgressInsightsProps {
  analytics: ProgressAnalytics;
  userProgress: UserProgress | null;
  style?: ViewStyle;
}

export const ProgressInsights: React.FC<ProgressInsightsProps> = ({
  analytics,
  userProgress,
  style
}) => {
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const generateInsights = () => {
    const insights = [];

    // Streak insights
    if (userProgress) {
      if (userProgress.currentStreak >= 7) {
        insights.push({
          id: 'streak_strong',
          type: 'positive',
          icon: '🔥',
          title: 'Strong Streak!',
          description: `Your ${userProgress.currentStreak}-day streak shows excellent consistency.`,
          recommendation: 'Keep up the momentum! Consider setting a new personal goal.',
          priority: 'high'
        });
      } else if (userProgress.currentStreak >= 3) {
        insights.push({
          id: 'streak_building',
          type: 'neutral',
          icon: '🌱',
          title: 'Building Momentum',
          description: `You're on a ${userProgress.currentStreak}-day streak. Great start!`,
          recommendation: 'Focus on consistency to reach your first week milestone.',
          priority: 'medium'
        });
      } else {
        insights.push({
          id: 'streak_opportunity',
          type: 'opportunity',
          icon: '🎯',
          title: 'Streak Opportunity',
          description: 'Building a daily habit takes consistency.',
          recommendation: 'Try setting a specific time each day for health tips.',
          priority: 'high'
        });
      }
    }

    // Engagement insights
    const avgEngagement = analytics.engagementTrends.reduce((sum, t) => sum + t.engagementScore, 0) / analytics.engagementTrends.length;
    
    if (avgEngagement >= 0.8) {
      insights.push({
        id: 'engagement_excellent',
        type: 'positive',
        icon: '⭐',
        title: 'Excellent Engagement',
        description: 'Your engagement quality is outstanding!',
        recommendation: 'Consider exploring more challenging content categories.',
        priority: 'low'
      });
    } else if (avgEngagement >= 0.6) {
      insights.push({
        id: 'engagement_good',
        type: 'neutral',
        icon: '👍',
        title: 'Good Engagement',
        description: 'You\'re engaging well with the content.',
        recommendation: 'Try spending a bit more time with each tip for better retention.',
        priority: 'medium'
      });
    } else {
      insights.push({
        id: 'engagement_improve',
        type: 'opportunity',
        icon: '💡',
        title: 'Engagement Opportunity',
        description: 'There\'s room to improve your engagement quality.',
        recommendation: 'Take notes while reading and try to apply tips immediately.',
        priority: 'high'
      });
    }

    // Category diversity insights
    const activeCategories = analytics.categoryBreakdown.filter(c => c.completionRate > 0).length;
    const totalCategories = analytics.categoryBreakdown.length;
    
    if (activeCategories >= totalCategories * 0.8) {
      insights.push({
        id: 'diversity_excellent',
        type: 'positive',
        icon: '🌈',
        title: 'Great Diversity',
        description: `You're exploring ${activeCategories} out of ${totalCategories} health categories.`,
        recommendation: 'Your well-rounded approach is excellent for overall health.',
        priority: 'low'
      });
    } else if (activeCategories >= totalCategories * 0.5) {
      insights.push({
        id: 'diversity_moderate',
        type: 'neutral',
        icon: '📚',
        title: 'Moderate Diversity',
        description: `You're active in ${activeCategories} health categories.`,
        recommendation: 'Consider exploring new categories to broaden your health knowledge.',
        priority: 'medium'
      });
    } else {
      insights.push({
        id: 'diversity_opportunity',
        type: 'opportunity',
        icon: '🔍',
        title: 'Explore More Categories',
        description: 'You\'re focusing on just a few health areas.',
        recommendation: 'Try branching out to discover new aspects of wellness.',
        priority: 'medium'
      });
    }

    // Behavior pattern insights
    analytics.behaviorPatterns.forEach(pattern => {
      if (pattern.pattern === 'time_preference' && pattern.strength > 0.7) {
        insights.push({
          id: 'time_pattern',
          type: 'positive',
          icon: '⏰',
          title: 'Optimal Timing Found',
          description: `You're most active around ${pattern.timeOfDay}.`,
          recommendation: 'Set a daily reminder for this time to maintain consistency.',
          priority: 'medium'
        });
      }
      
      if (pattern.pattern === 'day_preference' && pattern.strength > 0.6) {
        insights.push({
          id: 'day_pattern',
          type: 'neutral',
          icon: '📅',
          title: 'Weekly Pattern Detected',
          description: `You're most active on ${pattern.dayOfWeek}.`,
          recommendation: 'Try to spread engagement more evenly throughout the week.',
          priority: 'low'
        });
      }
    });

    // Prediction insights
    analytics.predictions.forEach(prediction => {
      if (prediction.confidence > 0.7) {
        insights.push({
          id: `prediction_${prediction.metric}`,
          type: 'neutral',
          icon: '🔮',
          title: 'Progress Forecast',
          description: `Predicted ${prediction.predictedValue} ${prediction.metric.replace('_', ' ')} in ${prediction.timeframe}.`,
          recommendation: 'Stay consistent to meet or exceed this prediction.',
          priority: 'low'
        });
      }
    });

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
    });
  };

  const insights = generateInsights();

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive': return '#10B981';
      case 'opportunity': return '#F59E0B';
      case 'neutral': return '#3B82F6';
      default: return '#64748B';
    }
  };

  const getInsightBackground = (type: string) => {
    switch (type) {
      case 'positive': return '#ECFDF5';
      case 'opportunity': return '#FFFBEB';
      case 'neutral': return '#EFF6FF';
      default: return '#F8FAFC';
    }
  };

  const renderInsight = (insight: any, index: number) => {
    const isExpanded = expandedInsight === insight.id;
    const color = getInsightColor(insight.type);
    const backgroundColor = getInsightBackground(insight.type);

    return (
      <TouchableOpacity
        key={insight.id}
        style={[
          styles.insightCard,
          { 
            backgroundColor,
            borderLeftColor: color
          }
        ]}
        onPress={() => setExpandedInsight(isExpanded ? null : insight.id)}
        activeOpacity={0.7}
      >
        <View style={styles.insightHeader}>
          <View style={styles.insightTitleContainer}>
            <Text style={styles.insightIcon}>{insight.icon}</Text>
            <Text style={[styles.insightTitle, { color }]}>
              {insight.title}
            </Text>
          </View>
          <Text style={styles.expandIcon}>
            {isExpanded ? '▼' : '▶'}
          </Text>
        </View>

        <Text style={styles.insightDescription}>
          {insight.description}
        </Text>

        {isExpanded && (
          <View style={styles.insightRecommendation}>
            <Text style={styles.recommendationLabel}>💡 Recommendation:</Text>
            <Text style={styles.recommendationText}>
              {insight.recommendation}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (insights.length === 0) {
    return (
      <View style={[styles.emptyContainer, style]}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>No Insights Available</Text>
        <Text style={styles.emptyText}>
          Keep engaging with health tips to generate personalized insights!
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Progress Insights</Text>
        <Text style={styles.subtitle}>
          Personalized recommendations based on your activity
        </Text>
      </View>

      <ScrollView 
        style={styles.insightsScroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {insights.slice(0, 5).map(renderInsight)}
      </ScrollView>

      {insights.length > 5 && (
        <TouchableOpacity style={styles.viewMoreButton}>
          <Text style={styles.viewMoreText}>
            View {insights.length - 5} More Insights
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  header: {
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B'
  },
  insightsScroll: {
    maxHeight: 300
  },
  insightCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  insightTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  insightIcon: {
    fontSize: 16,
    marginRight: 8
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1
  },
  expandIcon: {
    fontSize: 12,
    color: '#64748B'
  },
  insightDescription: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16
  },
  insightRecommendation: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)'
  },
  recommendationLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 4
  },
  recommendationText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    fontStyle: 'italic'
  },
  viewMoreButton: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  viewMoreText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500'
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed'
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20
  }
});

export default ProgressInsights;