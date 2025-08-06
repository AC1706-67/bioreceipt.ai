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
import { BioPulseTheme } from '../../constants/bioPulseTheme';
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
              <ActivityIndicator size="small" color={BioPulseTheme.colors.surface} />
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
              placeholderTextColor={BioPulseTheme.colors.textTertiary}
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
                <ActivityIndicator size="small" color={BioPulseTheme.colors.primary} />
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
              placeholderTextColor={BioPulseTheme.colors.textTertiary}
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
              placeholderTextColor={BioPulseTheme.colors.textTertiary}
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
    backgroundColor: BioPulseTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BioPulseTheme.spacing.lg,
    paddingVertical: BioPulseTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BioPulseTheme.colors.border,
    backgroundColor: BioPulseTheme.colors.surface,
  },
  title: {
    fontSize: BioPulseTheme.typography.fontSize.lg,
    fontWeight: '600',
    color: BioPulseTheme.colors.textPrimary,
  },
  cancelButton: {
    paddingHorizontal: BioPulseTheme.spacing.md,
    paddingVertical: BioPulseTheme.spacing.sm,
  },
  cancelButtonText: {
    fontSize: BioPulseTheme.typography.fontSize.base,
    color: BioPulseTheme.colors.textSecondary,
  },
  saveButton: {
    backgroundColor: BioPulseTheme.colors.primary,
    paddingHorizontal: BioPulseTheme.spacing.lg,
    paddingVertical: BioPulseTheme.spacing.sm,
    borderRadius: BioPulseTheme.borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: BioPulseTheme.colors.textTertiary,
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: BioPulseTheme.typography.fontSize.base,
    fontWeight: '600',
    color: BioPulseTheme.colors.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: BioPulseTheme.spacing.lg,
    paddingVertical: BioPulseTheme.spacing.md,
  },
  fieldContainer: {
    marginBottom: BioPulseTheme.spacing.lg,
  },
  fieldLabel: {
    fontSize: BioPulseTheme.typography.fontSize.base,
    fontWeight: '500',
    color: BioPulseTheme.colors.textPrimary,
    marginBottom: BioPulseTheme.spacing.sm,
  },
  required: {
    color: BioPulseTheme.colors.error,
  },
  textInput: {
    borderWidth: 1,
    borderColor: BioPulseTheme.colors.border,
    borderRadius: BioPulseTheme.borderRadius.md,
    paddingHorizontal: BioPulseTheme.spacing.md,
    paddingVertical: BioPulseTheme.spacing.sm,
    fontSize: BioPulseTheme.typography.fontSize.base,
    color: BioPulseTheme.colors.textPrimary,
    backgroundColor: BioPulseTheme.colors.surface,
    minHeight: 48,
  },
  textInputError: {
    borderColor: BioPulseTheme.colors.error,
    backgroundColor: '#FFF5F5',
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: BioPulseTheme.colors.border,
    borderRadius: BioPulseTheme.borderRadius.md,
    backgroundColor: BioPulseTheme.colors.surface,
    overflow: 'hidden',
  },
  pickerContainerError: {
    borderColor: BioPulseTheme.colors.error,
    backgroundColor: '#FFF5F5',
  },
  picker: {
    height: 48,
    color: BioPulseTheme.colors.textPrimary,
  },
  errorText: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.error,
    marginTop: BioPulseTheme.spacing.xs,
  },
  helperText: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.textTertiary,
    marginTop: BioPulseTheme.spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: BioPulseTheme.spacing.md,
  },
  loadingText: {
    marginLeft: BioPulseTheme.spacing.sm,
    fontSize: BioPulseTheme.typography.fontSize.base,
    color: BioPulseTheme.colors.textSecondary,
  },
  suggestionsContainer: {
    marginTop: BioPulseTheme.spacing.md,
  },
  suggestionsLabel: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    fontWeight: '500',
    color: BioPulseTheme.colors.textSecondary,
    marginBottom: BioPulseTheme.spacing.sm,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BioPulseTheme.spacing.sm,
    marginBottom: BioPulseTheme.spacing.sm,
  },
  suggestionChip: {
    backgroundColor: BioPulseTheme.colors.surface,
    borderWidth: 1,
    borderColor: BioPulseTheme.colors.border,
    borderRadius: BioPulseTheme.borderRadius.md,
    paddingHorizontal: BioPulseTheme.spacing.md,
    paddingVertical: BioPulseTheme.spacing.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  suggestionChipSelected: {
    backgroundColor: BioPulseTheme.colors.primary,
    borderColor: BioPulseTheme.colors.primary,
  },
  suggestionText: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    fontWeight: '600',
    color: BioPulseTheme.colors.textPrimary,
    marginBottom: 2,
  },
  suggestionTextSelected: {
    color: BioPulseTheme.colors.surface,
  },
  suggestionDescription: {
    fontSize: BioPulseTheme.typography.fontSize.xs,
    color: BioPulseTheme.colors.textSecondary,
    textAlign: 'center',
  },
  suggestionDescriptionSelected: {
    color: BioPulseTheme.colors.surface,
    opacity: 0.9,
  },
  customUnitHint: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    color: BioPulseTheme.colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default AddSubstanceModal;