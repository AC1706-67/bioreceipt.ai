/**
 * BioPulse.AI Main App Component
 * Integrates all components with BioPulse.AI branding and navigation
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { BioPulseTheme, NavigationIcons } from '../constants/bioPulseTheme';
import BioPulseTabNavigator from './navigation/BioPulseTabNavigator';
import MyDayScreen from './intake/MyDayScreen';
import { substanceDatabase } from '../services/substance/substanceDatabase';
import { intakeLoggingService } from '../services/substance/intakeLoggingService';

// Placeholder components for other tabs
const InsightsScreen: React.FC<{ userId: string }> = ({ userId }) => (
  <View style={styles.placeholderScreen}>
    <Text style={styles.placeholderIcon}>📊</Text>
    <Text style={styles.placeholderTitle}>Insights</Text>
    <Text style={styles.placeholderSubtitle}>
      Advanced analytics and pattern recognition coming in Phase 2
    </Text>
  </View>
);

const ProfileScreen: React.FC<{ userId: string }> = ({ userId }) => (
  <View style={styles.placeholderScreen}>
    <Text style={styles.placeholderIcon}>👤</Text>
    <Text style={styles.placeholderTitle}>Profile</Text>
    <Text style={styles.placeholderSubtitle}>
      User profile and settings management
    </Text>
  </View>
);

const DiscoverScreen: React.FC<{ userId: string }> = ({ userId }) => (
  <View style={styles.placeholderScreen}>
    <Text style={styles.placeholderIcon}>🔍</Text>
    <Text style={styles.placeholderTitle}>Discover</Text>
    <Text style={styles.placeholderSubtitle}>
      Explore substances, learn about interactions, and discover biohacking tips
    </Text>
  </View>
);

interface Props {
  userId: string;
}

const BioPulseApp: React.FC<Props> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState('my-day');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize core services
      await Promise.all([
        substanceDatabase.initialize(),
        intakeLoggingService.initialize()
      ]);
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize BioPulse.AI:', error);
      // Handle initialization error
    }
  };

  const tabs = [
    {
      id: 'discover',
      label: 'Discover',
      icon: NavigationIcons.search,
      component: DiscoverScreen,
    },
    {
      id: 'my-day',
      label: 'My Day',
      icon: NavigationIcons.home,
      component: MyDayScreen,
    },
    {
      id: 'insights',
      label: 'Insights',
      icon: '📊',
      component: InsightsScreen,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: NavigationIcons.profile,
      component: ProfileScreen,
    },
  ];

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingLogo}>BioPulse.AI</Text>
        <Text style={styles.loadingText}>Initializing biohacking platform...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={BioPulseTheme.colors.surface}
      />
      <BioPulseTabNavigator
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userId={userId}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BioPulseTheme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BioPulseTheme.colors.background,
  },
  loadingLogo: {
    fontSize: BioPulseTheme.typography.fontSize['4xl'],
    fontWeight: BioPulseTheme.typography.fontWeight.bold,
    color: BioPulseTheme.colors.primary,
    marginBottom: BioPulseTheme.spacing.lg,
  },
  loadingText: {
    fontSize: BioPulseTheme.typography.fontSize.base,
    color: BioPulseTheme.colors.textSecondary,
  },
  placeholderScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: BioPulseTheme.spacing.xl,
    backgroundColor: BioPulseTheme.colors.background,
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: BioPulseTheme.spacing.lg,
  },
  placeholderTitle: {
    fontSize: BioPulseTheme.typography.fontSize['2xl'],
    fontWeight: BioPulseTheme.typography.fontWeight.bold,
    color: BioPulseTheme.colors.textPrimary,
    marginBottom: BioPulseTheme.spacing.md,
  },
  placeholderSubtitle: {
    fontSize: BioPulseTheme.typography.fontSize.base,
    color: BioPulseTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: BioPulseTheme.typography.lineHeight.relaxed,
  },
});

export default BioPulseApp;