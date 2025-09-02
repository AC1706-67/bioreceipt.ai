/**
 * Social Screen
 * Main social features screen with feed, sharing, and community features
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList
} from 'react-native';
import { useSocial } from '../../hooks/useSocial';
import { SocialPost } from '../../services/social/socialService';
import { SocialFeedCard } from './SocialFeedCard';
import { ShareTipModal } from './ShareTipModal';
import { SocialProfileCard } from './SocialProfileCard';
import { NotificationBadge } from './NotificationBadge';

interface SocialScreenProps {
  userId: string;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToChallenges?: () => void;
  onNavigateToLeaderboard?: () => void;
}

export const SocialScreen: React.FC<SocialScreenProps> = ({
  userId,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToChallenges,
  onNavigateToLeaderboard
}) => {
  const {
    profile,
    feed,
    isFeedLoading,
    feedError,
    notifications,
    unreadCount,
    togglePostLike,
    addComment,
    refreshFeed,
    error,
    isLoading
  } = useSocial({ userId });

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedTipId, setSelectedTipId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshFeed();
    } catch (err) {
      console.error('Failed to refresh feed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refreshFeed]);

  const handleLikePost = useCallback(async (postId: string) => {
    try {
      await togglePostLike(postId);
    } catch (err) {
      Alert.alert('Error', 'Failed to like post. Please try again.');
    }
  }, [togglePostLike]);

  const handleCommentPost = useCallback(async (postId: string, comment: string) => {
    try {
      await addComment(postId, comment);
    } catch (err) {
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    }
  }, [addComment]);

  const handleShareTip = useCallback((tipId: string) => {
    setSelectedTipId(tipId);
    setShareModalVisible(true);
  }, []);

  const handleShareComplete = useCallback(() => {
    setShareModalVisible(false);
    setSelectedTipId(null);
    // Refresh feed to show new post
    handleRefresh();
  }, [handleRefresh]);

  // FlatList optimizations
  const keyExtractor = useCallback((item: any) => item.id, []);
  
  const renderFeedItem = useCallback(({ item }: { item: any }) => (
    <SocialFeedCard
      post={item}
      currentUserId={userId}
      onLike={() => handleLikePost(item.id)}
      onComment={(comment) => handleCommentPost(item.id, comment)}
      onShare={() => handleShareTip(item.content.tipId || '')}
    />
  ), [userId, handleLikePost, handleCommentPost, handleShareTip]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 120, // Adjust based on your card height
    offset: 120 * index,
    index
  }), []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading social features...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load social features</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Social</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={onNavigateToNotifications}
          >
            <NotificationBadge count={unreadCount} />
            <Text style={styles.headerButtonText}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={onNavigateToProfile}
          >
            <Text style={styles.headerButtonText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Summary */}
      {profile && (
        <SocialProfileCard 
          profile={profile}
          onPress={onNavigateToProfile}
          compact
        />
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShareModalVisible(true)}
        >
          <Text style={styles.actionButtonText}>Share a Tip</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onNavigateToChallenges}
        >
          <Text style={styles.actionButtonText}>Challenges</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onNavigateToLeaderboard}
        >
          <Text style={styles.actionButtonText}>Leaderboard</Text>
        </TouchableOpacity>
      </View>

      {/* Social Feed */}
      {feedError ? (
        <View style={styles.feedError}>
          <Text style={styles.feedErrorText}>Failed to load feed</Text>
          <Text style={styles.feedErrorDetail}>{feedError}</Text>
        </View>
      ) : feed.length === 0 ? (
        <View style={styles.emptyFeed}>
          <Text style={styles.emptyFeedTitle}>Welcome to Social!</Text>
          <Text style={styles.emptyFeedText}>
            Start following other users and sharing tips to see content here.
          </Text>
          <TouchableOpacity 
            style={styles.shareFirstTipButton}
            onPress={() => setShareModalVisible(true)}
          >
            <Text style={styles.shareFirstTipButtonText}>Share Your First Tip</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          style={styles.feedContainer}
          data={feed}
          keyExtractor={keyExtractor}
          renderItem={renderFeedItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews={true}
          getItemLayout={getItemLayout}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Share Tip Modal */}
      <Modal
        visible={shareModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <ShareTipModal
          userId={userId}
          tipId={selectedTipId}
          onClose={() => setShareModalVisible(false)}
          onShareComplete={handleShareComplete}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 8
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerButton: {
    marginLeft: 16,
    alignItems: 'center'
  },
  headerButtonText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 4,
    alignItems: 'center'
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  feedContainer: {
    flex: 1
  },
  feedError: {
    padding: 20,
    alignItems: 'center'
  },
  feedErrorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc3545',
    marginBottom: 4
  },
  feedErrorDetail: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  emptyFeed: {
    padding: 40,
    alignItems: 'center'
  },
  emptyFeedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  emptyFeedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22
  },
  shareFirstTipButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  shareFirstTipButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});