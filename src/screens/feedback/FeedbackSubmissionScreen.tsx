/**
 * Feedback Submission Screen
 * Allows users to submit feedback, bug reports, and feature requests
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useAppSelector } from '../../hooks/redux';
import { selectUser } from '../../store/authSlice';
import { FeedbackService } from '../../services/feedback/feedbackService';
import { FeedbackCategory, FeedbackSubmission, FeedbackTemplate } from '../../types/feedback';

interface FeedbackFormData {
  category: FeedbackCategory;
  title: string;
  description: string;
}

interface FeedbackSubmissionScreenProps {
  onSubmissionSuccess: (referenceNumber: string) => void;
  onBack: () => void;
}

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string; icon: string }[] = [
  { value: 'bug', label: 'Bug Report', icon: '🐛' },
  { value: 'feature_request', label: 'Feature Request', icon: '💡' },
  { value: 'content_quality', label: 'Content Feedback', icon: '📝' },
  { value: 'general_question', label: 'General Question', icon: '❓' },
];

export const FeedbackSubmissionScreen: React.FC<FeedbackSubmissionScreenProps> = ({
  onSubmissionSuccess,
  onBack,
}) => {
  const user = useAppSelector(selectUser);
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory>('general_question');
  const [template, setTemplate] = useState<FeedbackTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);

  const feedbackService = FeedbackService.getInstance();

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<FeedbackFormData>({
    defaultValues: {
      category: 'general_question',
      title: '',
      description: '',
    },
  });

  const watchedDescription = watch('description');

  useEffect(() => {
    setCharacterCount(watchedDescription?.length || 0);
  }, [watchedDescription]);

  useEffect(() => {
    const newTemplate = feedbackService.getFeedbackTemplate(selectedCategory);
    setTemplate(newTemplate);
    setValue('category', selectedCategory);
    
    // Clear form when category changes
    setValue('title', '');
    setValue('description', '');
  }, [selectedCategory, setValue]);

  const onSubmit = async (data: FeedbackFormData) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to submit feedback');
      return;
    }

    try {
      setSubmitting(true);

      const submission: FeedbackSubmission = {
        category: data.category,
        title: data.title.trim(),
        description: data.description.trim(),
      };

      const response = await feedbackService.submitFeedback(user.id, submission);

      if (response.success && response.referenceNumber) {
        // Show success message
        Alert.alert(
          '✅ Feedback Submitted!',
          `Thank you for your feedback!\n\nReference: ${response.referenceNumber}\n\nWe typically respond ${response.estimatedResponseTime}.`,
          [
            {
              text: 'OK',
              onPress: () => {
                reset();
                onSubmissionSuccess(response.referenceNumber);
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCategorySelector = () => (
    <View style={styles.categoryContainer}>
      <Text style={styles.sectionTitle}>What type of feedback is this?</Text>
      <View style={styles.categoryGrid}>
        {CATEGORY_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.categoryOption,
              selectedCategory === option.value && styles.selectedCategory,
            ]}
            onPress={() => setSelectedCategory(option.value)}
          >
            <Text style={styles.categoryIcon}>{option.icon}</Text>
            <Text
              style={[
                styles.categoryLabel,
                selectedCategory === option.value && styles.selectedCategoryLabel,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSuggestedQuestions = () => {
    if (!template?.suggestedQuestions.length) return null;

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>💭 Consider including:</Text>
        {template.suggestedQuestions.map((question, index) => (
          <Text key={index} style={styles.suggestionItem}>
            • {question}
          </Text>
        ))}
      </View>
    );
  };

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Please sign in to submit feedback</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Send Feedback</Text>
          <Text style={styles.subtitle}>Help us improve your experience</Text>
        </View>

        {renderCategorySelector()}

        {template && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>{template.title}</Text>

            <Controller
              control={control}
              name="title"
              rules={{
                required: 'Please provide a brief title',
                minLength: { value: 5, message: 'Title must be at least 5 characters' },
                maxLength: { value: 100, message: 'Title must be less than 100 characters' },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Brief Title *</Text>
                  <TextInput
                    style={[styles.titleInput, errors.title && styles.inputError]}
                    placeholder="Summarize your feedback in a few words"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    maxLength={100}
                  />
                  {errors.title && (
                    <Text style={styles.errorText}>{errors.title.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="description"
              rules={{
                required: 'Please provide details about your feedback',
                minLength: { value: 10, message: 'Please provide more details (at least 10 characters)' },
                maxLength: { value: 1000, message: 'Description must be less than 1000 characters' },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Details *</Text>
                  <TextInput
                    style={[styles.descriptionInput, errors.description && styles.inputError]}
                    placeholder={template.placeholder}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    multiline
                    numberOfLines={8}
                    maxLength={1000}
                    textAlignVertical="top"
                  />
                  <View style={styles.inputFooter}>
                    <Text style={styles.characterCount}>
                      {characterCount}/1000 characters
                    </Text>
                  </View>
                  {errors.description && (
                    <Text style={styles.errorText}>{errors.description.message}</Text>
                  )}
                </View>
              )}
            />

            {renderSuggestedQuestions()}

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.privacyNote}>
              Your feedback helps us improve the app. We'll review your submission and may contact you for follow-up questions.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  categoryContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  selectedCategory: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
    textAlign: 'center',
  },
  selectedCategoryLabel: {
    color: '#1976d2',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 12,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    minHeight: 120,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    color: '#6c757d',
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 4,
  },
  suggestionsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  suggestionItem: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyNote: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 18,
  },
});