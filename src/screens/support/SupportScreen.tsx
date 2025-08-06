/**
 * Support Screen
 * Provides help, FAQ, and support options for users
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface SupportOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => void;
}

export const SupportScreen: React.FC = () => {
  const navigation = useNavigation();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const faqData: FAQItem[] = [
    {
      id: '1',
      question: 'How do I get personalized health tips?',
      answer: 'Complete your profile with health goals, preferences, and interests. Our AI will then curate tips specifically for you based on your information.',
      category: 'Personalization',
    },
    {
      id: '2',
      question: 'Why am I not receiving notifications?',
      answer: 'Check your notification settings in the app and ensure notifications are enabled in your device settings. You can customize notification times in Settings > Notifications.',
      category: 'Notifications',
    },
    {
      id: '3',
      question: 'How do I track my progress?',
      answer: 'Visit the Progress tab to see your health journey, completed tips, streaks, and achievements. You can also set custom goals and milestones.',
      category: 'Progress',
    },
    {
      id: '4',
      question: 'Can I save tips for later?',
      answer: 'Yes! Tap the bookmark icon on any tip to save it to your favorites. Access saved tips from your profile or the tips section.',
      category: 'Tips',
    },
    {
      id: '5',
      question: 'How do I change my health goals?',
      answer: 'Go to Profile > Edit Profile and update your health goals, interests, or preferences. Your tips will be updated accordingly.',
      category: 'Profile',
    },
    {
      id: '6',
      question: 'Is my health data secure?',
      answer: 'Yes, we take privacy seriously. Your data is encrypted and stored securely. We never share personal health information with third parties.',
      category: 'Privacy',
    },
    {
      id: '7',
      question: 'How do I reset my password?',
      answer: 'On the sign-in screen, tap "Forgot Password" and enter your email. You\'ll receive instructions to reset your password.',
      category: 'Account',
    },
    {
      id: '8',
      question: 'Can I use the app offline?',
      answer: 'Yes! Previously loaded tips and your progress data are available offline. New content will sync when you reconnect to the internet.',
      category: 'Technical',
    },
  ];

  const supportOptions: SupportOption[] = [
    {
      id: 'feedback',
      title: 'Send Feedback',
      description: 'Report bugs, suggest features, or share your thoughts',
      icon: '💬',
      action: () => {
        // Navigate to feedback screen
        (navigation as any).navigate('Feedback');
      },
    },
    {
      id: 'history',
      title: 'Feedback History',
      description: 'View your submitted feedback and responses',
      icon: '📋',
      action: () => {
        // Navigate to feedback history screen
        (navigation as any).navigate('FeedbackHistory');
      },
    },
    {
      id: 'email',
      title: 'Email Support',
      description: 'Contact our support team directly',
      icon: '📧',
      action: () => {
        const email = 'support@healthytipapp.com';
        const subject = 'Support Request - Healthy Tip App';
        const body = 'Please describe your issue or question:';
        const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        Linking.canOpenURL(url).then((supported) => {
          if (supported) {
            Linking.openURL(url);
          } else {
            Alert.alert(
              'Email Not Available',
              `Please send an email to ${email}`,
              [{ text: 'OK' }]
            );
          }
        });
      },
    },
    {
      id: 'website',
      title: 'Visit Website',
      description: 'Browse our help center and documentation',
      icon: '🌐',
      action: () => {
        const url = 'https://healthytipapp.com/help';
        Linking.canOpenURL(url).then((supported) => {
          if (supported) {
            Linking.openURL(url);
          } else {
            Alert.alert('Cannot open website', 'Please visit healthytipapp.com/help');
          }
        });
      },
    },
    ...__DEV__ ? [{
      id: 'errorTest',
      title: 'Test Error Handling',
      description: 'Development tool for testing error scenarios',
      icon: '🧪',
      action: () => {
        (navigation as any).navigate('ErrorTest');
      },
    }] : [],
  ];

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const groupedFAQ = faqData.reduce((groups, faq) => {
    const category = faq.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(faq);
    return groups;
  }, {} as Record<string, FAQItem[]>);

  const renderSupportOption = (option: SupportOption) => (
    <TouchableOpacity
      key={option.id}
      style={styles.supportOption}
      onPress={option.action}
    >
      <View style={styles.optionIcon}>
        <Text style={styles.optionIconText}>{option.icon}</Text>
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{option.title}</Text>
        <Text style={styles.optionDescription}>{option.description}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const renderFAQItem = (faq: FAQItem) => {
    const isExpanded = expandedFAQ === faq.id;
    
    return (
      <View key={faq.id} style={styles.faqItem}>
        <TouchableOpacity
          style={styles.faqQuestion}
          onPress={() => toggleFAQ(faq.id)}
        >
          <Text style={styles.faqQuestionText}>{faq.question}</Text>
          <Text style={[
            styles.faqToggle,
            isExpanded && styles.faqToggleExpanded
          ]}>
            {isExpanded ? '−' : '+'}
          </Text>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.faqAnswer}>
            <Text style={styles.faqAnswerText}>{faq.answer}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderFAQCategory = (category: string, faqs: FAQItem[]) => (
    <View key={category} style={styles.faqCategory}>
      <Text style={styles.faqCategoryTitle}>{category}</Text>
      {faqs.map(renderFAQItem)}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Help & Support</Text>
        <Text style={styles.subtitle}>
          Find answers to common questions or get in touch with our team
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get Help</Text>
          <View style={styles.supportOptions}>
            {supportOptions.map(renderSupportOption)}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqContainer}>
            {Object.entries(groupedFAQ).map(([category, faqs]) =>
              renderFAQCategory(category, faqs)
            )}
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.appInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version:</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build:</Text>
              <Text style={styles.infoValue}>1</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated:</Text>
              <Text style={styles.infoValue}>January 2024</Text>
            </View>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactText}>
              📧 support@healthytipapp.com
            </Text>
            <Text style={styles.contactText}>
              🌐 healthytipapp.com
            </Text>
            <Text style={styles.contactText}>
              ⏰ Support Hours: Mon-Fri, 9AM-5PM EST
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            We're here to help! Don't hesitate to reach out if you need assistance.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  supportOptions: {
    gap: 12,
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionIconText: {
    fontSize: 20,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18,
  },
  chevron: {
    fontSize: 20,
    color: '#6c757d',
    marginLeft: 8,
  },
  faqContainer: {
    gap: 20,
  },
  faqCategory: {
    gap: 8,
  },
  faqCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  faqItem: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#2c3e50',
    marginRight: 12,
  },
  faqToggle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6c757d',
    width: 24,
    textAlign: 'center',
  },
  faqToggleExpanded: {
    color: '#3498db',
  },
  faqAnswer: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#f8f9fa',
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#5a6c7d',
    lineHeight: 20,
  },
  appInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  contactInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});