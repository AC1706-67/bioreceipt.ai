/**
 * Error Monitoring Dashboard
 * Real-time dashboard for monitoring error patterns and system health
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import {
  ErrorMetrics,
  ErrorPattern,
  ErrorCategory,
  ErrorSeverity,
  EnhancedError
} from '../../types/errors';
import { errorAnalyticsService } from '../../services/error/errorAnalyticsService';
import { errorReportingService } from '../../services/error/errorReportingService';
import { enhancedErrorHandler } from '../../services/error/enhancedErrorHandler';

const { width } = Dimensions.get('window');

interface Props {
  onErrorSelect?: (error: EnhancedError) => void;
  onPatternSelect?: (pattern: ErrorPattern) => void;
  refreshInterval?: number;
}

const ErrorMonitoringDashboard: React.FC<Props> = ({
  onErrorSelect,
  onPatternSelect,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [metrics, setMetrics] = useState<ErrorMetrics | null>(null);
  const [patterns, setPatterns] = useState<ErrorPattern[]>([]);
  const [recentErrors, setRecentErrors] = useState<EnhancedError[]>([]);
  const [insights, setInsights] = useState<{
    criticalIssues: string[];
    recommendations: string[];
    trends: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load dashboard data
  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    try {
      const [
        metricsData,
        patternsData,
        recentErrorsData,
        insightsData
      ] = await Promise.all([
        errorAnalyticsService.getErrorMetrics(forceRefresh),
        errorAnalyticsService.getErrorPatterns(),
        enhancedErrorHandler.getRecentErrors(20),
        errorAnalyticsService.getErrorInsights()
      ]);

      setMetrics(metricsData);
      setPatterns(patternsData);
      setRecentErrors(recentErrorsData);
      setInsights(insightsData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    }
  }, []);

  // Initial load
  useEffect(() => {
    const initializeDashboard = async () => {
      setIsLoading(true);
      await loadDashboardData(true);
      setIsLoading(false);
    };

    initializeDashboard();
  }, [loadDashboardData]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData(false);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [loadDashboardData, refreshInterval]);

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadDashboardData(true);
    setIsRefreshing(false);
  }, [loadDashboardData]);

  // Generate manual report
  const handleGenerateReport = useCallback(async () => {
    try {
      Alert.alert(
        'Generate Report',
        'Generate a comprehensive error report?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Generate',
            onPress: async () => {
              const report = await errorReportingService.generateManualReport();
              if (report) {
                Alert.alert('Success', 'Error report generated successfully');
              } else {
                Alert.alert('Info', 'No recent errors to report');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report');
    }
  }, []);

  // Clear analytics data
  const handleClearData = useCallback(async () => {
    Alert.alert(
      'Clear Data',
      'This will clear all error analytics data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await errorAnalyticsService.clearAllData();
              await loadDashboardData(true);
              Alert.alert('Success', 'Analytics data cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          }
        }
      ]
    );
  }, [loadDashboardData]);

  // Render severity indicator
  const renderSeverityIndicator = (severity: ErrorSeverity) => {
    const colors = {
      [ErrorSeverity.CRITICAL]: '#FF3B30',
      [ErrorSeverity.HIGH]: '#FF9500',
      [ErrorSeverity.MEDIUM]: '#FFCC00',
      [ErrorSeverity.LOW]: '#34C759'
    };

    return (
      <View style={[styles.severityIndicator, { backgroundColor: colors[severity] }]} />
    );
  };

  // Render metric card
  const renderMetricCard = (title: string, value: string | number, subtitle?: string, color?: string) => (
    <View style={[styles.metricCard, color && { borderLeftColor: color }]}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={[styles.metricValue, color && { color }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  // Render error category distribution
  const renderCategoryDistribution = () => {
    if (!metrics?.topErrorCategories.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Error Categories</Text>
        {metrics.topErrorCategories.slice(0, 5).map((category, index) => (
          <View key={category.category} style={styles.categoryItem}>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>{category.category}</Text>
              <Text style={styles.categoryCount}>{category.count} errors</Text>
            </View>
            <View style={styles.categoryBar}>
              <View 
                style={[
                  styles.categoryBarFill,
                  { width: `${category.percentage}%` }
                ]} 
              />
            </View>
            <Text style={styles.categoryPercentage}>{category.percentage.toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    );
  };

  // Render error patterns
  const renderErrorPatterns = () => {
    if (!patterns.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Error Patterns</Text>
        {patterns.slice(0, 5).map((pattern, index) => (
          <TouchableOpacity
            key={pattern.id}
            style={styles.patternItem}
            onPress={() => onPatternSelect?.(pattern)}
          >
            <View style={styles.patternHeader}>
              {renderSeverityIndicator(pattern.severity)}
              <Text style={styles.patternDescription}>{pattern.description}</Text>
            </View>
            <View style={styles.patternStats}>
              <Text style={styles.patternFrequency}>Frequency: {pattern.frequency}</Text>
              <Text style={styles.patternUsers}>Users: {pattern.affectedUsers}</Text>
            </View>
            <Text style={styles.patternLastSeen}>
              Last seen: {pattern.lastSeen.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render recent errors
  const renderRecentErrors = () => {
    if (!recentErrors.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Errors</Text>
        {recentErrors.slice(0, 10).map((error, index) => (
          <TouchableOpacity
            key={error.errorId}
            style={styles.errorItem}
            onPress={() => onErrorSelect?.(error)}
          >
            <View style={styles.errorHeader}>
              {renderSeverityIndicator(error.severity)}
              <Text style={styles.errorCode}>{error.errorCode}</Text>
              <Text style={styles.errorTime}>
                {error.timestamp.toLocaleTimeString()}
              </Text>
            </View>
            <Text style={styles.errorMessage} numberOfLines={2}>
              {error.userMessage}
            </Text>
            <Text style={styles.errorContext}>
              {error.context.currentScreen} • {error.category}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render insights
  const renderInsights = () => {
    if (!insights) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Insights</Text>
        
        {insights.criticalIssues.length > 0 && (
          <View style={styles.insightGroup}>
            <Text style={styles.insightGroupTitle}>🚨 Critical Issues</Text>
            {insights.criticalIssues.map((issue, index) => (
              <Text key={index} style={styles.criticalIssue}>{issue}</Text>
            ))}
          </View>
        )}

        {insights.recommendations.length > 0 && (
          <View style={styles.insightGroup}>
            <Text style={styles.insightGroupTitle}>💡 Recommendations</Text>
            {insights.recommendations.map((recommendation, index) => (
              <Text key={index} style={styles.recommendation}>{recommendation}</Text>
            ))}
          </View>
        )}

        {insights.trends.length > 0 && (
          <View style={styles.insightGroup}>
            <Text style={styles.insightGroupTitle}>📈 Trends</Text>
            {insights.trends.map((trend, index) => (
              <Text key={index} style={styles.trend}>{trend}</Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Error Monitoring</Text>
        <Text style={styles.lastUpdated}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </Text>
      </View>

      {/* Key Metrics */}
      {metrics && (
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Total Errors',
            metrics.totalErrors,
            'Last 7 days',
            metrics.totalErrors > 100 ? '#FF3B30' : '#34C759'
          )}
          {renderMetricCard(
            'Error Rate',
            `${(metrics.errorRate * 100).toFixed(2)}%`,
            'Per session',
            metrics.errorRate > 0.05 ? '#FF9500' : '#34C759'
          )}
          {renderMetricCard(
            'Critical Rate',
            `${(metrics.criticalErrorRate * 100).toFixed(2)}%`,
            'Critical errors',
            metrics.criticalErrorRate > 0.01 ? '#FF3B30' : '#34C759'
          )}
          {renderMetricCard(
            'Recovery Rate',
            `${(metrics.recoverySuccessRate * 100).toFixed(1)}%`,
            'Auto-resolved',
            metrics.recoverySuccessRate < 0.7 ? '#FF9500' : '#34C759'
          )}
        </View>
      )}

      {/* User Impact Score */}
      {metrics && (
        <View style={styles.impactSection}>
          <Text style={styles.impactTitle}>User Impact Score</Text>
          <View style={styles.impactBar}>
            <View 
              style={[
                styles.impactBarFill,
                { 
                  width: `${metrics.userImpactScore}%`,
                  backgroundColor: metrics.userImpactScore > 60 ? '#FF3B30' : 
                                 metrics.userImpactScore > 30 ? '#FF9500' : '#34C759'
                }
              ]} 
            />
          </View>
          <Text style={styles.impactScore}>{metrics.userImpactScore.toFixed(1)}/100</Text>
        </View>
      )}

      {/* Category Distribution */}
      {renderCategoryDistribution()}

      {/* Error Patterns */}
      {renderErrorPatterns()}

      {/* Recent Errors */}
      {renderRecentErrors()}

      {/* Insights */}
      {renderInsights()}

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionButton} onPress={handleGenerateReport}>
          <Text style={styles.actionButtonText}>Generate Report</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.dangerButton]} 
          onPress={handleClearData}
        >
          <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Clear Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
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
    fontSize: 12,
    color: '#666',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    width: (width - 44) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  metricTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 10,
    color: '#999',
  },
  impactSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  impactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  impactBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
  },
  impactBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  impactScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  categoryCount: {
    fontSize: 12,
    color: '#666',
  },
  categoryBar: {
    flex: 2,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginHorizontal: 12,
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#666',
    width: 40,
    textAlign: 'right',
  },
  patternItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    marginBottom: 8,
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  patternDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  patternStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  patternFrequency: {
    fontSize: 12,
    color: '#666',
  },
  patternUsers: {
    fontSize: 12,
    color: '#666',
  },
  patternLastSeen: {
    fontSize: 10,
    color: '#999',
  },
  errorItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    marginBottom: 8,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  errorCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
    flex: 1,
  },
  errorTime: {
    fontSize: 10,
    color: '#999',
  },
  errorMessage: {
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
  },
  errorContext: {
    fontSize: 11,
    color: '#666',
  },
  severityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  insightGroup: {
    marginBottom: 16,
  },
  insightGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  criticalIssue: {
    fontSize: 13,
    color: '#FF3B30',
    marginBottom: 4,
    paddingLeft: 8,
  },
  recommendation: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 4,
    paddingLeft: 8,
  },
  trend: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    paddingLeft: 8,
  },
  actionsSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  dangerButtonText: {
    color: '#fff',
  },
});

export default ErrorMonitoringDashboard;