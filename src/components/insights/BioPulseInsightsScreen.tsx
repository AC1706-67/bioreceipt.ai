/**
 * BioPulse Insights Screen
 * Advanced AI-powered insights and recommendations display
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

import { bioPulseAnalysisEngine, BioPulseAnalysis } from '../../services/analysis/bioPulseAnalysisEngine';
import { bioPulseAIService, AIInsightResponse, AIRecommendation, AIWarning } from '../../services/ai/bioPulseAIService';
import { bioPulseSafetyAlertService, SafetyAlert } from '../../services/alerts/bioPulseSafetyAlertService';
import { intakeLoggingService } from '../../services/substance/intakeLoggingService';
import { bioPulseTheme } from '../../constants/bioPulseTheme';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import TrendForecastPanel from './TrendForecastPanel';

const { width } = Dimensions.get('window');

interface InsightsScreenProps {
  userId: string;
}

export const BioPulseInsightsScreen: React.FC<InsightsScreenProps> = ({ userId }) => {
  const [analysis, setAnalysis] = useState<BioPulseAnalysis | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsightResponse | null>(null);
  const [safetyAlerts, setSafetyAlerts] = useState<SafetyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'recommendations' | 'alerts' | 'forecast'>('overview');
  
  const { handleError } = useErrorHandler();
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    loadInsights();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [userId]);

  const loadInsights = useCallback(async () => {
    try {
      setLoading(true);

      // Load analysis
      const analysisResult = await bioPulseAnalysisEngine.analyzeCurrentState(userId);
      setAnalysis(analysisResult);

      // Get recent intakes for AI context
      const recentIntakes = await intakeLoggingService.getRecentIntakes(userId, 24);

      // Generate AI insights
      const aiResult = await bioPulseAIService.generateInsights(analysisResult, recentIntakes);
      setAiInsights(aiResult);

      // Process safety alerts
      const alerts = await bioPulseSafetyAlertService.processAnalysisForAlerts(analysisResult, aiResult);
      const activeAlerts = await bioPulseSafetyAlertService.getActiveAlerts(userId);
      setSafetyAlerts(activeAlerts);

    } catch (error) {
      handleError(error, 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [userId, handleError]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  }, [loadInsights]);

  const handleAlertAcknowledge = async (alertId: string) => {
    try {
      await bioPulseSafetyAlertService.acknowledgeAlert(userId, alertId);
      setSafetyAlerts(prev => prev.map(alert => 
        alert.alertId === alertId ? { ...alert, acknowledged: true } : alert
      ));
    } catch (error) {
      handleError(error, 'Failed to acknowledge alert');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={[bioPulseTheme.colors.primary, bioPulseTheme.colors.secondary]}
        style={styles.headerGradient}
      >
        <Text style={styles.headerTitle}>BioPulse Insights</Text>
        <Text style={styles.headerSubtitle}>AI-Powered Analysis & Recommendations</Text>
      </LinearGradient>
    </View>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'overview', label: 'Overview', icon: 'analytics' },
        { key: 'recommendations', label: 'Recommendations', icon: 'lightbulb' },
        { key: 'alerts', label: 'Alerts', icon: 'warning' },
        { key: 'forecast', label: 'Forecast', icon: 'trending-up' }
      ].map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, selectedTab === tab.key && styles.activeTab]}
          onPress={() => setSelectedTab(tab.key as any)}
        >
          <MaterialIcons 
            name={tab.icon as any} 
            size={20} 
            color={selectedTab === tab.key ? bioPulseTheme.colors.primary : bioPulseTheme.colors.textSecondary} 
          />
          <Text style={[
            styles.tabLabel,
            selectedTab === tab.key && styles.activeTabLabel
          ]}>
            {tab.label}
          </Text>
          {tab.key === 'alerts' && safetyAlerts.filter(a => !a.acknowledged).length > 0 && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>
                {safetyAlerts.filter(a => !a.acknowledged).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverview = () => {
    if (!analysis || !aiInsights) return null;

    return (
      <View style={styles.overviewContainer}>
        {/* Executive Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="summarize" size={24} color={bioPulseTheme.colors.primary} />
            <Text style={styles.cardTitle}>Executive Summary</Text>
          </View>
          <Text style={styles.summaryText}>{aiInsights.summary}</Text>
        </View>

        {/* Impact Score Visualization */}
        <View style={styles.impactCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="speed" size={24} color={bioPulseTheme.colors.primary} />
            <Text style={styles.cardTitle}>Impact Analysis</Text>
          </View>
          
          <View style={styles.impactScoreContainer}>
            <View style={styles.overallScore}>
              <Text style={styles.scoreValue}>{analysis.impactScore.overall}</Text>
              <Text style={styles.scoreLabel}>Overall Impact</Text>
              <Text style={[styles.trendLabel, { color: getTrendColor(analysis.impactScore.trend) }]}>
                {analysis.impactScore.trend.toUpperCase()}
              </Text>
            </View>
            
            <View style={styles.categoryScores}>
              {Object.entries(analysis.impactScore.categories).map(([category, score]) => (
                <View key={category} style={styles.categoryScore}>
                  <Text style={styles.categoryLabel}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
                  <View style={styles.scoreBar}>
                    <View 
                      style={[
                        styles.scoreBarFill, 
                        { width: `${score}%`, backgroundColor: getScoreColor(score) }
                      ]} 
                    />
                  </View>
                  <Text style={styles.categoryValue}>{score}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Recovery Timeline */}
        {analysis.recoveryTimeline.phases.length > 0 && (
          <View style={styles.timelineCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="timeline" size={24} color={bioPulseTheme.colors.primary} />
              <Text style={styles.cardTitle}>Recovery Timeline</Text>
            </View>
            
            <View style={styles.timelineContainer}>
              <Text style={styles.timelineTotal}>
                Total Duration: {Math.round(analysis.recoveryTimeline.totalDuration)} hours
              </Text>
              
              {analysis.recoveryTimeline.phases.map((phase, index) => (
                <View key={index} style={styles.timelinePhase}>
                  <View style={[styles.phaseIndicator, { backgroundColor: getPriorityColor(phase.priority) }]} />
                  <View style={styles.phaseContent}>
                    <Text style={styles.phaseName}>{phase.name}</Text>
                    <Text style={styles.phaseDescription}>{phase.description}</Text>
                    <Text style={styles.phaseDuration}>
                      Duration: {Math.round(phase.duration)} hours
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Key Insights */}
        {analysis.personalizedInsights.length > 0 && (
          <View style={styles.insightsCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="insights" size={24} color={bioPulseTheme.colors.primary} />
              <Text style={styles.cardTitle}>Key Insights</Text>
            </View>
            
            {analysis.personalizedInsights.slice(0, 3).map((insight, index) => (
              <View key={insight.insightId} style={styles.insightItem}>
                <View style={styles.insightHeader}>
                  <Text style={styles.insightIcon}>{getInsightIcon(insight.type)}</Text>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightConfidence}>{Math.round(insight.confidence * 100)}%</Text>
                </View>
                <Text style={styles.insightDescription}>{insight.description}</Text>
                {insight.actionable && insight.actions && (
                  <View style={styles.insightActions}>
                    {insight.actions.slice(0, 2).map((action, actionIndex) => (
                      <Text key={actionIndex} style={styles.actionItem}>• {action}</Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderRecommendations = () => {
    if (!aiInsights || aiInsights.recommendations.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="lightbulb-outline" size={64} color={bioPulseTheme.colors.textSecondary} />
          <Text style={styles.emptyStateText}>No recommendations available</Text>
        </View>
      );
    }

    return (
      <View style={styles.recommendationsContainer}>
        {aiInsights.recommendations.map((recommendation, index) => (
          <RecommendationCard key={recommendation.id} recommendation={recommendation} />
        ))}
      </View>
    );
  };

  const renderAlerts = () => {
    const unacknowledgedAlerts = safetyAlerts.filter(alert => !alert.acknowledged);
    const acknowledgedAlerts = safetyAlerts.filter(alert => alert.acknowledged);

    if (safetyAlerts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="security" size={64} color={bioPulseTheme.colors.success} />
          <Text style={styles.emptyStateText}>All clear! No active alerts</Text>
        </View>
      );
    }

    return (
      <View style={styles.alertsContainer}>
        {unacknowledgedAlerts.length > 0 && (
          <>
            <Text style={styles.alertSectionTitle}>Active Alerts</Text>
            {unacknowledgedAlerts.map(alert => (
              <AlertCard 
                key={alert.alertId} 
                alert={alert} 
                onAcknowledge={() => handleAlertAcknowledge(alert.alertId)}
              />
            ))}
          </>
        )}
        
        {acknowledgedAlerts.length > 0 && (
          <>
            <Text style={styles.alertSectionTitle}>Acknowledged Alerts</Text>
            {acknowledgedAlerts.map(alert => (
              <AlertCard key={alert.alertId} alert={alert} />
            ))}
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="analytics" size={48} color={bioPulseTheme.colors.primary} />
        <Text style={styles.loadingText}>Analyzing your data...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {renderHeader()}
      {renderTabBar()}
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'recommendations' && renderRecommendations()}
        {selectedTab === 'alerts' && renderAlerts()}
        {selectedTab === 'forecast' && (
          <TrendForecastPanel 
            userId={userId} 
            onForecastUpdate={(forecast) => {
              // Handle forecast updates if needed
            }}
          />
        )}
      </ScrollView>
    </Animated.View>
  );
};

// Helper Components
const RecommendationCard: React.FC<{ recommendation: AIRecommendation }> = ({ recommendation }) => (
  <View style={[styles.recommendationCard, { borderLeftColor: getPriorityColor(recommendation.priority) }]}>
    <View style={styles.recommendationHeader}>
      <View style={styles.recommendationTitleContainer}>
        <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(recommendation.priority) }]}>
          <Text style={styles.priorityBadgeText}>{recommendation.priority.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.recommendationType}>{recommendation.type.replace('_', ' ').toUpperCase()}</Text>
    </View>
    
    <Text style={styles.recommendationDescription}>{recommendation.description}</Text>
    
    {recommendation.actionSteps.length > 0 && (
      <View style={styles.actionStepsContainer}>
        <Text style={styles.actionStepsTitle}>Action Steps:</Text>
        {recommendation.actionSteps.map((step, index) => (
          <Text key={index} style={styles.actionStep}>• {step}</Text>
        ))}
      </View>
    )}
    
    <View style={styles.recommendationFooter}>
      <Text style={styles.timeframe}>⏱️ {recommendation.timeframe}</Text>
      <Text style={styles.expectedOutcome}>🎯 {recommendation.expectedOutcome}</Text>
    </View>
  </View>
);

const AlertCard: React.FC<{ alert: SafetyAlert; onAcknowledge?: () => void }> = ({ alert, onAcknowledge }) => (
  <View style={[styles.alertCard, { borderLeftColor: getSeverityColor(alert.severity) }]}>
    <View style={styles.alertHeader}>
      <View style={styles.alertTitleContainer}>
        <Text style={styles.alertIcon}>{getSeverityIcon(alert.severity)}</Text>
        <Text style={styles.alertTitle}>{alert.title}</Text>
      </View>
      <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) }]}>
        <Text style={styles.severityBadgeText}>{alert.severity.toUpperCase()}</Text>
      </View>
    </View>
    
    <Text style={styles.alertMessage}>{alert.message}</Text>
    
    {alert.immediateActions.length > 0 && (
      <View style={styles.immediateActionsContainer}>
        <Text style={styles.immediateActionsTitle}>Immediate Actions:</Text>
        {alert.immediateActions.slice(0, 3).map((action, index) => (
          <Text key={index} style={styles.immediateAction}>• {action.description}</Text>
        ))}
      </View>
    )}
    
    <View style={styles.alertFooter}>
      <Text style={styles.alertTimestamp}>
        {alert.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
      {onAcknowledge && (
        <TouchableOpacity style={styles.acknowledgeButton} onPress={onAcknowledge}>
          <Text style={styles.acknowledgeButtonText}>Acknowledge</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// Helper Functions
const getTrendColor = (trend: string) => {
  switch (trend) {
    case 'improving': return bioPulseTheme.colors.success;
    case 'declining': return bioPulseTheme.colors.error;
    default: return bioPulseTheme.colors.warning;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return bioPulseTheme.colors.error;
  if (score >= 60) return bioPulseTheme.colors.warning;
  if (score >= 40) return bioPulseTheme.colors.info;
  return bioPulseTheme.colors.success;
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': case 'critical': return bioPulseTheme.colors.error;
    case 'high': return bioPulseTheme.colors.warning;
    case 'medium': return bioPulseTheme.colors.info;
    default: return bioPulseTheme.colors.success;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': case 'emergency': return bioPulseTheme.colors.error;
    case 'warning': return bioPulseTheme.colors.warning;
    case 'caution': return bioPulseTheme.colors.info;
    default: return bioPulseTheme.colors.textSecondary;
  }
};

const getInsightIcon = (type: string) => {
  const icons = {
    pattern: '📊',
    optimization: '💡',
    warning: '⚠️',
    achievement: '🎯'
  };
  return icons[type] || '•';
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical': case 'emergency': return '🚨';
    case 'warning': return '⚠️';
    case 'caution': return '🔶';
    default: return 'ℹ️';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: bioPulseTheme.colors.background,
  },
  header: {
    height: 120,
    overflow: 'hidden',
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
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
    position: 'relative',
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
  alertBadge: {
    position: 'absolute',
    top: 4,
    right: 8,
    backgroundColor: bioPulseTheme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
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
  overviewContainer: {
    padding: 16,
  },
  summaryCard: {
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
    fontSize: 18,
    fontWeight: '600',
    color: bioPulseTheme.colors.text,
    marginLeft: 8,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: bioPulseTheme.colors.text,
  },
  impactCard: {
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
  impactScoreContainer: {
    flexDirection: 'row',
  },
  overallScore: {
    flex: 1,
    alignItems: 'center',
    paddingRight: 16,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: bioPulseTheme.colors.primary,
  },
  scoreLabel: {
    fontSize: 14,
    color: bioPulseTheme.colors.textSecondary,
    marginBottom: 4,
  },
  trendLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryScores: {
    flex: 2,
  },
  categoryScore: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    width: 80,
    fontSize: 14,
    color: bioPulseTheme.colors.text,
  },
  scoreBar: {
    flex: 1,
    height: 8,
    backgroundColor: bioPulseTheme.colors.border,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryValue: {
    width: 30,
    fontSize: 14,
    fontWeight: '600',
    color: bioPulseTheme.colors.text,
    textAlign: 'right',
  },
  timelineCard: {
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
  timelineContainer: {
    marginTop: 8,
  },
  timelineTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: bioPulseTheme.colors.text,
    marginBottom: 16,
  },
  timelinePhase: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  phaseIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },
  phaseContent: {
    flex: 1,
  },
  phaseName: {
    fontSize: 16,
    fontWeight: '600',
    color: bioPulseTheme.colors.text,
    marginBottom: 4,
  },
  phaseDescription: {
    fontSize: 14,
    color: bioPulseTheme.colors.textSecondary,
    marginBottom: 4,
  },
  phaseDuration: {
    fontSize: 12,
    color: bioPulseTheme.colors.textSecondary,
  },
  insightsCard: {
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
  insightItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: bioPulseTheme.colors.border,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  insightTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: bioPulseTheme.colors.text,
  },
  insightConfidence: {
    fontSize: 12,
    color: bioPulseTheme.colors.textSecondary,
    backgroundColor: bioPulseTheme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  insightDescription: {
    fontSize: 14,
    color: bioPulseTheme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  insightActions: {
    marginTop: 8,
  },
  actionItem: {
    fontSize: 14,
    color: bioPulseTheme.colors.text,
    marginBottom: 4,
  },
  recommendationsContainer: {
    padding: 16,
  },
  recommendationCard: {
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
  recommendationHeader: {
    marginBottom: 12,
  },
  recommendationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recommendationTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: bioPulseTheme.colors.text,
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
  recommendationType: {
    fontSize: 12,
    color: bioPulseTheme.colors.textSecondary,
    fontWeight: '500',
  },
  recommendationDescription: {
    fontSize: 16,
    color: bioPulseTheme.colors.text,
    lineHeight: 24,
    marginBottom: 12,
  },
  actionStepsContainer: {
    marginBottom: 12,
  },
  actionStepsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: bioPulseTheme.colors.text,
    marginBottom: 8,
  },
  actionStep: {
    fontSize: 14,
    color: bioPulseTheme.colors.textSecondary,
    marginBottom: 4,
  },
  recommendationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeframe: {
    fontSize: 12,
    color: bioPulseTheme.colors.textSecondary,
  },
  expectedOutcome: {
    fontSize: 12,
    color: bioPulseTheme.colors.textSecondary,
    flex: 1,
    textAlign: 'right',
  },
  alertsContainer: {
    padding: 16,
  },
  alertSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: bioPulseTheme.colors.text,
    marginBottom: 12,
  },
  alertCard: {
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
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  alertTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  alertTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: bioPulseTheme.colors.text,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  severityBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  alertMessage: {
    fontSize: 14,
    color: bioPulseTheme.colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  immediateActionsContainer: {
    marginBottom: 12,
  },
  immediateActionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: bioPulseTheme.colors.text,
    marginBottom: 8,
  },
  immediateAction: {
    fontSize: 14,
    color: bioPulseTheme.colors.textSecondary,
    marginBottom: 4,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertTimestamp: {
    fontSize: 12,
    color: bioPulseTheme.colors.textSecondary,
  },
  acknowledgeButton: {
    backgroundColor: bioPulseTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  acknowledgeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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

export default BioPulseInsightsScreen;