/**
 * Feedback History Screen
 * Shows user's submitted feedback with status tracking
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAppSelector } from '../../hooks/redux';
import { selectUser } from '../../store/authSlice';
import { FeedbackService } from '../../services/feedback/feedbackService';
import { UserFeedback, FeedbackCategory, FeedbackStatus } from '../../types/feedback';

interface FeedbackHistoryScreenProps {
  onBack: () => void;
  onNewFeedback: () => void;
}

export const FeedbackHistoryScreen: React.FC<FeedbackHistoryScreenProps> = ({
  onBack,
  onNewFeedback,
}) => {
  const user = useAppSelector(selectUser);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const feedbackService = FeedbackService.getInstance();

  useEffect(() => {
    if (user) {
      loadFeedback();
    }
  }, [user]);

  const loadFeedback = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userFeedback = await feedbackService.getUserFeedback(user.id);
      setFeedback(userFeedback);
    } catch (error) {
      console.error('Error loading feedback:', error);
      Alert.alert('Error', 'Failed to load feedback history');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeedback();
    setRefreshing(false);
  };

  const getCategoryIcon = (category: FeedbackCategory): string => {
    switch (category) {
      case 'bug':
        return '🐛';
      case 'feature_request':
        return '💡';
      case 'content_quality':
        return '📝';
      case 'general_question':
        return '❓';
      default:
        return '📋';
    }
  };

  const getCategoryLabel = (category: FeedbackCategory): string => {
    switch (category) {
      case 'bug':
        return 'Bug Report';
      case 'feature_request':
        return 'Feature Request';
      case 'content_quality':
        return 'Content Feedback';
      case 'general_question':
        return 'General Question';
      default:
        return 'Feedback';
    }
  };

  const getStatusColor = (status: FeedbackStatus): string => {
    switch (status) {
      case 'submitted':
        return '#ffc107';
      case 'in_review':
        return '#17a2b8';
      case 'resolved':
        return '#28a745';
      case 'closed':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  const getStatusLabel = (status: FeedbackStatus): string => {
    switch (status) {
      case 'submitted':
        return 'Submitted';
      case 'in_review':
        return 'In Review';
      case 'resolved':
        return 'Resolved';
      case 'closed':
        return 'Closed';
      default:
        return 'Unknown';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical':
        return '#dc3545';
      case 'high':
        return '#fd7e14';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFeedbackPress = (feedbackItem: UserFeedback) => {
    const statusInfo = feedbackItem.adminResponse 
      ? `\n\nResponse: ${feedbackItem.adminResponse}`
      : '\n\nWe\'ll update you when there\'s a response.';

    Alert.alert(
      `${getCategoryIcon(feedbackItem.category)} ${feedbackItem.title}`,
      `Reference: ${feedbackItem.referenceNumber}\nStatus: ${getStatusLabel(feedbackItem.status)}\nSubmitted: ${formatDate(feedbackItem.createdAt)}${statusInfo}`,
      [{ text: 'OK' }]
    );
  };

  const renderFeedbackItem = (item: UserFeedback) => (
    <TouchableOpacity
      key={item.id}
      style={styles.feedbackItem}
      onPress={() => handleFeedbackPress(item)}
    >
      <View style={styles.feedbackHeader}>
        <View style={styles.feedbackTitle}>
          <Text style={styles.categoryIcon}>{getCategoryIcon(item.category)}</Text>
          <View style={styles.titleContainer}>
            <Text style={styles.feedbackTitleText} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.categoryLabel}>
              {getCategoryLabel(item.category)}
            </Text>
          </View>
        </View>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: getPriorityColor(item.priority) },
            ]}
          >
            <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.feedbackDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.feedbackFooter}>
        <Text style={styles.referenceNumber}>#{item.referenceNumber}</Text>
        <Text style={styles.submissionDate}>
          {formatDate(item.createdAt)}
        </Text>
      </View>

      {item.adminResponse && (
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>Response:</Text>
          <Text style={styles.responseText} numberOfLines={2}>
            {item.adminResponse}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📝</Text>
      <Text style={styles.emptyStateTitle}>No Feedback Yet</Text>
      <Text style={styles.emptyStateText}>
        Have a suggestion, found a bug, or need help? We'd love to hear from you!
      </Text>
      <TouchableOpacity style={styles.newFeedbackButton} onPress={onNewFeedback}>
        <Text style={styles.newFeedbackButtonText}>Send Your First Feedback</Text>
      </TouchableOpacity>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Please sign in to view feedback history</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your Feedback</Text>
        <Text style={styles.subtitle}>Track your submissions and responses</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading your feedback...</Text>
          </View>
        ) : feedback.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.feedbackList}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>
                {feedback.length} submission{feedback.length !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity style={styles.newFeedbackButtonSmall} onPress={onNewFeedback}>
                <Text style={styles.newFeedbackButtonSmallText}>+ New</Text>
              </TouchableOpacity>
            </View>
            {feedback.map(renderFeedbackItem)}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
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
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  newFeedbackButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  newFeedbackButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackList: {
    padding: 20,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  newFeedbackButtonSmall: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  newFeedbackButtonSmallText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  feedbackTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  titleContainer: {
    flex: 1,
  },
  feedbackTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 8,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  feedbackDescription: {
    fontSize: 14,
    color: '#5a6c7d',
    lineHeight: 20,
    marginBottom: 12,
  },
  feedbackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  referenceNumber: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
  },
  submissionDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  responseContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
});