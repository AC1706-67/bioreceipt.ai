/**
 * Settings Screen Component
 * Complete settings interface with all preference sections
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  TouchableOpacity,
  Modal
} from 'react-native';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { UserPreferences, UserPreferencesUpdate } from '../../models/UserPreferences';
import { analyticsService } from '../../services/analytics/analyticsService';

interface SettingsScreenProps {
  userId: string;
  onClose?: () => void;
}

interface SettingsSection {
  id: string;
  title: string;
  icon: string;
  component: React.ComponentType<any>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ userId, onClose }) => {
  const { 
    preferences, 
    loading, 
    error, 
    updatePreferences, 
    resetPreferences, 
    exportPreferences 
  } = useUserPreferences(userId);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    trackScreenView();
  }, [userId]);

  const trackScreenView = () => {
    analyticsService.trackEvent('settings_screen_viewed', {
      userId,
      timestamp: new Date().toISOString()
    });
  };

  const handleUpdatePreferences = async (updates: UserPreferencesUpdate) => {
    try {
      setSaving(true);
      await updatePreferences(updates);
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await resetPreferences();
              Alert.alert('Success', 'Settings have been reset to defaults.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings.');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleExportSettings = async () => {
    try {
      const exportData = await exportPreferences();
      Alert.alert('Export Complete', 'Settings have been exported successfully.');
      console.log('Exported settings:', exportData);
    } catch (error) {
      Alert.alert('Error', 'Failed to export settings.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  if (error || !preferences) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load settings</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sections: SettingsSection[] = [
    {
      id: 'notifications',
      title: 'Notifications',
      icon: '🔔',
      component: NotificationSettings
    },
    {
      id: 'content',
      title: 'Content Preferences',
      icon: '📚',
      component: ContentSettings
    },
    {
      id: 'privacy',
      title: 'Privacy & Data',
      icon: '🔒',
      component: PrivacySettings
    },
    {
      id: 'display',
      title: 'Display & Appearance',
      icon: '🎨',
      component: DisplaySettings
    },
    {
      id: 'accessibility',
      title: 'Accessibility',
      icon: '♿',
      component: AccessibilitySettings
    }
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Saving indicator */}
      {saving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Settings sections */}
        {sections.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={styles.sectionItem}
            onPress={() => setActiveSection(section.id)}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>{section.icon}</Text>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionArrow}>›</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Account actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.actionsSectionTitle}>Account Actions</Text>
          <TouchableOpacity style={styles.actionItem} onPress={handleExportSettings}>
            <Text style={styles.actionIcon}>📤</Text>
            <Text style={styles.actionTitle}>Export Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={handleResetSettings}>
            <Text style={styles.actionIcon}>🔄</Text>
            <Text style={[styles.actionTitle, styles.destructiveAction]}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>BioReceipt Health Tips</Text>
          <Text style={styles.appInfoText}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Section modals */}
      {sections.map((section) => (
        <Modal
          key={`modal_${section.id}`}
          visible={activeSection === section.id}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <section.component
            preferences={preferences}
            onUpdate={handleUpdatePreferences}
            onClose={() => setActiveSection(null)}
            saving={saving}
          />
        </Modal>
      ))}
    </View>
  );
};

// Notification Settings Component
const NotificationSettings: React.FC<{
  preferences: UserPreferences;
  onUpdate: (updates: UserPreferencesUpdate) => void;
  onClose: () => void;
  saving: boolean;
}> = ({ preferences, onUpdate, onClose, saving }) => {
  const updateNotificationSetting = (key: string, value: any) => {
    onUpdate({
      notifications: {
        ...preferences.notifications,
        [key]: value
      }
    });
  };

  const updateQuietHours = (key: string, value: any) => {
    onUpdate({
      notifications: {
        ...preferences.notifications,
        quietHours: {
          ...preferences.notifications.quietHours,
          [key]: value
        }
      }
    });
  };

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Notification Settings</Text>
        <TouchableOpacity onPress={onClose} disabled={saving}>
          <Text style={styles.modalCloseText}>Done</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.modalContent}>
        <View style={styles.settingGroup}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Enable Notifications</Text>
            <Switch
              value={preferences.notifications.enabled}
              onValueChange={(value) => updateNotificationSetting('enabled', value)}
              disabled={saving}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Daily Health Tips</Text>
            <Switch
              value={preferences.notifications.dailyTips}
              onValueChange={(value) => updateNotificationSetting('dailyTips', value)}
              disabled={saving || !preferences.notifications.enabled}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Weekly Digest</Text>
            <Switch
              value={preferences.notifications.weeklyDigest}
              onValueChange={(value) => updateNotificationSetting('weeklyDigest', value)}
              disabled={saving || !preferences.notifications.enabled}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Achievement Notifications</Text>
            <Switch
              value={preferences.notifications.achievements}
              onValueChange={(value) => updateNotificationSetting('achievements', value)}
              disabled={saving || !preferences.notifications.enabled}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Reminders</Text>
            <Switch
              value={preferences.notifications.reminders}
              onValueChange={(value) => updateNotificationSetting('reminders', value)}
              disabled={saving || !preferences.notifications.enabled}
            />
          </View>
        </View>

        <View style={styles.settingGroup}>
          <Text style={styles.groupTitle}>Quiet Hours</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Enable Quiet Hours</Text>
            <Switch
              value={preferences.notifications.quietHours.enabled}
              onValueChange={(value) => updateQuietHours('enabled', value)}
              disabled={saving || !preferences.notifications.enabled}
            />
          </View>
          {preferences.notifications.quietHours.enabled && (
            <>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Start Time</Text>
                <Text style={styles.settingValue}>{preferences.notifications.quietHours.startTime}</Text>
              </View>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>End Time</Text>
                <Text style={styles.settingValue}>{preferences.notifications.quietHours.endTime}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.settingGroup}>
          <Text style={styles.groupTitle}>Frequency</Text>
          {['low', 'medium', 'high'].map((frequency) => (
            <TouchableOpacity
              key={frequency}
              style={styles.radioItem}
              onPress={() => updateNotificationSetting('frequency', frequency)}
              disabled={saving}
            >
              <View style={styles.radioButton}>
                {preferences.notifications.frequency === frequency && (
                  <View style={styles.radioButtonSelected} />
                )}
              </View>
              <Text style={styles.radioLabel}>
                {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

// Content Settings Component
const ContentSettings: React.FC<{
  preferences: UserPreferences;
  onUpdate: (updates: UserPreferencesUpdate) => void;
  onClose: () => void;
  saving: boolean;
}> = ({ preferences, onUpdate, onClose, saving }) => {
  const updateContentSetting = (key: string, value: any) => {
    onUpdate({
      content: {
        ...preferences.content,
        [key]: value
      }
    });
  };

  const updateCategory = (category: string, enabled: boolean) => {
    onUpdate({
      content: {
        ...preferences.content,
        categories: {
          ...preferences.content.categories,
          [category]: enabled
        }
      }
    });
  };

  const categories = [
    { key: 'nutrition', label: 'Nutrition & Diet', icon: '🥗' },
    { key: 'fitness', label: 'Fitness & Exercise', icon: '💪' },
    { key: 'mentalWellness', label: 'Mental Wellness', icon: '🧠' },
    { key: 'sleep', label: 'Sleep & Recovery', icon: '😴' },
    { key: 'recovery', label: 'Recovery & Rest', icon: '🛌' },
    { key: 'hygiene', label: 'Hygiene & Care', icon: '🧼' }
  ];

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Content Preferences</Text>
        <TouchableOpacity onPress={onClose} disabled={saving}>
          <Text style={styles.modalCloseText}>Done</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.modalContent}>
        <View style={styles.settingGroup}>
          <Text style={styles.groupTitle}>Content Categories</Text>
          {categories.map((category) => (
            <View key={category.key} style={styles.settingItem}>
              <View style={styles.categoryRow}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.settingLabel}>{category.label}</Text>
              </View>
              <Switch
                value={preferences.content.categories[category.key as keyof typeof preferences.content.categories]}
                onValueChange={(value) => updateCategory(category.key, value)}
                disabled={saving}
              />
            </View>
          ))}
        </View>

        <View style={styles.settingGroup}>
          <Text style={styles.groupTitle}>Difficulty Level</Text>
          {['beginner', 'intermediate', 'advanced', 'mixed'].map((difficulty) => (
            <TouchableOpacity
              key={difficulty}
              style={styles.radioItem}
              onPress={() => updateContentSetting('difficulty', difficulty)}
              disabled={saving}
            >
              <View style={styles.radioButton}>
                {preferences.content.difficulty === difficulty && (
                  <View style={styles.radioButtonSelected} />
                )}
              </View>
              <Text style={styles.radioLabel}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.settingGroup}>
          <Text style={styles.groupTitle}>Reading Time Preference</Text>
          {[
            { key: 'short', label: 'Short (< 3 minutes)' },
            { key: 'medium', label: 'Medium (3-7 minutes)' },
            { key: 'long', label: 'Long (> 7 minutes)' },
            { key: 'any', label: 'Any length' }
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={styles.radioItem}
              onPress={() => updateContentSetting('readingTime', option.key)}
              disabled={saving}
            >
              <View style={styles.radioButton}>
                {preferences.content.readingTime === option.key && (
                  <View style={styles.radioButtonSelected} />
                )}
              </View>
              <Text style={styles.radioLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.settingGroup}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Personalized Content</Text>
            <Switch
              value={preferences.content.personalizedContent}
              onValueChange={(value) => updateContentSetting('personalizedContent', value)}
              disabled={saving}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>AI Recommendations</Text>
            <Switch
              value={preferences.content.aiRecommendations}
              onValueChange={(value) => updateContentSetting('aiRecommendations', value)}
              disabled={saving}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Privacy Settings Component
const PrivacySettings: React.FC<{
  preferences: UserPreferences;
  onUpdate: (updates: UserPreferencesUpdate) => void;
  onClose: () => void;
  saving: boolean;
}> = ({ preferences, onUpdate, onClose, saving }) => {
  const updatePrivacySetting = (key: string, value: boolean) => {
    onUpdate({
      privacy: {
        ...preferences.privacy,
        [key]: value
      }
    });
  };

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Privacy & Data</Text>
        <TouchableOpacity onPress={onClose} disabled={saving}>
          <Text style={styles.modalCloseText}>Done</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.modalContent}>
        <View style={styles.settingGroup}>
          <Text style={styles.groupTitle}>Data Collection</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Allow Data Collection</Text>
            <Switch
              value={preferences.privacy.dataCollection}
              onValueChange={(value) => updatePrivacySetting('dataCollection', value)}
              disabled={saving}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Analytics</Text>
            <Switch
              value={preferences.privacy.analytics}
              onValueChange={(value) => updatePrivacySetting('analytics', value)}
              disabled={saving}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Personalization</Text>
            <Switch
              value={preferences.privacy.personalization}
              onValueChange={(value) => updatePrivacySetting('personalization', value)}
              disabled={saving}
            />
          </View>
        </View>

        <View style={styles.settingGroup}>
          <Text style={styles.groupTitle}>Sharing & Tracking</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Data Sharing</Text>
            <Switch
              value={preferences.privacy.dataSharing}
              onValueChange={(value) => updatePrivacySetting('dataSharing', value)}
              disabled={saving}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Location Tracking</Text>
            <Switch
              value={preferences.privacy.locationTracking}
              onValueChange={(value) => updatePrivacySetting('locationTracking', value)}
              disabled={saving}
            />
          </View>
        </View>

        <View style={styles.settingGroup}>
          <Text style={styles.groupTitle}>Error Reporting</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Crash Reporting</Text>
            <Switch
              value={preferences.privacy.crashReporting}
              onValueChange={(value) => updatePrivacySetting('crashReporting', value)}
              disabled={saving}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Display Settings Component
const DisplaySettings: React.FC<{
  preferences: UserPreferences;
  onUpdate: (updates: UserPreferencesUpdate) => void;
  onClose: () => void;
  saving: boolean;
}> = ({ preferences, onUpdate, onClose, saving }) => {
  const updateDisplaySetting = (key: string, value: any) => {
    onUpdate({
      display: {
        ...preferences.display,
        [key]: value
      }
    });
  };

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Display & Appearance</Text>
        <TouchableOpacity onPress={onClose} disabled={saving}>
          <Text style={styles.modalCloseText}>Done</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.modalContent}>
        <View style={styles.settingGroup}>
          <Text style={styles.groupTitle}>Theme</Text>
          {['light', 'dark', 'system'].map((theme) => (
            <TouchableOpacity
              key={theme}
              style={styles.radioItem}
              onPress={() => updateDisplaySetting('theme', theme)}
              disabled={saving}
            >
              <View style={styles.radioButton}>
                {preferences.display.theme === theme && (
                  <View style={styles.radioButtonSelected} />
                )}
              </View>
              <Text style={styles.radioLabel}>
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.settingGroup}>
          <Text style={styles.groupTitle}>Font Size</Text>
          {['small', 'medium', 'large'].map((size) => (
            <TouchableOpacity
              key={size}
              style={styles.radioItem}
              onPress={() => updateDisplaySetting('fontSize', size)}
              disabled={saving}
            >
              <View style={styles.radioButton}>
                {preferences.display.fontSize === size && (
                  <View style={styles.radioButtonSelected} />
                )}
              </View>
              <Text style={styles.radioLabel}>
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.settingGroup}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>High Contrast</Text>
            <Switch
              value={preferences.display.highContrast}
              onValueChange={(value) => updateDisplaySetting('highContrast', value)}
              disabled={saving}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Reduce Motion</Text>
            <Switch
              value={preferences.display.reduceMotion}
              onValueChange={(value) => updateDisplaySetting('reduceMotion', value)}
              disabled={saving}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Compact Mode</Text>
            <Switch
              value={preferences.display.compactMode}
              onValueChange={(value) => updateDisplaySetting('compactMode', value)}
              disabled={saving}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Accessibility Settings Component
const AccessibilitySettings: React.FC<{
  preferences: UserPreferences;
  onUpdate: (updates: UserPreferencesUpdate) => void;
  onClose: () => void;
  saving: boolean;
}> = ({ preferences, onUpdate, onClose, saving }) => {
  const updateAccessibilitySetting = (key: string, value: boolean) => {
    onUpdate({
      accessibility: {
        ...preferences.accessibility,
        [key]: value
      }
    });
  };

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Accessibility</Text>
        <TouchableOpacity onPress={onClose} disabled={saving}>
          <Text style={styles.modalCloseText}>Done</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.modalContent}>
        <View style={styles.settingGroup}>
          <Text style={styles.groupTitle}>Screen Reader Support</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Screen Reader</Text>
            <Switch
              value={preferences.accessibility.screenReader}
              onValueChange={(value) => updateAccessibilitySetting('screenReader', value)}
              disabled={saving}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>VoiceOver</Text>
            <Switch
              value={preferences.accessibility.voiceOver}
              onValueChange={(value) => updateAccessibilitySetting('voiceOver', value)}
              disabled={saving}
            />
          </View>
        </View>

        <View style={styles.settingGroup}>
          <Text style={styles.groupTitle}>Visual Accessibility</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Large Text</Text>
            <Switch
              value={preferences.accessibility.largeText}
              onValueChange={(value) => updateAccessibilitySetting('largeText', value)}
              disabled={saving}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Button Shapes</Text>
            <Switch
              value={preferences.accessibility.buttonShapes}
              onValueChange={(value) => updateAccessibilitySetting('buttonShapes', value)}
              disabled={saving}
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Reduce Transparency</Text>
            <Switch
              value={preferences.accessibility.reduceTransparency}
              onValueChange={(value) => updateAccessibilitySetting('reduceTransparency', value)}
              disabled={saving}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  closeButton: {
    padding: 8
  },
  closeButtonText: {
    fontSize: 18,
    color: '#007AFF'
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#e3f2fd'
  },
  savingText: {
    marginLeft: 8,
    color: '#1976d2'
  },
  content: {
    flex: 1
  },
  sectionItem: {
    backgroundColor: '#fff',
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },
  sectionArrow: {
    fontSize: 18,
    color: '#999'
  },
  actionsSection: {
    marginTop: 24,
    marginHorizontal: 16
  },
  actionsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 4,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 12
  },
  actionTitle: {
    fontSize: 16,
    color: '#333'
  },
  destructiveAction: {
    color: '#d32f2f'
  },
  appInfo: {
    alignItems: 'center',
    padding: 24,
    marginTop: 24
  },
  appInfoText: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    marginBottom: 16
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF'
  },
  modalContent: {
    flex: 1,
    padding: 16
  },
  settingGroup: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    paddingBottom: 8
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1
  },
  settingValue: {
    fontSize: 16,
    color: '#666'
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 12
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF'
  },
  radioLabel: {
    fontSize: 16,
    color: '#333'
  }
});

export default SettingsScreen;
