/**
 * Tip Card Component
 * Displays individual health tip with interaction buttons
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { HealthTip, UserAction } from '../../types';
import {
  createButtonAccessibility,
  createImageAccessibility,
  createHeaderAccessibility,
  createListItemAccessibility,
  ACCESSIBILITY_ROLES,
  announceForAccessibility,
} from '../../utils/accessibility';

interface TipCardProps {
  tip: HealthTip;
  onAction: (tipId: string, action: UserAction) => void;
  isLiked?: boolean;
  isBookmarked?: boolean;
  isCompleted?: boolean;
}

export const TipCard: React.FC<TipCardProps> = ({
  tip,
  onAction,
  isLiked = false,
  isBookmarked = false,
  isCompleted = false,
}) => {
  const [liked, setLiked] = useState(isLiked);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [completed, setCompleted] = useState(isCompleted);

  const handleLike = () => {
    const newLikedState = !liked;
    setLiked(newLikedState);
    onAction(tip.id, 'like');
    
    // Announce the action for screen readers
    announceForAccessibility(
      newLikedState ? 'Tip liked' : 'Tip unliked',
      'polite'
    );
  };

  const handleBookmark = () => {
    const newBookmarkedState = !bookmarked;
    setBookmarked(newBookmarkedState);
    onAction(tip.id, 'bookmark');
    
    // Announce the action for screen readers
    announceForAccessibility(
      newBookmarkedState ? 'Tip saved to bookmarks' : 'Tip removed from bookmarks',
      'polite'
    );
  };

  const handleComplete = () => {
    if (completed) {
      Alert.alert('Already Completed', 'You have already completed this tip!');
      return;
    }

    Alert.alert(
      'Mark as Complete',
      'Have you completed this health tip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Complete',
          onPress: () => {
            setCompleted(true);
            onAction(tip.id, 'complete');
            
            // Announce completion for screen readers
            announceForAccessibility(
              'Congratulations! Health tip completed successfully',
              'assertive'
            );
            
            // Show celebration for completion
            Alert.alert(
              'Great Job! 🎉',
              'You\'ve completed this health tip! Keep up the great work on your wellness journey.',
              [{ text: 'Continue', style: 'default' }]
            );
          },
        },
      ]
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '#27ae60';
      case 'medium':
        return '#f39c12';
      case 'hard':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'nutrition':
        return '#27ae60';
      case 'mental_wellness':
        return '#9b59b6';
      case 'fitness':
        return '#e74c3c';
      case 'sleep':
        return '#3498db';
      case 'recovery':
        return '#f39c12';
      case 'hygiene':
        return '#1abc9c';
      default:
        return '#95a5a6';
    }
  };

  // Create accessibility label for the entire tip card
  const cardAccessibilityLabel = `Health tip: ${tip.title}. ${tip.category.replace('_', ' ')} category, ${tip.difficulty} difficulty, ${tip.estimatedReadTime} minute read. ${completed ? 'Completed' : 'Not completed'}`;

  return (
    <View 
      style={[styles.container, completed && styles.completedContainer]}
      {...createListItemAccessibility(cardAccessibilityLabel)}
    >
      {tip.imageUrl && (
        <Image 
          source={{ uri: tip.imageUrl }} 
          style={styles.image}
          {...createImageAccessibility(`Image for ${tip.title}`)}
        />
      )}
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View 
            style={styles.badges}
            accessible={true}
            accessibilityRole={ACCESSIBILITY_ROLES.GROUP}
            accessibilityLabel={`Category: ${tip.category.replace('_', ' ')}, Difficulty: ${tip.difficulty}`}
          >
            <View style={[styles.badge, { backgroundColor: getCategoryColor(tip.category) }]}>
              <Text style={styles.badgeText}>
                {tip.category.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getDifficultyColor(tip.difficulty) }]}>
              <Text style={styles.badgeText}>{tip.difficulty.toUpperCase()}</Text>
            </View>
          </View>
          <Text 
            style={styles.readTime}
            accessible={true}
            accessibilityRole={ACCESSIBILITY_ROLES.TEXT}
            accessibilityLabel={`Estimated reading time: ${tip.estimatedReadTime} minutes`}
          >
            {tip.estimatedReadTime} min read
          </Text>
        </View>

        <Text 
          style={styles.title}
          {...createHeaderAccessibility(tip.title, 3)}
        >
          {tip.title}
        </Text>
        <Text 
          style={styles.description}
          accessible={true}
          accessibilityRole={ACCESSIBILITY_ROLES.TEXT}
          accessibilityLabel={`Tip content: ${tip.content}`}
        >
          {tip.content}
        </Text>

        {tip.tags.length > 0 && (
          <View 
            style={styles.tagsContainer}
            accessible={true}
            accessibilityRole={ACCESSIBILITY_ROLES.GROUP}
            accessibilityLabel={`Tags: ${tip.tags.slice(0, 3).join(', ')}${tip.tags.length > 3 ? ` and ${tip.tags.length - 3} more` : ''}`}
          >
            {tip.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
            {tip.tags.length > 3 && (
              <Text style={styles.moreTagsText}>+{tip.tags.length - 3} more</Text>
            )}
          </View>
        )}

        <View 
          style={styles.actions}
          accessible={false}
          accessibilityRole={ACCESSIBILITY_ROLES.GROUP}
          accessibilityLabel="Tip actions"
        >
          <TouchableOpacity
            style={[styles.actionButton, liked && styles.likedButton]}
            onPress={handleLike}
            {...createButtonAccessibility(
              liked ? 'Unlike this tip' : 'Like this tip',
              liked ? 'Double tap to remove like' : 'Double tap to like this health tip',
              { selected: liked }
            )}
          >
            <Text style={[styles.actionText, liked && styles.likedText]}>
              {liked ? '❤️ Liked' : '🤍 Like'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, bookmarked && styles.bookmarkedButton]}
            onPress={handleBookmark}
            {...createButtonAccessibility(
              bookmarked ? 'Remove bookmark' : 'Bookmark this tip',
              bookmarked ? 'Double tap to remove from saved tips' : 'Double tap to save this tip for later',
              { selected: bookmarked }
            )}
          >
            <Text style={[styles.actionText, bookmarked && styles.bookmarkedText]}>
              {bookmarked ? '🔖 Saved' : '📑 Save'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.completeButton,
              completed && styles.completedButton,
            ]}
            onPress={handleComplete}
            disabled={completed}
            {...createButtonAccessibility(
              completed ? 'Tip completed' : 'Mark tip as complete',
              completed ? 'This tip has been completed' : 'Double tap to mark this health tip as completed',
              { disabled: completed, selected: completed }
            )}
          >
            <Text style={[styles.actionText, styles.completeText, completed && styles.completedText]}>
              {completed ? '✅ Done' : '⭕ Complete'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  completedContainer: {
    opacity: 0.8,
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  readTime: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: '#5a6c7d',
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  tag: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  tagText: {
    fontSize: 12,
    color: '#6c757d',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  likedButton: {
    backgroundColor: '#ffe6e6',
    borderColor: '#e74c3c',
  },
  bookmarkedButton: {
    backgroundColor: '#e6f3ff',
    borderColor: '#3498db',
  },
  completeButton: {
    backgroundColor: '#f8f9fa',
    borderColor: '#28a745',
  },
  completedButton: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  actionText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  likedText: {
    color: '#e74c3c',
  },
  bookmarkedText: {
    color: '#3498db',
  },
  completeText: {
    color: '#28a745',
  },
  completedText: {
    color: '#155724',
    fontWeight: 'bold',
  },
});