/**
 * Trend Forecast Panel
 * Displays predictive analytics and trend forecasts
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

import {
  predictiveAnalyticsEngine,
  TrendForecast,
  RiskCategory,
  PreventiveAction,
  OptimalTiming
} from '../../services/analytics/predictiveAnalyticsEngine';
import { bioPulseTheme } from '../../constants/bioPulseTheme';
import { useErrorHandler } from '../../hooks/useErrorHandler';

const { width } = Dimensions.get('window');

interface TrendForecastPanelProps {
  userId: string;
  onForecastUpdate?: (forecast: TrendForecast) => void;
}

export const TrendForecastPanel: React.FC<TrendForecastPanelProps> = ({
  userId,
  onForecastUpdate
}) => {
  const [forecast, setForecast] = useState<TrendForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'actions' | 'timing'>('overview');
  
  const { handleError } = useErrorHandler();

  useEffect(() => {
    loadForecast();
  }, [userId]);

  const loadForecast = async () => {
    try {
      setLoading(true);
      const forecastData = await predictiveAnalyticsEngine.generateForecast(userId);
      setForecast(forecastData);
      onForecastUpdate?.(forecastData);
    } catch (error) {
      handleError(error, 'Failed to load trend forecast');
    } finally {
      setLoading(false);
    }
  };

  const refreshForecast = async () => {
    try {
      setRefreshing(true);
      const forecastData = await predictiveAnalyticsEngine.generateForecast(userId);
      setForecast(forecastData);
      onForecastUpdate?.(forecastData);
    } catch (error) {
      handleError(error, 'Failed to refresh forecast');
    } finally {
      setRefreshing(false);
    }
  };

  const getRiskColor = (riskCategory: RiskCategory): string => {
    switch (riskCategory) {
      case RiskCategory.MINIMAL:
        return bioPulseTheme.colors.success;
      case RiskCategory.LOW:
        return bioPulseTheme.colors.info;
      case RiskCategory.MODERATE:
        return bioPulseTheme.colors.warning;
      case RiskCategory.HIGH:
        return bioPulseTheme.colors.error;
      case RiskCategory.CRITICAL:
        return '#d32f2f';
      default:
        return bioPulseTheme.colors.textSecondary;
    }
  };

  const getRiskIcon = (riskCategory: RiskCategory): string => {
    switch (riskCategory) {
      case RiskCategory.MINIMAL:
        return 'check-circle';
      case RiskCategory.LOW:
        return 'info';
      case RiskCategory.MODERATE:
        return 'warning';
      case RiskCategory.HIGH:
        return 'error';
      case RiskCategory.CRITICAL:
        return 'dangerous';
      default:
        return 'help';
    }
  };

  const formatTimeUntilRisk = (riskWindow: Date): string => {
    const now = new Date();
    const diffMs = riskWindow.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      return `${diffMinutes} minutes`;
    } else if (diffHours < 24) {
      return `${diffHours} hours`;
    } else {
      const diffDays = Math.round(diffHours / 24);
      return `${diffDays} days`;
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.titleContainer}>
          <MaterialIcons name="trending-up" size={24} color={bioPulseTheme.colors.primary} />
          <Text style={styles.headerTitle}>Trend Forecast</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshForecast}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={bioPulseTheme.colors.primary} />
          ) : (
            <MaterialIcons name="refresh" size={20} color={bioPulseTheme.colors.primary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'overview', label: 'Overview', icon: 'analytics' },
        { key: 'actions', label: 'Actions', icon: 'assignment' },
        { key: 'timing', label: 'Timing', icon: 'schedule' }
      ].map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, selectedTab === tab.key && styles.activeTab]}
          onPress={() => setSelectedTab(tab.key as any)}
        >
          <MaterialIcons 
            name={tab.icon as any} 
            size={18} 
            color={selectedTab === tab.key ? bioPulseTheme.colors.primary : bioPulseTheme.colors.textSecondary} 
          />
          <Text style={[
            styles.tabLabel,
            selectedTab === tab.key && styles.activeTabLabel
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverview = () => {
    if (!forecast) return null;

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Risk Assessment Card */}
        <View style={styles.riskCard}>
          <LinearGradient
            colors={[getRiskColor(forecast.riskCategory), `${getRiskColor(forecast.riskCategory)}80`]}
            style={styles.riskGradient}
          >
            <View style={styles.riskHeader}>
              <MaterialIcons 
                name={getRiskIcon(forecast.riskCategory) as any} 
                size={32} 
                color="white" 
              />
              <View style={styles.riskInfo}>
                <Text style={styles.riskLevel}>{forecast.riskLevel}/100</Text>
                <Text style={styles.riskCategory}>{forecast.riskCategory.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.riskDescription}>
              Risk window: {formatTimeUntilRisk(forecast.riskWindow)}
            </Text>
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>Confidence: </Text>
              <Text style={styles.confidenceValue}>
                {Math.round(forecast.confidence * 100)}%
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Main Recommendation */}
        <View style={styles.recommendationCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="lightbulb" size={20} color={bioPulseTheme.colors.primary} />
            <Text style={styles.cardTitle}>Recommended Action</Text>
          </View>
          <Text style={styles.recommendationText}>{forecast.recommendedAction}</Text>
        </View>

        {/* Trend Analysis */}
        <View style={styles.trendCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="show-chart" size={20} color={bioPulseTheme.colors.primary} />
            <Text style={styles.cardTitle}>Trend Analysis</Text>
          </View>
          <View style={styles.trendContent}>
            <View style={styles.trendItem}>
              <Text style={styles.trendLabel}>Direction:</Text>
              <View style={styles.trendValue}>
                <MaterialIcons 
                  name={getTrendIcon(forecast.trendAnalysis.direction)} 
                  size={16} 
                  color={getTrendColor(forecast.trendAnalysis.direction)} 
                />
                <Text style={[styles.trendText, { color: getTrendColor(forecast.trendAnalysis.direction) }]}>
                  {forecast.trendAnalysis.direction.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.trendItem}>
              <Text style={styles.trendLabel}>Strength:</Text>
              <Text style={styles.trendText}>
                {Math.round(forecast.trendAnalysis.strength * 100)}%
              </Text>
            </View>
            <View style={styles.trendItem}>
              <Text style={styles.trendLabel}>Duration:</Text>
              <Text style={styles.trendText}>
                {forecast.trendAnalysis.duration} days
              </Text>
            </View>
          </View>
        </View>

        {/* Correlation Factors */}
        {forecast.correlationFactors.length > 0 && (
          <View style={styles.correlationCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="device-hub" size={20} color={bioPulseTheme.colors.primary} />
              <Text style={styles.cardTitle}>Key Correlations</Text>
            </View>
            {forecast.correlationFactors.slice(0, 3).map((factor, index) => (
              <View key={index} style={styles.correlationItem}>
                <View style={styles.correlationHeader}>
                  <Text style={styles.correlationFactor}>{factor.factor}</Text>
                  <Text style={[
                    styles.correlationValue,
                    { color: factor.correlation > 0 ? bioPulseTheme.colors.error : bioPulseTheme.colors.success }
                  ]}>
                    {factor.correlation > 0 ? '+' : ''}{Math.round(factor.correlation * 100)}%
                  </Text>
                </View>
                <Text style={styles.correlationDescription}>{factor.description}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderActions = () => {
    if (!forecast || forecast.preventiveActions.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="assignment-turned-in" size={64} color={bioPulseTheme.colors.textSecondary} />
          <Text style={styles.emptyStateText}>No preventive actions needed</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {forecast.preventiveActions.map((action, index) => (
          <ActionCard key={action.actionId} action={action} />
        ))}
      </ScrollView>
    );
  };

  const renderTiming = () => {
    if (!forecast || forecast.optimalTiming.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="schedule" size={64} color={bioPulseTheme.colors.textSecondary} />
          <Text style={styles.emptyStateText}>No timing recommendations available</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {forecast.optimalTiming.map((timing, index) => (
          <TimingCard key={index} timing={timing} />
        ))}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={bioPulseTheme.colors.primary} />
        <Text style={styles.loadingText}>Generating forecast...</Text>
      </View>
    );
  }

  if (!forecast) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color={bioPulseTheme.colors.error} />
        <Text style={styles.errorText}>Unable to generate forecast</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadForecast}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderTabBar()}
      {selectedTab === 'overview' && renderOverview()}
      {selectedTab === 'actions' && renderActions()}
      {selectedTab === 'timing' && renderTiming()}
    </View>
  );
};

// Helper Components
const ActionCard: React.FC<{ action: PreventiveAction }> = ({ action }) => (
  <View style={[styles.actionCard, { borderLeftColor: getPriorityColor(action.priority) }]}>
    <View style={styles.actionHeader}>
      <View style={styles.actionTitleContainer}>
        <Text style={styles.actionTitle}>{action.title}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(action.priority) }]}>
          <Text style={styles.priorityBadgeText}>{action.priority.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.actionType}>{action.type.replace('_', ' ').toUpperCase()}</Text>
    </View>
    
    <Text style={styles.actionDescription}>{action.description}</Text>
    
    <View style={styles.actionFooter}>
      <View style={styles.actionDetail}>
        <MaterialIcons name="schedule" size={16} color={bioPulseTheme.colors.textSecondary} />
        <Text style={styles.actionDetailText}>{action.timing}</Text>
      </View>
      <View style={styles.actionDetail}>
        <MaterialIcons name="trending-up" size={16} color={bioPulseTheme.colors.textSecondary} />
        <Text style={styles.actionDetailText}>{action.expectedImpact}% impact</Text>
      </View>
    </View>
  </View>
);

const TimingCard: React.FC<{ timing: OptimalTiming }> = ({ timing }) => (
  <View style={styles.timingCard}>
    <View style={styles.timingHeader}>
      <Text style={styles.timingActivity}>{timing.activityType}</Text>
      <Text style={styles.timingTime}>
        {timing.recommendedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
    
    <Text style={styles.timingReasoning}>{timing.reasoning}</Text>
    <Text style={styles.timingBenefit}>Expected: {timing.expectedBenefit}</Text>
    
    <View style={styles.timingWindow}>
      <MaterialIcons name="access-time" size={16} color={bioPulseTheme.colors.textSecondary} />
      <Text style={styles.timingWindowText}>
        {Math.round(timing.timeWindow / 60)}h window
      </Text>
    </View>
  </View>
);

// Helper Functions
const getTrendIcon = (direction: string): string => {
  switch (direction) {
    case 'increasing': return 'trending-up';
    case 'decreasing': return 'trending-down';
    case 'stable': return 'trending-flat';
    default: return 'show-chart';
  }
};

const getTrendColor = (direction: string): string => {
  switch (direction) {
    case 'increasing': return bioPulseTheme.colors.error;
    case 'decreasing': return bioPulseTheme.colors.success;
    case 'stable': return bioPulseTheme.colors.info;
    default: return bioPulseTheme.colors.textSecondary;
  }
};

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent': return bioPulseTheme.colors.error;
    case 'high': return bioPulseTheme.colors.warning;
    case 'medium': return bioPulseTheme.colors.info;
    default: return bioPulseTheme.colors.success;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: bioPulseTheme.colors.background,
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: bioPulseTheme.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: bioPulseTheme.colors.text,
    marginLeft: 8,
  },
  refreshButton: {
    padding: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: bioPulseTheme.colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: bioPulseTheme.colors.primary,
  },
  tabLabel: {
    marginLeft: 6,
    fontSize: 14,
    color: bioPulseTheme.colors.textSecondary,
  },
  activeTabLabel: {
    color: bioPulseTheme.colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: bioPulseTheme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: bioPulseTheme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: bioPulseTheme.colors.background,
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: bioPulseTheme.colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: bioPulseTheme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  riskCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  riskGradient: {
    padding: 20,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskInfo: {
    marginLeft: 16,
  },
  riskLevel: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  riskCategory: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  riskDescription: {
    fontSize: 16,
    color: 'white',
    marginBottom: 8,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  confidenceValue: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  recommendationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: bioPulseTheme.colors.text,
    marginLeft: 8,
  },
  recommendationText: {
    fontSize: 16,
    lineHeight: 24,
    color: bioPulseTheme.colors.text,
  },
  trendCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trendContent: {
    marginTop: 8,
  },
  trendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendLabel: {
    fontSize: 14,
    color: bioPulseTheme.colors.textSecondary,
  },
  trendValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  correlationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  correlationItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: bioPulseTheme.colors.border,
  },
  correlationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  correlationFactor: {
    fontSize: 14,
    fontWeight: '600',
    color: bioPulseTheme.colors.text,
  },
  correlationValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  correlationDescription: {
    fontSize: 12,
    color: bioPulseTheme.colors.textSecondary,
    lineHeight: 16,
  },
  actionCard: {
    backgroundColor: 'white',
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
  actionHeader: {
    marginBottom: 12,
  },
  actionTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: bioPulseTheme.colors.text,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionType: {
    fontSize: 12,
    color: bioPulseTheme.colors.textSecondary,
    fontWeight: '500',
  },
  actionDescription: {
    fontSize: 14,
    color: bioPulseTheme.colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  actionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionDetailText: {
    fontSize: 12,
    color: bioPulseTheme.colors.textSecondary,
    marginLeft: 4,
  },
  timingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timingActivity: {
    fontSize: 16,
    fontWeight: '600',
    color: bioPulseTheme.colors.text,
  },
  timingTime: {
    fontSize: 16,
    fontWeight: '600',
    color: bioPulseTheme.colors.primary,
  },
  timingReasoning: {
    fontSize: 14,
    color: bioPulseTheme.colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  timingBenefit: {
    fontSize: 14,
    color: bioPulseTheme.colors.textSecondary,
    marginBottom: 12,
  },
  timingWindow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timingWindowText: {
    fontSize: 12,
    color: bioPulseTheme.colors.textSecondary,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: bioPulseTheme.colors.textSecondary,
    marginTop: 16,
  },
});

export default TrendForecastPanel;