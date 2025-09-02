/**
 * Admin Panel Main Component
 * Provides comprehensive admin interface for content management
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminAuthService, AdminUser } from '../../services/admin/adminAuthService';
import { AdminContentService, ContentDashboardStats } from '../../services/admin/adminContentService';
import { AdminLoginScreen } from './AdminLoginScreen';
import { ContentManagementScreen } from './ContentManagementScreen';
import { ContentUploadScreen } from './ContentUploadScreen';
import { AdminAnalyticsDashboard } from './AdminAnalyticsDashboard';

type AdminScreen = 'dashboard' | 'content' | 'upload' | 'analytics' | 'users' | 'settings';

interface AdminPanelProps {
  onClose?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AdminScreen>('dashboard');
  const [dashboardStats, setDashboardStats] = useState<ContentDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const adminAuthService = AdminAuthService.getInstance();
  const adminContentService = AdminContentService.getInstance();

  useEffect(() => {
    initializeAdmin();
  }, []);

  const initializeAdmin = async () => {
    try {
      setLoading(true);
      
      // Initialize admin services
      await adminAuthService.initialize();
      
      // Check if user is already authenticated
      const session = adminAuthService.getCurrentSession();
      if (session) {
        const user = await adminAuthService.validateSession(session.token);
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          await loadDashboardData();
        }
      }
    } catch (error) {
      console.error('Failed to initialize admin panel:', error);
      Alert.alert('Error', 'Failed to initialize admin panel');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (user: AdminUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    await loadDashboardData();
  };

  const handleLogout = async () => {
    try {
      await adminAuthService.logout();
      setCurrentUser(null);
      setIsAuthenticated(false);
      setDashboardStats(null);
      setCurrentScreen('dashboard');
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const loadDashboardData = async () => {
    if (!currentUser) return;

    try {
      const stats = await adminContentService.getDashboardStats(currentUser.id);
      setDashboardStats(stats);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const renderNavigation = () => (
    <View style={styles.navigation}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.navItem, currentScreen === 'dashboard' && styles.navItemActive]}
          onPress={() => setCurrentScreen('dashboard')}
        >
          <Text style={[styles.navText, currentScreen === 'dashboard' && styles.navTextActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentScreen === 'content' && styles.navItemActive]}
          onPress={() => setCurrentScreen('content')}
        >
          <Text style={[styles.navText, currentScreen === 'content' && styles.navTextActive]}>
            Content
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentScreen === 'upload' && styles.navItemActive]}
          onPress={() => setCurrentScreen('upload')}
        >
          <Text style={[styles.navText, currentScreen === 'upload' && styles.navTextActive]}>
            Upload
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentScreen === 'analytics' && styles.navItemActive]}
          onPress={() => setCurrentScreen('analytics')}
        >
          <Text style={[styles.navText, currentScreen === 'analytics' && styles.navTextActive]}>
            Analytics
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderDashboard = () => (
    <ScrollView
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Welcome back, {currentUser?.username}</Text>
      </View>

      {dashboardStats && (
        <>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{dashboardStats.totalTips}</Text>
              <Text style={styles.statLabel}>Total Tips</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{dashboardStats.activeTips}</Text>
              <Text style={styles.statLabel}>Active Tips</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{dashboardStats.totalViews.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Views</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{Math.round(dashboardStats.averageEngagementScore)}%</Text>
              <Text style={styles.statLabel}>Avg Engagement</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category Breakdown</Text>
            <View style={styles.categoryList}>
              {Object.entries(dashboardStats.categoryBreakdown).map(([category, count]) => (
                <View key={category} style={styles.categoryItem}>
                  <Text style={styles.categoryName}>{category.replace('_', ' ')}</Text>
                  <Text style={styles.categoryCount}>{count}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityList}>
              {dashboardStats.recentActivity.slice(0, 5).map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Text style={styles.activityIconText}>
                      {activity.type === 'created' ? '➕' : 
                       activity.type === 'updated' ? '✏️' : 
                       activity.type === 'deleted' ? '🗑️' : '📝'}
                    </Text>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      {activity.adminUsername} {activity.type} "{activity.tipTitle}"
                    </Text>
                    <Text style={styles.activityTime}>
                      {activity.timestamp.toLocaleDateString()} at {activity.timestamp.toLocaleTimeString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderCurrentScreen = () => {
    if (!currentUser) return null;

    switch (currentScreen) {
      case 'dashboard':
        return renderDashboard();
      case 'content':
        return <ContentManagementScreen adminUser={currentUser} />;
      case 'upload':
        return <ContentUploadScreen adminUser={currentUser} onUploadSuccess={loadDashboardData} />;
      case 'analytics':
        return <AdminAnalyticsDashboard adminUser={currentUser} />;
      default:
        return renderDashboard();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Initializing Admin Panel...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginScreen onLogin={handleLogin} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Admin Panel</Text>
        <View style={styles.topBarActions}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderNavigation()}
      {renderCurrentScreen()}
    </SafeAreaView>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F44336',
    borderRadius: 4,
    marginRight: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666666',
  },
  navigation: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  navItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  navItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2E7D32',
  },
  navText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  navTextActive: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  statCard: {
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  section: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 12,
  },
  categoryList: {
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 14,
    color: '#333333',
    textTransform: 'capitalize',
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityIconText: {
    fontSize: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#666666',
  },
});