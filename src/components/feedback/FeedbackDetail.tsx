/**
 * Feedback Detail Component
 * Detailed view of a single feedback item with full conversation history
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  Clipboard
} from 'react-native';
import {
  UserFeedback,
  FeedbackCategory,
  FeedbackStatus,
  FeedbackPriority
} from '../../models/Feedback';
import { feedbackService } from '../../services/feedback/feedbackService';

interface FeedbackDetailProps {
  feedback: UserFeedback;
  userId: string;
  onClose?: () => void;
  onUpdate?: (updatedFeedback: UserFeedback) => void;
  style?: any;
}

const FeedbackDetail: React.FC<FeedbackDetailProps> = ({
  feedback,
  userId,
  onClose,
  onUpdate,
  style
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCopyReference = useCallback(async () => {
    try {
      await Clipboard.setString(feedback.referenceNumber);
      Alert.alert('Copied', 'Reference number copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  }, [feedback.referenceNumber]);

  const handleShare = useCallback(async () => {
    try {
      const message = `Feedback Reference: ${feedback.referenceNumber}\nTitle: ${feedback.title}\nStatus: ${feedback.status}`;
      
      await Share.share({
        message,
        title: 'Feedback Details'
      });
    } catch (error) {
      console.error('Error sharing feedback:', error);
    }
  }, [feedback]);

  const handleDelete = useCallback(async () => {
    if (feedback.status !== FeedbackStatus.SUBMITTED) {
      Alert.alert(
        'Cannot Delete',
        'This feedback is being processed and cannot be deleted.'
      );
      return;
    }

    Alert.alert(
      'Delete Feedback',
      'Are you sure you want to delete this feedback? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await feedbackService.deleteFeedback(feedback.id, userId);
              Alert.alert('Success', 'Feedback deleted successfully');
              onClose?.();
            } catch (error) {
              console.error('Error deleting feedback:', error);
              Alert.alert('Error', 'Failed to delete feedback');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  }, [feedback, userId, onClose]);

  const getStatusColor = (status: FeedbackStatus): string => {
    const colors: Record<FeedbackStatus, string> = {
      [FeedbackStatus.SUBMITTED]: '#007AFF',
      [FeedbackStatus.ACKNOWLEDGED]: '#FF9500',
      [FeedbackStatus.IN_PROGRESS]: '#FF9500',
      [FeedbackStatus.RESOLVED]: '#34C759',
      [FeedbackStatus.CLOSED]: '#8E8E93',
      [FeedbackStatus.REJECTED]: '#FF3B30'
    };
    return colors[status];
  };

  const getPriorityColor = (priority: FeedbackPriority): string => {
    const colors: Record<FeedbackPriority, string> = {
      [FeedbackPriority.LOW]: '#34C759',
      [FeedbackPriority.MEDIUM]: '#FF9500',
      [FeedbackPriority.HIGH]: '#FF6B35',
      [FeedbackPriority.CRITICAL]: '#FF3B30'
    };
    return colors[priority];
  };

  const getCategoryDisplayName = (category: FeedbackCategory): string => {
    const names: Record<FeedbackCategory, string> = {
      [FeedbackCategory.BUG_REPORT]: 'Bug Report',
      [FeedbackCategory.FEATURE_REQUEST]: 'Feature Request',
      [FeedbackCategory.CONTENT_QUALITY]: 'Content Quality',
      [FeedbackCategory.USABILITY]: 'Usability',
      [FeedbackCategory.PERFORMANCE]: 'Performance',
      [FeedbackCategory.ACCESSIBILITY]: 'Accessibility',
      [FeedbackCategory.GENERAL]: 'General Feedback'
    };
    return names[category];
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getStatusDescription = (status: FeedbackStatus): string => {
    const descriptions: Record<FeedbackStatus, string> = {
      [FeedbackStatus.SUBMITTED]: 'Your feedback has been submitted and is waiting for review.',
      [FeedbackStatus.ACKNOWLEDGED]: 'We have received and acknowledged your feedback.',
      [FeedbackStatus.IN_PROGRESS]: 'We are actively working on addressing your feedback.',
      [FeedbackStatus.RESOLVED]: 'Your feedback has been resolved. Thank you for helping us improve!',
      [FeedbackStatus.CLOSED]: 'This feedback has been closed.',
      [FeedbackStatus.REJECTED]: 'This feedback was reviewed but could not be implemented at this time.'
    };
    return descriptions[status];
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.referenceContainer}
          onPress={handleCopyReference}
        >
          <Text style={styles.referenceLabel}>Reference #</Text>
          <Text style={styles.referenceNumber}>{feedback.referenceNumber}</Text>
          <Text style={styles.copyHint}>Tap to copy</Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
          
          {feedback.status === FeedbackStatus.SUBMITTED && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteActionButton]}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              <Text style={styles.deleteActionButtonText}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.title}>{feedback.title}</Text>

      <View style={styles.metaContainer}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Category</Text>
          <Text style={styles.categoryBadge}>
            {getCategoryDisplayName(feedback.category)}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Priority</Text>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(feedback.priority) }]}>
            <Text style={styles.priorityText}>{feedback.priority.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(feedback.status) }]}>
            <Text style={styles.statusText}>{feedback.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderTimeline = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Timeline</Text>
      
      <View style={styles.timelineItem}>
        <View style={styles.timelineDot} />
        <View style={styles.timelineContent}>
          <Text style={styles.timelineTitle}>Feedback Submitted</Text>
          <Text style={styles.timelineDate}>{formatDate(feedback.createdAt)}</Text>
        </View>
      </View>

      {feedback.updatedAt.getTime() !== feedback.createdAt.getTime() && (
        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, { backgroundColor: getStatusColor(feedback.status) }]} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>Status Updated</Text>
            <Text style={styles.timelineDate}>{formatDate(feedback.updatedAt)}</Text>
            <Text style={styles.timelineDescription}>
              {getStatusDescription(feedback.status)}
            </Text>
          </View>
        </View>
      )}

      {feedback.resolvedAt && (
        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, { backgroundColor: '#34C759' }]} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>Resolved</Text>
            <Text style={styles.timelineDate}>{formatDate(feedback.resolvedAt)}</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderDescription = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Description</Text>
      <Text style={styles.description}>{feedback.description}</Text>
    </View>
  );

  const renderAdminResponse = () => {
    if (!feedback.adminResponse) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin Response</Text>
        <View style={styles.adminResponseContainer}>
          <Text style={styles.adminResponse}>{feedback.adminResponse}</Text>
          {feedback.adminUserId && (
            <Text style={styles.adminInfo}>
              Response by admin • {formatDate(feedback.updatedAt)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderDeviceInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Device Information</Text>
      <View style={styles.deviceInfoContainer}>
        <View style={styles.deviceInfoRow}>
          <Text style={styles.deviceInfoLabel}>Platform:</Text>
          <Text style={styles.deviceInfoValue}>{feedback.deviceInfo.platform}</Text>
        </View>
        <View style={styles.deviceInfoRow}>
          <Text style={styles.deviceInfoLabel}>OS Version:</Text>
          <Text style={styles.deviceInfoValue}>{feedback.deviceInfo.osVersion}</Text>
        </View>
        <View style={styles.deviceInfoRow}>
          <Text style={styles.deviceInfoLabel}>App Version:</Text>
          <Text style={styles.deviceInfoValue}>{feedback.appVersion}</Text>
        </View>
        <View style={styles.deviceInfoRow}>
          <Text style={styles.deviceInfoLabel}>Device Model:</Text>
          <Text style={styles.deviceInfoValue}>{feedback.deviceInfo.deviceModel}</Text>
        </View>
      </View>
    </View>
  );

  const renderTags = () => {
    if (!feedback.tags || feedback.tags.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tags</Text>
        <View style={styles.tagsContainer}>
          {feedback.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderTimeline()}
        {renderDescription()}
        {renderAdminResponse()}
        {renderTags()}
        {renderDeviceInfo()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  referenceContainer: {
    flex: 1,
  },
  referenceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  referenceNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 2,
  },
  copyHint: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  deleteActionButton: {
    backgroundColor: '#ffebee',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  deleteActionButtonText: {
    fontSize: 12,
    color: '#d32f2f',
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    lineHeight: 26,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  categoryBadge: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    marginRight: 12,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  description: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  adminResponseContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  adminResponse: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 8,
  },
  adminInfo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  deviceInfoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  deviceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deviceInfoLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  deviceInfoValue: {
    fontSize: 13,
    color: '#333',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});

export default FeedbackDetail;