/**
 * Add Custom Substance Modal
 * Allows users to add custom substances to their tracking catalog
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';
import { substanceDatabase } from '../../services/substance/substanceDatabase';
import { NewSubstance, getUnitSuggestions, getCommonUnits } from '../../models/NewSubstance';
import { SubstanceCategory } from '../../models/Substance';
import { validateName, validateCategory, validateDefaultUnit, validateDescription } from '../../utils/substanceValidation';
import { Database } from '../../config/supabase';
import { useToast } from '../../contexts/ToastContext';
import { getErrorRecoveryStrategy, executeErrorRecovery, smartRetry } from '../../utils/substanceErrorRecovery';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubstanceAdded: (substance: Database['public']['Tables']['substances']['Row'] & {
    substance_categories: { id: string; name: string };
  }) => void;
}

interface FormData {
  name: string;
  category: SubstanceCategory | '';
  defaultUnit: string;
  description: string;
}

interface ValidationErrors {
  name?: string;
  category?: string;
  defaultUnit?: string;
  description?: string;
}

const AddSubstanceModal: React.FC<Props> = ({
  visible,
  onClose,
  onSubstanceAdded,
}) => {
  const [categories, setCategories] = useState<Database['public']['Tables']['substance_categories']['Row'][]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    category: '',
    defaultUnit: '',
    description: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  
  const toast = useToast();

  // Load categories when modal opens
  useEffect(() => {
    if (visible) {
      loadCategories();
      resetForm();
    }
  }, [visible]);

  const loadCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const result = await substanceDatabase.getSupabaseCategories();
      if (result.success && result.data) {
        setCategories(result.data);
      } else {
        const error = result.error || 'Failed to load categories. Please try again.';
        toast.showError(error);
      }
    } catch (error: any) {
      console.error('Error loading categories:', error);
      toast.showError('Failed to load categories. Please try again.');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      defaultUnit: '',
      description: '',
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    const nameError = validateName(formData.name);
    if (nameError) {
      newErrors.name = nameError;
    }

    const categoryError = validateCategory(formData.category);
    if (categoryError) {
      newErrors.category = categoryError;
    }

    const unitError = validateDefaultUnit(formData.defaultUnit);
    if (unitError) {
      newErrors.defaultUnit = unitError;
    }

    const descriptionError = validateDescription(formData.description);
    if (descriptionError) {
      newErrors.description = descriptionError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.showError(
        'Please fix the validation errors before submitting.',
        'Review',
        () => {
          // Focus on first error field
          const firstErrorField = Object.keys(errors)[0];
          if (firstErrorField) {
            // Could implement field focusing here
            console.log(`Focus on field: ${firstErrorField}`);
          }
        }
      );
      return;
    }

    setIsLoading(true);

    try {
      const newSubstance: NewSubstance = {
        name: formData.name,
        category: formData.category as SubstanceCategory,
        defaultUnit: formData.defaultUnit,
        description: formData.description || undefined,
      };

      const result = await substanceDatabase.addCustomSubstance(
        newSubstance,
        (attemptNumber, error) => {
          // Show retry feedback to user
          toast.showInfo(
            `Retrying... (attempt ${attemptNumber})`,
            'Cancel',
            () => {
              // Could implement retry cancellation here
              console.log('User cancelled retry');
            }
          );
        }
      );

      if (result.success && result.data) {
        // Enhanced success feedback
        toast.showSuccess(
          `${result.data.name} added successfully!`,
          'Log Intake',
          () => {
            // Auto-navigate to logging with this substance selected
            onSubstanceAdded(result.data);
            onClose();
          }
        );
        
        // If no action taken, still proceed normally
        setTimeout(() => {
          onSubstanceAdded(result.data);
          onClose();
        }, 100);
      } else {
        // Enhanced error handling based on error type
        if (result.substanceError) {
          const errorInfo = result.substanceError;
          
          if (errorInfo.code === 'DUPLICATE_NAME') {
            // Special handling for duplicate names
            setErrors({ name: 'A substance with this name already exists' });
            toast.showError(
              'This substance name is already taken',
              'Try Again',
              () => {
                // Clear the name field and focus it
                setFormData(prev => ({ ...prev, name: '' }));
                setErrors(prev => ({ ...prev, name: undefined }));
              }
            );
          } else if (errorInfo.code === 'NETWORK_ERROR') {
            // Network error with retry option
            toast.showError(
              'Connection problem. Check your internet and try again.',
              'Retry',
              () => {
                handleSubmit(); // Retry the submission
              }
            );
          } else if (errorInfo.code === 'RATE_LIMITED') {
            // Rate limiting error
            toast.showWarning(
              'Too many requests. Please wait a moment before trying again.',
              'OK'
            );
          } else if (result.validationErrors) {
            // Validation errors
            setErrors(result.validationErrors);
            toast.showError(
              'Please fix the highlighted errors and try again.',
              'Review',
              () => {
                // Focus on first error field
                const firstErrorField = Object.keys(result.validationErrors!)[0];
                console.log(`Focus on field: ${firstErrorField}`);
              }
            );
          } else {
            // Generic error with user-friendly message
            toast.showError(
              errorInfo.userMessage || 'Failed to add substance. Please try again.',
              errorInfo.retryable ? 'Retry' : 'OK',
              errorInfo.retryable ? () => handleSubmit() : undefined
            );
          }
        } else {
          // Fallback error handling
          toast.showError(
            result.error || 'Failed to add substance. Please try again.',
            'Retry',
            () => handleSubmit()
          );
        }
      }
    } catch (error: any) {
      console.error('Error adding substance:', error);
      
      // Enhanced error classification for unexpected errors
      if (error.name === 'NetworkError' || error.message?.includes('network')) {
        toast.showError(
          'Network connection lost. Please check your internet and try again.',
          'Retry',
          () => handleSubmit()
        );
      } else if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
        toast.showError(
          'Request timed out. Please try again.',
          'Retry',
          () => handleSubmit()
        );
      } else if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
        toast.showError(
          'You don\'t have permission to add substances. Please log in again.',
          'OK'
        );
      } else {
        toast.showError(
          'An unexpected error occurred. Please try again.',
          'Retry',
          () => handleSubmit()
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryDisplayName = (category: SubstanceCategory): string => {
    return category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
  };

  // Real-time validation handlers
  const handleNameChange = (text: string) => {
    setFormData(prev => ({ ...prev, name: text }));
    if (errors.name) {
      const nameError = validateName(text);
      setErrors(prev => ({ ...prev, name: nameError || undefined }));
    }
  };

  const handleCategoryChange = (category: SubstanceCategory | '') => {
    setFormData(prev => ({ ...prev, category }));
    if (errors.category) {
      const categoryError = validateCategory(category);
      setErrors(prev => ({ ...prev, category: categoryError || undefined }));
    }
    
    // Auto-suggest most common unit for the category
    if (category && !formData.defaultUnit.trim()) {
      const commonUnits = getCommonUnits(category as SubstanceCategory);
      if (commonUnits.length > 0) {
        const topUnit = commonUnits[0].unit;
        setFormData(prev => ({ ...prev, defaultUnit: topUnit }));
        toast.showInfo(`Suggested unit: ${topUnit}`, 'Change', () => {
          setFormData(prev => ({ ...prev, defaultUnit: '' }));
        });
      }
    }
  };

  const handleUnitChange = (text: string) => {
    setFormData(prev => ({ ...prev, defaultUnit: text }));
    if (errors.defaultUnit) {
      const unitError = validateDefaultUnit(text);
      setErrors(prev => ({ ...prev, defaultUnit: unitError || undefined }));
    }
  };

  const handleDescriptionChange = (text: string) => {
    setFormData(prev => ({ ...prev, description: text }));
    if (errors.description) {
      const descriptionError = validateDescription(text);
      setErrors(prev => ({ ...prev, description: descriptionError || undefined }));
    }
  };

  const handleUnitSuggestionSelect = (unit: string) => {
    setFormData(prev => ({ ...prev, defaultUnit: unit }));
    // Clear unit error if it exists
    if (errors.defaultUnit) {
      const unitError = validateDefaultUnit(unit);
      setErrors(prev => ({ ...prev, defaultUnit: unitError || undefined }));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isLoading}
            accessible={true}
            accessibilityLabel="Cancel adding substance"
            accessibilityRole="button"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Add Custom Substance</Text>
          
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            accessible={true}
            accessibilityLabel="Save new substance"
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={BioReceiptTheme.colors.surface} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Name Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.textInput, errors.name && styles.textInputError]}
              placeholder="e.g., Vitamin D3, Green Tea Extract"
              placeholderTextColor={BioReceiptTheme.colors.textTertiary}
              value={formData.name}
              onChangeText={handleNameChange}
              maxLength={50}
              accessible={true}
              accessibilityLabel="Substance name"
              accessibilityHint="Enter the name of the substance you want to add"
              testID="substance-name-input"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            <Text style={styles.helperText}>
              {formData.name.length}/50 characters
            </Text>
          </View>

          {/* Category Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              Category <Text style={styles.required}>*</Text>
            </Text>
            {isLoadingCategories ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={BioReceiptTheme.colors.primary} />
                <Text style={styles.loadingText}>Loading categories...</Text>
              </View>
            ) : (
              <View style={[styles.pickerContainer, errors.category && styles.pickerContainerError]}>
                <Picker
                  selectedValue={formData.category}
                  onValueChange={(value) => handleCategoryChange(value as SubstanceCategory | '')}
                  style={styles.picker}
                  accessible={true}
                  accessibilityLabel="Substance category"
                  testID="substance-category-picker"
                >
                  <Picker.Item label="Select a category..." value="" />
                  {Object.values(SubstanceCategory).map(category => (
                    <Picker.Item
                      key={category}
                      label={getCategoryDisplayName(category)}
                      value={category}
                    />
                  ))}
                </Picker>
              </View>
            )}
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>

          {/* Default Unit Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              Default Unit <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.textInput, errors.defaultUnit && styles.textInputError]}
              placeholder="e.g., ml, mg, tablet"
              placeholderTextColor={BioReceiptTheme.colors.textTertiary}
              value={formData.defaultUnit}
              onChangeText={handleUnitChange}
              maxLength={20}
              autoCapitalize="none"
              accessible={true}
              accessibilityLabel="Default unit of measurement"
              accessibilityHint="Enter the unit used to measure this substance"
              testID="substance-unit-input"
            />
            {errors.defaultUnit && <Text style={styles.errorText}>{errors.defaultUnit}</Text>}
            
            {/* Unit Suggestions */}
            {formData.category && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsLabel}>Suggested units for {getCategoryDisplayName(formData.category as SubstanceCategory)}:</Text>
                <View style={styles.suggestionsList}>
                  {getCommonUnits(formData.category as SubstanceCategory).map(suggestion => (
                    <TouchableOpacity
                      key={suggestion.unit}
                      style={[
                        styles.suggestionChip,
                        formData.defaultUnit === suggestion.unit && styles.suggestionChipSelected
                      ]}
                      onPress={() => handleUnitSuggestionSelect(suggestion.unit)}
                      accessible={true}
                      accessibilityLabel={`Use ${suggestion.unit} as unit`}
                      accessibilityHint={suggestion.displayName}
                      accessibilityRole="button"
                    >
                      <Text style={[
                        styles.suggestionText,
                        formData.defaultUnit === suggestion.unit && styles.suggestionTextSelected
                      ]}>
                        {suggestion.unit}
                      </Text>
                      <Text style={[
                        styles.suggestionDescription,
                        formData.defaultUnit === suggestion.unit && styles.suggestionDescriptionSelected
                      ]}>
                        {suggestion.displayName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.customUnitHint}>
                  Don't see your unit? Type it directly in the field above.
                </Text>
              </View>
            )}
          </View>

          {/* Description Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textInputMultiline, errors.description && styles.textInputError]}
              placeholder="e.g., Essential vitamin for bone health and immune function"
              placeholderTextColor={BioReceiptTheme.colors.textTertiary}
              value={formData.description}
              onChangeText={handleDescriptionChange}
              maxLength={255}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessible={true}
              accessibilityLabel="Substance description"
              accessibilityHint="Optional description for the substance"
              testID="substance-description-input"
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            <Text style={styles.helperText}>
              {formData.description.length}/255 characters
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BioReceiptTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BioReceiptTheme.colors.border,
    backgroundColor: BioReceiptTheme.colors.surface,
  },
  title: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    fontWeight: '600',
    color: BioReceiptTheme.colors.textPrimary,
  },
  cancelButton: {
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.sm,
  },
  cancelButtonText: {
    fontSize: BioReceiptTheme.typography.fontSize.base,
    color: BioReceiptTheme.colors.textSecondary,
  },
  saveButton: {
    backgroundColor: BioReceiptTheme.colors.primary,
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.sm,
    borderRadius: BioReceiptTheme.borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: BioReceiptTheme.colors.textTertiary,
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: BioReceiptTheme.typography.fontSize.base,
    fontWeight: '600',
    color: BioReceiptTheme.colors.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.md,
  },
  fieldContainer: {
    marginBottom: BioReceiptTheme.spacing.lg,
  },
  fieldLabel: {
    fontSize: BioReceiptTheme.typography.fontSize.base,
    fontWeight: '500',
    color: BioReceiptTheme.colors.textPrimary,
    marginBottom: BioReceiptTheme.spacing.sm,
  },
  required: {
    color: BioReceiptTheme.colors.error,
  },
  textInput: {
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
    borderRadius: BioReceiptTheme.borderRadius.md,
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.sm,
    fontSize: BioReceiptTheme.typography.fontSize.base,
    color: BioReceiptTheme.colors.textPrimary,
    backgroundColor: BioReceiptTheme.colors.surface,
    minHeight: 48,
  },
  textInputError: {
    borderColor: BioReceiptTheme.colors.error,
    backgroundColor: '#FFF5F5',
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
    borderRadius: BioReceiptTheme.borderRadius.md,
    backgroundColor: BioReceiptTheme.colors.surface,
    overflow: 'hidden',
  },
  pickerContainerError: {
    borderColor: BioReceiptTheme.colors.error,
    backgroundColor: '#FFF5F5',
  },
  picker: {
    height: 48,
    color: BioReceiptTheme.colors.textPrimary,
  },
  errorText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.error,
    marginTop: BioReceiptTheme.spacing.xs,
  },
  helperText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textTertiary,
    marginTop: BioReceiptTheme.spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: BioReceiptTheme.spacing.md,
  },
  loadingText: {
    marginLeft: BioReceiptTheme.spacing.sm,
    fontSize: BioReceiptTheme.typography.fontSize.base,
    color: BioReceiptTheme.colors.textSecondary,
  },
  suggestionsContainer: {
    marginTop: BioReceiptTheme.spacing.md,
  },
  suggestionsLabel: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    fontWeight: '500',
    color: BioReceiptTheme.colors.textSecondary,
    marginBottom: BioReceiptTheme.spacing.sm,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BioReceiptTheme.spacing.sm,
    marginBottom: BioReceiptTheme.spacing.sm,
  },
  suggestionChip: {
    backgroundColor: BioReceiptTheme.colors.surface,
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
    borderRadius: BioReceiptTheme.borderRadius.md,
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  suggestionChipSelected: {
    backgroundColor: BioReceiptTheme.colors.primary,
    borderColor: BioReceiptTheme.colors.primary,
  },
  suggestionText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    fontWeight: '600',
    color: BioReceiptTheme.colors.textPrimary,
    marginBottom: 2,
  },
  suggestionTextSelected: {
    color: BioReceiptTheme.colors.surface,
  },
  suggestionDescription: {
    fontSize: BioReceiptTheme.typography.fontSize.xs,
    color: BioReceiptTheme.colors.textSecondary,
    textAlign: 'center',
  },
  suggestionDescriptionSelected: {
    color: BioReceiptTheme.colors.surface,
    opacity: 0.9,
  },
  customUnitHint: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default AddSubstanceModal;