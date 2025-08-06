/**
 * Admin Feedback Dashboard Component
 * Administrative interface for managing user feedback and support requests
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
  Alert,
  TextInput,
  Modal
} from 'react-native';
import {
  UserFeedback,
  FeedbackCategory,
  FeedbackStatus,
  FeedbackPriority,
  FeedbackFilter,
  FeedbackStats
} from '../../models/Feedback';
import { feedbackService } from '../../services/feedback/feedbackService';

interface AdminFeedbackDashboardProps {
  adminUserId: string;
  style?: any;
}

const AdminFeedbackDashboard: React.FC<AdminFeedbackDashboardProps> = ({
  adminUserId,
  style
}) => {
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FeedbackFilter>({});
  const [selectedFeedback, setSelectedFeedback] = useState<UserFeedback | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [newStatus, setNewStatus] = useState<FeedbackStatus>(FeedbackStatus.ACKNOWLEDGED);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [feedbackData, statsData] = await Promise.all([
        loadAllFeedback(),
        feedbackService.getFeedbackStats()
      ]);
      setFeedback(feedbackData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert('Error', 'Failed to load feedback data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  const loadAllFeedback = async (): Promise<UserFeedback[]> => {
    // In a real app, this would be an admin API call
    // For now, we'll simulate by getting all feedback from storage
    const allFeedbackData = await feedbackService.getUserFeedback('', filter);
    return allFeedbackData;
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleFilterChange = useCallback((newFilter: Partial<FeedbackFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  const handleFeedbackPress = useCallback((feedbackItem: UserFeedback) => {
    setSelectedFeedback(feedbackItem);
    setAdminResponse('');
    setNewStatus(feedbackItem.status);
    setShowResponseModal(true);
  }, []);

  const handleUpdateFeedback = useCallback(async () => {
    if (!selectedFeedback) return;

    try {
      const updatedFeedback = await feedbackService.updateFeedbackStatus(
        selectedFeedback.id,
        newStatus,
        adminResponse.trim() || undefined,
        adminUserId
      );

      // Update the feedback in the list
      setFeedback(prev => prev.map(f => 
        f.id === selectedFeedback.id ? updatedFeedback : f
      ));

      setShowResponseModal(false);
      setSelectedFeedback(null);
      setAdminResponse('');
      
      Alert.alert('Success', 'Feedback updated successfully');
    } catch (error) {
      console.error('Error updating feedback:', error);
      Alert.alert('Error', 'Failed to update feedback');
    }
  }, [selectedFeedback, newStatus, adminResponse, adminUserId]);

  const getPriorityColor = (priority: FeedbackPriority): string => {
    const colors: Record<FeedbackPriority, string> = {
      [FeedbackPriority.LOW]: '#34C759',
      [FeedbackPriority.MEDIUM]: '#FF9500',
      [FeedbackPriority.HIGH]: '#FF6B35',
      [FeedbackPriority.CRITICAL]: '#FF3B30'
    };
    return colors[priority];
  };

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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const renderStats = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Feedback Overview</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalSubmissions}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#FF9500' }]}>
              {stats.byStatus[FeedbackStatus.SUBMITTED] || 0}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#34C759' }]}>
              {stats.byStatus[FeedbackStatus.RESOLVED] || 0}
            </Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#007AFF' }]}>
              {stats.resolutionRate.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Resolution Rate</Text>
          </View>
        </View>

        {stats.trendingIssues.length > 0 && (
          <View style={styles.trendingSection}>
            <Text style={styles.trendingTitle}>Trending Issues</Text>
            {stats.trendingIssues.slice(0, 3).map((issue, index) => (
              <View key={index} style={styles.trendingItem}>
                <Text style={styles.trendingCategory}>
                  {getCategoryDisplayName(issue.category)}
                </Text>
                <Text style={styles.trendingCount}>{issue.count}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterButton, !filter.status && styles.filterButtonActive]}
          onPress={() => handleFilterChange({ status: undefined })}
        >
          <Text style={styles.filterButtonText}>All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter.status === FeedbackStatus.SUBMITTED && styles.filterButtonActive]}
          onPress={() => handleFilterChange({ status: FeedbackStatus.SUBMITTED })}
        >
          <Text style={styles.filterButtonText}>New</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter.status === FeedbackStatus.IN_PROGRESS && styles.filterButtonActive]}
          onPress={() => handleFilterChange({ status: FeedbackStatus.IN_PROGRESS })}
        >
          <Text style={styles.filterButtonText}>In Progress</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter.priority === FeedbackPriority.CRITICAL && styles.filterButtonActive]}
          onPress={() => handleFilterChange({ 
            priority: filter.priority === FeedbackPriority.CRITICAL ? undefined : FeedbackPriority.CRITICAL 
          })}
        >
          <Text style={styles.filterButtonText}>Critical</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFeedbackItem = ({ item }: { item: UserFeedback }) => (
    <TouchableOpacity
      style={styles.feedbackItem}
      onPress={() => handleFeedbackPress(item)}
    >
      <View style={styles.feedbackHeader}>
        <View style={styles.feedbackMeta}>
          <Text style={styles.referenceNumber}>#{item.referenceNumber}</Text>
          <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(item.priority) }]} />
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.feedbackTitle} numberOfLines={2}>{item.title}</Text>
      
      <View style={styles.feedbackDetails}>
        <Text style={styles.category}>{getCategoryDisplayName(item.category)}</Text>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      {item.adminResponse && (
        <View style={styles.responseIndicator}>
          <Text style={styles.responseIndicatorText}>✓ Responded</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderResponseModal = () => (
    <Modal
      visible={showResponseModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowResponseModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowResponseModal(false)}
          >
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>Update Feedback</Text>
          
          <TouchableOpacity
            style={styles.modalSaveButton}
            onPress={handleUpdateFeedback}
          >
            <Text style={styles.modalSaveText}>Save</Text>
          </TouchableOpacity>
        </View>

        {selectedFeedback && (
          <View style={styles.modalContent}>
            <View style={styles.feedbackSummary}>
              <Text style={styles.summaryTitle}>{selectedFeedback.title}</Text>
              <Text style={styles.summaryReference}>#{selectedFeedback.referenceNumber}</Text>
              <Text style={styles.summaryDescription} numberOfLines={3}>
                {selectedFeedback.description}
              </Text>
            </View>

            <View style={styles.statusSection}>
              <Text style={styles.sectionLabel}>Status</Text>
              <View style={styles.statusOptions}>
                {Object.values(FeedbackStatus).map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      newStatus === status && styles.statusOptionActive
                    ]}
                    onPress={() => setNewStatus(status)}
                  >
                    <Text style={[
                      styles.statusOptionText,
                      newStatus === status && styles.statusOptionTextActive
                    ]}>
                      {status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.responseSection}>
              <Text style={styles.sectionLabel}>Admin Response (Optional)</Text>
              <TextInput
                style={styles.responseInput}
                value={adminResponse}
                onChangeText={setAdminResponse}
                placeholder="Enter your response to the user..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Feedback Found</Text>
      <Text style={styles.emptyStateText}>
        No feedback matches your current filters.
      </Text>
    </View>
  );

  if (loading && feedback.length === 0) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading feedback...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Feedback Dashboard</Text>
      
      {renderStats()}
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

      {renderResponseModal()}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  trendingSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  trendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  trendingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  trendingCategory: {
    fontSize: 13,
    color: '#666',
  },
  trendingCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#333',
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
    marginRight: 8,
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
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
    marginBottom: 8,
  },
  responseIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  responseIndicatorText: {
    fontSize: 11,
    color: '#2e7d32',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCloseButton: {
    paddingVertical: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalSaveButton: {
    paddingVertical: 8,
  },
  modalSaveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  feedbackSummary: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  summaryReference: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  summaryDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  statusSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusOptionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  statusOptionTextActive: {
    color: '#fff',
  },
  responseSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  responseInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

export default AdminFeedbackDashboard;