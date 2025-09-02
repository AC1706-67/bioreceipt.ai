/**
 * Data Access Request Screen
 * Allows users to request access to their data (HIPAA Right of Access)
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
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HIPAAComplianceService, DataAccessRequest } from '../../services/compliance/hipaaComplianceService';

interface DataAccessRequestScreenProps {
  userId: string;
  onBack: () => void;
}

interface DataTypeOption {
  id: string;
  name: string;
  description: string;
  selected: boolean;
}

export const DataAccessRequestScreen: React.FC<DataAccessRequestScreenProps> = ({
  userId,
  onBack
}) => {
  const [requestType, setRequestType] = useState<'view' | 'export' | 'delete'>('view');
  const [dataTypes, setDataTypes] = useState<DataTypeOption[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestHistory, setRequestHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const hipaaService = HIPAAComplianceService.getInstance();

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      // Initialize available data types
      const availableDataTypes: DataTypeOption[] = [
        {
          id: 'profile',
          name: 'Profile Information',
          description: 'Your personal profile data including name, age, gender, and health interests',
          selected: false
        },
        {
          id: 'health_tips',
          name: 'Health Tips',
          description: 'All health tips you have viewed, liked, or bookmarked',
          selected: false
        },
        {
          id: 'engagements',
          name: 'Engagement Data',
          description: 'Your interaction history with the app and content',
          selected: false
        },
        {
          id: 'progress',
          name: 'Progress Data',
          description: 'Your streak data, achievements, and progress tracking information',
          selected: false
        },
        {
          id: 'audit_logs',
          name: 'Access Logs',
          description: 'Logs of when and how your data has been accessed',
          selected: false
        }
      ];

      setDataTypes(availableDataTypes);
      
      // Load request history (simplified - in real app would come from service)
      setRequestHistory([]);
    } catch (error) {
      console.error('Failed to initialize data access screen:', error);
      Alert.alert('Error', 'Failed to load data access information.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDataType = (dataTypeId: string) => {
    setDataTypes(prev => prev.map(dt => 
      dt.id === dataTypeId ? { ...dt, selected: !dt.selected } : dt
    ));
  };

  const handleSubmitRequest = async () => {
    try {
      const selectedDataTypes = dataTypes.filter(dt => dt.selected).map(dt => dt.id);
      
      if (selectedDataTypes.length === 0) {
        Alert.alert('Selection Required', 'Please select at least one type of data to request.');
        return;
      }

      // Show confirmation dialog
      const requestTypeText = requestType === 'view' ? 'view' : 
                             requestType === 'export' ? 'export' : 'delete';
      
      Alert.alert(
        'Confirm Request',
        `Are you sure you want to ${requestTypeText} the following data types?\n\n${
          selectedDataTypes.map(id => dataTypes.find(dt => dt.id === id)?.name).join('\n')
        }`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: submitRequest }
        ]
      );
    } catch (error) {
      console.error('Failed to prepare request:', error);
      Alert.alert('Error', 'Failed to prepare your request. Please try again.');
    }
  };

  const submitRequest = async () => {
    try {
      setSubmitting(true);
      
      const selectedDataTypes = dataTypes.filter(dt => dt.selected).map(dt => dt.id);
      
      const request: DataAccessRequest = {
        userId,
        requestType,
        requestedData: selectedDataTypes,
        requestDate: new Date(),
        status: 'pending'
      };

      const requestId = await hipaaService.handleDataAccessRequest(request);

      Alert.alert(
        'Request Submitted',
        `Your ${requestType} request has been submitted successfully.\n\nRequest ID: ${requestId}\n\nYou will be notified when your request is processed.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setDataTypes(prev => prev.map(dt => ({ ...dt, selected: false })));
              setAdditionalInfo('');
              setRequestType('view');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to submit request:', error);
      Alert.alert('Error', 'Failed to submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderRequestTypeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Request Type</Text>
      <Text style={styles.sectionSubtitle}>Choose what you would like to do with your data</Text>
      
      <View style={styles.requestTypeContainer}>
        <TouchableOpacity
          style={[styles.requestTypeButton, requestType === 'view' && styles.requestTypeButtonActive]}
          onPress={() => setRequestType('view')}
          accessibilityRole="button"
          accessibilityLabel="View data request"
        >
          <Text style={[styles.requestTypeText, requestType === 'view' && styles.requestTypeTextActive]}>
            View Data
          </Text>
          <Text style={styles.requestTypeDescription}>
            Review your data within the app
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.requestTypeButton, requestType === 'export' && styles.requestTypeButtonActive]}
          onPress={() => setRequestType('export')}
          accessibilityRole="button"
          accessibilityLabel="Export data request"
        >
          <Text style={[styles.requestTypeText, requestType === 'export' && styles.requestTypeTextActive]}>
            Export Data
          </Text>
          <Text style={styles.requestTypeDescription}>
            Download a copy of your data
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.requestTypeButton, requestType === 'delete' && styles.requestTypeButtonActive]}
          onPress={() => setRequestType('delete')}
          accessibilityRole="button"
          accessibilityLabel="Delete data request"
        >
          <Text style={[styles.requestTypeText, requestType === 'delete' && styles.requestTypeTextActive]}>
            Delete Data
          </Text>
          <Text style={styles.requestTypeDescription}>
            Request deletion of your data
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDataTypeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Data Types</Text>
      <Text style={styles.sectionSubtitle}>Select the types of data for your request</Text>
      
      {dataTypes.map(dataType => (
        <TouchableOpacity
          key={dataType.id}
          style={[styles.dataTypeItem, dataType.selected && styles.dataTypeItemSelected]}
          onPress={() => toggleDataType(dataType.id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: dataType.selected }}
          accessibilityLabel={`${dataType.name} data type`}
        >
          <View style={styles.dataTypeHeader}>
            <Text style={[styles.dataTypeName, dataType.selected && styles.dataTypeNameSelected]}>
              {dataType.name}
            </Text>
            <View style={[styles.checkbox, dataType.selected && styles.checkboxSelected]}>
              {dataType.selected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </View>
          <Text style={[styles.dataTypeDescription, dataType.selected && styles.dataTypeDescriptionSelected]}>
            {dataType.description}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAdditionalInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Additional Information</Text>
      <Text style={styles.sectionSubtitle}>
        Provide any additional details about your request (optional)
      </Text>
      
      <TextInput
        style={styles.textInput}
        multiline
        numberOfLines={4}
        placeholder="Enter any additional information or specific requirements..."
        value={additionalInfo}
        onChangeText={setAdditionalInfo}
        textAlignVertical="top"
        accessibilityLabel="Additional information text input"
      />
    </View>
  );

  const renderImportantNotice = () => (
    <View style={styles.importantNotice}>
      <Text style={styles.noticeTitle}>Important Information</Text>
      <Text style={styles.noticeText}>
        • Data access requests are processed within 30 days as required by HIPAA
      </Text>
      <Text style={styles.noticeText}>
        • You have the right to request access to your protected health information
      </Text>
      <Text style={styles.noticeText}>
        • Data deletion requests may affect your ability to use certain app features
      </Text>
      <Text style={styles.noticeText}>
        • Some data may be retained for legal or regulatory compliance purposes
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading data access options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Data Access Request</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Exercise your right to access, export, or delete your personal data
          </Text>

          {renderImportantNotice()}
          {renderRequestTypeSelector()}
          {renderDataTypeSelector()}
          {renderAdditionalInfo()}
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (dataTypes.filter(dt => dt.selected).length === 0 || submitting) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmitRequest}
          disabled={dataTypes.filter(dt => dt.selected).length === 0 || submitting}
          accessibilityRole="button"
          accessibilityLabel="Submit data access request"
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Request</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
    marginBottom: 20,
  },
  importantNotice: {
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 18,
    marginBottom: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  requestTypeContainer: {
    gap: 12,
  },
  requestTypeButton: {
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  requestTypeButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  requestTypeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  requestTypeTextActive: {
    color: '#2E7D32',
  },
  requestTypeDescription: {
    fontSize: 14,
    color: '#666666',
  },
  dataTypeItem: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  dataTypeItemSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  dataTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dataTypeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  dataTypeNameSelected: {
    color: '#2E7D32',
  },
  dataTypeDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 18,
  },
  dataTypeDescriptionSelected: {
    color: '#388E3C',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FFFFFF',
    minHeight: 100,
  },
  buttonContainer: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  submitButton: {
    paddingVertical: 16,
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