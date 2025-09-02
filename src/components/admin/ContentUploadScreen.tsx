/**
 * Content Upload Screen
 * Interface for uploading and editing health tip content
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AdminUser } from '../../services/admin/adminAuthService';
import { 
  AdminContentService, 
  ContentUploadRequest, 
  ContentValidationResult 
} from '../../services/admin/adminContentService';
import { HealthTipCategory, DifficultyLevel } from '../../models/HealthTip';

interface ContentUploadScreenProps {
  adminUser: AdminUser;
  onUploadSuccess?: () => void;
  editingTipId?: string;
}

export const ContentUploadScreen: React.FC<ContentUploadScreenProps> = ({
  adminUser,
  onUploadSuccess,
  editingTipId
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<HealthTipCategory>('nutrition');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('easy');
  const [tags, setTags] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [estimatedReadTime, setEstimatedReadTime] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [scheduledPublishDate, setScheduledPublishDate] = useState('');
  const [priority, setPriority] = useState('0');

  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<ContentValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const adminContentService = AdminContentService.getInstance();

  const categories: HealthTipCategory[] = [
    'nutrition', 'mental_wellness', 'fitness', 'sleep', 'recovery', 'hygiene'
  ];

  const difficulties: DifficultyLevel[] = ['easy', 'medium', 'hard'];

  useEffect(() => {
    if (editingTipId) {
      loadExistingTip();
    }
  }, [editingTipId]);

  const loadExistingTip = async () => {
    if (!editingTipId) return;

    try {
      setLoading(true);
      const tip = await adminContentService.getTipById(editingTipId);
      if (tip) {
        setTitle(tip.title);
        setContent(tip.content);
        setCategory(tip.category);
        setDifficulty(tip.difficulty);
        setTags(tip.tags.join(', '));
        setImageUrl(tip.imageUrl || '');
        setEstimatedReadTime(tip.estimatedReadTime.toString());
        setIsActive(tip.isActive);
        setPriority((tip.priority || 0).toString());
        setScheduledPublishDate(
          tip.scheduledPublishDate ? tip.scheduledPublishDate.toISOString().split('T')[0] : ''
        );
      }
    } catch (error) {
      console.error('Failed to load existing tip:', error);
      Alert.alert('Error', 'Failed to load existing content');
    } finally {
      setLoading(false);
    }
  };

  const validateContent = async () => {
    const request: ContentUploadRequest = {
      title,
      content,
      category,
      difficulty,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      imageUrl: imageUrl.trim() || undefined,
      estimatedReadTime: estimatedReadTime ? parseInt(estimatedReadTime) : undefined,
      isActive,
      priority: parseInt(priority) || 0,
      scheduledPublishDate: scheduledPublishDate ? new Date(scheduledPublishDate) : undefined
    };

    const validationResult = await adminContentService.validateContent(request);
    setValidation(validationResult);
    setShowValidation(true);
    return validationResult;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate content first
      const validationResult = await validateContent();
      if (!validationResult.isValid) {
        Alert.alert(
          'Validation Failed',
          `Please fix the following errors:\n\n${validationResult.errors.join('\n')}`
        );
        return;
      }

      const request: ContentUploadRequest = {
        title,
        content,
        category,
        difficulty,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        imageUrl: imageUrl.trim() || undefined,
        estimatedReadTime: estimatedReadTime ? parseInt(estimatedReadTime) : undefined,
        isActive,
        priority: parseInt(priority) || 0,
        scheduledPublishDate: scheduledPublishDate ? new Date(scheduledPublishDate) : undefined
      };

      if (editingTipId) {
        await adminContentService.updateContent(editingTipId, request, adminUser.id);
        Alert.alert('Success', 'Content updated successfully!');
      } else {
        await adminContentService.uploadContent(request, adminUser.id);
        Alert.alert('Success', 'Content uploaded successfully!');
        resetForm();
      }

      onUploadSuccess?.();
    } catch (error) {
      console.error('Failed to submit content:', error);
      Alert.alert('Error', (error as Error).message || 'Failed to submit content');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory('nutrition');
    setDifficulty('easy');
    setTags('');
    setImageUrl('');
    setEstimatedReadTime('');
    setIsActive(true);
    setScheduledPublishDate('');
    setPriority('0');
    setValidation(null);
    setShowValidation(false);
  };

  const renderValidation = () => {
    if (!showValidation || !validation) return null;

    return (
      <View style={styles.validationContainer}>
        <TouchableOpacity
          style={styles.validationHeader}
          onPress={() => setShowValidation(!showValidation)}
        >
          <Text style={styles.validationTitle}>
            Content Validation {validation.isValid ? '✅' : '❌'}
          </Text>
          <Text style={styles.validationToggle}>
            {showValidation ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {showValidation && (
          <View style={styles.validationContent}>
            {validation.errors.length > 0 && (
              <View style={styles.validationSection}>
                <Text style={styles.validationSectionTitle}>❌ Errors</Text>
                {validation.errors.map((error, index) => (
                  <Text key={index} style={styles.errorText}>• {error}</Text>
                ))}
              </View>
            )}

            {validation.warnings.length > 0 && (
              <View style={styles.validationSection}>
                <Text style={styles.validationSectionTitle}>⚠️ Warnings</Text>
                {validation.warnings.map((warning, index) => (
                  <Text key={index} style={styles.warningText}>• {warning}</Text>
                ))}
              </View>
            )}

            {validation.suggestions.length > 0 && (
              <View style={styles.validationSection}>
                <Text style={styles.validationSectionTitle}>💡 Suggestions</Text>
                {validation.suggestions.map((suggestion, index) => (
                  <Text key={index} style={styles.suggestionText}>• {suggestion}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const isFormValid = () => {
    return title.trim().length > 0 && content.trim().length > 0;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {editingTipId ? 'Edit Content' : 'Upload New Content'}
        </Text>
        <Text style={styles.subtitle}>
          Create engaging health tips for users
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter a compelling title"
            maxLength={200}
            editable={!loading}
          />
          <Text style={styles.charCount}>{title.length}/200</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Content *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={content}
            onChangeText={setContent}
            placeholder="Write your health tip content here..."
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={5000}
            editable={!loading}
          />
          <Text style={styles.charCount}>{content.length}/5000</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={category}
                onValueChange={setCategory}
                enabled={!loading}
              >
                {categories.map(cat => (
                  <Picker.Item
                    key={cat}
                    label={cat.replace('_', ' ').toUpperCase()}
                    value={cat}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Difficulty *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={difficulty}
                onValueChange={setDifficulty}
                enabled={!loading}
              >
                {difficulties.map(diff => (
                  <Picker.Item
                    key={diff}
                    label={diff.toUpperCase()}
                    value={diff}
                  />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tags</Text>
          <TextInput
            style={styles.input}
            value={tags}
            onChangeText={setTags}
            placeholder="Enter tags separated by commas"
            editable={!loading}
          />
          <Text style={styles.helperText}>
            Separate multiple tags with commas (e.g., healthy eating, nutrition, tips)
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Image URL</Text>
          <TextInput
            style={styles.input}
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://example.com/image.jpg"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Read Time (minutes)</Text>
            <TextInput
              style={styles.input}
              value={estimatedReadTime}
              onChangeText={setEstimatedReadTime}
              placeholder="Auto-calculated"
              keyboardType="numeric"
              editable={!loading}
            />
          </View>

          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Priority</Text>
            <TextInput
              style={styles.input}
              value={priority}
              onChangeText={setPriority}
              placeholder="0"
              keyboardType="numeric"
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Scheduled Publish Date</Text>
          <TextInput
            style={styles.input}
            value={scheduledPublishDate}
            onChangeText={setScheduledPublishDate}
            placeholder="YYYY-MM-DD (optional)"
            editable={!loading}
          />
          <Text style={styles.helperText}>
            Leave empty to publish immediately
          </Text>
        </View>

        <View style={styles.switchGroup}>
          <Text style={styles.label}>Active</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            disabled={loading}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={isActive ? '#2E7D32' : '#f4f3f4'}
          />
        </View>

        {renderValidation()}

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.validateButton}
            onPress={validateContent}
            disabled={loading || !isFormValid()}
          >
            <Text style={styles.validateButtonText}>Validate Content</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!isFormValid() || loading) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {editingTipId ? 'Update Content' : 'Upload Content'}
              </Text>
            )}
          </TouchableOpacity>

          {!editingTipId && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetForm}
              disabled={loading}
            >
              <Text style={styles.resetButtonText}>Reset Form</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  form: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'right',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  validationContainer: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
  },
  validationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  validationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  validationToggle: {
    fontSize: 14,
    color: '#666666',
  },
  validationContent: {
    padding: 12,
    paddingTop: 0,
  },
  validationSection: {
    marginBottom: 12,
  },
  validationSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    marginBottom: 2,
  },
  suggestionText: {
    fontSize: 12,
    color: '#2196F3',
    marginBottom: 2,
  },
  buttonGroup: {
    gap: 12,
  },
  validateButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  validateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '500',
  },
});