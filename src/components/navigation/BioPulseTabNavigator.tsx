/**
 * BioPulse.AI Tab Navigator
 * Main navigation component with BioPulse.AI branding
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BioPulseTheme, NavigationIcons } from '../../constants/bioPulseTheme';

interface TabItem {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType<any>;
}

interface Props {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  userId: string;
}

const BioPulseTabNavigator: React.FC<Props> = ({ tabs, activeTab, onTabChange, userId }) => {
  const renderTab = (tab: TabItem) => {
    const isActive = activeTab === tab.id;
    
    return (
      <TouchableOpacity
        key={tab.id}
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => onTabChange(tab.id)}
      >
        <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
          {tab.icon}
        </Text>
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
          {tab.label}
        </Text>
        {isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.appName}>BioPulse.AI</Text>
          <Text style={styles.appTagline}>AI-Powered Biohacking</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Text style={styles.headerButtonText}>{NavigationIcons.search}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Text style={styles.headerButtonText}>{NavigationIcons.settings}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {ActiveComponent && <ActiveComponent userId={userId} />}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map(renderTab)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BioPulseTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: BioPulseTheme.spacing.lg,
    paddingTop: BioPulseTheme.spacing.xl,
    paddingBottom: BioPulseTheme.spacing.lg,
    backgroundColor: BioPulseTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: BioPulseTheme.colors.border,
  },
  headerContent: {
    flex: 1,
  },
  appName: {
    fontSize: BioPulseTheme.typography.fontSize['3xl'],
    fontWeight: BioPulseTheme.typography.fontWeight.bold,
    color: BioPulseTheme.colors.primary,
    marginBottom: BioPulseTheme.spacing.xs,
  },
  appTagline: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.textSecondary,
    fontWeight: BioPulseTheme.typography.fontWeight.medium,
  },
  headerActions: {
    flexDirection: 'row',
    gap: BioPulseTheme.spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BioPulseTheme.borderRadius.md,
    backgroundColor: BioPulseTheme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: BioPulseTheme.typography.fontSize.lg,
    color: BioPulseTheme.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: BioPulseTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: BioPulseTheme.colors.border,
    paddingBottom: BioPulseTheme.spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: BioPulseTheme.spacing.md,
    position: 'relative',
  },
  tabActive: {
    // Active tab styling handled by indicator
  },
  tabIcon: {
    fontSize: BioPulseTheme.typography.fontSize.xl,
    color: BioPulseTheme.colors.textTertiary,
    marginBottom: BioPulseTheme.spacing.xs,
  },
  tabIconActive: {
    color: BioPulseTheme.colors.primary,
  },
  tabLabel: {
    fontSize: BioPulseTheme.typography.fontSize.xs,
    color: BioPulseTheme.colors.textTertiary,
    fontWeight: BioPulseTheme.typography.fontWeight.medium,
  },
  tabLabelActive: {
    color: BioPulseTheme.colors.primary,
    fontWeight: BioPulseTheme.typography.fontWeight.semibold,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: BioPulseTheme.colors.primary,
    borderRadius: BioPulseTheme.borderRadius.full,
  },
});

export default BioPulseTabNavigator;