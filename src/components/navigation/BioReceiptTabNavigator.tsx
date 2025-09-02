/**
 * BioReceipt Tab Navigator
 * Main navigation component for the BioReceipt application
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BioReceiptTheme, NavigationIcons } from '../../constants/bioReceiptTheme';

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

const BioReceiptTabNavigator: React.FC<Props> = ({ tabs, activeTab, onTabChange, userId }) => {
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
          <Text style={styles.appName}>BioReceipt</Text>
          <Text style={styles.appTagline}>Smart Receipt Tracking</Text>
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
    backgroundColor: BioReceiptTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingTop: BioReceiptTheme.spacing.xl,
    paddingBottom: BioReceiptTheme.spacing.lg,
    backgroundColor: BioReceiptTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: BioReceiptTheme.colors.border,
  },
  headerContent: {
    flex: 1,
  },
  appName: {
    fontSize: BioReceiptTheme.typography.fontSize['3xl'],
    fontWeight: BioReceiptTheme.typography.fontWeight.bold,
    color: BioReceiptTheme.colors.primary,
    marginBottom: BioReceiptTheme.spacing.xs,
  },
  appTagline: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textSecondary,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
  },
  headerActions: {
    flexDirection: 'row',
    gap: BioReceiptTheme.spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BioReceiptTheme.borderRadius.md,
    backgroundColor: BioReceiptTheme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    color: BioReceiptTheme.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: BioReceiptTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: BioReceiptTheme.colors.border,
    paddingBottom: BioReceiptTheme.spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: BioReceiptTheme.spacing.md,
    position: 'relative',
  },
  tabActive: {
    // Active tab styling handled by indicator
  },
  tabIcon: {
    fontSize: BioReceiptTheme.typography.fontSize.xl,
    color: BioReceiptTheme.colors.textTertiary,
    marginBottom: BioReceiptTheme.spacing.xs,
  },
  tabIconActive: {
    color: BioReceiptTheme.colors.primary,
  },
  tabLabel: {
    fontSize: BioReceiptTheme.typography.fontSize.xs,
    color: BioReceiptTheme.colors.textTertiary,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
  },
  tabLabelActive: {
    color: BioReceiptTheme.colors.primary,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: BioReceiptTheme.colors.primary,
    borderRadius: BioReceiptTheme.borderRadius.full,
  },
});

export default BioReceiptTabNavigator;