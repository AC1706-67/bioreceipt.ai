/**
 * Personalized Tips Screen
 * Displays AI-personalized health tips with engagement tracking
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useAIPersonalization } from '../../hooks/useAIPersonalization';
import { HealthTipCard } from '../tips/HealthTipCard';

interface PersonalizedTipsScreenProps {
  userId: string;
  onTipPress?: (tipId: string) => void;
}

export const PersonalizedTipsScreen: React.FC<PersonalizedTipsScreenProps> = ({
  userId,
  onTipPress
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  const {
    personalizedTips,
    loading,
    error,
    confidence,
    fallbackUsed,
    reasoning,
    refreshTips,
    recordEngagement,
    insights,
    aiServiceHealth
  } = useAIPersonalization(userId, 10, {
    excludeViewed: true,
    includeContextualFactors: true
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshTips();
    } finally {
      setRefreshing(false);
    }
  };

  const handleTipEngagement = async (
    tipId: string,
    engagementType: 'view' | 'like' | 'complete' | 'bookmark' | 'skip' | 'share',
    additionalData?: any
  ) => {
    try {
      await recordEngagement(tipId, engagementType, additionalData);
      
      if (onTipPress && engagementType === 'view') {
        onTipPress(tipId);
      }
    } catch (error) {
      console.error('Error recording engagement:', error);
    }
  };

  const handleShowInsights = () => {
    setShowInsights(!showInsights);
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#4CAF50'; // Green
    if (confidence >= 0.6) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  if (loading && personalizedTips.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {aiServiceHealth?.available ? 'Personalizing your tips...' : 'Loading tips...'}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unable to Load Tips</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with personalization info */}
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.headerTitle}>Your Personalized Tips</Text>
          <View style={styles.confidenceContainer}>
            <View style={[styles.confidenceDot, { backgroundColor: getConfidenceColor(confidence) }]} />
            <Text style={styles.confidenceText}>
              {getConfidenceLabel(confidence)} Confidence
            </Text>
          </View>
        </View>
        
        {fallbackUsed && (
          <View style={styles.fallbackNotice}>
            <Text style={styles.fallbackText}>
              💡 Using general recommendations
            </Text>
          </View>
        )}

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.insightsButton} onPress={handleShowInsights}>
            <Text style={styles.insightsButtonText}>
              {showInsights ? 'Hide' : 'Show'} Insights
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Personalization Insights */}
      {showInsights && insights && (
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>Personalization Insights</Text>
          
          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>Profile Completeness:</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${insights.profileCompleteness * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.insightValue}>
              {Math.round(insights.profileCompleteness * 100)}%
            </Text>
          </View>

          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>Engagement Score:</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${insights.engagementScore * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.insightValue}>
              {Math.round(insights.engagementScore * 100)}%
            </Text>
          </View>

          {insights.preferredCategories.length > 0 && (
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Preferred Topics:</Text>
              <Text style={styles.insightValue}>
                {insights.preferredCategories.join(', ')}
              </Text>
            </View>
          )}

          {insights.recommendedImprovements.length > 0 && (
            <View style={styles.improvementsContainer}>
              <Text style={styles.improvementsTitle}>Suggestions:</Text>
              {insights.recommendedImprovements.map((improvement, index) => (
                <Text key={index} style={styles.improvementItem}>
                  • {improvement}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* AI Service Status */}
      {aiServiceHealth && !aiServiceHealth.available && (
        <View style={styles.serviceStatusContainer}>
          <Text style={styles.serviceStatusText}>
            ⚠️ AI personalization temporarily unavailable
          </Text>
        </View>
      )}

      {/* Tips List */}
      <ScrollView
        style={styles.tipsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {personalizedTips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Tips Available</Text>
            <Text style={styles.emptyMessage}>
              Try adjusting your preferences or check back later for new content.
            </Text>
          </View>
        ) : (
          personalizedTips.map((tip, index) => (
            <View key={tip.id} style={styles.tipContainer}>
              <HealthTipCard
                tip={tip}
                onPress={() => handleTipEngagement(tip.id, 'view')}
                onLike={() => handleTipEngagement(tip.id, 'like')}
                onBookmark={() => handleTipEngagement(tip.id, 'bookmark')}
                onComplete={() => handleTipEngagement(tip.id, 'complete')}
                onShare={() => handleTipEngagement(tip.id, 'share')}
                showPersonalizationBadge={!fallbackUsed}
              />
              
              {/* Show reasoning for first few tips */}
              {index < 2 && reasoning.length > 0 && !fallbackUsed && (
                <View style={styles.reasoningContainer}>
                  <Text style={styles.reasoningTitle}>Why this tip?</Text>
                  <Text style={styles.reasoningText}>
                    {reasoning[index] || reasoning[0]}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}

        {/* Load more button */}
        {personalizedTips.length > 0 && (
          <TouchableOpacity style={styles.loadMoreButton} onPress={handleRefresh}>
            <Text style={styles.loadMoreText}>Load More Tips</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500'
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  headerMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  confidenceText: {
    fontSize: 12,
    color: '#666'
  },
  fallbackNotice: {
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8
  },
  fallbackText: {
    fontSize: 12,
    color: '#856404'
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  insightsButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4
  },
  insightsButtonText: {
    color: '#1976d2',
    fontSize: 12,
    fontWeight: '500'
  },
  refreshButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4
  },
  refreshButtonText: {
    color: '#333',
    fontSize: 12
  },
  insightsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  insightLabel: {
    fontSize: 14,
    color: '#666',
    width: 120
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginHorizontal: 8
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2
  },
  insightValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    minWidth: 40
  },
  improvementsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  improvementsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6
  },
  improvementItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2
  },
  serviceStatusContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107'
  },
  serviceStatusText: {
    fontSize: 14,
    color: '#856404'
  },
  tipsContainer: {
    flex: 1
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  tipContainer: {
    marginBottom: 16
  },
  reasoningContainer: {
    backgroundColor: '#e8f5e8',
    margin: 16,
    marginTop: 0,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50'
  },
  reasoningTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2e7d32',
    marginBottom: 4
  },
  reasoningText: {
    fontSize: 12,
    color: '#388e3c'
  },
  loadMoreButton: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  loadMoreText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500'
  }
});

export default PersonalizedTipsScreen;