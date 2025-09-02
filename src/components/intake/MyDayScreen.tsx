/**
 * My Day Screen
 * Daily view of substance intakes with placeholder for real-time insights
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions
} from 'react-native';
import { SubstanceIntake } from '../../models/SubstanceIntake';
import { SubstanceCategory } from '../../models/Substance';
import { intakeLoggingService } from '../../services/substance/intakeLoggingService';
import { BioReceiptTheme, SubstanceCategoryIcons, NavigationIcons } from '../../constants/BioReceiptTheme';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import IntakeLoggingScreen from './IntakeLoggingScreen';

const { width } = Dimensions.get('window');

interface Props {
  userId: string;
  onNavigateToLogging?: () => void;
}

const MyDayScreen: React.FC<Props> = ({ userId, onNavigateToLogging }) => {
  const [todayIntakes, setTodayIntakes] = useState<SubstanceIntake[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLoggingModal, setShowLoggingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [preselectedSubstance, setPreselectedSubstance] = useState<any>(null);

  const { handleError } = useErrorHandler({
    context: { feature: 'my_day', currentScreen: 'MyDayScreen' }
  });

  useEffect(() => {
    loadTodayIntakes();
  }, [selectedDate]);

  const loadTodayIntakes = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get start and end of selected day
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const intakes = await intakeLoggingService.getIntakeHistory(userId, {
        startDate: startOfDay,
        endDate: endOfDay,
        limit: 100
      });

      setTodayIntakes(intakes);
    } catch (error) {
      await handleError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, selectedDate, handleError]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadTodayIntakes();
    setIsRefreshing(false);
  }, [loadTodayIntakes]);

  const handleIntakeLogged = useCallback((intake: SubstanceIntake) => {
    setTodayIntakes(prev => [intake, ...prev]);
    setShowLoggingModal(false);
    setPreselectedSubstance(null); // Clear preselected substance after logging
  }, []);

  const handleSubstanceAdded = useCallback((newSubstance: any) => {
    // Auto-navigate to logging with the newly created substance preselected
    setPreselectedSubstance(newSubstance);
    setShowLoggingModal(true);
  }, []);

  const handleDeleteIntake = useCallback(async (intakeId: string) => {
    Alert.alert(
      'Delete Intake',
      'Are you sure you want to delete this intake entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await intakeLoggingService.deleteIntake(userId, intakeId);
              if (success) {
                setTodayIntakes(prev => prev.filter(intake => intake.id !== intakeId));
              }
            } catch (error) {
              await handleError(error as Error);
            }
          }
        }
      ]
    );
  }, [userId, handleError]);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getCategoryColor = (category: SubstanceCategory): string => {
    const colors = {
      [SubstanceCategory.ALCOHOL]: BioReceiptTheme.colors.alcohol,
      [SubstanceCategory.DRUGS_RECREATIONAL]: BioReceiptTheme.colors.drugs,
      [SubstanceCategory.DRUGS_PRESCRIPTION]: BioReceiptTheme.colors.drugs,
      [SubstanceCategory.DRUGS_OTC]: BioReceiptTheme.colors.drugs,
      [SubstanceCategory.FOOD]: BioReceiptTheme.colors.food,
      [SubstanceCategory.SUPPLEMENTS]: BioReceiptTheme.colors.supplements,
      [SubstanceCategory.STEROIDS]: BioReceiptTheme.colors.steroids,
      [SubstanceCategory.NOOTROPICS]: BioReceiptTheme.colors.supplements,
      [SubstanceCategory.HORMONES]: BioReceiptTheme.colors.hormones,
      [SubstanceCategory.OTHER]: BioReceiptTheme.colors.textTertiary
    };
    return colors[category] || BioReceiptTheme.colors.textTertiary;
  };

  const getCategoryIcon = (category: SubstanceCategory): string => {
    return SubstanceCategoryIcons[category] || SubstanceCategoryIcons.other;
  };

  const renderDateSelector = () => (
    <View style={styles.dateSelector}>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => {
          const yesterday = new Date(selectedDate);
          yesterday.setDate(yesterday.getDate() - 1);
          setSelectedDate(yesterday);
        }}
      >
        <Text style={styles.dateButtonText}>{NavigationIcons.back}</Text>
      </TouchableOpacity>
      
      <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
      
      <TouchableOpacity
        style={[
          styles.dateButton,
          selectedDate.toDateString() === new Date().toDateString() && styles.dateButtonDisabled
        ]}
        onPress={() => {
          const tomorrow = new Date(selectedDate);
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (tomorrow <= new Date()) {
            setSelectedDate(tomorrow);
          }
        }}
        disabled={selectedDate.toDateString() === new Date().toDateString()}
      >
        <Text style={[
          styles.dateButtonText,
          selectedDate.toDateString() === new Date().toDateString() && styles.dateButtonTextDisabled
        ]}>
          {NavigationIcons.forward}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderIntakeItem = (intake: SubstanceIntake) => (
    <TouchableOpacity
      key={intake.id}
      style={styles.intakeItem}
      onLongPress={() => handleDeleteIntake(intake.id)}
    >
      <View style={styles.intakeHeader}>
        <View style={styles.intakeIconContainer}>
          <Text style={styles.intakeIcon}>
            {getCategoryIcon(intake.substanceCategory)}
          </Text>
          <View style={[
            styles.categoryIndicator,
            { backgroundColor: getCategoryColor(intake.substanceCategory) }
          ]} />
        </View>
        
        <View style={styles.intakeInfo}>
          <Text style={styles.intakeName}>{intake.substanceName}</Text>
          <Text style={styles.intakeDetails}>
            {intake.quantity} {intake.unit}
          </Text>
          {intake.context && (
            <Text style={styles.intakeContext}>{intake.context}</Text>
          )}
        </View>
        
        <Text style={styles.intakeTime}>{formatTime(intake.timestamp)}</Text>
      </View>
      
      {intake.notes && (
        <Text style={styles.intakeNotes}>{intake.notes}</Text>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📝</Text>
      <Text style={styles.emptyStateTitle}>No intakes logged today</Text>
      <Text style={styles.emptyStateSubtitle}>
        Start tracking your substances to get personalized insights
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => setShowLoggingModal(true)}
      >
        <Text style={styles.emptyStateButtonText}>Log Your First Intake</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInsightsPlaceholder = () => (
    <View style={styles.insightsPlaceholder}>
      <View style={styles.insightsHeader}>
        <Text style={styles.insightsTitle}>Real-Time Insights</Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Phase 2</Text>
        </View>
      </View>
      
      <View style={styles.insightsContent}>
        <Text style={styles.insightsIcon}>🧠</Text>
        <Text style={styles.insightsDescription}>
          AI-powered analysis and safety alerts coming soon
        </Text>
        
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>• Real-time interaction warnings</Text>
          <Text style={styles.featureItem}>• Personalized recovery recommendations</Text>
          <Text style={styles.featureItem}>• Pattern analysis and insights</Text>
          <Text style={styles.featureItem}>• Dosage optimization suggestions</Text>
        </View>
      </View>
    </View>
  );

  const renderDaySummary = () => {
    if (todayIntakes.length === 0) return null;

    const categoryCount = todayIntakes.reduce((acc, intake) => {
      acc[intake.substanceCategory] = (acc[intake.substanceCategory] || 0) + 1;
      return acc;
    }, {} as Record<SubstanceCategory, number>);

    return (
      <View style={styles.daySummary}>
        <Text style={styles.daySummaryTitle}>Day Summary</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{todayIntakes.length}</Text>
            <Text style={styles.summaryLabel}>Total Intakes</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{Object.keys(categoryCount).length}</Text>
            <Text style={styles.summaryLabel}>Categories</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {new Set(todayIntakes.map(i => i.substanceId)).size}
            </Text>
            <Text style={styles.summaryLabel}>Substances</Text>
          </View>
        </View>
      </View>
    );
  };

  if (showLoggingModal) {
    return (
      <IntakeLoggingScreen
        userId={userId}
        onIntakeLogged={handleIntakeLogged}
        onClose={() => {
          setShowLoggingModal(false);
          setPreselectedSubstance(null);
        }}
        preselectedSubstance={preselectedSubstance}
        onSubstanceAdded={handleSubstanceAdded}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Day</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowLoggingModal(true)}
        >
          <Text style={styles.addButtonText}>{NavigationIcons.add}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={BioReceiptTheme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderDateSelector()}
        
        {renderInsightsPlaceholder()}
        
        {renderDaySummary()}

        <View style={styles.intakesSection}>
          <Text style={styles.sectionTitle}>
            Intakes {todayIntakes.length > 0 && `(${todayIntakes.length})`}
          </Text>
          
          {isLoading ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>Loading intakes...</Text>
            </View>
          ) : todayIntakes.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.intakesList}>
              {todayIntakes.map(renderIntakeItem)}
            </View>
          )}
        </View>
      </ScrollView>
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
    padding: BioReceiptTheme.spacing.lg,
    backgroundColor: BioReceiptTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: BioReceiptTheme.colors.border,
  },
  headerTitle: {
    fontSize: BioReceiptTheme.typography.fontSize['2xl'],
    fontWeight: BioReceiptTheme.typography.fontWeight.bold,
    color: BioReceiptTheme.colors.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: BioReceiptTheme.borderRadius.full,
    backgroundColor: BioReceiptTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    color: BioReceiptTheme.colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: BioReceiptTheme.spacing.lg,
    backgroundColor: BioReceiptTheme.colors.surface,
    marginBottom: BioReceiptTheme.spacing.md,
  },
  dateButton: {
    width: 40,
    height: 40,
    borderRadius: BioReceiptTheme.borderRadius.md,
    backgroundColor: BioReceiptTheme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateButtonDisabled: {
    opacity: 0.3,
  },
  dateButtonText: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    color: BioReceiptTheme.colors.textSecondary,
  },
  dateButtonTextDisabled: {
    color: BioReceiptTheme.colors.textMuted,
  },
  dateText: {
    fontSize: BioReceiptTheme.typography.fontSize.xl,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.textPrimary,
  },
  insightsPlaceholder: {
    margin: BioReceiptTheme.spacing.lg,
    padding: BioReceiptTheme.spacing.lg,
    backgroundColor: BioReceiptTheme.colors.surface,
    borderRadius: BioReceiptTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: BioReceiptTheme.spacing.md,
  },
  insightsTitle: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.textPrimary,
  },
  comingSoonBadge: {
    paddingHorizontal: BioReceiptTheme.spacing.sm,
    paddingVertical: BioReceiptTheme.spacing.xs,
    backgroundColor: BioReceiptTheme.colors.tertiary,
    borderRadius: BioReceiptTheme.borderRadius.sm,
  },
  comingSoonText: {
    fontSize: BioReceiptTheme.typography.fontSize.xs,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.textPrimary,
  },
  insightsContent: {
    alignItems: 'center',
  },
  insightsIcon: {
    fontSize: 48,
    marginBottom: BioReceiptTheme.spacing.md,
  },
  insightsDescription: {
    fontSize: BioReceiptTheme.typography.fontSize.base,
    color: BioReceiptTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: BioReceiptTheme.spacing.lg,
  },
  featureList: {
    alignSelf: 'stretch',
  },
  featureItem: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textTertiary,
    marginBottom: BioReceiptTheme.spacing.xs,
  },
  daySummary: {
    margin: BioReceiptTheme.spacing.lg,
    marginTop: 0,
    padding: BioReceiptTheme.spacing.lg,
    backgroundColor: BioReceiptTheme.colors.surface,
    borderRadius: BioReceiptTheme.borderRadius.lg,
  },
  daySummaryTitle: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.textPrimary,
    marginBottom: BioReceiptTheme.spacing.md,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: BioReceiptTheme.typography.fontSize['2xl'],
    fontWeight: BioReceiptTheme.typography.fontWeight.bold,
    color: BioReceiptTheme.colors.primary,
  },
  summaryLabel: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textSecondary,
    marginTop: BioReceiptTheme.spacing.xs,
  },
  intakesSection: {
    padding: BioReceiptTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.textPrimary,
    marginBottom: BioReceiptTheme.spacing.md,
  },
  intakesList: {
    gap: BioReceiptTheme.spacing.md,
  },
  intakeItem: {
    backgroundColor: BioReceiptTheme.colors.surface,
    padding: BioReceiptTheme.spacing.lg,
    borderRadius: BioReceiptTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
  },
  intakeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  intakeIconContainer: {
    position: 'relative',
    marginRight: BioReceiptTheme.spacing.md,
  },
  intakeIcon: {
    fontSize: 32,
  },
  categoryIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: BioReceiptTheme.borderRadius.full,
    borderWidth: 2,
    borderColor: BioReceiptTheme.colors.surface,
  },
  intakeInfo: {
    flex: 1,
  },
  intakeName: {
    fontSize: BioReceiptTheme.typography.fontSize.base,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.textPrimary,
    marginBottom: BioReceiptTheme.spacing.xs,
  },
  intakeDetails: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textSecondary,
    marginBottom: BioReceiptTheme.spacing.xs,
  },
  intakeContext: {
    fontSize: BioReceiptTheme.typography.fontSize.xs,
    color: BioReceiptTheme.colors.textTertiary,
    fontStyle: 'italic',
  },
  intakeTime: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textTertiary,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
  },
  intakeNotes: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textSecondary,
    marginTop: BioReceiptTheme.spacing.md,
    paddingTop: BioReceiptTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: BioReceiptTheme.colors.border,
  },
  emptyState: {
    alignItems: 'center',
    padding: BioReceiptTheme.spacing['2xl'],
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: BioReceiptTheme.spacing.lg,
  },
  emptyStateTitle: {
    fontSize: BioReceiptTheme.typography.fontSize.xl,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.textPrimary,
    marginBottom: BioReceiptTheme.spacing.md,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: BioReceiptTheme.typography.fontSize.base,
    color: BioReceiptTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: BioReceiptTheme.spacing.xl,
    lineHeight: BioReceiptTheme.typography.lineHeight.relaxed,
  },
  emptyStateButton: {
    backgroundColor: BioReceiptTheme.colors.primary,
    paddingHorizontal: BioReceiptTheme.spacing.xl,
    paddingVertical: BioReceiptTheme.spacing.md,
    borderRadius: BioReceiptTheme.borderRadius.lg,
  },
  emptyStateButtonText: {
    fontSize: BioReceiptTheme.typography.fontSize.base,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.textPrimary,
  },
  loadingState: {
    alignItems: 'center',
    padding: BioReceiptTheme.spacing.xl,
  },
  loadingText: {
    fontSize: BioReceiptTheme.typography.fontSize.base,
    color: BioReceiptTheme.colors.textSecondary,
  },
});

export default MyDayScreen;