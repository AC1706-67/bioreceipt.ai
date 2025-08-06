/**
 * Consent Manager Component
 * Handles user consent for analytics and data collection
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { AnalyticsService } from '../../services/analytics/analyticsService';
import { storeData, getData } from '../../utils/storage';

interface ConsentSettings {
  analyticsConsent: boolean;
  performanceConsent: boolean;
  crashReportingConsent: boolean;
  trackingLevel: 'minimal' | 'standard' | 'detailed';
  consentDate: Date;
  consentVersion: string;
}

interface ConsentManagerProps {
  visible: boolean;
  onConsentGiven: (settings: ConsentSettings) => void;
  onConsentDeclined: () => void;
  isUpdate?: boolean; // Whether this is updating existing consent
}

export const ConsentManager: React.FC<ConsentManagerProps> = ({
  visible,
  onConsentGiven,
  onConsentDeclined,
  isUpdate = false,
}) => {
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [performanceConsent, setPerformanceConsent] = useState(false);
  const [crashReportingConsent, setCrashReportingConsent] = useState(false);
  const [trackingLevel, setTrackingLevel] = useState<'minimal' | 'standard' | 'detailed'>('standard');
  const [showDetails, setShowDetails] = useState(false);

  const analyticsService = AnalyticsService.getInstance();
  const consentVersion = '1.0';

  useEffect(() => {
    if (isUpdate) {
      loadExistingConsent();
    }
  }, [isUpdate]);

  const loadExistingConsent = async () => {
    try {
      const existingConsent = await getData<ConsentSettings>('USER_CONSENT');
      if (existingConsent) {
        setAnalyticsConsent(existingConsent.analyticsConsent);
        setPerformanceConsent(existingConsent.performanceConsent);
        setCrashReportingConsent(existingConsent.crashReportingConsent);
        setTrackingLevel(existingConsent.trackingLevel);
      }
    } catch (error) {
      console.error('Error loading existing consent:', error);
    }
  };

  const handleAcceptAll = async () => {
    const settings: ConsentSettings = {
      analyticsConsent: true,
      performanceConsent: true,
      crashReportingConsent: true,
      trackingLevel: 'standard',
      consentDate: new Date(),
      consentVersion,
    };

    await saveConsent(settings);
    await analyticsService.initialize(true, 'standard');
    onConsentGiven(settings);
  };

  const handleDeclineAll = async () => {
    const settings: ConsentSettings = {
      analyticsConsent: false,
      performanceConsent: false,
      crashReportingConsent: false,
      trackingLevel: 'minimal',
      consentDate: new Date(),
      consentVersion,
    };

    await saveConsent(settings);
    await analyticsService.initialize(false, 'minimal');
    onConsentDeclined();
  };

  const handleCustomConsent = async () => {
    const settings: ConsentSettings = {
      analyticsConsent,
      performanceConsent,
      crashReportingConsent,
      trackingLevel,
      consentDate: new Date(),
      consentVersion,
    };

    await saveConsent(settings);
    await analyticsService.initialize(analyticsConsent, trackingLevel);
    onConsentGiven(settings);
  };

  const saveConsent = async (settings: ConsentSettings) => {
    try {
      await storeData('USER_CONSENT', settings);
      console.log('User consent saved:', settings);
    } catch (error) {
      console.error('Error saving consent:', error);
    }
  };

  const renderTrackingLevelSelector = () => (
    <View style={styles.trackingLevelContainer}>
      <Text style={styles.sectionTitle}>Data Collection Level</Text>
      <Text style={styles.sectionDescription}>
        Choose how much data you're comfortable sharing with us.
      </Text>
      
      <View style={styles.levelOptions}>
        {[
          {
            value: 'minimal' as const,
            title: 'Minimal',
            description: 'Only essential app functionality data',
          },
          {
            value: 'standard' as const,
            title: 'Standard',
            description: 'App usage patterns and basic analytics',
          },
          {
            value: 'detailed' as const,
            title: 'Detailed',
            description: 'Comprehensive analytics for better personalization',
          },
        ].map((level) => (
          <TouchableOpacity
            key={level.value}
            style={[
              styles.levelOption,
              trackingLevel === level.value && styles.selectedLevelOption,
            ]}
            onPress={() => setTrackingLevel(level.value)}
          >
            <View style={styles.levelHeader}>
              <Text style={[
                styles.levelTitle,
                trackingLevel === level.value && styles.selectedLevelTitle,
              ]}>
                {level.title}
              </Text>
              <View style={[
                styles.radioButton,
                trackingLevel === level.value && styles.selectedRadioButton,
              ]}>
                {trackingLevel === level.value && <View style={styles.radioButtonInner} />}
              </View>
            </View>
            <Text style={styles.levelDescription}>{level.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderConsentDetails = () => (
    <ScrollView style={styles.detailsContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.detailsTitle}>Data Collection Details</Text>
      
      <View style={styles.consentSection}>
        <View style={styles.consentHeader}>
          <Text style={styles.consentTitle}>Analytics & Usage Data</Text>
          <Switch
            value={analyticsConsent}
            onValueChange={setAnalyticsConsent}
            trackColor={{ false: '#e9ecef', true: '#3498db' }}
            thumbColor={analyticsConsent ? '#ffffff' : '#6c757d'}
          />
        </View>
        <Text style={styles.consentDescription}>
          • How you use the app (screens visited, features used)
          • Health tip interactions (views, likes, bookmarks)
          • Search queries and preferences
          • Session duration and frequency
        </Text>
      </View>

      <View style={styles.consentSection}>
        <View style={styles.consentHeader}>
          <Text style={styles.consentTitle}>Performance Monitoring</Text>
          <Switch
            value={performanceConsent}
            onValueChange={setPerformanceConsent}
            trackColor={{ false: '#e9ecef', true: '#3498db' }}
            thumbColor={performanceConsent ? '#ffffff' : '#6c757d'}
          />
        </View>
        <Text style={styles.consentDescription}>
          • App loading times and responsiveness
          • Memory usage and battery impact
          • Network performance metrics
          • Device specifications (anonymized)
        </Text>
      </View>

      <View style={styles.consentSection}>
        <View style={styles.consentHeader}>
          <Text style={styles.consentTitle}>Crash Reporting</Text>
          <Switch
            value={crashReportingConsent}
            onValueChange={setCrashReportingConsent}
            trackColor={{ false: '#e9ecef', true: '#3498db' }}
            thumbColor={crashReportingConsent ? '#ffffff' : '#6c757d'}
          />
        </View>
        <Text style={styles.consentDescription}>
          • Automatic crash reports to help fix bugs
          • Error logs and stack traces
          • Device state when errors occur
          • No personal health data is included
        </Text>
      </View>

      {renderTrackingLevelSelector()}

      <View style={styles.privacyNote}>
        <Text style={styles.privacyTitle}>Your Privacy Rights</Text>
        <Text style={styles.privacyText}>
          • You can change these settings anytime in the app
          • Request a copy of your data or delete it completely
          • Data is encrypted and never sold to third parties
          • We comply with GDPR, CCPA, and other privacy regulations
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleDeclineAll}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isUpdate ? 'Update Privacy Settings' : 'Privacy & Data Collection'}
          </Text>
          <Text style={styles.subtitle}>
            {isUpdate 
              ? 'Review and update your data sharing preferences'
              : 'Help us improve your experience while respecting your privacy'
            }
          </Text>
        </View>

        {showDetails ? (
          <>
            {renderConsentDetails()}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowDetails(false)}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleCustomConsent}
              >
                <Text style={styles.saveButtonText}>Save Preferences</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.benefitsSection}>
                <Text style={styles.benefitsTitle}>How This Helps You</Text>
                <View style={styles.benefit}>
                  <Text style={styles.benefitIcon}>🎯</Text>
                  <Text style={styles.benefitText}>
                    Get more personalized health tips based on your interests
                  </Text>
                </View>
                <View style={styles.benefit}>
                  <Text style={styles.benefitIcon}>🚀</Text>
                  <Text style={styles.benefitText}>
                    Faster app performance and fewer bugs
                  </Text>
                </View>
                <View style={styles.benefit}>
                  <Text style={styles.benefitIcon}>📊</Text>
                  <Text style={styles.benefitText}>
                    Track your progress and health journey more effectively
                  </Text>
                </View>
                <View style={styles.benefit}>
                  <Text style={styles.benefitIcon}>🔒</Text>
                  <Text style={styles.benefitText}>
                    Your health data stays private and secure
                  </Text>
                </View>
              </View>

              <View style={styles.dataSection}>
                <Text style={styles.dataTitle}>What We Collect</Text>
                <Text style={styles.dataText}>
                  • App usage patterns and feature interactions
                  • Performance metrics to improve speed and reliability
                  • Crash reports to fix bugs quickly
                  • Anonymous analytics to understand user needs
                </Text>
                <Text style={styles.dataNote}>
                  We never collect personal health information, passwords, or sell your data.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.customizeButton}
                onPress={() => setShowDetails(true)}
              >
                <Text style={styles.customizeButtonText}>Customize</Text>
              </TouchableOpacity>
              
              <View style={styles.mainButtons}>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={handleDeclineAll}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={handleAcceptAll}
                >
                  <Text style={styles.acceptButtonText}>Accept All</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    lineHeight: 22,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  benefitsSection: {
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  benefitText: {
    flex: 1,
    fontSize: 16,
    color: '#495057',
    lineHeight: 22,
  },
  dataSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  dataTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  dataText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 12,
  },
  dataNote: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  buttonContainer: {
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  customizeButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  customizeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  mainButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  detailsContainer: {
    flex: 1,
    padding: 24,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 24,
  },
  consentSection: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  consentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  consentDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  trackingLevelContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    lineHeight: 20,
  },
  levelOptions: {
    gap: 12,
  },
  levelOption: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    padding: 16,
  },
  selectedLevelOption: {
    borderColor: '#3498db',
    backgroundColor: '#f8fcff',
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  selectedLevelTitle: {
    color: '#3498db',
  },
  levelDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#dee2e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadioButton: {
    borderColor: '#3498db',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3498db',
  },
  privacyNote: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 14,
    color: '#155724',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  saveButton: {
    backgroundColor: '#28a745',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});