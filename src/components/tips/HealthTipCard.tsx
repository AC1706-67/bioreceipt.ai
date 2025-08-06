/**
 * Health Tip Card Component
 * Displays individual health tips with image loading, text rendering,
 * and user interaction handlers
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { HealthTip, UserHealthTipInteraction } from '../../models/HealthTip';
import { healthTipService } from '../../services/content/healthTipService';
import { analyticsService } from '../../services/analytics/analyticsService';

interface HealthTipCardProps {
  tip: HealthTip;
  userId: string;
  onPress?: (tip: HealthTip) => void;
  onInteraction?: (interaction: UserHealthTipInteraction) => void;
  showFullContent?: boolean;
  style?: any;
}

const { width: screenWidth } = Dimensions.get('window');

const HealthTipCard: React.FC<HealthTipCardProps> = memo(({
  tip,
  userId,
  onPress,
  onInteraction,
  showFullContent = false,
  style
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(tip);
    }
    
    // Track analytics
    analyticsService.trackTipInteraction('view', tip.id, {
      title: tip.title,
      category: tip.category
    }, userId);
    
    // Record view interaction
    recordInteraction('view');
  }, [tip, onPress, userId]);

  const recordInteraction = useCallback(async (
    interactionType: 'view' | 'like' | 'bookmark' | 'complete' | 'share' | 'rate',
    metadata?: any
  ) => {
    try {
      const interaction: UserHealthTipInteraction = {
        userId,
        tipId: tip.id,
        interactionType,
        timestamp: new Date(),
        metadata
      };

      await healthTipService.recordInteraction(interaction);
      
      if (onInteraction) {
        onInteraction(interaction);
      }
    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  }, [userId, tip.id, onInteraction]);

  const handleLike = useCallback(async () => {
    try {
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      
      if (newLikedState) {
        // Track analytics
        analyticsService.trackTipInteraction('like', tip.id, {
          title: tip.title,
          category: tip.category
        }, userId);
        
        await recordInteraction('like');
      }
    } catch (error) {
      console.error('Error handling like:', error);
      setIsLiked(!isLiked); // Revert on error
    }
  }, [isLiked, recordInteraction, tip, userId]);

  const handleBookmark = useCallback(async () => {
    try {
      const newBookmarkedState = !isBookmarked;
      setIsBookmarked(newBookmarkedState);
      
      if (newBookmarkedState) {
        // Track analytics
        analyticsService.trackTipInteraction('bookmark', tip.id, {
          title: tip.title,
          category: tip.category
        }, userId);
        
        await recordInteraction('bookmark');
      }
    } catch (error) {
      console.error('Error handling bookmark:', error);
      setIsBookmarked(!isBookmarked); // Revert on error
    }
  }, [isBookmarked, recordInteraction, tip, userId]);

  const handleComplete = useCallback(async () => {
    try {
      const newCompletedState = !isCompleted;
      setIsCompleted(newCompletedState);
      
      if (newCompletedState) {
        // Track analytics
        analyticsService.trackTipInteraction('complete', tip.id, {
          title: tip.title,
          category: tip.category
        }, userId);
        
        await recordInteraction('complete');
        Alert.alert('Great job!', 'You completed this health tip!');
      }
    } catch (error) {
      console.error('Error handling complete:', error);
      setIsCompleted(!isCompleted); // Revert on error
    }
  }, [isCompleted, recordInteraction, tip, userId]);

  const handleShare = useCallback(async () => {
    try {
      // Track analytics
      analyticsService.trackTipInteraction('share', tip.id, {
        title: tip.title,
        category: tip.category
      }, userId);
      
      // In a real app, this would open share dialog
      Alert.alert('Share', 'Share functionality would be implemented here');
      await recordInteraction('share');
    } catch (error) {
      console.error('Error handling share:', error);
    }
  }, [recordInteraction, tip, userId]);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
  }, []);

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      nutrition: '#4CAF50',
      fitness: '#FF9800',
      mental_wellness: '#9C27B0',
      sleep: '#3F51B5',
      recovery: '#00BCD4',
      hygiene: '#795548',
      general: '#607D8B'
    };
    return colors[category] || colors.general;
  };

  const getDifficultyIcon = (difficulty: string): string => {
    const icons: Record<string, string> = {
      beginner: '⭐',
      intermediate: '⭐⭐',
      advanced: '⭐⭐⭐'
    };
    return icons[difficulty] || icons.beginner;
  };

  const truncateContent = (content: string, maxLength: number = 150): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.8}
      testID="health-tip-card"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(tip.category) }]}>
          <Text style={styles.categoryText}>{tip.category.replace('_', ' ').toUpperCase()}</Text>
        </View>
        <View style={styles.metadata}>
          <Text style={styles.difficulty}>{getDifficultyIcon(tip.difficulty)}</Text>
          <Text style={styles.readTime}>{tip.estimatedReadTime}min</Text>
        </View>
      </View>

      {/* Image */}
      {tip.imageUrl && !imageError && (
        <View style={styles.imageContainer} testID="tip-image">
          {imageLoading && (
            <View style={styles.imageLoader} testID="image-loader">
              <ActivityIndicator size="small" color="#666" />
            </View>
          )}
          <Image
            source={{ uri: tip.imageUrl }}
            style={styles.image}
            onLoad={handleImageLoad}
            onError={handleImageError}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{tip.title}</Text>
        <Text style={styles.contentText}>
          {showFullContent ? tip.content : truncateContent(tip.content)}
        </Text>
        
        {/* Tags */}
        <View style={styles.tagsContainer}>
          {tip.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
          {tip.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{tip.tags.length - 3} more</Text>
          )}
        </View>
      </View>

      {/* Footer with interactions */}
      <View style={styles.footer}>
        <View style={styles.stats}>
          <Text style={styles.statText}>👁 {tip.metadata.views}</Text>
          <Text style={styles.statText}>⭐ {tip.metadata.averageRating.toFixed(1)}</Text>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, isLiked && styles.actionButtonActive]}
            onPress={handleLike}
          >
            <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
              {isLiked ? '❤️' : '🤍'} {tip.metadata.likes}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, isBookmarked && styles.actionButtonActive]}
            onPress={handleBookmark}
          >
            <Text style={[styles.actionText, isBookmarked && styles.actionTextActive]}>
              {isBookmarked ? '🔖' : '📑'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, isCompleted && styles.actionButtonActive]}
            onPress={handleComplete}
          >
            <Text style={[styles.actionText, isCompleted && styles.actionTextActive]}>
              {isCompleted ? '✅' : '⭕'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
          >
            <Text style={styles.actionText}>📤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Author */}
      <View style={styles.authorContainer}>
        <Text style={styles.authorText}>By {tip.author}</Text>
        <Text style={styles.dateText}>
          {new Date(tip.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  categoryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  difficulty: {
    fontSize: 12,
  },
  readTime: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  imageContainer: {
    position: 'relative',
    height: 200,
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    zIndex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    lineHeight: 24,
  },
  contentText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#f8f8f8',
  },
  actionButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  actionText: {
    fontSize: 12,
    color: '#666',
  },
  actionTextActive: {
    color: '#1976d2',
    fontWeight: '600',
  },
  authorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  authorText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: 11,
    color: '#999',
  },
});

export default HealthTipCard;