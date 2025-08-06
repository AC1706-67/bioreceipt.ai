import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ViewStyle,
  Image
} from 'react-native';
import { Achievement } from '../../types/progress';

interface AchievementGalleryProps {
  achievements: Achievement[];
  onAchievementPress?: (achievement: Achievement) => void;
  horizontal?: boolean;
  showRarity?: boolean;
  style?: ViewStyle;
}

export const AchievementGallery: React.FC<AchievementGalleryProps> = ({
  achievements,
  onAchievementPress,
  horizontal = false,
  showRarity = true,
  style
}) => {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#64748B';
      case 'rare': return '#3B82F6';
      case 'epic': return '#8B5CF6';
      case 'legendary': return '#F59E0B';
      default: return '#64748B';
    }
  };

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'rare': return '#3B82F6';
      case 'epic': return '#8B5CF6';
      case 'legendary': return '#F59E0B';
      default: return 'transparent';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderAchievement = (achievement: Achievement, index: number) => {
    const rarityColor = getRarityColor(achievement.rarity);
    const glowColor = getRarityGlow(achievement.rarity);
    const isLegendary = achievement.rarity === 'legendary';

    return (
      <TouchableOpacity
        key={achievement.id}
        style={[
          styles.achievementCard,
          horizontal && styles.horizontalCard,
          {
            borderColor: rarityColor,
            shadowColor: glowColor,
            shadowOpacity: glowColor !== 'transparent' ? 0.3 : 0.1
          }
        ]}
        onPress={() => onAchievementPress?.(achievement)}
        activeOpacity={0.8}
      >
        {/* Legendary Sparkle Effect */}
        {isLegendary && (
          <View style={styles.sparkleContainer}>
            <Text style={styles.sparkle}>✨</Text>
            <Text style={[styles.sparkle, styles.sparkle2]}>✨</Text>
            <Text style={[styles.sparkle, styles.sparkle3]}>✨</Text>
          </View>
        )}

        {/* Achievement Image/Icon */}
        <View style={[
          styles.imageContainer,
          { borderColor: rarityColor }
        ]}>
          {achievement.imageUrl ? (
            <Image 
              source={{ uri: achievement.imageUrl }}
              style={styles.achievementImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.achievementIcon}>
              {achievement.rarity === 'legendary' ? '👑' :
               achievement.rarity === 'epic' ? '💎' :
               achievement.rarity === 'rare' ? '🏆' :
               '🏅'}
            </Text>
          )}
        </View>

        {/* Achievement Info */}
        <View style={styles.achievementInfo}>
          <Text style={styles.achievementTitle} numberOfLines={1}>
            {achievement.title}
          </Text>
          
          <Text style={styles.achievementDescription} numberOfLines={2}>
            {achievement.description}
          </Text>

          {/* Rarity Badge */}
          {showRarity && (
            <View style={[
              styles.rarityBadge,
              { backgroundColor: rarityColor }
            ]}>
              <Text style={styles.rarityText}>
                {achievement.rarity.toUpperCase()}
              </Text>
            </View>
          )}

          {/* Unlock Date */}
          <Text style={styles.unlockDate}>
            Unlocked {formatDate(achievement.unlockedAt)}
          </Text>

          {/* Progress Bar (if applicable) */}
          {achievement.progress < achievement.maxProgress && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${(achievement.progress / achievement.maxProgress) * 100}%`,
                      backgroundColor: rarityColor
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {achievement.progress}/{achievement.maxProgress}
              </Text>
            </View>
          )}

          {/* Shareable Message */}
          {achievement.shareableMessage && (
            <TouchableOpacity style={styles.shareButton}>
              <Text style={styles.shareButtonText}>📤 Share</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (achievements.length === 0) {
    return (
      <View style={[styles.emptyContainer, style]}>
        <Text style={styles.emptyIcon}>🏆</Text>
        <Text style={styles.emptyTitle}>No Achievements Yet</Text>
        <Text style={styles.emptyText}>
          Complete milestones and engage with health tips to unlock achievements!
        </Text>
      </View>
    );
  }

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.horizontalContainer, style]}
        style={styles.horizontalScroll}
      >
        {achievements.map(renderAchievement)}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {achievements.map(renderAchievement)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20
  },
  horizontalScroll: {
    paddingLeft: 20
  },
  horizontalContainer: {
    paddingRight: 20
  },
  achievementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden'
  },
  horizontalCard: {
    width: 200,
    marginRight: 12,
    marginBottom: 0
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none'
  },
  sparkle: {
    position: 'absolute',
    fontSize: 12,
    opacity: 0.8
  },
  sparkle2: {
    top: 10,
    right: 15,
    fontSize: 8
  },
  sparkle3: {
    bottom: 20,
    left: 10,
    fontSize: 10
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
    backgroundColor: '#F8FAFC'
  },
  achievementImage: {
    width: 40,
    height: 40
  },
  achievementIcon: {
    fontSize: 32
  },
  achievementInfo: {
    alignItems: 'center'
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4
  },
  achievementDescription: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8
  },
  rarityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  unlockDate: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 8
  },
  progressContainer: {
    width: '100%',
    marginBottom: 8
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4
  },
  progressFill: {
    height: '100%',
    borderRadius: 2
  },
  progressText: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center'
  },
  shareButton: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  shareButtonText: {
    fontSize: 10,
    color: '#4F46E5',
    fontWeight: '500'
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed'
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20
  }
});

export default AchievementGallery;