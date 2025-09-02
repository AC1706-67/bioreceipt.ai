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
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';
import SubstanceSelector from './SubstanceSelector';
import QuantityInput from './QuantityInput';
import IntakeHistory from './IntakeHistory';
import { supabaseHelpers } from '../../config/supabase';
import { OfflineQueueStatus } from '../photo/OfflineQueueStatus';

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

interface LoggingScreenProps {
  route?: {
    params?: {
      preSelectedSubstance?: Substance;
      autoFocusQuantity?: boolean;
    };
  };
}

const LoggingScreen: React.FC<LoggingScreenProps> = ({ route }) => {
  const { user } = useSelector((state: any) => state.auth);
  
  const [substances, setSubstances] = useState<Substance[]>([]);
  const [selectedSubstance, setSelectedSubstance] = useState<Substance | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSubstances, setIsLoadingSubstances] = useState(true);
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [shouldAutoFocusQuantity, setShouldAutoFocusQuantity] = useState(false);

  // Load substances on component mount
  useEffect(() => {
    loadSubstances();
  }, []);

  // Handle pre-selected substance from navigation params
  useEffect(() => {
    if (route?.params?.preSelectedSubstance) {
      const preSelected = route.params.preSelectedSubstance;
      setSelectedSubstance(preSelected);
      setUnit(preSelected.default_unit);
      
      // Auto-focus quantity input if requested
      if (route.params.autoFocusQuantity) {
        setShouldAutoFocusQuantity(true);
      }
      
      // Show success message for smooth UX
      Alert.alert(
        'Substance Selected',
        `${preSelected.name} is ready for logging. Enter the quantity to continue.`,
        [{ text: 'OK', style: 'default' }]
      );
    }
  }, [route?.params]);

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
          onSubstanceAdded={(newSubstance) => {
            // Auto-select the newly created substance
            setSelectedSubstance(newSubstance);
            setUnit(newSubstance.default_unit);
            setShouldAutoFocusQuantity(true);
            
            // Update local substances list
            setSubstances(prev => {
              const exists = prev.some(s => s.id === newSubstance.id);
              return exists ? prev : [...prev, newSubstance];
            });
          }}
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
            autoFocus={shouldAutoFocusQuantity}
            onFocus={() => setShouldAutoFocusQuantity(false)}
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

      {/* Offline Photo Queue Status */}
      <OfflineQueueStatus compact={true} />

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
    backgroundColor: BioReceiptTheme.colors.background,
  },
  scrollContent: {
    paddingBottom: BioReceiptTheme.spacing.xl,
  },
  header: {
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingTop: BioReceiptTheme.spacing.xl,
    paddingBottom: BioReceiptTheme.spacing.lg,
    backgroundColor: BioReceiptTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: BioReceiptTheme.colors.border,
  },
  title: {
    fontSize: BioReceiptTheme.typography.fontSize['2xl'],
    fontWeight: BioReceiptTheme.typography.fontWeight.bold,
    color: BioReceiptTheme.colors.text,
    marginBottom: BioReceiptTheme.spacing.xs,
  },
  subtitle: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.textSecondary,
  },
  quickActionsContainer: {
    paddingVertical: BioReceiptTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.text,
    marginBottom: BioReceiptTheme.spacing.md,
    paddingHorizontal: BioReceiptTheme.spacing.lg,
  },
  quickActionsScroll: {
    paddingLeft: BioReceiptTheme.spacing.lg,
  },
  quickActionsContent: {
    paddingRight: BioReceiptTheme.spacing.lg,
  },
  quickActionButton: {
    backgroundColor: BioReceiptTheme.colors.surface,
    borderRadius: BioReceiptTheme.borderRadius.lg,
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.sm,
    marginRight: BioReceiptTheme.spacing.sm,
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
    minHeight: 44, // Accessibility: minimum touch target
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
    color: BioReceiptTheme.colors.text,
    textAlign: 'center',
  },
  quickActionUnit: {
    fontSize: BioReceiptTheme.typography.fontSize.xs,
    color: BioReceiptTheme.colors.textTertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  formContainer: {
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.lg,
  },
  inputContainer: {
    marginBottom: BioReceiptTheme.spacing.lg,
  },
  label: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
    color: BioReceiptTheme.colors.text,
    marginBottom: BioReceiptTheme.spacing.sm,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
    borderRadius: BioReceiptTheme.borderRadius.md,
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.md,
    backgroundColor: BioReceiptTheme.colors.surface,
    minHeight: 48, // Accessibility: minimum touch target
    justifyContent: 'center',
  },
  notesText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.text,
  },
  notesPlaceholder: {
    color: BioReceiptTheme.colors.textTertiary,
  },
  logButton: {
    backgroundColor: BioReceiptTheme.colors.primary,
    borderRadius: BioReceiptTheme.borderRadius.md,
    paddingVertical: BioReceiptTheme.spacing.md,
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    alignItems: 'center',
    minHeight: 48, // Accessibility: minimum touch target
    justifyContent: 'center',
    marginTop: BioReceiptTheme.spacing.md,
  },
  logButtonDisabled: {
    backgroundColor: BioReceiptTheme.colors.disabled,
  },
  logButtonText: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.white,
  },
  historyContainer: {
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingTop: BioReceiptTheme.spacing.lg,
  },
});

export default LoggingScreen;