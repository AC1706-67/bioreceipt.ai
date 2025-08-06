/**
 * Accessibility Auditor Component
 * Development tool for auditing accessibility compliance
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { auditAccessibility, AccessibilityAuditResult } from '../../utils/accessibility';

interface AccessibilityAuditorProps {
  children: React.ReactNode;
  componentName: string;
  enabled?: boolean;
}

export const AccessibilityAuditor: React.FC<AccessibilityAuditorProps> = ({
  children,
  componentName,
  enabled = __DEV__,
}) => {
  const [auditResults, setAuditResults] = useState<AccessibilityAuditResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (enabled && React.isValidElement(children)) {
      // Audit the child component's props
      const result = auditAccessibility(componentName, children.props);
      setAuditResults(result);
    }
  }, [children, componentName, enabled]);

  const handleShowAudit = () => {
    if (auditResults) {
      setShowResults(true);
    }
  };

  const handleHideAudit = () => {
    setShowResults(false);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#28a745'; // Green
    if (score >= 70) return '#ffc107'; // Yellow
    if (score >= 50) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
  };

  const getSeverityColor = (severity: 'error' | 'warning' | 'info'): string => {
    switch (severity) {
      case 'error':
        return '#dc3545';
      case 'warning':
        return '#ffc107';
      case 'info':
        return '#17a2b8';
      default:
        return '#6c757d';
    }
  };

  const getSeverityIcon = (severity: 'error' | 'warning' | 'info'): string => {
    switch (severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📝';
    }
  };

  if (!enabled || !auditResults) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {children}
      
      {/* Accessibility Score Badge */}
      <TouchableOpacity
        style={[
          styles.scoreBadge,
          { backgroundColor: getScoreColor(auditResults.score) }
        ]}
        onPress={handleShowAudit}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Accessibility score: ${auditResults.score} out of 100. ${auditResults.issues.length} issues found. Double tap to view details.`}
      >
        <Text style={styles.scoreText}>A11y</Text>
        <Text style={styles.scoreNumber}>{auditResults.score}</Text>
      </TouchableOpacity>

      {/* Audit Results Modal */}
      {showResults && (
        <View style={styles.auditModal}>
          <View style={styles.auditContent}>
            <View style={styles.auditHeader}>
              <Text style={styles.auditTitle}>
                Accessibility Audit: {componentName}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleHideAudit}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Close audit results"
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.scoreSection}>
              <Text style={styles.scoreLabel}>Accessibility Score</Text>
              <View style={styles.scoreContainer}>
                <View
                  style={[
                    styles.scoreCircle,
                    { borderColor: getScoreColor(auditResults.score) }
                  ]}
                >
                  <Text
                    style={[
                      styles.scoreLarge,
                      { color: getScoreColor(auditResults.score) }
                    ]}
                  >
                    {auditResults.score}
                  </Text>
                </View>
                <Text style={styles.scoreDescription}>
                  {auditResults.score >= 90 && 'Excellent accessibility compliance'}
                  {auditResults.score >= 70 && auditResults.score < 90 && 'Good accessibility with minor issues'}
                  {auditResults.score >= 50 && auditResults.score < 70 && 'Moderate accessibility issues'}
                  {auditResults.score < 50 && 'Significant accessibility issues'}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.issuesContainer}>
              <Text style={styles.issuesTitle}>
                Issues Found ({auditResults.issues.length})
              </Text>

              {auditResults.issues.length === 0 ? (
                <View style={styles.noIssues}>
                  <Text style={styles.noIssuesIcon}>🎉</Text>
                  <Text style={styles.noIssuesText}>
                    No accessibility issues found! This component follows WCAG 2.1 AA guidelines.
                  </Text>
                </View>
              ) : (
                auditResults.issues.map((issue, index) => (
                  <View key={index} style={styles.issueItem}>
                    <View style={styles.issueHeader}>
                      <Text style={styles.issueIcon}>
                        {getSeverityIcon(issue.severity)}
                      </Text>
                      <View style={styles.issueInfo}>
                        <Text
                          style={[
                            styles.issueSeverity,
                            { color: getSeverityColor(issue.severity) }
                          ]}
                        >
                          {issue.severity.toUpperCase()}
                        </Text>
                        <Text style={styles.issueType}>
                          {issue.type.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.issueMessage}>{issue.message}</Text>
                    <View style={styles.suggestionContainer}>
                      <Text style={styles.suggestionLabel}>💡 Suggestion:</Text>
                      <Text style={styles.suggestionText}>{issue.suggestion}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.auditFooter}>
              <TouchableOpacity
                style={styles.learnMoreButton}
                onPress={() => {
                  Alert.alert(
                    'WCAG 2.1 AA Guidelines',
                    'Web Content Accessibility Guidelines (WCAG) 2.1 Level AA is the international standard for web accessibility. It ensures content is perceivable, operable, understandable, and robust for all users, including those with disabilities.',
                    [{ text: 'OK' }]
                  );
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Learn more about WCAG 2.1 AA guidelines"
              >
                <Text style={styles.learnMoreText}>Learn More About WCAG</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  scoreBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  scoreText: {
    fontSize: 8,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  scoreNumber: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  auditModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 2000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  auditContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  auditTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  scoreSection: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 16,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scoreLarge: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreDescription: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  issuesContainer: {
    maxHeight: 300,
    padding: 20,
  },
  issuesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  noIssues: {
    alignItems: 'center',
    padding: 20,
  },
  noIssuesIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noIssuesText: {
    fontSize: 16,
    color: '#28a745',
    textAlign: 'center',
    lineHeight: 22,
  },
  issueItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dee2e6',
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  issueInfo: {
    flex: 1,
  },
  issueSeverity: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  issueType: {
    fontSize: 10,
    color: '#6c757d',
    marginTop: 2,
  },
  issueMessage: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 8,
    lineHeight: 20,
  },
  suggestionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 12,
    color: '#6c757d',
    lineHeight: 16,
  },
  auditFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    alignItems: 'center',
  },
  learnMoreButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  learnMoreText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});