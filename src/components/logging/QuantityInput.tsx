/**
 * Quantity Input - MVP Quantity and Unit Input Component
 * Accessible quantity input with unit selection
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';

interface Props {
  quantity: string;
  unit: string;
  defaultUnit: string;
  onQuantityChange: (quantity: string) => void;
  onUnitChange: (unit: string) => void;
  autoFocus?: boolean;
  onFocus?: () => void;
}

// Common units for different substance categories
const COMMON_UNITS = [
  // Volume
  'ml', 'l', 'oz', 'cup', 'tbsp', 'tsp',
  // Weight
  'g', 'kg', 'mg', 'lb', 'oz',
  // Count
  'tablet', 'capsule', 'pill', 'drop', 'spray',
  // Serving
  'serving', 'scoop', 'dose', 'piece',
  // Medical
  'IU', 'mcg', 'unit',
];

const QuantityInput: React.FC<Props> = ({
  quantity,
  unit,
  defaultUnit,
  onQuantityChange,
  onUnitChange,
  autoFocus = false,
  onFocus,
}) => {
  const [isUnitModalVisible, setIsUnitModalVisible] = useState(false);
  const [quantityError, setQuantityError] = useState('');

  const validateQuantity = (value: string): boolean => {
    if (!value) {
      setQuantityError('Quantity is required');
      return false;
    }
    
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setQuantityError('Please enter a valid positive number');
      return false;
    }
    
    if (numValue > 10000) {
      setQuantityError('Quantity seems too large');
      return false;
    }
    
    setQuantityError('');
    return true;
  };

  const handleQuantityChange = (value: string) => {
    // Allow only numbers and decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    onQuantityChange(cleanValue);
    
    // Validate if there's a value
    if (cleanValue) {
      validateQuantity(cleanValue);
    } else {
      setQuantityError('');
    }
  };

  const handleUnitSelect = (selectedUnit: string) => {
    onUnitChange(selectedUnit);
    setIsUnitModalVisible(false);
  };

  const renderUnitItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.unitItem, item === unit && styles.unitItemSelected]}
      onPress={() => handleUnitSelect(item)}
      accessible={true}
      accessibilityLabel={`Select unit ${item}`}
      accessibilityRole="button"
      accessibilityState={{ selected: item === unit }}
    >
      <Text style={[styles.unitText, item === unit && styles.unitTextSelected]}>
        {item}
      </Text>
      {item === defaultUnit && (
        <Text style={styles.defaultLabel}>Default</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Quantity</Text>
      
      <View style={styles.inputRow}>
        {/* Quantity Input */}
        <View style={styles.quantityContainer}>
          <TextInput
            style={[styles.quantityInput, quantityError ? styles.inputError : null]}
            value={quantity}
            onChangeText={handleQuantityChange}
            placeholder="0"
            placeholderTextColor={BioReceiptTheme.colors.textTertiary}
            keyboardType="decimal-pad"
            autoFocus={autoFocus}
            onFocus={onFocus}
            accessible={true}
            accessibilityLabel="Quantity input"
            accessibilityHint="Enter the amount consumed"
            testID="quantity-input"
          />
          {quantityError ? (
            <Text 
              style={styles.errorText}
              accessible={true}
              accessibilityRole="alert"
            >
              {quantityError}
            </Text>
          ) : null}
        </View>

        {/* Unit Selector */}
        <TouchableOpacity
          style={styles.unitSelector}
          onPress={() => setIsUnitModalVisible(true)}
          accessible={true}
          accessibilityLabel={`Selected unit: ${unit}`}
          accessibilityHint="Change unit of measurement"
          accessibilityRole="button"
          testID="unit-selector"
        >
          <Text style={styles.unitSelectorText}>{unit}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Unit Selection Modal */}
      <Modal
        visible={isUnitModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsUnitModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsUnitModalVisible(false)}
              accessible={true}
              accessibilityLabel="Cancel unit selection"
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Unit</Text>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => handleUnitSelect(defaultUnit)}
              accessible={true}
              accessibilityLabel="Reset to default unit"
              accessibilityRole="button"
            >
              <Text style={styles.resetButtonText}>Default</Text>
            </TouchableOpacity>
          </View>

          {/* Units List */}
          <FlatList
            data={COMMON_UNITS}
            keyExtractor={(item) => item}
            renderItem={renderUnitItem}
            style={styles.unitsList}
            contentContainerStyle={styles.unitsListContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: BioReceiptTheme.spacing.lg,
  },
  label: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
    color: BioReceiptTheme.colors.text,
    marginBottom: BioReceiptTheme.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: BioReceiptTheme.spacing.md,
  },
  quantityContainer: {
    flex: 2,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
    borderRadius: BioReceiptTheme.borderRadius.md,
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.md,
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    color: BioReceiptTheme.colors.text,
    backgroundColor: BioReceiptTheme.colors.surface,
    textAlign: 'center',
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    minHeight: 48, // Accessibility: minimum touch target
  },
  inputError: {
    borderColor: BioReceiptTheme.colors.error,
  },
  errorText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.error,
    marginTop: BioReceiptTheme.spacing.xs,
    textAlign: 'center',
  },
  unitSelector: {
    flex: 1,
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
    borderRadius: BioReceiptTheme.borderRadius.md,
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.md,
    backgroundColor: BioReceiptTheme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48, // Accessibility: minimum touch target
  },
  unitSelectorText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
    color: BioReceiptTheme.colors.text,
  },
  chevron: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    color: BioReceiptTheme.colors.textTertiary,
    fontWeight: BioReceiptTheme.typography.fontWeight.bold,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: BioReceiptTheme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BioReceiptTheme.colors.border,
    backgroundColor: BioReceiptTheme.colors.surface,
  },
  cancelButton: {
    paddingVertical: BioReceiptTheme.spacing.sm,
    paddingHorizontal: BioReceiptTheme.spacing.sm,
    minHeight: 44, // Accessibility: minimum touch target
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.textSecondary,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
  },
  modalTitle: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.text,
  },
  resetButton: {
    paddingVertical: BioReceiptTheme.spacing.sm,
    paddingHorizontal: BioReceiptTheme.spacing.sm,
    minHeight: 44, // Accessibility: minimum touch target
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.primary,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
  },
  unitsList: {
    flex: 1,
  },
  unitsListContent: {
    paddingVertical: BioReceiptTheme.spacing.md,
  },
  unitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BioReceiptTheme.colors.border,
    backgroundColor: BioReceiptTheme.colors.surface,
    minHeight: 48, // Accessibility: minimum touch target
  },
  unitItemSelected: {
    backgroundColor: BioReceiptTheme.colors.primaryLight,
    borderBottomColor: BioReceiptTheme.colors.primary,
  },
  unitText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.text,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
  },
  unitTextSelected: {
    color: BioReceiptTheme.colors.primary,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
  },
  defaultLabel: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.success,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
    backgroundColor: BioReceiptTheme.colors.successLight,
    paddingHorizontal: BioReceiptTheme.spacing.sm,
    paddingVertical: 2,
    borderRadius: BioReceiptTheme.borderRadius.sm,
  },
});

export default QuantityInput;