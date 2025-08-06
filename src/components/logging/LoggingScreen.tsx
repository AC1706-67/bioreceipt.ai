/**
 * Logging Screen - MVP Substance Intake Logging UI
 * Main interface for logging substance intake with accessibility
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { BioPulseTheme } from '../../constants/bioPulseTheme';
import SubstanceSelector from './SubstanceSelector';
import QuantityInput from './QuantityInput';
import IntakeHistory from './IntakeHistory';
import { supabaseHelpers } from '../../config/supabase';

interface Substance {
  id: string;
  name: string;
  category: string;
  default_unit: string;
  description?: string;
}

interface IntakeEntry {
  id?: string;
  substance_id: string;
  quantity: number;
  unit: string;
  timestamp: Date;
  notes?: string;
}

const LoggingScreen: React.FC = () => {
  const { user } = useSelector((state: any) => state.auth);
  
  const [substances, setSubstances] = useState<Substance[]>([]);
  const [selectedSubstance, setSelectedSubstance] = useState<Substance | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSubstances, setIsLoadingSubstances] = useState(true);
  const [refreshHistory, setRefreshHistory] = useState(0);

  // Load substances on component mount
  useEffect(() => {
    loadSubstances();
  }, []);

  // Set default unit when substance is selected
  useEffect(() => {
    if (selectedSubstance) {
      setUnit(selectedSubstance.default_unit);
    }
  }, [selectedSubstance]);

  const loadSubstances = async () => {
    try {
      setIsLoadingSubstances(true);
      const substancesData = await supabaseHelpers.getSubstances();
      setSubstances(substancesData || []);
    } catch (error) {
      console.error('Error loading substances:', error);
      Alert.alert('Error', 'Failed to load substances. Please try again.');
    } finally {
      setIsLoadingSubstances(false);
    }
  };

  const handleLogIntake = async () => {
    if (!selectedSubstance) {
      Alert.alert('Error', 'Please select a substance');
      return;
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (!unit) {
      Alert.alert('Error', 'Please specify a unit');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setIsLoading(true);

      const intakeEntry: IntakeEntry = {
        substance_id: selectedSubstance.id,
        quantity: parseFloat(quantity),
        unit: unit,
        timestamp: new Date(),
        notes: notes.trim() || undefined,
      };

      await supabaseHelpers.logIntake({
        user_id: user.id,
        ...intakeEntry,
        timestamp: intakeEntry.timestamp.toISOString(),
      });

      // Reset form
      setSelectedSubstance(null);
      setQuantity('');
      setUnit('');
      setNotes('');

      // Refresh history
      setRefreshHistory(prev => prev + 1);

      Alert.alert('Success', 'Intake logged successfully!');
    } catch (error) {
      console.error('Error logging intake:', error);
      Alert.alert('Error', 'Failed to log intake. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLog = (substance: Substance) => {
    setSelectedSubstance(substance);
    setQuantity('1'); // Default quantity
    setUnit(substance.default_unit);
  };

  const isFormValid = selectedSubstance && quantity && parseFloat(quantity) > 0 && unit;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <Text 
          style={styles.title}
          accessible={true}
          accessibilityRole="header"
        >
          Log Intake
        </Text>
        <Text style={styles.subtitle}>
          Track what you consume for better insights
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Log</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.quickActionsScroll}
          contentContainerStyle={styles.quickActionsContent}
        >
          {substances.slice(0, 6).map((substance) => (
            <TouchableOpacity
              key={substance.id}
              style={styles.quickActionButton}
              onPress={() => handleQuickLog(substance)}
              accessible={true}
              accessibilityLabel={`Quick log ${substance.name}`}
              accessibilityHint={`Quickly log ${substance.name} with default quantity`}
              accessibilityRole="button"
            >
              <Text style={styles.quickActionText}>{substance.name}</Text>
              <Text style={styles.quickActionUnit}>{substance.default_unit}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Logging Form */}
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Log New Intake</Text>

        {/* Substance Selection */}
        <SubstanceSelector
          substances={substances}
          selectedSubstance={selectedSubstance}
          onSelectSubstance={setSelectedSubstance}
          isLoading={isLoadingSubstances}
        />

        {/* Quantity Input */}
        {selectedSubstance && (
          <QuantityInput
            quantity={quantity}
            unit={unit}
            defaultUnit={selectedSubstance.default_unit}
            onQuantityChange={setQuantity}
            onUnitChange={setUnit}
          />
        )}

        {/* Notes Input */}
        {selectedSubstance && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TouchableOpacity
              style={styles.notesInput}
              onPress={() => {
                // For MVP, we'll use a simple alert for notes
                Alert.prompt(
                  'Add Notes',
                  'Add any additional notes about this intake',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Save', 
                      onPress: (text) => setNotes(text || '') 
                    }
                  ],
                  'plain-text',
                  notes
                );
              }}
              accessible={true}
              accessibilityLabel="Add notes"
              accessibilityHint="Add optional notes about this intake"
              accessibilityRole="button"
            >
              <Text style={[styles.notesText, !notes && styles.notesPlaceholder]}>
                {notes || 'Tap to add notes...'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Log Button */}
        {selectedSubstance && (
          <TouchableOpacity
            style={[styles.logButton, !isFormValid && styles.logButtonDisabled]}
            onPress={handleLogIntake}
            disabled={!isFormValid || isLoading}
            accessible={true}
            accessibilityLabel={isLoading ? "Logging intake..." : "Log intake"}
            accessibilityHint="Save this intake to your log"
            accessibilityRole="button"
            testID="log-intake-button"
          >
            <Text style={styles.logButtonText}>
              {isLoading ? 'Logging...' : 'Log Intake'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Recent History */}
      <View style={styles.historyContainer}>
        <Text style={styles.sectionTitle}>Recent Intakes</Text>
        <IntakeHistory 
          userId={user?.id}
          refreshTrigger={refreshHistory}
          limit={5}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BioPulseTheme.colors.background,
  },
  scrollContent: {
    paddingBottom: BioPulseTheme.spacing.xl,
  },
  header: {
    paddingHorizontal: BioPulseTheme.spacing.lg,
    paddingTop: BioPulseTheme.spacing.xl,
    paddingBottom: BioPulseTheme.spacing.lg,
    backgroundColor: BioPulseTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: BioPulseTheme.colors.border,
  },
  title: {
    fontSize: BioPulseTheme.typography.fontSize['2xl'],
    fontWeight: BioPulseTheme.typography.fontWeight.bold,
    color: BioPulseTheme.colors.text,
    marginBottom: BioPulseTheme.spacing.xs,
  },
  subtitle: {
    fontSize: BioPulseTheme.typography.fontSize.md,
    color: BioPulseTheme.colors.textSecondary,
  },
  quickActionsContainer: {
    paddingVertical: BioPulseTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: BioPulseTheme.typography.fontSize.lg,
    fontWeight: BioPulseTheme.typography.fontWeight.semibold,
    color: BioPulseTheme.colors.text,
    marginBottom: BioPulseTheme.spacing.md,
    paddingHorizontal: BioPulseTheme.spacing.lg,
  },
  quickActionsScroll: {
    paddingLeft: BioPulseTheme.spacing.lg,
  },
  quickActionsContent: {
    paddingRight: BioPulseTheme.spacing.lg,
  },
  quickActionButton: {
    backgroundColor: BioPulseTheme.colors.surface,
    borderRadius: BioPulseTheme.borderRadius.lg,
    paddingHorizontal: BioPulseTheme.spacing.md,
    paddingVertical: BioPulseTheme.spacing.sm,
    marginRight: BioPulseTheme.spacing.sm,
    borderWidth: 1,
    borderColor: BioPulseTheme.colors.border,
    minHeight: 44, // Accessibility: minimum touch target
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    fontWeight: BioPulseTheme.typography.fontWeight.medium,
    color: BioPulseTheme.colors.text,
    textAlign: 'center',
  },
  quickActionUnit: {
    fontSize: BioPulseTheme.typography.fontSize.xs,
    color: BioPulseTheme.colors.textTertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  formContainer: {
    paddingHorizontal: BioPulseTheme.spacing.lg,
    paddingVertical: BioPulseTheme.spacing.lg,
  },
  inputContainer: {
    marginBottom: BioPulseTheme.spacing.lg,
  },
  label: {
    fontSize: BioPulseTheme.typography.fontSize.md,
    fontWeight: BioPulseTheme.typography.fontWeight.medium,
    color: BioPulseTheme.colors.text,
    marginBottom: BioPulseTheme.spacing.sm,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: BioPulseTheme.colors.border,
    borderRadius: BioPulseTheme.borderRadius.md,
    paddingHorizontal: BioPulseTheme.spacing.md,
    paddingVertical: BioPulseTheme.spacing.md,
    backgroundColor: BioPulseTheme.colors.surface,
    minHeight: 48, // Accessibility: minimum touch target
    justifyContent: 'center',
  },
  notesText: {
    fontSize: BioPulseTheme.typography.fontSize.md,
    color: BioPulseTheme.colors.text,
  },
  notesPlaceholder: {
    color: BioPulseTheme.colors.textTertiary,
  },
  logButton: {
    backgroundColor: BioPulseTheme.colors.primary,
    borderRadius: BioPulseTheme.borderRadius.md,
    paddingVertical: BioPulseTheme.spacing.md,
    paddingHorizontal: BioPulseTheme.spacing.lg,
    alignItems: 'center',
    minHeight: 48, // Accessibility: minimum touch target
    justifyContent: 'center',
    marginTop: BioPulseTheme.spacing.md,
  },
  logButtonDisabled: {
    backgroundColor: BioPulseTheme.colors.disabled,
  },
  logButtonText: {
    fontSize: BioPulseTheme.typography.fontSize.lg,
    fontWeight: BioPulseTheme.typography.fontWeight.semibold,
    color: BioPulseTheme.colors.white,
  },
  historyContainer: {
    paddingHorizontal: BioPulseTheme.spacing.lg,
    paddingTop: BioPulseTheme.spacing.lg,
  },
});

export default LoggingScreen;