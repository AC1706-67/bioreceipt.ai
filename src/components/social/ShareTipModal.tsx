/**
 * Share Tip Modal
 * Modal for sharing health tips to social platforms
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useSocialSharing } from '../../hooks/useSocial';

interface ShareTipModalProps {
  userId: string;
  tipId?: string | null;
  onClose: () => void;
  onShareComplete: () => void;
}

interface SharePlatform {
  id: 'native' | 'facebook' | 'twitter' | 'instagram' | 'whatsapp';
  name: string;
  icon: string;
  enabled: boolean;
}

export const ShareTipModal: React.FC<ShareTipModalProps> = ({
  userId,
  tipId,
  onClose,
  onShareComplete
}) => {
  const { shareHealthTip, isSharing, shareError } = useSocialSharing(userId);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [platforms, setPlatforms] = useState<SharePlatform[]>([
    { id: 'native', name: 'HealthyTip Community', icon: '🏠', enabled: true },
    { id: 'facebook', name: 'Facebook', icon: '📘', enabled: false },
    { id: 'twitter', name: 'Twitter', icon: '🐦', enabled: false },
    { id: 'instagram', name: 'Instagram', icon: '📷', enabled: false },
    { id: 'whatsapp', name: 'WhatsApp', icon: '💬', enabled: false }
  ]);

  useEffect(() => {
    // Load tip data if tipId is provided
    if (tipId) {
      loadTipData(tipId);
    }
  }, [tipId]);

  const loadTipData = async (id: string) => {
    try {
      // In a real implementation, this would load the tip data
      // For now, we'll set some mock data
      setTitle('Sample Health Tip');
      setDescription('This is a sample health tip description that would be loaded from the tip service.');
    } catch (error) {
      console.error('Failed to load tip data:', error);
      Alert.alert('Error', 'Failed to load tip data');
    }
  };

  const togglePlatform = (platformId: string) => {
    setPlatforms(prev => 
      prev.map(platform => 
        platform.id === platformId 
          ? { ...platform, enabled: !platform.enabled }
          : platform
      )
    );
  };

  const handleShare = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your tip');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description for your tip');
      return;
    }

    const enabledPlatforms = platforms
      .filter(p => p.enabled)
      .map(p => p.id);

    if (enabledPlatforms.length === 0) {
      Alert.alert('Error', 'Please select at least one platform to share to');
      return;
    }

    try {
      const shareData = {
        title: title.trim(),
        description: description.trim(),
        personalNote: personalNote.trim() || undefined,
        tags: tags.trim() ? tags.split(',').map(tag => tag.trim()) : undefined,
        visibility,
        platforms: enabledPlatforms
      };

      const result = await shareHealthTip(tipId || 'sample_tip', shareData);
      
      // Show success message
      const successfulShares = Object.entries(result.shareResults)
        .filter(([_, success]) => success)
        .map(([platform, _]) => platform);

      if (successfulShares.length > 0) {
        Alert.alert(
          'Success!', 
          `Your tip was shared to: ${successfulShares.join(', ')}`,
          [{ text: 'OK', onPress: onShareComplete }]
        );
      } else {
        Alert.alert('Error', 'Failed to share to any platforms');
      }
    } catch (error) {
      console.error('Failed to share tip:', error);
      Alert.alert('Error', shareError || 'Failed to share tip. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share Tip</Text>
        <TouchableOpacity 
          onPress={handleShare}
          disabled={isSharing}
          style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
        >
          {isSharing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.shareButtonText}>Share</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Title *</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter a catchy title for your tip"
            maxLength={100}
            multiline
          />
          <Text style={styles.characterCount}>{title.length}/100</Text>
        </View>

        {/* Description Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Description *</Text>
          <TextInput
            style={[styles.textInput, styles.textAreaInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your health tip in detail"
            maxLength={500}
            multiline
            numberOfLines={4}
          />
          <Text style={styles.characterCount}>{description.length}/500</Text>
        </View>

        {/* Personal Note Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Personal Note (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textAreaInput]}
            value={personalNote}
            onChangeText={setPersonalNote}
            placeholder="Add your personal experience or thoughts"
            maxLength={300}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.characterCount}>{personalNote.length}/300</Text>
        </View>

        {/* Tags Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Tags (Optional)</Text>
          <TextInput
            style={styles.textInput}
            value={tags}
            onChangeText={setTags}
            placeholder="Enter tags separated by commas (e.g., nutrition, exercise, wellness)"
            maxLength={200}
          />
          <Text style={styles.helperText}>Separate tags with commas</Text>
        </View>

        {/* Visibility Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visibility</Text>
          <View style={styles.visibilityOptions}>
            {[
              { value: 'public', label: 'Public', description: 'Anyone can see this post' },
              { value: 'followers', label: 'Followers Only', description: 'Only your followers can see this' },
              { value: 'private', label: 'Private', description: 'Only you can see this' }
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.visibilityOption,
                  visibility === option.value && styles.visibilityOptionSelected
                ]}
                onPress={() => setVisibility(option.value as any)}
              >
                <View style={styles.visibilityOptionContent}>
                  <Text style={[
                    styles.visibilityOptionLabel,
                    visibility === option.value && styles.visibilityOptionLabelSelected
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.visibilityOptionDescription}>
                    {option.description}
                  </Text>
                </View>
                <View style={[
                  styles.radioButton,
                  visibility === option.value && styles.radioButtonSelected
                ]}>
                  {visibility === option.value && <View style={styles.radioButtonInner} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Platform Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share To</Text>
          <View style={styles.platformList}>
            {platforms.map((platform) => (
              <View key={platform.id} style={styles.platformItem}>
                <View style={styles.platformInfo}>
                  <Text style={styles.platformIcon}>{platform.icon}</Text>
                  <Text style={styles.platformName}>{platform.name}</Text>
                </View>
                <Switch
                  value={platform.enabled}
                  onValueChange={() => togglePlatform(platform.id)}
                  trackColor={{ false: '#e9ecef', true: '#007AFF' }}
                  thumbColor={platform.enabled ? 'white' : '#f4f3f4'}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Share Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>{title || 'Your tip title will appear here'}</Text>
            <Text style={styles.previewDescription}>
              {description || 'Your tip description will appear here'}
            </Text>
            {personalNote && (
              <Text style={styles.previewNote}>"{personalNote}"</Text>
            )}
            {tags && (
              <View style={styles.previewTags}>
                {tags.split(',').map((tag, index) => (
                  <Text key={index} style={styles.previewTag}>
                    #{tag.trim()}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  cancelButton: {
    fontSize: 16,
    color: '#666'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  shareButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center'
  },
  shareButtonDisabled: {
    backgroundColor: '#adb5bd'
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  content: {
    flex: 1,
    padding: 16
  },
  inputSection: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
    minHeight: 44
  },
  textAreaInput: {
    minHeight: 100,
    textAlignVertical: 'top'
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  visibilityOptions: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden'
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4'
  },
  visibilityOptionSelected: {
    backgroundColor: '#f8f9ff'
  },
  visibilityOptionContent: {
    flex: 1
  },
  visibilityOptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2
  },
  visibilityOptionLabelSelected: {
    color: '#007AFF'
  },
  visibilityOptionDescription: {
    fontSize: 12,
    color: '#666'
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioButtonSelected: {
    borderColor: '#007AFF'
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF'
  },
  platformList: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden'
  },
  platformItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4'
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  platformIcon: {
    fontSize: 20,
    marginRight: 12
  },
  platformName: {
    fontSize: 16,
    color: '#333'
  },
  previewCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  previewDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8
  },
  previewNote: {
    fontSize: 14,
    color: '#007AFF',
    fontStyle: 'italic',
    marginBottom: 8
  },
  previewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  previewTag: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#e9f4ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4
  }
});