/**
 * HIPAA Consent Screen
 * Provides comprehensive consent collection interface for HIPAA compliance
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConsentManagementService, ConsentType } from '../../services/compliance/consentManagementService';
import { HIPAAComplianceService } from '../../services/compliance/hipaaComplianceService';

interface HIPAAConsentScreenProps {
  userId: string;
  onConsentComplete: (consentsGranted: boolean) => void;
  onSkip?: () => void;
}

interface ConsentState {
  [key: string]: boolean;
}

export const HIPAAConsentScreen: React.FC<HIPAAConsentScreenProps> = ({
  userId,
  onConsentComplete,
  onSkip
}) => {
  const [consentTypes, setConsentTypes] = useState<ConsentType[]>([]);
  const [consentStates, setConsentStates] = useState<ConsentState>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const consentService = ConsentManagementService.getInstance();
  const hipaaService = HIPAAComplianceService.getInstance();

  useEffect(() => {
    loadConsentTypes();
  }, []);

  const loadConsentTypes = async () => {
    try {
      const types = consentService.getAvailableConsentTypes();
      setConsentTypes(types);
      
      // Initialize consent states
      const initialStates: ConsentState = {};
      types.forEach(type => {
        initialStates[type.id] = false;
      });
      setConsentStates(initialStates);
    } catch (error) {
      console.error('Failed to load consent types:', error);
      Alert.alert('Error', 'Failed to load consent information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleConsent = (consentId: string) => {
    setConsentStates(prev => ({
      ...prev,
      [consentId]: !prev[consentId]
    }));
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Check if all required consents are granted
      const requiredConsents = consentTypes.filter(type => type.required);
      const missingRequired = requiredConsents.filter(type => !consentStates[type.id]);

      if (missingRequired.length > 0) {
        Alert.alert(
          'Required Consent Missing',
          `The following required consents must be granted to continue:\n\n${missingRequired.map(c => `• ${c.name}`).join('\n')}`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Record consents
      const grantedConsents = Object.entries(consentStates)
        .filter(([_, granted]) => granted)
        .map(([consentId]) => consentId);

      const deniedConsents = Object.entries(consentStates)
        .filter(([_, granted]) => !granted)
        .map(([consentId]) => consentId);

      // Record granted consents
      if (grantedConsents.length > 0) {
        await consentService.recordConsent({
          userId,
          consentTypes: grantedConsents,
          granted: true,
          ipAddress: '127.0.0.1', // In real app, get actual IP
          userAgent: 'BioReceipt Mobile App',
          details: {
            consentMethod: 'MOBILE_APP_FORM',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Record denied consents
      if (deniedConsents.length > 0) {
        await consentService.recordConsent({
          userId,
          consentTypes: deniedConsents,
          granted: false,
          ipAddress: '127.0.0.1',
          userAgent: 'BioReceipt Mobile App',
          details: {
            consentMethod: 'MOBILE_APP_FORM',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Initialize HIPAA compliance
      await hipaaService.initializeUserCompliance(userId);

      Alert.alert(
        'Consent Recorded',
        'Your consent preferences have been recorded successfully.',
        [
          {
            text: 'Continue',
            onPress: () => onConsentComplete(requiredConsents.every(type => consentStates[type.id]))
          }
        ]
      );
    } catch (error) {
      console.error('Failed to record consent:', error);
      Alert.alert('Error', 'Failed to record your consent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderConsentItem = (consentType: ConsentType) => {
    const isExpanded = expandedSections.has(consentType.id);
    const isGranted = consentStates[consentType.id];

    return (
      <View key={consentType.id} style={styles.consentItem}>
        <TouchableOpacity
          style={styles.consentHeader}
          onPress={() => toggleSection(consentType.id)}
          accessibilityRole="button"
          accessibilityLabel={`${consentType.name} consent details`}
        >
          <View style={styles.consentTitleRow}>
            <Text style={styles.consentTitle}>
              {consentType.name}
              {consentType.required && <Text style={styles.requiredIndicator}> *</Text>}
            </Text>
            <Text style={styles.expandIcon}>{isExpanded ? '−' : '+'}</Text>
          </View>
          <Text style={styles.consentCategory}>{consentType.category}</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.consentDetails}>
            <Text style={styles.consentDescription}>{consentType.description}</Text>
            
            {consentType.category === 'HIPAA' && (
              <View style={styles.hipaaNotice}>
                <Text style={styles.hipaaNoticeTitle}>HIPAA Authorization Notice</Text>
                <Text style={styles.hipaaNoticeText}>
                  This authorization allows BioReceipt to use and disclose your protected health 
                  information for treatment, payment, and healthcare operations. You have the 
                  right to revoke this authorization at any time by contacting us in writing.
                </Text>
                <Text style={styles.hipaaNoticeText}>
                  This authorization expires one year from the date of signing unless revoked earlier.
                </Text>
              </View>
            )}

            <View style={styles.consentToggle}>
              <Text style={styles.toggleLabel}>
                {isGranted ? 'Consent Granted' : 'Consent Not Granted'}
              </Text>
              <Switch
                value={isGranted}
                onValueChange={() => toggleConsent(consentType.id)}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={isGranted ? '#2E7D32' : '#f4f3f4'}
                accessibilityLabel={`Toggle ${consentType.name} consent`}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading consent information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const requiredConsents = consentTypes.filter(type => type.required);
  const optionalConsents = consentTypes.filter(type => !type.required);
  const allRequiredGranted = requiredConsents.every(type => consentStates[type.id]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Privacy & Consent</Text>
          <Text style={styles.subtitle}>
            Please review and provide your consent for data processing and HIPAA authorization.
          </Text>
        </View>

        <View style={styles.importantNotice}>
          <Text style={styles.noticeTitle}>Important Notice</Text>
          <Text style={styles.noticeText}>
            BioReceipt is committed to protecting your privacy and complying with HIPAA regulations. 
            Your health information will be handled with the highest level of security and confidentiality.
          </Text>
        </View>

        {requiredConsents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Required Consents</Text>
            <Text style={styles.sectionSubtitle}>
              These consents are required to use the app and its features.
            </Text>
            {requiredConsents.map(renderConsentItem)}
          </View>
        )}

        {optionalConsents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Optional Consents</Text>
            <Text style={styles.sectionSubtitle}>
              These consents are optional and help us improve your experience.
            </Text>
            {optionalConsents.map(renderConsentItem)}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            You can change your consent preferences at any time in the app settings. 
            For questions about data processing, please contact our privacy team.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        {onSkip && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip consent for now"
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.submitButton,
            !allRequiredGranted && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!allRequiredGranted || submitting}
          accessibilityRole="button"
          accessibilityLabel="Submit consent preferences"
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {allRequiredGranted ? 'Continue' : 'Grant Required Consents'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  importantNotice: {
    margin: 20,
    padding: 16,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
  section: {
    margin: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  consentItem: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  consentHeader: {
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  consentTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
    flex: 1,
  },
  requiredIndicator: {
    color: '#F44336',
  },
  expandIcon: {
    fontSize: 20,
    color: '#666666',
    marginLeft: 8,
  },
  consentCategory: {
    fontSize: 12,
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  consentDetails: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  consentDescription: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    marginBottom: 16,
  },
  hipaaNotice: {
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  hipaaNoticeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  hipaaNoticeText: {
    fontSize: 12,
    color: '#BF360C',
    lineHeight: 16,
    marginBottom: 6,
  },
  consentToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  footer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
