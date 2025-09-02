/**
 * Admin Analytics Dashboard
 * Comprehensive analytics dashboard for administrators
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';

// Guard chart imports for web/Node environments
let LineChart: any, BarChart: any, PieChart: any;
if (Platform.OS !== 'web') {
  try {
    ({ LineChart, BarChart, PieChart } = require('react-native-chart-kit'));
  } catch (error) {
    console.warn('react-native-chart-kit not available:', error);
  }
}
import {
  AnalyticsService,
  EngagementMetrics,
  ContentPerformance,
  UserBehaviorAnalytics
} from '../../services/analytics/analyticsService';
import { AdminUser } from '../../services/admin/adminAuthService';

interface AdminAnalyticsDashboardProps {
  adminUser: AdminUser;
}

interface DateRange {
  label: string;
  startDate: Date;
  endDate: Date;
}

const screenWidth = Dimensions.get('window').width;

export const AdminAnalyticsDashboard: React.FC<AdminAnalyticsDashboardProps> = ({
  adminUser
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>({
    label: 'Last 30 Days',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  });

  // Analytics data state
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics | null>(null);
  const [contentPerformance, setContentPerformance] = useState<ContentPerformance[]>([]);
  const [userBehavior, setUserBehavior] = useState<UserBehaviorAnalytics | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'content' | 'users' | 'performance'>('overview');

  const analyticsService = AnalyticsService.getInstance();

  const dateRanges: DateRange[] = [
    {
      label: 'Last 7 Days',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    },
    {
      label: 'Last 30 Days',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    },
    {
      label: 'Last 90 Days',
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    },
    {
      label: 'Last Year',
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    }
  ];

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedDateRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      // Check admin permissions
      if (!adminUser.permissions.includes('analytics.read') && adminUser.role !== 'super_admin') {
        Alert.alert('Access Denied', 'You do not have permission to view analytics data.');
        return;
      }

      // Load all analytics data
      const [engagement, content, behavior] = await Promise.all([
        analyticsService.getEngagementMetrics(selectedDateRange.startDate, selectedDateRange.endDate),
        analyticsService.getContentPerformance(selectedDateRange.startDate, selectedDateRange.endDate),
        analyticsService.getUserBehaviorAnalytics(selectedDateRange.startDate, selectedDateRange.endDate)
      ]);

      setEngagementMetrics(engagement);
      setContentPerformance(content);
      setUserBehavior(behavior);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      Alert.alert('Error', 'Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const renderDateRangeSelector = () => (
    <View style={styles.dateRangeContainer}>
      <Text style={styles.sectionTitle}>Time Period</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {dateRanges.map((range, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dateRangeButton,
              selectedDateRange.label === range.label && styles.dateRangeButtonActive
            ]}
            onPress={() => setSelectedDateRange(range)}
          >
            <Text style={[
              styles.dateRangeButtonText,
              selectedDateRange.label === range.label && styles.dateRangeButtonTextActive
            ]}>
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTabSelector = () => (
    <View style={styles.tabContainer}>
      {[
        { key: 'overview', label: 'Overview' },
        { key: 'content', label: 'Content' },
        { key: 'users', label: 'Users' },
        { key: 'performance', label: 'Performance' }
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tabButton,
            selectedTab === tab.key && styles.tabButtonActive
          ]}
          onPress={() => setSelectedTab(tab.key as any)}
        >
          <Text style={[
            styles.tabButtonText,
            selectedTab === tab.key && styles.tabButtonTextActive
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverviewTab = () => {
    if (!engagementMetrics) return null;

    const chartData = {
      labels: ['Views', 'Likes', 'Bookmarks', 'Completions', 'Shares'],
      datasets: [{
        data: [
          engagementMetrics.tipViews,
          engagementMetrics.tipLikes,
          engagementMetrics.tipBookmarks,
          engagementMetrics.tipCompletions,
          engagementMetrics.tipShares
        ]
      }]
    };

    const pieData = [
      {
        name: 'Views',
        population: engagementMetrics.tipViews,
        color: '#4CAF50',
        legendFontColor: '#333333',
        legendFontSize: 12
      },
      {
        name: 'Likes',
        population: engagementMetrics.tipLikes,
        color: '#2196F3',
        legendFontColor: '#333333',
        legendFontSize: 12
      },
      {
        name: 'Bookmarks',
        population: engagementMetrics.tipBookmarks,
        color: '#FF9800',
        legendFontColor: '#333333',
        legendFontSize: 12
      },
      {
        name: 'Completions',
        population: engagementMetrics.tipCompletions,
        color: '#9C27B0',
        legendFontColor: '#333333',
        legendFontSize: 12
      }
    ];

    return (
      <ScrollView style={styles.tabContent}>
        {/* Key Metrics Cards */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{engagementMetrics.dailyActiveUsers}</Text>
            <Text style={styles.metricLabel}>Daily Active Users</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{engagementMetrics.weeklyActiveUsers}</Text>
            <Text style={styles.metricLabel}>Weekly Active Users</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{engagementMetrics.monthlyActiveUsers}</Text>
            <Text style={styles.metricLabel}>Monthly Active Users</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {Math.round(engagementMetrics.averageSessionDuration / 1000 / 60)}m
            </Text>
            <Text style={styles.metricLabel}>Avg Session Duration</Text>
          </View>
        </View>

        {/* Engagement Overview Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Engagement Overview</Text>
          {BarChart ? (
            <BarChart
              data={chartData}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16
                }
              }}
              style={styles.chart}
            />
          ) : (
            <View style={[styles.chart, styles.chartPlaceholder]}>
              <Text style={styles.chartPlaceholderText}>Chart not available</Text>
            </View>
          )}
        </View>

        {/* Engagement Distribution */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Engagement Distribution</Text>
          {PieChart ? (
            <PieChart
              data={pieData}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          ) : (
            <View style={[styles.chart, styles.chartPlaceholder]}>
              <Text style={styles.chartPlaceholderText}>Chart not available</Text>
            </View>
          )}
        </View>

        {/* Streak Milestones */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Streak Milestones</Text>
          <View style={styles.streakContainer}>
            {Object.entries(engagementMetrics.streakMilestones).map(([milestone, count]) => (
              <View key={milestone} style={styles.streakItem}>
                <Text style={styles.streakMilestone}>{milestone} days</Text>
                <Text style={styles.streakCount}>{count} users</Text>
              </View>
            ))}
            {Object.keys(engagementMetrics.streakMilestones).length === 0 && (
              <Text style={styles.noDataText}>No streak milestones achieved yet</Text>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderContentTab = () => {
    const topContent = contentPerformance
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 10);

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Top Performing Content</Text>
          {topContent.length > 0 ? (
            topContent.map((content, index) => (
              <View key={content.tipId} style={styles.contentItem}>
                <View style={styles.contentRank}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                <View style={styles.contentDetails}>
                  <Text style={styles.contentTitle} numberOfLines={2}>
                    {content.title}
                  </Text>
                  <Text style={styles.contentCategory}>{content.category}</Text>
                  <View style={styles.contentMetrics}>
                    <Text style={styles.contentMetric}>
                      {content.views} views
                    </Text>
                    <Text style={styles.contentMetric}>
                      {content.likes} likes
                    </Text>
                    <Text style={styles.contentMetric}>
                      {content.engagementRate.toFixed(1)}% engagement
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No content performance data available</Text>
          )}
        </View>

        {/* Category Performance */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Performance by Category</Text>
          {renderCategoryPerformance()}
        </View>
      </ScrollView>
    );
  };

  const renderCategoryPerformance = () => {
    const categoryStats = contentPerformance.reduce((acc, content) => {
      if (!acc[content.category]) {
        acc[content.category] = {
          totalViews: 0,
          totalLikes: 0,
          totalEngagement: 0,
          count: 0
        };
      }
      acc[content.category].totalViews += content.views;
      acc[content.category].totalLikes += content.likes;
      acc[content.category].totalEngagement += content.engagementRate;
      acc[content.category].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return (
      <View>
        {Object.entries(categoryStats).map(([category, stats]) => {
          if (!stats || typeof stats !== 'object') return null;
          return (
            <View key={category} style={styles.categoryItem}>
              <Text style={styles.categoryName}>{category.replace('_', ' ').toUpperCase()}</Text>
              <View style={styles.categoryStats}>
                <Text style={styles.categoryStat}>{stats.totalViews || 0} views</Text>
                <Text style={styles.categoryStat}>{stats.totalLikes || 0} likes</Text>
                <Text style={styles.categoryStat}>
                  {stats.count > 0 ? (stats.totalEngagement / stats.count).toFixed(1) : '0.0'}% avg engagement
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderUsersTab = () => {
    if (!userBehavior) return null;

    return (
      <ScrollView style={styles.tabContent}>
        {/* User Behavior Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {userBehavior.averageSessionsPerDay.toFixed(1)}
            </Text>
            <Text style={styles.metricLabel}>Avg Sessions/Day</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {Math.round(userBehavior.averageSessionDuration / 1000 / 60)}m
            </Text>
            <Text style={styles.metricLabel}>Avg Session Duration</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{userBehavior.mostActiveTimeOfDay}</Text>
            <Text style={styles.metricLabel}>Most Active Time</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {(userBehavior.retentionRates.day1 * 100).toFixed(0)}%
            </Text>
            <Text style={styles.metricLabel}>Day 1 Retention</Text>
          </View>
        </View>

        {/* Retention Rates */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>User Retention</Text>
          <View style={styles.retentionContainer}>
            <View style={styles.retentionItem}>
              <Text style={styles.retentionLabel}>Day 1</Text>
              <Text style={styles.retentionValue}>
                {(userBehavior.retentionRates.day1 * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.retentionItem}>
              <Text style={styles.retentionLabel}>Day 7</Text>
              <Text style={styles.retentionValue}>
                {(userBehavior.retentionRates.day7 * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.retentionItem}>
              <Text style={styles.retentionLabel}>Day 30</Text>
              <Text style={styles.retentionValue}>
                {(userBehavior.retentionRates.day30 * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Preferred Categories */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Preferred Categories</Text>
          <View style={styles.categoriesContainer}>
            {userBehavior.preferredCategories.map((category, index) => (
              <View key={category} style={styles.preferredCategoryItem}>
                <Text style={styles.preferredCategoryRank}>{index + 1}</Text>
                <Text style={styles.preferredCategoryName}>
                  {category.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            ))}
            {userBehavior.preferredCategories.length === 0 && (
              <Text style={styles.noDataText}>No category preferences data available</Text>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderPerformanceTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>App Performance Metrics</Text>
        <Text style={styles.noDataText}>
          Performance metrics will be displayed here when available
        </Text>
      </View>
    </ScrollView>
  );

  if (loading && !engagementMetrics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading analytics data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics Dashboard</Text>
        <Text style={styles.subtitle}>
          Data insights for {selectedDateRange.label.toLowerCase()}
        </Text>
      </View>

      {renderDateRangeSelector()}
      {renderTabSelector()}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'content' && renderContentTab()}
        {selectedTab === 'users' && renderUsersTab()}
        {selectedTab === 'performance' && renderPerformanceTab()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  dateRangeContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  dateRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateRangeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  dateRangeButtonText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  dateRangeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#4CAF50',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
  },
  chartPlaceholder: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  chartPlaceholderText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  streakContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  streakItem: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  streakMilestone: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  streakCount: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  contentItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contentRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  contentDetails: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  contentCategory: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  contentMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  contentMetric: {
    fontSize: 12,
    color: '#999999',
  },
  categoryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  categoryStats: {
    flexDirection: 'row',
    gap: 16,
  },
  categoryStat: {
    fontSize: 12,
    color: '#666666',
  },
  retentionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  retentionItem: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    minWidth: 80,
  },
  retentionLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  retentionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  categoriesContainer: {
    gap: 8,
  },
  preferredCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  preferredCategoryRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 12,
  },
  preferredCategoryName: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  noDataText: {
    textAlign: 'center',
    color: '#999999',
    fontSize: 14,
    fontStyle: 'italic',
    padding: 20,
  },
});