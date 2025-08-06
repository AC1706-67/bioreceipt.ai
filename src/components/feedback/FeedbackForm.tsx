/**
 * Feedback Form Component
 * Comprehensive form for submitting user feedback with validation and offline support
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import {
  FeedbackCategory,
  FeedbackFormData,
  FeedbackValidator,
  UserFeedback
} from '../../models/Feedback';
import { feedbackService } from '../../services/feedback/feedbackService';

interface FeedbackFormProps {
  userId: string;
  initialCategory?: FeedbackCategory;
  onSubmitSuccess?: (feedback: UserFeedback) => void;
  onCancel?: () => void;
  style?: any;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({
  userId,
  initialCategory,
  onSubmitSuccess,
  onCancel,
  style
}) => {
  const [formData, setFormData] = useState<FeedbackFormData>({
    category: initialCategory || FeedbackCategory.GENERAL,
    title: '',
    description: '',
    userEmail: '',
    isPublic: false
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Load feedback templates
  useEffect(() => {
    loadTemplates();
  }, [formData.category]);

  const loadTemplates = useCallback(async () => {
    try {
      const categoryTemplates = await feedbackService.getFeedbackTemplates(formData.category);
      setTemplates(categoryTemplates);
      
      if (categoryTemplates.length > 0) {
        setSelectedTemplate(categoryTemplates[0]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }, [formData.category]);

  const handleInputChange = useCallback((field: keyof FeedbackFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  }, [errors.length]);

  const handleCategoryChange = useCallback((category: FeedbackCategory) => {
    setFormData(prev => ({ ...prev, category }));
    setSelectedTemplate(null);
  }, []);

  const validateForm = useCallback((): boolean => {
    const validation = FeedbackValidator.validate(formData);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return false;
    }
    
    setErrors([]);
    return true;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const feedback = await feedbackService.submitFeedback(userId, formData);
      
      Alert.alert(
        'Feedback Submitted',
        `Thank you for your feedback! Your reference number is ${feedback.referenceNumber}. We'll get back to you soon.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onSubmitSuccess) {
                onSubmitSuccess(feedback);
              }
            }
          }
        ]
      );

      // Reset form
      setFormData({
        category: FeedbackCategory.GENERAL,
        title: '',
        description: '',
        userEmail: '',
        isPublic: false
      });

    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert(
        'Submission Error',
        'There was an error submitting your feedback. It has been saved and will be submitted when you\'re back online.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, formData, validateForm, onSubmitSuccess]);

  const handleTemplateSelect = useCallback((template: any) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      category: template.category
    }));
  }, []);

  const getCategoryDisplayName = (category: FeedbackCategory): string => {
    const names: Record<FeedbackCategory, string> = {
      [FeedbackCategory.BUG_REPORT]: 'Bug Report',
      [FeedbackCategory.FEATURE_REQUEST]: 'Feature Request',
      [FeedbackCategory.CONTENT_QUALITY]: 'Content Quality',
      [FeedbackCategory.USABILITY]: 'Usability',
      [FeedbackCategory.PERFORMANCE]: 'Performance',
      [FeedbackCategory.ACCESSIBILITY]: 'Accessibility',
      [FeedbackCategory.GENERAL]: 'General Feedback'
    };
    return names[category];
  };

  const renderCategorySelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Feedback Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {Object.values(FeedbackCategory).map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              formData.category === category && styles.categoryButtonActive
            ]}
            onPress={() => handleCategoryChange(category)}
          >
            <Text style={[
              styles.categoryButtonText,
              formData.category === category && styles.categoryButtonTextActive
            ]}>
              {getCategoryDisplayName(category)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTemplateSelector = () => {
    if (templates.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Templates</Text>
        {templates.map(template => (
          <TouchableOpacity
            key={template.category}
            style={[
              styles.templateButton,
              selectedTemplate?.category === template.category && styles.templateButtonActive
            ]}
            onPress={() => handleTemplateSelect(template)}
          >
            <Text style={styles.templateTitle}>{template.title}</Text>
            <Text style={styles.templateDescription}>{template.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderSuggestedQuestions = () => {
    if (!selectedTemplate?.suggestedQuestions) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Consider These Questions</Text>
        {selectedTemplate.suggestedQuestions.map((question: string, index: number) => (
          <Text key={index} style={styles.suggestedQuestion}>
            • {question}
          </Text>
        ))}
      </View>
    );
  };

  const renderErrors = () => {
    if (errors.length === 0) return null;

    return (
      <View style={styles.errorContainer}>
        {errors.map((error, index) => (
          <Text key={index} style={styles.errorText}>• {error}</Text>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Share Your Feedback</Text>
        <Text style={styles.subtitle}>
          Help us improve by sharing your thoughts, reporting issues, or suggesting new features.
        </Text>

        {renderCategorySelector()}
        {renderTemplateSelector()}
        {renderSuggestedQuestions()}

        <View style={styles.section}>
          <Text style={styles.label}>
            Title <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(text) => handleInputChange('title', text)}
            placeholder="Brief summary of your feedback"
            maxLength={200}
            multiline={false}
          />
          <Text style={styles.charCount}>{formData.title.length}/200</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => handleInputChange('description', text)}
            placeholder="Please provide detailed information about your feedback"
            maxLength={2000}
            multiline={true}
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{formData.description.length}/2000</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Email (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.userEmail}
            onChangeText={(text) => handleInputChange('userEmail', text)}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.helperText}>
            We'll use this to follow up on your feedback if needed
          </Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => handleInputChange('isPublic', !formData.isPublic)}
          >
            <View style={[styles.checkbox, formData.isPublic && styles.checkboxChecked]}>
              {formData.isPublic && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              Make this feedback public (helps other users)
            </Text>
          </TouchableOpacity>
        </View>

        {renderErrors()}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Feedback</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  templateButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  templateButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  suggestedQuestion: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
    lineHeight: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    marginBottom: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 32,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default FeedbackForm;