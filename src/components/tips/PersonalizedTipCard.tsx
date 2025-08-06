/**
 * Personalized Tip Card Component
 * Enhanced tip card with AI personalization feedback
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { HealthTip, UserAction } from '../../types';
import { TipCard } from './TipCard';
import { usePersonalizationFeedback } from '../../hooks/usePersonalization';
import {
  createButtonAccessibility,
  createHeaderAccessibility,
  ACCESSIBILITY_ROLES,
  announceForAccessibility,
} from '../../utils/accessibility';

interface PersonalizedTipCardProps {
  tip: HealthTip;
  onAction: (tipId: string, action: UserAction) => void;
  isLiked?: boolean;
  isBookmarked?: boolean;
  isCompleted?: boolean;
  personalizationScore?: number;
  reasoning?: string;
  showPersonalizationInfo?: boolean;
}

export const PersonalizedTipCard: React.FC<PersonalizedTipCardProps> = ({
  tip,
  onAction,
  isLiked = false,
  isBookmarked = false,
  isCompleted = false,
  personalizationScore = 0,
  reasoning = '',
  showPersonalizationInfo = true,
}) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  
  const {
    handleFeedback,
    submittingFeedback,
    feedbackError,
    feedbackSuccess,
  } = usePersonalizationFeedback();

  const handlePersonalizationFeedback = async (feedback: 'positive' | 'negative') => {
    try {
      await handleFeedback(tip.id, feedback);
      setShowFeedback(false);
      
      announceForAccessibility(
        `Thank you for your ${feedback} feedback on this personalized tip`,
        'polite'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    }
  };

  const getPersonalizationScoreColor = (score: number) => {
    if (score >= 0.8) return '#27ae60'; // High personalization - green
    if (score >= 0.6) return '#f39c12'; // Medium personalization - orange
    return '#95a5a6'; // Low personalization - gray
  };

  const getPersonalizationScoreText = (score: number) => {
    if (score >= 0.8) return 'Highly Personalized';
    if (score >= 0.6) return 'Personalized';
    return 'General Recommendation';
  };

  return (
    <View style={styles.container}>
      {/* Personalization Header */}
      {showPersonalizationInfo && (
        <View style={styles.personalizationHeader}>
          <View style={styles.personalizationScore}>
            <View 
              style={[
                styles.scoreIndicator, 
                { backgroundColor: getPersonalizationScoreColor(personalizationScore) }
              ]}
            />
            <Text style={styles.scoreText}>
              {getPersonalizationScoreText(personalizationScore)}
            </Text>
            <Text style={styles.scoreValue}>
              {Math.round(personalizationScore * 100)}%
            </Text>
          </View>
          
          {reasoning && (
            <TouchableOpacity
              style={styles.reasoningButton}
              onPress={() => setShowReasoning(!showReasoning)}
              {...createButtonAccessibility(
                showReasoning ? 'Hide reasoning' : 'Show why this was recommended',
                'Double tap to toggle personalization reasoning'
              )}
            >
              <Text style={styles.reasoningButtonText}>
                {showReasoning ? '🔽' : '🤔'} Why this?
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Reasoning Explanation */}
      {showReasoning && reasoning && (
        <View style={styles.reasoningContainer}>
          <Text style={styles.reasoningTitle}>Why we recommended this:</Text>
          <Text style={styles.reasoningText}>{reasoning}</Text>
        </View>
      )}

      {/* Main Tip Card */}
      <TipCard
        tip={tip}
        onAction={onAction}
        isLiked={isLiked}
        isBookmarked={isBookmarked}
        isCompleted={isCompleted}
      />

      {/* Personalization Feedback */}
      {showPersonalizationInfo && (
        <View style={styles.feedbackContainer}>
          {!showFeedback ? (
            <TouchableOpacity
              style={styles.feedbackToggle}
              onPress={() => setShowFeedback(true)}
              {...createButtonAccessibility(
                'Rate this recommendation',
                'Double tap to provide feedback on this personalized tip'
              )}
            >
              <Text style={styles.feedbackToggleText}>
                💭 How was this recommendation?
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.feedbackButtons}>
              <Text style={styles.feedbackTitle}>Was this tip helpful for you?</Text>
              
              <View style={styles.feedbackButtonRow}>
                <TouchableOpacity
                  style={[styles.feedbackButton, styles.positiveButton]}
                  onPress={() => handlePersonalizationFeedback('positive')}
                  disabled={submittingFeedback === tip.id}
                  {...createButtonAccessibility(
                    'This tip was helpful',
                    'Double tap to indicate this personalized tip was helpful'
                  )}
                >
                  {submittingFeedback === tip.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Text style={styles.feedbackButtonIcon}>👍</Text>
                      <Text style={styles.feedbackButtonText}>Helpful</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.feedbackButton, styles.negativeButton]}
                  onPress={() => handlePersonalizationFeedback('negative')}
                  disabled={submittingFeedback === tip.id}
                  {...createButtonAccessibility(
                    'This tip was not helpful',
                    'Double tap to indicate this personalized tip was not helpful'
                  )}
                >
                  {submittingFeedback === tip.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Text style={styles.feedbackButtonIcon}>👎</Text>
                      <Text style={styles.feedbackButtonText}>Not Helpful</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.feedbackButton, styles.cancelButton]}
                  onPress={() => setShowFeedback(false)}
                  {...createButtonAccessibility(
                    'Cancel feedback',
                    'Double tap to cancel providing feedback'
                  )}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Feedback Status Messages */}
          {feedbackSuccess && (
            <View style={styles.feedbackSuccess}>
              <Text style={styles.feedbackSuccessText}>{feedbackSuccess}</Text>
            </View>
          )}

          {feedbackError && (
            <View style={styles.feedbackError}>
              <Text style={styles.feedbackErrorText}>{feedbackError}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  personalizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  personalizationScore: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scoreIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  scoreText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    marginRight: 8,
  },
  scoreValue: {
    fontSize: 12,
    color: '#495057',
    fontWeight: 'bold',
  },
  reasoningButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#e9ecef',
  },
  reasoningButtonText: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '500',
  },
  reasoningContainer: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  reasoningTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  reasoningText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 16,
  },
  feedbackContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  feedbackToggle: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  feedbackToggleText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  feedbackButtons: {
    alignItems: 'center',
  },
  feedbackTitle: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  feedbackButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
    justifyContent: 'center',
  },
  positiveButton: {
    backgroundColor: '#28a745',
  },
  negativeButton: {
    backgroundColor: '#dc3545',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  feedbackButtonIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  feedbackButtonText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '500',
  },
  cancelButtonText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '500',
  },
  feedbackSuccess: {
    backgroundColor: '#d4edda',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  feedbackSuccessText: {
    fontSize: 12,
    color: '#155724',
    textAlign: 'center',
    fontWeight: '500',
  },
  feedbackError: {
    backgroundColor: '#f8d7da',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  feedbackErrorText: {
    fontSize: 12,
    color: '#721c24',
    textAlign: 'center',
    fontWeight: '500',
  },
});