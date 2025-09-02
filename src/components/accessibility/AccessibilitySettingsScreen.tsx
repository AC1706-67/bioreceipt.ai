/**
 * Accessibility Settings Screen
 * Comprehensive accessibility configuration interface
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Slider,
  Platform
} from 'react-native';
import { useAccessibility, useAccessibleTextStyle, useAccessibleColors } from '../../hooks/useAccessibility';
import { AccessibilitySettings } from '../../services/accessibility/accessibilityService';

interface AccessibilitySettingsScreenProps {
  onBack?: () => void;
}

export const AccessibilitySettingsScreen: React.FC<AccessibilitySettingsScreenProps> = ({
  onBack
}) => {
  const {
    settings,
    updateSettings,
    isScreenReaderEnabled,
    isReduceMotionEnabled,
    announceForAccessibility,
    generateAccessibilityProps,
    checkContrastRatio,
    meetsContrastStandards
  } = useAccessibility();

  const [localSettings, setLocalSettings] = useState<AccessibilitySettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  // Color scheme for demonstration
  const baseColors = {
    primary: '#4CAF50',
    secondary: '#2196F3',
    background: '#FFFFFF',
    text: '#333333',
    accent: '#FF9800'
  };

  const accessibleColors = useAccessibleColors(baseColors);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings);
    setHasChanges(hasChanges);
  }, [localSettings, settings]);

  const handleSettingChange = (key: keyof AccessibilitySettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    try {
      await updateSettings(localSettings);
      announceForAccessibility('Accessibility settings saved successfully');
      Alert.alert('Success', 'Accessibility settings have been saved.');
    } catch (error) {
      console.error('Failed to save accessibility settings:', error);
      Alert.alert('Error', 'Failed to save accessibility settings. Please try again.');
    }
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all accessibility settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const defaultSettings: AccessibilitySettings = {
              screenReaderEnabled: isScreenReaderEnabled,
              highContrastEnabled: false,
              largeTextEnabled: false,
              reducedMotionEnabled: isReduceMotionEnabled,
              voiceOverEnabled: false,
              switchControlEnabled: false,
              boldTextEnabled: false,
              buttonShapesEnabled: false,
              grayscaleEnabled: false,
              invertColorsEnabled: false,
              reduceTransparencyEnabled: false,
              announceNotifications: true,
              customFontSize: 1.0,
              customLineHeight: 1.2,
              customLetterSpacing: 0
            };
            setLocalSettings(defaultSettings);
            announceForAccessibility('Settings reset to default');
          }
        }
      ]
    );
  };

  const testContrastRatio = () => {
    const ratio = checkContrastRatio(accessibleColors.text, accessibleColors.background);
    const meetsStandards = meetsContrastStandards(accessibleColors.text, accessibleColors.background);
    
    Alert.alert(
      'Contrast Test',
      `Current contrast ratio: ${ratio.toFixed(2)}:1\n` +
      `WCAG AA Standard: ${meetsStandards ? 'PASS' : 'FAIL'}\n` +
      `(Minimum required: 4.5:1)`
    );
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={[styles.section, { backgroundColor: accessibleColors.background }]}>
      <Text 
        style={[
          useAccessibleTextStyle(styles.sectionTitle), 
          { color: accessibleColors.text }
        ]}
        {...generateAccessibilityProps({ role: 'header', label: title })}
      >
        {title}
      </Text>
      {children}
    </View>
  );

  const renderToggleSetting = (
    key: keyof AccessibilitySettings,
    title: string,
    description: string,
    value: boolean
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text 
          style={[useAccessibleTextStyle(styles.settingTitle), { color: accessibleColors.text }]}
        >
          {title}
        </Text>
        <Text 
          style={[useAccessibleTextStyle(styles.settingDescription), { color: accessibleColors.text }]}
        >
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={(newValue) => handleSettingChange(key, newValue)}
        trackColor={{ false: '#767577', true: accessibleColors.primary }}
        thumbColor={value ? accessibleColors.accent : '#f4f3f4'}
        {...generateAccessibilityProps({
          label: `${title} ${value ? 'enabled' : 'disabled'}`,
          hint: `Double tap to ${value ? 'disable' : 'enable'} ${title.toLowerCase()}`,
          role: 'switch',
          state: { selected: value }
        })}
      />
    </View>
  );

  const renderSliderSetting = (
    key: keyof AccessibilitySettings,
    title: string,
    description: string,
    value: number,
    minimumValue: number,
    maximumValue: number,
    step: number = 0.1,
    formatValue?: (value: number) => string
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text 
          style={[useAccessibleTextStyle(styles.settingTitle), { color: accessibleColors.text }]}
        >
          {title}
        </Text>
        <Text 
          style={[useAccessibleTextStyle(styles.settingDescription), { color: accessibleColors.text }]}
        >
          {description}
        </Text>
        <Text 
          style={[useAccessibleTextStyle(styles.settingValue), { color: accessibleColors.accent }]}
        >
          Current: {formatValue ? formatValue(value) : value.toFixed(1)}
        </Text>
      </View>
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={minimumValue}
          maximumValue={maximumValue}
          value={value}
          step={step}
          onValueChange={(newValue) => handleSettingChange(key, newValue)}
          minimumTrackTintColor={accessibleColors.primary}
          maximumTrackTintColor="#d3d3d3"
          thumbStyle={{ backgroundColor: accessibleColors.accent }}
          {...generateAccessibilityProps({
            label: title,
            hint: `Adjust ${title.toLowerCase()} by sliding`,
            role: 'adjustable',
            value: {
              min: minimumValue,
              max: maximumValue,
              now: value,
              text: formatValue ? formatValue(value) : value.toFixed(1)
            }
          })}
        />
      </View>
    </View>
  );

  const titleStyle = useAccessibleTextStyle(styles.title);
  const buttonTextStyle = useAccessibleTextStyle(styles.buttonText);

  return (
    <View style={[styles.container, { backgroundColor: accessibleColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: accessibleColors.primary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          {...generateAccessibilityProps({
            label: 'Go back',
            hint: 'Returns to previous screen',
            role: 'button'
          })}
        >
          <Text style={[buttonTextStyle, { color: '#FFFFFF' }]}>← Back</Text>
        </TouchableOpacity>
        <Text 
          style={[titleStyle, { color: '#FFFFFF' }]}
          {...generateAccessibilityProps({ role: 'header', label: 'Accessibility Settings' })}
        >
          Accessibility Settings
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* System Status */}
        {renderSection('System Status', (
          <View>
            <View style={styles.statusRow}>
              <Text style={[useAccessibleTextStyle(styles.statusLabel), { color: accessibleColors.text }]}>
                Screen Reader:
              </Text>
              <Text style={[
                useAccessibleTextStyle(styles.statusValue), 
                { color: isScreenReaderEnabled ? accessibleColors.primary : accessibleColors.accent }
              ]}>
                {isScreenReaderEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={[useAccessibleTextStyle(styles.statusLabel), { color: accessibleColors.text }]}>
                Reduce Motion:
              </Text>
              <Text style={[
                useAccessibleTextStyle(styles.statusValue), 
                { color: isReduceMotionEnabled ? accessibleColors.primary : accessibleColors.accent }
              ]}>
                {isReduceMotionEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        ))}

        {/* Visual Settings */}
        {renderSection('Visual Settings', (
          <View>
            {renderToggleSetting(
              'highContrastEnabled',
              'High Contrast',
              'Increases contrast for better visibility',
              localSettings.highContrastEnabled
            )}
            {renderToggleSetting(
              'largeTextEnabled',
              'Large Text',
              'Increases text size throughout the app',
              localSettings.largeTextEnabled
            )}
            {renderToggleSetting(
              'boldTextEnabled',
              'Bold Text',
              'Makes text bold for better readability',
              localSettings.boldTextEnabled
            )}
            {renderToggleSetting(
              'buttonShapesEnabled',
              'Button Shapes',
              'Adds shapes to buttons for better identification',
              localSettings.buttonShapesEnabled
            )}
            {renderToggleSetting(
              'grayscaleEnabled',
              'Grayscale',
              'Removes colors and displays in grayscale',
              localSettings.grayscaleEnabled
            )}
            {renderToggleSetting(
              'invertColorsEnabled',
              'Invert Colors',
              'Inverts colors for better contrast',
              localSettings.invertColorsEnabled
            )}
            {renderToggleSetting(
              'reduceTransparencyEnabled',
              'Reduce Transparency',
              'Reduces transparency effects',
              localSettings.reduceTransparencyEnabled
            )}
          </View>
        ))}

        {/* Motion Settings */}
        {renderSection('Motion Settings', (
          <View>
            {renderToggleSetting(
              'reducedMotionEnabled',
              'Reduce Motion',
              'Reduces animations and motion effects',
              localSettings.reducedMotionEnabled
            )}
          </View>
        ))}

        {/* Text Customization */}
        {renderSection('Text Customization', (
          <View>
            {renderSliderSetting(
              'customFontSize',
              'Font Size',
              'Adjust text size multiplier',
              localSettings.customFontSize,
              0.5,
              3.0,
              0.1,
              (value) => `${Math.round(value * 100)}%`
            )}
            {renderSliderSetting(
              'customLineHeight',
              'Line Height',
              'Adjust spacing between lines',
              localSettings.customLineHeight,
              1.0,
              2.0,
              0.1,
              (value) => `${value.toFixed(1)}x`
            )}
            {renderSliderSetting(
              'customLetterSpacing',
              'Letter Spacing',
              'Adjust spacing between letters',
              localSettings.customLetterSpacing,
              -2,
              4,
              0.5,
              (value) => `${value.toFixed(1)}pt`
            )}
          </View>
        ))}

        {/* Audio Settings */}
        {renderSection('Audio Settings', (
          <View>
            {renderToggleSetting(
              'announceNotifications',
              'Announce Notifications',
              'Announces notifications and alerts',
              localSettings.announceNotifications
            )}
          </View>
        ))}

        {/* Testing Tools */}
        {renderSection('Testing Tools', (
          <View>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: accessibleColors.secondary }]}
              onPress={testContrastRatio}
              {...generateAccessibilityProps({
                label: 'Test color contrast',
                hint: 'Tests current color contrast ratio',
                role: 'button'
              })}
            >
              <Text style={[buttonTextStyle, { color: '#FFFFFF' }]}>
                Test Color Contrast
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Preview Section */}
        {renderSection('Preview', (
          <View style={styles.previewContainer}>
            <Text 
              style={[
                useAccessibleTextStyle({ fontSize: 16 }), 
                { color: accessibleColors.text, marginBottom: 8 }
              ]}
            >
              Sample text with current settings applied
            </Text>
            <Text 
              style={[
                useAccessibleTextStyle({ fontSize: 14 }), 
                { color: accessibleColors.text, marginBottom: 8 }
              ]}
            >
              This is how regular text will appear with your accessibility preferences.
            </Text>
            <TouchableOpacity
              style={[
                styles.previewButton, 
                { 
                  backgroundColor: accessibleColors.primary,
                  borderRadius: localSettings.buttonShapesEnabled ? 8 : 0
                }
              ]}
              {...generateAccessibilityProps({
                label: 'Sample button',
                hint: 'This is a preview button',
                role: 'button'
              })}
            >
              <Text style={[buttonTextStyle, { color: '#FFFFFF' }]}>
                Sample Button
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actionButtons, { backgroundColor: accessibleColors.background }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.resetButton]}
          onPress={resetSettings}
          {...generateAccessibilityProps({
            label: 'Reset to defaults',
            hint: 'Resets all accessibility settings to default values',
            role: 'button'
          })}
        >
          <Text style={[buttonTextStyle, { color: '#F44336' }]}>Reset</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.actionButton, 
            styles.saveButton,
            { backgroundColor: hasChanges ? accessibleColors.primary : '#CCCCCC' }
          ]}
          onPress={saveSettings}
          disabled={!hasChanges}
          {...generateAccessibilityProps({
            label: hasChanges ? 'Save changes' : 'No changes to save',
            hint: hasChanges ? 'Saves your accessibility settings' : 'No changes have been made',
            role: 'button',
            state: { disabled: !hasChanges }
          })}
        >
          <Text style={[buttonTextStyle, { color: '#FFFFFF' }]}>
            {hasChanges ? 'Save Changes' : 'No Changes'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  sliderContainer: {
    width: 120,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  testButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  previewContainer: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginTop: 8,
  },
  previewButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  resetButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  saveButton: {
    // backgroundColor set dynamically
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});