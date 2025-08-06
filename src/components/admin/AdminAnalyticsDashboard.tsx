/**
 * Admin Analytics Dashboard
 * Comprehensive admin dashboard with charts and detailed metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { analyticsService, AppUsageMetrics } from '../../services/analytics/analyticsService';
import { feedbackService, FeedbackStats } from '../../services/feedback/feedbackService';

const { width } = Dimensions.get('window');

interface DashboardData {
  appMetrics: AppUsageMetrics | null;
  feedbackStats: FeedbackStats | null;
  lastUpdated: Date;
}

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

const AdminAnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    appMetrics: null,
    feedbackStats: null,
    lastUpdated: new Date()
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [appMetrics, feedbackStats] = await Promise.all([
        analyticsService.getAppUsageMetrics(),
        feedbackService.getFeedbackStats()
      ]);

      setData({
        appMetrics,
        feedbackStats,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m ${seconds % 60}s`;
  };

  const renderMetricCard = (
    title: string,
    value: string | number,
    subtitle?: string,
    trend?: 'up' | 'down' | 'neutral',
    icon?: string
  ) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricTitle}>{title}</Text>
        {icon && <Text style={styles.metricIcon}>{icon}</Text>}
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {subtitle && (
        <View style={styles.metricSubtitle}>
          {trend && (
            <Text style={[
              styles.trendIndicator,
              trend === 'up' && styles.trendUp,
              trend === 'down' && styles.trendDown,
            ]}>
              {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
            </Text>
          )}
          <Text style={styles.metricSubtitleText}>{subtitle}</Text>
        </View>
      )}
    </View>
  );

  const renderBarChart = (title: string, data: ChartDataPoint[]) => {
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.barChart}>
          {data.map((item, index) => (
            <View key={index} style={styles.barItem}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: maxValue > 0 ? (item.value / maxValue) * 100 : 0,
                      backgroundColor: item.color || '#007AFF'
                    }
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{item.label}</Text>
              <Text style={styles.barValue}>{formatNumber(item.value)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderLineChart = (title: string, data: ChartDataPoint[]) => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.lineChart}>
        <Text style={styles.chartPlaceholder}>
          📈 Line chart for {title}
        </Text>
        <Text style={styles.chartNote}>
          Chart visualization would be implemented with a charting library
        </Text>
      </View>
    </View>
  );

  const renderUserMetrics = () => {
    if (!data.appMetrics) return null;

    const { activeUsers, sessionMetrics, userBehavior } = data.appMetrics;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Metrics</Text>
        
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Daily Active Users',
            formatNumber(activeUsers.daily),
            'Active today',
            'up',
            '👥'
          )}
          
          {renderMetricCard(
            'Weekly Active Users',
            formatNumber(activeUsers.weekly),
            'Active this week',
            'up',
            '📅'
          )}
          
          {renderMetricCard(
            'Monthly Active Users',
            formatNumber(activeUsers.monthly),
            'Active this month',
            'neutral',
            '📊'
          )}
          
          {renderMetricCard(
            'Total Users',
            formatNumber(data.appMetrics.totalUsers),
            'All time',
            'up',
            '🌟'
          )}
        </View>

        {renderBarChart('Active Users', [
          { label: 'Daily', value: activeUsers.daily, color: '#FF6B35' },
          { label: 'Weekly', value: activeUsers.weekly, color: '#F7931E' },
          { label: 'Monthly', value: activeUsers.monthly, color: '#FFD23F' }
        ])}
      </View>
    );
  };

  const renderEngagementMetrics = () => {
    if (!data.appMetrics) return null;

    const { sessionMetrics, userBehavior } = data.appMetrics;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Engagement Metrics</Text>
        
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Avg Session Duration',
            formatDuration(sessionMetrics.averageDuration),
            'Per session',
            'up',
            '⏱️'
          )}
          
          {renderMetricCard(
            'Total Sessions',
            formatNumber(sessionMetrics.totalSessions),
            'All time',
            'up',
            '🔄'
          )}
          
          {renderMetricCard(
            'Bounce Rate',
            `${sessionMetrics.bounceRate.toFixed(1)}%`,
            'Single page visits',
            'down',
            '⚡'
          )}
          
          {renderMetricCard(
            'Completion Rate',
            `${(userBehavior.completionRate * 100).toFixed(1)}%`,
            'Tips completed',
            'up',
            '✅'
          )}
        </View>

        {renderBarChart('Retention Rates', [
          { label: 'Day 1', value: userBehavior.retentionRate.day1 * 100, color: '#34C759' },
          { label: 'Day 7', value: userBehavior.retentionRate.day7 * 100, color: '#007AFF' },
          { label: 'Day 30', value: userBehavior.retentionRate.day30 * 100, color: '#5856D6' }
        ])}
      </View>
    );
  };

  const renderContentMetrics = () => {
    if (!data.appMetrics) return null;

    const { contentMetrics } = data.appMetrics;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content Performance</Text>
        
        <View style={styles.contentList}>
          <Text style={styles.subsectionTitle}>Most Viewed Tips</Text>
          {contentMetrics.mostViewedTips.slice(0, 5).map((tip, index) => (
            <View key={tip.tipId} style={styles.contentItem}>
              <Text style={styles.contentRank}>#{index + 1}</Text>
              <View style={styles.contentInfo}>
                <Text style={styles.contentTitle} numberOfLines={1}>
                  {tip.title}
                </Text>
                <Text style={styles.contentViews}>
                  {formatNumber(tip.views)} views
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.contentList}>
          <Text style={styles.subsectionTitle}>Most Liked Tips</Text>
          {contentMetrics.mostLikedTips.slice(0, 5).map((tip, index) => (
            <View key={tip.tipId} style={styles.contentItem}>
              <Text style={styles.contentRank}>#{index + 1}</Text>
              <View style={styles.contentInfo}>
                <Text style={styles.contentTitle} numberOfLines={1}>
                  {tip.title}
                </Text>
                <Text style={styles.contentViews}>
                  {formatNumber(tip.likes)} likes
                </Text>
              </View>
            </View>
          ))}
        </View>

        {renderBarChart('Category Popularity', 
          Object.entries(contentMetrics.categoryPopularity).map(([category, count]) => ({
            label: category.charAt(0).toUpperCase() + category.slice(1),
            value: count,
            color: getCategoryColor(category)
          }))
        )}
      </View>
    );
  };

  const renderFeedbackMetrics = () => {
    if (!data.feedbackStats) return null;

    const { totalSubmissions, byCategory, byStatus, resolutionRate, trendingIssues } = data.feedbackStats;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feedback & Support</Text>
        
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Total Feedback',
            formatNumber(totalSubmissions),
            'All time',
            'up',
            '💬'
          )}
          
          {renderMetricCard(
            'Resolution Rate',
            `${resolutionRate.toFixed(1)}%`,
            'Resolved issues',
            'up',
            '✅'
          )}
          
          {renderMetricCard(
            'Pending Issues',
            formatNumber(byStatus.submitted || 0),
            'Need attention',
            'neutral',
            '⏳'
          )}
          
          {renderMetricCard(
            'Bug Reports',
            formatNumber(byCategory.bug_report || 0),
            'Technical issues',
            'down',
            '🐛'
          )}
        </View>

        {renderBarChart('Feedback by Category', 
          Object.entries(byCategory).map(([category, count]) => ({
            label: category.replace('_', ' '),
            value: count,
            color: getFeedbackCategoryColor(category)
          }))
        )}

        {trendingIssues.length > 0 && (
          <View style={styles.trendingIssues}>
            <Text style={styles.subsectionTitle}>Trending Issues</Text>
            {trendingIssues.map((issue, index) => (
              <View key={index} style={styles.trendingItem}>
                <Text style={styles.trendingCategory}>
                  {issue.category.replace('_', ' ')}
                </Text>
                <Text style={styles.trendingCount}>
                  {issue.count} reports
                </Text>
                <Text style={styles.trendingTrend}>
                  {issue.trend === 'increasing' ? '📈' : 
                   issue.trend === 'decreasing' ? '📉' : '➡️'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      nutrition: '#4CAF50',
      fitness: '#FF9800',
      mental_wellness: '#9C27B0',
      sleep: '#3F51B5',
      recovery: '#00BCD4',
      hygiene: '#795548',
      general: '#607D8B'
    };
    return colors[category] || colors.general;
  };

  const getFeedbackCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      bug_report: '#F44336',
      feature_request: '#2196F3',
      content_quality: '#FF9800',
      usability: '#9C27B0',
      performance: '#FF5722',
      accessibility: '#4CAF50',
      general: '#607D8B'
    };
    return colors[category] || colors.general;
  };

  if (loading && !data.appMetrics) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#007AFF']}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Analytics Dashboard</Text>
        <Text style={styles.lastUpdated}>
          Last updated: {data.lastUpdated.toLocaleTimeString()}
        </Text>
      </View>

      <View style={styles.periodSelector}>
        {(['day', 'week', 'month'] as const).map(period => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive
            ]}>
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderUserMetrics()}
      {renderEngagementMetrics()}
      {renderContentMetrics()}
      {renderFeedbackMetrics()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 20,
  },
  metricCard: {
    width: (width - 56) / 2,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    margin: 8,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  metricIcon: {
    fontSize: 20,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  metricSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIndicator: {
    fontSize: 12,
    marginRight: 4,
  },
  trendUp: {
    color: '#34C759',
  },
  trendDown: {
    color: '#FF3B30',
  },
  metricSubtitleText: {
    fontSize: 12,
    color: '#999',
  },
  chartContainer: {
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 8,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  barContainer: {
    height: 80,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '80%',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  barValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  lineChart: {
    height: 120,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholder: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  chartNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  contentList: {
    marginBottom: 20,
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contentRank: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    width: 30,
  },
  contentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contentTitle: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  contentViews: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  trendingIssues: {
    marginTop: 16,
  },
  trendingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  trendingCategory: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textTransform: 'capitalize',
  },
  trendingCount: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  trendingTrend: {
    fontSize: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});

export default AdminAnalyticsDashboard;