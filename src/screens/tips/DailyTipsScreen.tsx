/**
 * Daily Tips Screen Component
 * Shows personalized daily health tips
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useAppSelector } from '../../hooks/redux';
import { selectUser } from '../../store/authSlice';
import { UserAction } from '../../types';
import { TipCard } from '../../components/tips/TipCard';
import { useDailyTips } from '../../hooks/useHealthTips';
import { useScreenTracking, useAnalytics } from '../../hooks/useAnalytics';

export const DailyTipsScreen: React.FC = () => {
  const user = useAppSelector(selectUser);
  const [refreshing, setRefreshing] = useState(false);

  // Use the daily tips hook
  const {
    dailyTips,
    loading,
    error,
    handleTipAction: hookHandleTipAction,
    refreshDailyTips,
  } = useDailyTips();

  const { trackTipInteraction, trackPerformance } = useAnalytics();
  
  // Track screen view
  useScreenTracking('DailyTipsScreen', {
    tipCount: dailyTips.length,
    hasUser: !!user,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    const startTime = Date.now();
    
    try {
      await refreshDailyTips();
      
      // Track performance
      if (user) {
        trackPerformance('daily_tips_refresh_time', Date.now() - startTime, {
          tipCount: dailyTips.length,
          userId: user.id,
        });
      }
    } catch (refreshError) {
      Alert.alert('Error', 'Failed to refresh daily tips. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleTipAction = async (tipId: string, action: UserAction) => {
    if (!user) return;

    try {
      // Use the hook's action handler
      await hookHandleTipAction(tipId, action);
      
      // Track analytics
      const tip = dailyTips.find(t => t.id === tipId);
      if (tip) {
        trackTipInteraction(action, tipId, {
          title: tip.title,
          category: tip.category,
        });
      }
      
      // Show feedback for completed tips
      if (action === 'complete') {
        Alert.alert(
          'Great Job! 🎉',
          'You completed a health tip! Keep up the great work on your wellness journey.',
          [{ text: 'Continue', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Error recording tip action:', error);
      Alert.alert('Error', 'Failed to record your action. Please try again.');
    }
  };

  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading your daily tips...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Please sign in to view your daily tips.</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unable to Load Daily Tips</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {getGreeting()}, {user.name}! 👋
        </Text>
        <Text style={styles.date}>{getCurrentDate()}</Text>
        <Text style={styles.subtitle}>
          Here are your personalized health tips for today
        </Text>
      </View>

      <View style={styles.tipsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Tips</Text>
          <Text style={styles.tipCount}>{dailyTips.length} tips</Text>
        </View>

        {dailyTips.length > 0 ? (
          dailyTips.map((tip, index) => (
            <View key={tip.id} style={styles.tipWrapper}>
              <View style={styles.tipNumber}>
                <Text style={styles.tipNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.tipCardContainer}>
                <TipCard
                  tip={tip}
                  onAction={handleTipAction}
                  // In a real app, these would come from user interaction state
                  isLiked={false}
                  isBookmarked={false}
                  isCompleted={false}
                />
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Tips Available</Text>
            <Text style={styles.emptyStateText}>
              We're preparing personalized tips for you. Please check back later!
            </Text>
          </View>
        )}
      </View>

      <View style={styles.motivationalSection}>
        <Text style={styles.motivationalTitle}>💪 Keep Going!</Text>
        <Text style={styles.motivationalText}>
          Small daily actions lead to big health improvements. You're doing great!
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tips are personalized based on your health interests and progress.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
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
  },
  header: {
    marginBottom: 30,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#5a6c7d',
    lineHeight: 22,
  },
  tipsContainer: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  tipCount: {
    fontSize: 14,
    color: '#6c757d',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tipWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  tipNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 8,
  },
  tipNumberText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tipCardContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 22,
  },
  motivationalSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  motivationalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  motivationalText: {
    fontSize: 16,
    color: '#5a6c7d',
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 8,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3498db',
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});