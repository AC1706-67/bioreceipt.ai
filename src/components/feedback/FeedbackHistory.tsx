/**
 * Feedback History Component
 * Displays user's feedback history with status tracking and filtering
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import {
  UserFeedback,
  FeedbackCategory,
  FeedbackStatus,
  FeedbackPriority,
  FeedbackFilter
} from '../../models/Feedback';
import { feedbackService } from '../../services/feedback/feedbackService';

interface FeedbackHistoryProps {
  userId: string;
  onFeedbackPress?: (feedback: UserFeedback) => void;
  style?: any;
}

const FeedbackHistory: React.FC<FeedbackHistoryProps> = ({
  userId,
  onFeedbackPress,
  style
}) => {
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FeedbackFilter>({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, [filter]);

  const loadFeedback = useCallback(async () => {
    try {
      setLoading(true);
      const userFeedback = await feedbackService.getUserFeedback(userId, filter);
      setFeedback(userFeedback);
    } catch (error) {
      console.error('Error loading feedback:', error);
      Alert.alert('Error', 'Failed to load feedback history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, filter]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeedback();
  }, [loadFeedback]);

  const handleFilterChange = useCallback((newFilter: Partial<FeedbackFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilter({});
  }, []);

  const handleDeleteFeedback = useCallback(async (feedbackId: string) => {
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
              await feedbackService.deleteFeedback(feedbackId, userId);
              await loadFeedback(); // Refresh the list
              Alert.alert('Success', 'Feedback deleted successfully');
            } catch (error) {
              console.error('Error deleting feedback:', error);
              Alert.alert('Error', 'Failed to delete feedback');
            }
          }
        }
      ]
    );
  }, [userId, loadFeedback]);

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

  const getPriorityIcon = (priority: FeedbackPriority): string => {
    const icons: Record<FeedbackPriority, string> = {
      [FeedbackPriority.LOW]: '🟢',
      [FeedbackPriority.MEDIUM]: '🟡',
      [FeedbackPriority.HIGH]: '🟠',
      [FeedbackPriority.CRITICAL]: '🔴'
    };
    return icons[priority];
  };

  const getCategoryDisplayName = (category: FeedbackCategory): string => {
    const names: Record<FeedbackCategory, string> = {
      [FeedbackCategory.BUG_REPORT]: 'Bug Report',
      [FeedbackCategory.FEATURE_REQUEST]: 'Feature Request',
      [FeedbackCategory.CONTENT_QUALITY]: 'Content Quality',
      [FeedbackCategory.USABILITY]: 'Usability',
      [FeedbackCategory.PERFORMANCE]: 'Performance',
      [FeedbackCategory.ACCESSIBILITY]: 'Accessibility',
      [FeedbackCategory.GENERAL]: 'General'
    };
    return names[category];
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const renderFeedbackItem = ({ item }: { item: UserFeedback }) => (
    <TouchableOpacity
      style={styles.feedbackItem}
      onPress={() => onFeedbackPress?.(item)}
    >
      <View style={styles.feedbackHeader}>
        <View style={styles.feedbackMeta}>
          <Text style={styles.referenceNumber}>#{item.referenceNumber}</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.priority}>{getPriorityIcon(item.priority)}</Text>
      </View>

      <Text style={styles.feedbackTitle}>{item.title}</Text>
      
      <View style={styles.feedbackDetails}>
        <Text style={styles.category}>{getCategoryDisplayName(item.category)}</Text>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      {item.adminResponse && (
        <View style={styles.adminResponse}>
          <Text style={styles.adminResponseLabel}>Admin Response:</Text>
          <Text style={styles.adminResponseText} numberOfLines={2}>
            {item.adminResponse}
          </Text>
        </View>
      )}

      <View style={styles.feedbackActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onFeedbackPress?.(item)}
        >
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
        
        {item.status === FeedbackStatus.SUBMITTED && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteFeedback(item.id)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <View style={styles.filtersContainer}>
        <Text style={styles.filtersTitle}>Filter by:</Text>
        
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity
              style={[styles.filterOption, !filter.status && styles.filterOptionActive]}
              onPress={() => handleFilterChange({ status: undefined })}
            >
              <Text style={styles.filterOptionText}>All</Text>
            </TouchableOpacity>
            {Object.values(FeedbackStatus).map(status => (
              <TouchableOpacity
                key={status}
                style={[styles.filterOption, filter.status === status && styles.filterOptionActive]}
                onPress={() => handleFilterChange({ status })}
              >
                <Text style={styles.filterOptionText}>
                  {status.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Category</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity
              style={[styles.filterOption, !filter.category && styles.filterOptionActive]}
              onPress={() => handleFilterChange({ category: undefined })}
            >
              <Text style={styles.filterOptionText}>All</Text>
            </TouchableOpacity>
            {Object.values(FeedbackCategory).map(category => (
              <TouchableOpacity
                key={category}
                style={[styles.filterOption, filter.category === category && styles.filterOptionActive]}
                onPress={() => handleFilterChange({ category })}
              >
                <Text style={styles.filterOptionText}>
                  {getCategoryDisplayName(category)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
          <Text style={styles.clearFiltersText}>Clear Filters</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Feedback Yet</Text>
      <Text style={styles.emptyStateText}>
        You haven't submitted any feedback yet. Share your thoughts to help us improve!
      </Text>
    </View>
  );

  if (loading && feedback.length === 0) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading feedback history...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Feedback</Text>
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterToggleText}>
            Filters {showFilters ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
      </View>

      {renderFilters()}

      <FlatList
        data={feedback}
        renderItem={renderFeedbackItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={feedback.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filterToggle: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterToggleText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterOptionText: {
    fontSize: 12,
    color: '#333',
    textTransform: 'capitalize',
  },
  clearFiltersButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  feedbackItem: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  referenceNumber: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginRight: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  priority: {
    fontSize: 16,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  feedbackDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  adminResponse: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  adminResponseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  adminResponseText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  feedbackActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#d32f2f',
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default FeedbackHistory;