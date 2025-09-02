/**
 * BioReceipt Main Application Component
 * Root component that sets up navigation, theme, and global providers
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { BioReceiptTheme, NavigationIcons } from '../constants/bioReceiptTheme';
import BioReceiptTabNavigator from './navigation/BioReceiptTabNavigator';
import MyDayScreen from './intake/MyDayScreen';
import { SocialScreenContainer } from './social/SocialScreenContainer';
import { substanceDatabase } from '../services/substance/substanceDatabase';
import { intakeLoggingService } from '../services/substance/intakeLoggingService';
import { useSupabasePing } from '../hooks/useSupabasePing';
import { initializePhotoStore } from '../features/photos/store';
import { startPhotoUploadQueue, stopPhotoUploadQueue } from '../features/photos/queue';
import { useAuth } from '../contexts/AuthContext';

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

const BioReceiptApp: React.FC<Props> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState('my-day');
  const [isInitialized, setIsInitialized] = useState(false);
  const { user } = useAuth();

  // Test Supabase connection on app start
  useSupabasePing();

  useEffect(() => {
    initializeApp();
    
    // Cleanup on unmount
    return () => {
      stopPhotoUploadQueue();
    };
  }, []);

  // Start photo upload queue when user is authenticated
  useEffect(() => {
    if (isInitialized && user) {
      console.log('Starting photo upload queue for authenticated user');
      startPhotoUploadQueue(() => !!user);
    }
  }, [isInitialized, user]);

  const initializeApp = async () => {
    try {
      // Initialize core services
      await Promise.all([
        substanceDatabase.initialize(),
        intakeLoggingService.initialize(),
        initializePhotoStore() // Initialize photo store and hydrate from storage
      ]);
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize BioReceipt:', error);
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
      id: 'community',
      label: 'Community',
      icon: NavigationIcons.community,
      component: SocialScreenContainer,
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
        <Text style={styles.loadingLogo}>BioReceipt</Text>
        <Text style={styles.loadingText}>Initializing receipt tracking platform...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={BioReceiptTheme.colors.surface}
      />
      <BioReceiptTabNavigator
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
    backgroundColor: BioReceiptTheme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BioReceiptTheme.colors.background,
  },
  loadingLogo: {
    fontSize: BioReceiptTheme.typography.fontSize['4xl'],
    fontWeight: BioReceiptTheme.typography.fontWeight.bold,
    color: BioReceiptTheme.colors.primary,
    marginBottom: BioReceiptTheme.spacing.lg,
  },
  loadingText: {
    fontSize: BioReceiptTheme.typography.fontSize.base,
    color: BioReceiptTheme.colors.textSecondary,
  },
  placeholderScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: BioReceiptTheme.spacing.xl,
    backgroundColor: BioReceiptTheme.colors.background,
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: BioReceiptTheme.spacing.lg,
  },
  placeholderTitle: {
    fontSize: BioReceiptTheme.typography.fontSize['2xl'],
    fontWeight: BioReceiptTheme.typography.fontWeight.bold,
    color: BioReceiptTheme.colors.textPrimary,
    marginBottom: BioReceiptTheme.spacing.md,
  },
  placeholderSubtitle: {
    fontSize: BioReceiptTheme.typography.fontSize.base,
    color: BioReceiptTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: BioReceiptTheme.typography.lineHeight.relaxed,
  },
});

export default BioReceiptApp;