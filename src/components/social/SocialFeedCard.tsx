/**
 * Social Feed Card
 * Component for displaying social posts in the feed
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Pressable,
  AccessibilityInfo
} from 'react-native';
import { SocialPost } from '../../services/social/socialService';

interface SocialFeedCardProps {
  post: SocialPost;
  currentUserId: string;
  onLike: () => void;
  onComment: (comment: string) => void;
  onShare: () => void;
}

const SocialFeedCardComponent: React.FC<SocialFeedCardProps> = ({
  post,
  currentUserId,
  onLike,
  onComment,
  onShare
}) => {
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(false); // In real app, this would come from user's likes

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike();
  };

  const handleComment = () => {
    if (commentText.trim()) {
      onComment(commentText.trim());
      setCommentText('');
      setShowCommentInput(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getPostTypeIcon = (type: SocialPost['type']) => {
    switch (type) {
      case 'tip_share': return '💡';
      case 'achievement': return '🏆';
      case 'progress_update': return '📈';
      case 'discussion': return '💬';
      case 'challenge': return '🎯';
      default: return '📝';
    }
  };

  const getPostTypeLabel = (type: SocialPost['type']) => {
    switch (type) {
      case 'tip_share': return 'shared a tip';
      case 'achievement': return 'earned an achievement';
      case 'progress_update': return 'updated progress';
      case 'discussion': return 'started a discussion';
      case 'challenge': return 'joined a challenge';
      default: return 'posted';
    }
  };

  return (
    <View 
      style={styles.container}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`Post by ${post.author.name}. ${getPostTypeLabel(post.type)}. ${post.content.text || 'No text content'}`}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {post.authorId.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.authorDetails}>
            <Text style={styles.authorName}>Health Enthusiast</Text>
            <Text style={styles.postMeta}>
              {getPostTypeIcon(post.type)} {getPostTypeLabel(post.type)} • {formatTimeAgo(post.createdAt)}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <Text style={styles.menuIcon}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{post.content.title}</Text>
        <Text style={styles.description}>{post.content.description}</Text>
        
        {/* Tags */}
        {post.content.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {post.content.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Media */}
        {post.content.media && post.content.media.length > 0 && (
          <View style={styles.mediaContainer}>
            {post.content.media.map((media, index) => (
              <Image
                key={index}
                source={{ uri: media.url }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
            ))}
          </View>
        )}
      </View>

      {/* Engagement Stats */}
      <View style={styles.engagementStats}>
        <Text style={styles.statText}>
          {post.engagement.likes} {post.engagement.likes === 1 ? 'like' : 'likes'}
        </Text>
        <Text style={styles.statText}>
          {post.engagement.comments} {post.engagement.comments === 1 ? 'comment' : 'comments'}
        </Text>
        <Text style={styles.statText}>
          {post.engagement.shares} {post.engagement.shares === 1 ? 'share' : 'shares'}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Pressable 
          style={[styles.actionButton, isLiked && styles.actionButtonActive]}
          accessibilityRole="button"
          accessibilityLabel={isLiked ? 'Unlike post' : 'Like post'}
          accessibilityHint="Double tap to toggle like"
          accessibilityState={{ selected: isLiked }}
          hitSlop={8}
          onPress={() => {
            const newLiked = !isLiked;
            handleLike();
            // Announce the action for screen readers
            AccessibilityInfo.announceForAccessibility(
              newLiked ? 'Post liked' : 'Post unliked'
            );
          }}
        >
          <Text style={[styles.actionIcon, isLiked && styles.actionIconActive]}>
            {isLiked ? '❤️' : '🤍'}
          </Text>
          <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
            Like ({post.likes || 0})
          </Text>
        </Pressable>

        <Pressable 
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel="Comment on post"
          accessibilityHint="Opens comment input"
          hitSlop={8}
          onPress={() => setShowCommentInput(!showCommentInput)}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>Comment ({post.comments?.length || 0})</Text>
        </Pressable>

        <Pressable 
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel="Share post"
          accessibilityHint="Opens share options"
          hitSlop={8}
          onPress={onShare}
        >
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionText}>Share</Text>
        </Pressable>

        <Pressable 
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel="Save post"
          accessibilityHint="Save post for later"
          hitSlop={8}
        >
          <Text style={styles.actionIcon}>🔖</Text>
          <Text style={styles.actionText}>Save</Text>
        </Pressable>
      </View>

      {/* Comment Input */}
      {showCommentInput && (
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            accessibilityLabel="Comment input"
            accessibilityHint="Type your comment here, maximum 500 characters"
            returnKeyType="done"
            blurOnSubmit={true}
          />
          <View style={styles.commentActions}>
            <Pressable 
              style={styles.commentCancelButton}
              accessibilityRole="button"
              accessibilityLabel="Cancel comment"
              accessibilityHint="Discards your comment and closes input"
              hitSlop={8}
              onPress={() => {
                setShowCommentInput(false);
                setCommentText('');
                AccessibilityInfo.announceForAccessibility('Comment cancelled');
              }}
            >
              <Text style={styles.commentCancelText}>Cancel</Text>
            </Pressable>
            <Pressable 
              style={[
                styles.commentSubmitButton,
                !commentText.trim() && styles.commentSubmitButtonDisabled
              ]}
              accessibilityRole="button"
              accessibilityLabel="Post comment"
              accessibilityHint="Submits your comment to the post"
              accessibilityState={{ disabled: !commentText.trim() }}
              hitSlop={8}
              onPress={() => {
                handleComment();
                AccessibilityInfo.announceForAccessibility('Comment posted');
              }}
              disabled={!commentText.trim()}
            >
              <Text style={[
                styles.commentSubmitText,
                !commentText.trim() && styles.commentSubmitTextDisabled
              ]}>
                Post
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  authorDetails: {
    flex: 1
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  postMeta: {
    fontSize: 12,
    color: '#666'
  },
  menuButton: {
    padding: 8
  },
  menuIcon: {
    fontSize: 16,
    color: '#666'
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 12
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    lineHeight: 24
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12
  },
  tag: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4
  },
  tagText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500'
  },
  mediaContainer: {
    marginTop: 8
  },
  mediaImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8
  },
  engagementStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4'
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginRight: 16
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4'
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6
  },
  actionButtonActive: {
    backgroundColor: '#fff5f5'
  },
  actionIcon: {
    fontSize: 16,
    marginRight: 4
  },
  actionIconActive: {
    color: '#dc3545'
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  actionTextActive: {
    color: '#dc3545'
  },
  commentInputContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4'
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
    marginTop: 12,
    marginBottom: 8
  },
  commentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  commentCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8
  },
  commentCancelText: {
    fontSize: 14,
    color: '#666'
  },
  commentSubmitButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  commentSubmitButtonDisabled: {
    backgroundColor: '#e9ecef'
  },
  commentSubmitText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600'
  },
  commentSubmitTextDisabled: {
    color: '#adb5bd'
  }
});

// Export memoized component for performance
export const SocialFeedCard = React.memo(SocialFeedCardComponent);