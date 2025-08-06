/**
 * Progress Screen
 * Main screen for displaying user progress, streaks, and milestones
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAppSelector } from '../../hooks/redux';
import { selectUser } from '../../store/authSlice';
import { ProgressService } from '../../services/progress/progressService';
import { ProgressCard } from '../../components/progress/ProgressCard';
import { MilestonesView } from '../../components/progress/MilestonesView';
import { WeeklyProgressChart } from '../../components/progress/WeeklyProgressChart';
import { UserProgress, StreakMilestone, WeeklyProgress, ProgressStats } from '../../types';

type TabType = 'overview' | 'milestones' | 'weekly' | 'stats';

export const ProgressScreen: React.FC = () => {
  const user = useAppSelector(selectUser);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [milestones, setMilestones] = useState<StreakMilestone[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress | null>(null);
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const progressService = ProgressService.getInstance();

  useEffect(() => {
    if (user) {
      loadProgressData();
    }
  }, [user]);

  const loadProgressData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const [
        userProgress,
        userMilestones,
        weeklyData,
        statsData,
      ] = await Promise.all([
        progressService.getUserProgress(user.id),
        progressService.getUserMilestones(user.id),
        progressService.getWeeklyProgress(user.id),
        progressService.getProgressStats(user.id),
      ]);

      setProgress(userProgress);
      setMilestones(userMilestones);
      setWeeklyProgress(weeklyData);
      setProgressStats(statsData);
    } catch (error) {
      console.error('Error loading progress data:', error);
      Alert.alert('Error', 'Failed to load progress data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProgressData();
    setRefreshing(false);
  };

  const handleViewDetails = () => {
    setActiveTab('stats');
  };

  const renderTabButton = (tab: TabType, label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabLabel, activeTab === tab && styles.activeTabLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderOverview = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {progress && (
        <ProgressCard
          progress={progress}
          milestones={milestones}
          onViewDetails={handleViewDetails}
        />
      )}

      <View style={styles.quickStats}>
        <Text style={styles.quickStatsTitle}>Quick Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{progress?.currentStreak || 0}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{progress?.longestStreak || 0}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{progress?.totalTipsCompleted || 0}</Text>
            <Text style={styles.statLabel}>Tips Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{milestones.filter(m => m.achieved).length}</Text>
            <Text style={styles.statLabel}>Milestones</Text>
          </View>
        </View>
      </View>

      {weeklyProgress && (
        <View style={styles.weeklyPreview}>
          <Text style={styles.weeklyPreviewTitle}>This Week</Text>
          <View style={styles.weeklyPreviewStats}>
            <View style={styles.weeklyPreviewStat}>
              <Text style={styles.weeklyPreviewNumber}>{weeklyProgress.totalTipsCompleted}</Text>
              <Text style={styles.weeklyPreviewLabel}>Tips Completed</Text>
            </View>
            <View style={styles.weeklyPreviewStat}>
              <Text style={styles.weeklyPreviewNumber}>{weeklyProgress.streakDays}</Text>
              <Text style={styles.weeklyPreviewLabel}>Active Days</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.viewWeeklyButton}
            onPress={() => setActiveTab('weekly')}
          >
            <Text style={styles.viewWeeklyButtonText}>View Weekly Details</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const renderStats = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {progressStats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Detailed Statistics</Text>
          
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>Streak Performance</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Current Streak:</Text>
              <Text style={styles.statsValue}>{progressStats.currentStreak} days</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Longest Streak:</Text>
              <Text style={styles.statsValue}>{progressStats.longestStreak} days</Text>
            </View>
          </View>

          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>Engagement</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Tips Completed:</Text>
              <Text style={styles.statsValue}>{progressStats.totalTipsCompleted}</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Tips Viewed:</Text>
              <Text style={styles.statsValue}>{progressStats.totalTipsViewed}</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Completion Rate:</Text>
              <Text style={styles.statsValue}>
                {Math.round(progressStats.averageCompletionRate * 100)}%
              </Text>
            </View>
          </View>

          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>Preferences</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Favorite Category:</Text>
              <Text style={styles.statsValue}>
                {progressStats.favoriteCategory.replace('_', ' ')}
              </Text>
            </View>
          </View>

          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>Achievements</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Milestones Achieved:</Text>
              <Text style={styles.statsValue}>
                {progressStats.milestones.filter(m => m.achieved).length} of {progressStats.milestones.length}
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your progress...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Please sign in to view your progress</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Progress</Text>
        <Text style={styles.subtitle}>Track your wellness journey</Text>
      </View>

      <View style={styles.tabBar}>
        {renderTabButton('overview', 'Overview', '📊')}
        {renderTabButton('milestones', 'Milestones', '🏆')}
        {renderTabButton('weekly', 'Weekly', '📅')}
        {renderTabButton('stats', 'Stats', '📈')}
      </View>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'milestones' && (
        <MilestonesView milestones={milestones} currentStreak={progress?.currentStreak || 0} />
      )}
      {activeTab === 'weekly' && weeklyProgress && (
        <WeeklyProgressChart weeklyProgress={weeklyProgress} />
      )}
      {activeTab === 'stats' && renderStats()}
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
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#e3f2fd',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#1976d2',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  quickStats: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  weeklyPreview: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weeklyPreviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  weeklyPreviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  weeklyPreviewStat: {
    alignItems: 'center',
  },
  weeklyPreviewNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 4,
  },
  weeklyPreviewLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  viewWeeklyButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewWeeklyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    padding: 20,
  },
  statsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  statsLabel: {
    fontSize: 14,
    color: '#5a6c7d',
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
});