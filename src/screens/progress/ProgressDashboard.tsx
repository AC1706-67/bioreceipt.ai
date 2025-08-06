import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { progressTrackingService } from '../../services/progress/progressTrackingService';
import { progressAnalyticsService } from '../../services/progress/progressAnalyticsService';
import { streakCalculationService } from '../../services/progress/streakCalculationService';
import { milestoneService } from '../../services/progress/milestoneService';
import { UserProgress, ProgressAnalytics, Milestone, Achievement, StreakData } from '../../types/progress';
import { ProgressCard } from '../../components/progress/ProgressCard';
import { StreakDisplay } from '../../components/progress/StreakDisplay';
import { MilestonesView } from '../../components/progress/MilestonesView';
import { WeeklyProgressChart } from '../../components/progress/WeeklyProgressChart';
import { AchievementGallery } from '../../components/progress/AchievementGallery';
import { ProgressInsights } from '../../components/progress/ProgressInsights';
import { useAuth } from '../../hooks/useAuth';
import { analyticsService } from '../../services/analytics/analyticsService';

const { width } = Dimensions.get('window');

interface ProgressDashboardState {
  userProgress: UserProgress | null;
  analytics: ProgressAnalytics | null;
  streakData: StreakData | null;
  milestones: Milestone[];
  achievements: Achievement[];
  progressScore: any;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

export const ProgressDashboard: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [state, setState] = useState<ProgressDashboardState>({
    userProgress: null,
    analytics: null,
    streakData: null,
    milestones: [],
    achievements: [],
    progressScore: null,
    isLoading: true,
    isRefreshing: false,
    error: null
  });

  const loadProgressData = useCallback(async (showRefresh = false) => {
    if (!user?.id) return;

    try {
      setState(prev => ({ 
        ...prev, 
        isLoading: !showRefresh, 
        isRefreshing: showRefresh,
        error: null 
      }));

      // Load all progress data in parallel
      const [
        userProgress,
        analytics,
        streakData,
        milestones,
        achievements,
        progressScore
      ] = await Promise.all([
        progressTrackingService.getUserProgress(user.id),
        progressAnalyticsService.generateProgressAnalytics(user.id, 'month'),
        streakCalculationService.calculateStreakMetrics(user.id, 'daily', 
          { tipId: '', userId: user.id, action: 'view', timestamp: new Date() },
          { readingTime: 0, interactionCount: 0, completionRate: 1, retentionScore: 1, applicationAttempted: false, feedbackProvided: false }
        ).catch(() => null), // Graceful fallback
        milestoneService.getUserMilestones(user.id, { includeCompleted: false }),
        progressTrackingService.getUserAchievements(user.id),
        progressAnalyticsService.calculateProgressScore(user.id)
      ]);

      setState(prev => ({
        ...prev,
        userProgress,
        analytics,
        streakData,
        milestones: milestones.slice(0, 5), // Show top 5 milestones
        achievements: achievements.slice(-3), // Show latest 3 achievements
        progressScore,
        isLoading: false,
        isRefreshing: false
      }));

      // Track dashboard view
      analyticsService.trackEvent('progress_dashboard_viewed', {
        userId: user.id,
        currentStreak: userProgress.currentStreak,
        totalTipsCompleted: userProgress.totalTipsCompleted,
        activeMilestones: milestones.length
      });

    } catch (error) {
      console.error('Error loading progress data:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load progress data',
        isLoading: false,
        isRefreshing: false
      }));
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadProgressData();
    }, [loadProgressData])
  );

  const handleRefresh = useCallback(() => {
    loadProgressData(true);
  }, [loadProgressData]);

  const handleStreakFreeze = useCallback(async () => {
    if (!user?.id || !state.userProgress) return;

    try {
      const success = await progressTrackingService.useStreakFreeze(user.id);
      
      if (success) {
        Alert.alert(
          'Streak Freeze Activated! 🧊',
          'Your streak is protected for the next 24 hours. Get back to your healthy habits tomorrow!',
          [{ text: 'Got it!', onPress: () => loadProgressData() }]
        );
      } else {
        Alert.alert(
          'No Streak Freezes Available',
          'You don\'t have any streak freezes remaining. Complete milestones to earn more!',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error using streak freeze:', error);
      Alert.alert('Error', 'Failed to activate streak freeze. Please try again.');
    }
  }, [user?.id, state.userProgress, loadProgressData]);

  const handleMilestonePress = useCallback((milestone: Milestone) => {
    navigation.navigate('MilestoneDetail', { milestoneId: milestone.id });
  }, [navigation]);

  const handleAchievementPress = useCallback((achievement: Achievement) => {
    navigation.navigate('AchievementDetail', { achievementId: achievement.id });
  }, [navigation]);

  const handleViewAllMilestones = useCallback(() => {
    navigation.navigate('AllMilestones');
  }, [navigation]);

  const handleViewAllAchievements = useCallback(() => {
    navigation.navigate('AllAchievements');
  }, [navigation]);

  const handleViewAnalytics = useCallback(() => {
    navigation.navigate('DetailedAnalytics');
  }, [navigation]);

  if (state.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{state.error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadProgressData()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { userProgress, analytics, streakData, milestones, achievements, progressScore } = state;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={state.isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#4F46E5"
            colors={['#4F46E5']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Progress</Text>
          <Text style={styles.headerSubtitle}>
            Keep up the great work! 🌟
          </Text>
        </View>

        {/* Progress Score Card */}
        {progressScore && (
          <ProgressCard
            title="Overall Progress Score"
            score={progressScore.overallScore}
            trend={progressScore.trend}
            factors={progressScore.factors}
            onPress={handleViewAnalytics}
          />
        )}

        {/* Streak Display */}
        {userProgress && streakData && (
          <StreakDisplay
            currentStreak={userProgress.currentStreak}
            longestStreak={userProgress.longestStreak}
            streakData={streakData}
            streakFreezesRemaining={userProgress.streakFreezeRemaining}
            onUseStreakFreeze={handleStreakFreeze}
            style={styles.streakDisplay}
          />
        )}

        {/* Weekly Progress Chart */}
        {analytics && (
          <WeeklyProgressChart
            data={analytics.engagementTrends.slice(-7)}
            title="This Week's Progress"
            style={styles.chartContainer}
          />
        )}

        {/* Active Milestones */}
        {milestones.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Milestones</Text>
              <TouchableOpacity onPress={handleViewAllMilestones}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <MilestonesView
              milestones={milestones}
              onMilestonePress={handleMilestonePress}
              showProgress={true}
            />
          </View>
        )}

        {/* Recent Achievements */}
        {achievements.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Achievements</Text>
              <TouchableOpacity onPress={handleViewAllAchievements}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <AchievementGallery
              achievements={achievements}
              onAchievementPress={handleAchievementPress}
              horizontal={true}
            />
          </View>
        )}

        {/* Progress Insights */}
        {analytics && (
          <ProgressInsights
            analytics={analytics}
            userProgress={userProgress}
            style={styles.insightsContainer}
          />
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleViewAnalytics}
          >
            <Text style={styles.actionButtonText}>📊 Detailed Analytics</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleViewAllMilestones}
          >
            <Text style={styles.actionButtonText}>🎯 All Milestones</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 20
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  header: {
    padding: 20,
    paddingBottom: 10
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B'
  },
  streakDisplay: {
    marginHorizontal: 20,
    marginBottom: 20
  },
  chartContainer: {
    marginHorizontal: 20,
    marginBottom: 20
  },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B'
  },
  viewAllText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500'
  },
  insightsContainer: {
    marginHorizontal: 20,
    marginBottom: 20
  },
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    textAlign: 'center'
  },
  bottomSpacing: {
    height: 20
  }
});

export default ProgressDashboard;