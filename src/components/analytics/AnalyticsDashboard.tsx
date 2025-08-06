/**
 * Analytics Dashboard Component
 * Admin dashboard for viewing app usage metrics and analytics
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { AnalyticsService, AppUsageMetrics, UserEngagementMetrics } from '../../services/analytics/analyticsService';

const { width } = Dimensions.get('window');

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, trend, icon }) => (
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

interface TopListItemProps {
  rank: number;
  title: string;
  value: number;
  subtitle?: string;
}

const TopListItem: React.FC<TopListItemProps> = ({ rank, title, value, subtitle }) => (
  <View style={styles.topListItem}>
    <View style={styles.rankBadge}>
      <Text style={styles.rankText}>{rank}</Text>
    </View>
    <View style={styles.topListContent}>
      <Text style={styles.topListTitle} numberOfLines={1}>{title}</Text>
      {subtitle && <Text style={styles.topListSubtitle}>{subtitle}</Text>}
    </View>
    <Text style={styles.topListValue}>{value}</Text>
  </View>
);

export const AnalyticsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<AppUsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');

  const analyticsService = AnalyticsService.getInstance();

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const appMetrics = await analyticsService.getAppUsageMetrics();
      setMetrics(appMetrics);
    } catch (error) {
      console.error('Error loading analytics metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMetrics();
    setRefreshing(false);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatDuration = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const renderOverviewMetrics = () => {
    if (!metrics) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Users"
            value={formatNumber(metrics.totalUsers)}
            icon="👥"
          />
          <MetricCard
            title="Active Users"
            value={formatNumber(metrics.activeUsers[selectedPeriod === 'day' ? 'daily' : selectedPeriod === 'week' ? 'weekly' : 'monthly'])}
            subtitle={`${selectedPeriod}ly active`}
            icon="🟢"
          />
          <MetricCard
            title="Total Sessions"
            value={formatNumber(metrics.sessionMetrics.totalSessions)}
            icon="📱"
          />
          <MetricCard
            title="Avg Session"
            value={formatDuration(metrics.sessionMetrics.averageDuration)}
            subtitle="duration"
            icon="⏱️"
          />
        </View>
      </View>
    );
  };

  const renderEngagementMetrics = () => {
    if (!metrics) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Engagement</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Bounce Rate"
            value={formatPercentage(metrics.sessionMetrics.bounceRate)}
            trend={metrics.sessionMetrics.bounceRate < 30 ? 'up' : 'down'}
            icon="📊"
          />
          <MetricCard
            title="Completion Rate"
            value={formatPercentage(metrics.userBehavior.completionRate)}
            trend="up"
            icon="✅"
          />
          <MetricCard
            title="Tips per Session"
            value={metrics.userBehavior.averageTipsPerSession.toFixed(1)}
            icon="💡"
          />
          <MetricCard
            title="Day 7 Retention"
            value={formatPercentage(metrics.userBehavior.retentionRate.day7)}
            trend="up"
            icon="🔄"
          />
        </View>
      </View>
    );
  };

  const renderTopContent = () => {
    if (!metrics) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Content</Text>
        
        <View style={styles.topContentContainer}>
          <View style={styles.topContentSection}>
            <Text style={styles.topContentTitle}>Most Viewed Tips</Text>
            <View style={styles.topList}>
              {metrics.contentMetrics.mostViewedTips.slice(0, 5).map((tip, index) => (
                <TopListItem
                  key={tip.tipId}
                  rank={index + 1}
                  title={tip.title}
                  value={tip.views}
                  subtitle={`${tip.views} views`}
                />
              ))}
            </View>
          </View>

          <View style={styles.topContentSection}>
            <Text style={styles.topContentTitle}>Most Liked Tips</Text>
            <View style={styles.topList}>
              {metrics.contentMetrics.mostLikedTips.slice(0, 5).map((tip, index) => (
                <TopListItem
                  key={tip.tipId}
                  rank={index + 1}
                  title={tip.title}
                  value={tip.likes}
                  subtitle={`${tip.likes} likes`}
                />
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderCategoryPopularity = () => {
    if (!metrics) return null;

    const categories = Object.entries(metrics.contentMetrics.categoryPopularity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);

    const maxValue = Math.max(...categories.map(([, value]) => value));

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category Popularity</Text>
        <View style={styles.categoryChart}>
          {categories.map(([category, value]) => (
            <View key={category} style={styles.categoryItem}>
              <Text style={styles.categoryName}>{category.replace('_', ' ')}</Text>
              <View style={styles.categoryBarContainer}>
                <View 
                  style={[
                    styles.categoryBar,
                    { width: `${(value / maxValue) * 100}%` }
                  ]} 
                />
                <Text style={styles.categoryValue}>{value}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderRetentionChart = () => {
    if (!metrics) return null;

    const retentionData = [
      { period: 'Day 1', rate: metrics.userBehavior.retentionRate.day1 },
      { period: 'Day 7', rate: metrics.userBehavior.retentionRate.day7 },
      { period: 'Day 30', rate: metrics.userBehavior.retentionRate.day30 },
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Retention</Text>
        <View style={styles.retentionChart}>
          {retentionData.map((item, index) => (
            <View key={item.period} style={styles.retentionItem}>
              <Text style={styles.retentionPeriod}>{item.period}</Text>
              <View style={styles.retentionBarContainer}>
                <View 
                  style={[
                    styles.retentionBar,
                    { height: `${item.rate}%` }
                  ]} 
                />
              </View>
              <Text style={styles.retentionValue}>{formatPercentage(item.rate)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['day', 'week', 'month'] as const).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.selectedPeriodButton,
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.selectedPeriodButtonText,
          ]}>
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No analytics data available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadMetrics}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics Dashboard</Text>
        {renderPeriodSelector()}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderOverviewMetrics()}
        {renderEngagementMetrics()}
        {renderTopContent()}
        {renderCategoryPopularity()}
        {renderRetentionChart()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectedPeriodButton: {
    backgroundColor: '#3498db',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  selectedPeriodButtonText: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  metricIcon: {
    fontSize: 20,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
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
    color: '#28a745',
  },
  trendDown: {
    color: '#e74c3c',
  },
  metricSubtitleText: {
    fontSize: 12,
    color: '#6c757d',
  },
  topContentContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  topContentSection: {
    flex: 1,
  },
  topContentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  topList: {
    gap: 8,
  },
  topListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3498db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  topListContent: {
    flex: 1,
  },
  topListTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  topListSubtitle: {
    fontSize: 12,
    color: '#6c757d',
  },
  topListValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
  },
  categoryChart: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    width: 100,
    textTransform: 'capitalize',
  },
  categoryBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBar: {
    height: 8,
    backgroundColor: '#3498db',
    borderRadius: 4,
    minWidth: 4,
  },
  categoryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    minWidth: 30,
  },
  retentionChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    paddingTop: 20,
  },
  retentionItem: {
    alignItems: 'center',
    flex: 1,
  },
  retentionPeriod: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
  },
  retentionBarContainer: {
    height: 120,
    width: 40,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  retentionBar: {
    backgroundColor: '#28a745',
    borderRadius: 4,
    width: '100%',
  },
  retentionValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginTop: 8,
  },
});