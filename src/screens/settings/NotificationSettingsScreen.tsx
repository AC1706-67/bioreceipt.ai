/**
 * Notification Settings Screen
 * Allows users to customize their notification preferences
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useAppSelector } from '../../hooks/redux';
import { selectUser } from '../../store/authSlice';
import { NotificationService } from '../../services/notification/notificationService';
import { NotificationSettings, NotificationPermission } from '../../types/notification';

interface TimePickerProps {
  value: string;
  onValueChange: (time: string) => void;
  label: string;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onValueChange, label }) => {
  const [hours, minutes] = value.split(':').map(Number);

  const showTimePicker = () => {
    // In a real implementation, this would show a native time picker
    // For now, we'll show a simple alert with preset options
    const timeOptions = [
      '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
      '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
      '19:00', '20:00', '21:00'
    ];

    Alert.alert(
      'Select Time',
      'Choose your preferred time:',
      timeOptions.map(time => ({
        text: time,
        onPress: () => onValueChange(time),
      })).concat([
        { text: 'Cancel', style: 'cancel' }
      ])
    );
  };

  const formatTime = (time: string): string => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <View style={styles.timePickerContainer}>
      <Text style={styles.timePickerLabel}>{label}</Text>
      <TouchableOpacity style={styles.timePickerButton} onPress={showTimePicker}>
        <Text style={styles.timePickerText}>{formatTime(value)}</Text>
      </TouchableOpacity>
    </View>
  );
};

export const NotificationSettingsScreen: React.FC = () => {
  const user = useAppSelector(selectUser);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [userSettings, userPermission] = await Promise.all([
        notificationService.getNotificationSettings(user.id),
        notificationService.getNotificationPermission(),
      ]);

      setSettings(userSettings);
      setPermission(userPermission);
    } catch (error) {
      console.error('Error loading notification settings:', error);
      Alert.alert('Error', 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    if (!user) return;

    try {
      setSaving(true);
      await notificationService.updateNotificationSettings(user.id, newSettings);
      setSettings(newSettings);
      Alert.alert('Success', 'Notification settings updated successfully');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const requestPermission = async () => {
    try {
      const newPermission = await notificationService.requestPermission();
      setPermission(newPermission);

      if (!newPermission.granted) {
        Alert.alert(
          'Permission Denied',
          'To receive notifications, please enable them in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // In a real implementation, this would open device settings
              console.log('Opening device settings...');
            }},
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      Alert.alert('Error', 'Failed to request notification permission');
    }
  };

  const sendTestNotification = async () => {
    if (!user) return;

    try {
      await notificationService.sendTestNotification(user.id);
      Alert.alert('Test Sent', 'A test notification has been sent!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    if (!settings) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const updateQuietHours = (key: 'enabled' | 'startTime' | 'endTime', value: any) => {
    if (!settings?.quietHours) return;

    const newQuietHours = { ...settings.quietHours, [key]: value };
    const newSettings = { ...settings, quietHours: newQuietHours };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading notification settings...</Text>
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load notification settings</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadSettings}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Settings</Text>
        <Text style={styles.subtitle}>Customize when and how you receive notifications</Text>
      </View>

      {/* Permission Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permission Status</Text>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionStatus}>
              {permission?.granted ? '✅ Enabled' : '❌ Disabled'}
            </Text>
            <Text style={styles.permissionDescription}>
              {permission?.granted 
                ? 'You will receive push notifications'
                : 'Enable notifications to receive daily tips and reminders'
              }
            </Text>
          </View>
          {!permission?.granted && (
            <TouchableOpacity style={styles.enableButton} onPress={requestPermission}>
              <Text style={styles.enableButtonText}>Enable</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General Settings</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Enable Notifications</Text>
            <Text style={styles.settingDescription}>
              Turn all notifications on or off
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={(value) => updateSetting('enabled', value)}
            disabled={!permission?.granted || saving}
          />
        </View>
      </View>

      {/* Daily Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Tips</Text>
        
        <TimePicker
          label="Daily Tip Time"
          value={settings.dailyTipTime}
          onValueChange={(time) => updateSetting('dailyTipTime', time)}
        />
        <Text style={styles.settingDescription}>
          When would you like to receive your daily health tip?
        </Text>
      </View>

      {/* Reminder Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reminders & Celebrations</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Streak Reminders</Text>
            <Text style={styles.settingDescription}>
              Get reminded to maintain your daily streak
            </Text>
          </View>
          <Switch
            value={settings.streakReminders}
            onValueChange={(value) => updateSetting('streakReminders', value)}
            disabled={!settings.enabled || saving}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Milestone Celebrations</Text>
            <Text style={styles.settingDescription}>
              Celebrate when you reach streak milestones
            </Text>
          </View>
          <Switch
            value={settings.milestoneNotifications}
            onValueChange={(value) => updateSetting('milestoneNotifications', value)}
            disabled={!settings.enabled || saving}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Encouragement Messages</Text>
            <Text style={styles.settingDescription}>
              Get motivational messages when you've been away
            </Text>
          </View>
          <Switch
            value={settings.encouragementMessages}
            onValueChange={(value) => updateSetting('encouragementMessages', value)}
            disabled={!settings.enabled || saving}
          />
        </View>
      </View>

      {/* Quiet Hours */}
      {settings.quietHours && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Quiet Hours</Text>
              <Text style={styles.settingDescription}>
                No notifications during specified hours
              </Text>
            </View>
            <Switch
              value={settings.quietHours.enabled}
              onValueChange={(value) => updateQuietHours('enabled', value)}
              disabled={!settings.enabled || saving}
            />
          </View>

          {settings.quietHours.enabled && (
            <View style={styles.quietHoursContainer}>
              <TimePicker
                label="Start Time"
                value={settings.quietHours.startTime}
                onValueChange={(time) => updateQuietHours('startTime', time)}
              />
              <TimePicker
                label="End Time"
                value={settings.quietHours.endTime}
                onValueChange={(time) => updateQuietHours('endTime', time)}
              />
            </View>
          )}
        </View>
      )}

      {/* Test Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Notifications</Text>
        <TouchableOpacity 
          style={styles.testButton} 
          onPress={sendTestNotification}
          disabled={!permission?.granted || !settings.enabled}
        >
          <Text style={styles.testButtonText}>Send Test Notification</Text>
        </TouchableOpacity>
        <Text style={styles.settingDescription}>
          Send a test notification to make sure everything is working
        </Text>
      </View>

      {/* Timezone Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timezone</Text>
        <Text style={styles.timezoneText}>{settings.timezone}</Text>
        <Text style={styles.settingDescription}>
          Notifications are scheduled based on your device timezone
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
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
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  permissionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permissionInfo: {
    flex: 1,
  },
  permissionStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  enableButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  enableButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  timePickerContainer: {
    marginBottom: 12,
  },
  timePickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  timePickerButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timePickerText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  quietHoursContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  testButton: {
    backgroundColor: '#17a2b8',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  timezoneText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
    marginBottom: 8,
  },
});